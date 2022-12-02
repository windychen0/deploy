const store = require('../utils/store')
const log = require('../utils/log')
const {getProjectById, ProjectVersion, addProjectVersion} = require('./project')
const child_process = require('child_process')
const uuid = require('../utils/uuid')
const {runPromiseInSequence, formatDate} = require('../utils/utils')

const renderShell = {
    async fn({stages, context}) {
        return stages.map(stage => {
            return {
                ...stage,
                shell: new Function('with(this){return `' + (stage.shell || '').replace(/`/, '\`') + '`}').bind(context)()
            }
        })
    }
}

let taskShellLog = {}

const runStages = {
    async fn({stages, id, projectId, context}) {

        let version = new ProjectVersion({id, version: context.next_version})

        taskShellLog[id] = {
            version,
            log: [],
            projectId,
            loaded: false
        }

        let p = new Promise(res => res())

        // stages.forEach((stage , index) => {
        //     p = p.then(()=> runStage.fn({stage , index , version , length: stages.length}))
        // })
        runPromiseInSequence(stages.map((item, index) => () => runStage.fn({
            stage: item,
            index,
            version,
            length: stages.length
        })))
    }
}

const runStage = {
    async fn({stage, index, version, length}) {
        log('运行shell: ' + stage.shell)
        let version_stage = {
            name: stage.name,
            state: 'pending',
            start: formatDate()
        }
        version.stages[index] = version_stage
        let task = taskShellLog[version.id]

        try {
            task.log.push({
                id: uuid(),
                msg: `第${index + 1}步: ${stage.name} - 开始\n`
            })
            let {stdout} = child_process.spawn(stage.shell, {shell: true})
            stdout.on('data', m => {
                task.log.push({
                    id: uuid(),
                    msg: m.toString()
                })
            })

            return await new Promise(res => {
                stdout.on('close', () => {
                    task.log.push({
                        id: uuid(),
                        msg: `第${index + 1}步: ${stage.name} - 结束\n\n\n`
                    })
                    version_stage.end = formatDate()
                    version_stage.state = 'ok'
                    if (index === length - 1) {
                        addProjectVersion.fn({version, state: 'ok', projectId: task.projectId})
                        task.loaded = true
                    }
                    res(true)
                })
            })
                .catch(e => {
                    version_stage.state = 'error'
                    addProjectVersion.fn({version, state: 'error', projectId: task.projectId})
                    throw e
                })
        } catch (e) {
            version_stage.state = 'error'
            await addProjectVersion.fn({version, state: 'error', projectId: task.projectId})
            throw e
        }
    }
}

const getDeployByProjectId = {
    async fn({projectId, id}) {
        let list = await store.get('project-deploy-' + projectId).get('list')
        let res = list.find(item => item.id === id)
        return res || null
    }
}

const getLastGitCommitInfo = {
    async fn({pwd, size = 1}) {
        let {stdout} = child_process.spawn(`cd ${pwd} && git log -${size} --no-merges`, {shell: true})
        let d = ''
        stdout.on('data', m => {
            d += m.toString()
        })
        return new Promise(res => {
            stdout.on('close', () => {
                let data = d.split('commit')
                    .filter(item => Boolean(item.trim()))
                    .map(item =>
                        item.split(/\n/)
                            .filter(it => Boolean(it.trim())
                                && !it.match(/^Author:/)
                                && !it.match(/^Date:/)
                            )
                    ).flat()

                console.log({data})
                res(
                    data.slice(1).trim()
                )
            })
        })
    }
}

module.exports = {
    runDeploy: {
        method: 'post',
        async fn({res, req}) {

            let {id, projectId, username = '', msg = ''} = req.body

            let _uuid = ''

            let loaded = true

            if(msg){
                msg += '\n'
            }

            let hasTask = Object.values(taskShellLog).some(item => {
                if (item && (item.projectId === projectId)) {
                    _uuid = item.id
                    loaded = item.loaded
                    return true
                }
            })

            // 如果没有任务或者是完成了任务
            if (!hasTask || loaded) {
                _uuid = uuid()
                let deploy = await getDeployByProjectId.fn({projectId, id})
                let project = await getProjectById.fn({id: projectId})
                msg += ((await getLastGitCommitInfo.fn({pwd: project.store_pwd, size: 1}))[0] || '')
                let context = JSON.parse(JSON.stringify({
                    ...deploy,
                    ...project,
                    user: res._user,
                    current_date: formatDate(),
                    getLastGitCommitInfo: {
                        fn: getLastGitCommitInfo.fn,
                        arg: {pwd: project.store_pwd, size: 1}
                    },
                    msg,
                }))

                context.next_version = Number(context.current_version) + 1
                context.old_dir = context.deploy_dir + context.current_date + '_' + context.current_version

                let stages = await renderShell.fn({stages: deploy.stages, context})

                await runStages.fn({stages, id: _uuid, projectId, context})
            }

            return res.restful = {
                data: {
                    id: _uuid
                }
            }
        }
    },
    getDeployProgress: {
        method: 'get',
        async fn({res, req}) {
            const {id, messageId} = req.query

            let messageArr = taskShellLog[id]?.log || []
            let loaded = !!(taskShellLog[id]?.loaded)
            if (messageId) {
                let idx = messageArr.findIndex(m => m.id === messageId)
                if (idx !== -1) {
                    messageArr = messageArr.slice(idx + 1)
                }
            }
            return res.restful = {
                data: {
                    emitKey: ['sendDeployProgress' + id],
                    data: {
                        ['sendDeployProgress' + id]: {
                            messageArr,
                            loaded
                        },
                    }
                }
            }
        }
    }
}