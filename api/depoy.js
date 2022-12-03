const store = require('../utils/store')
const projectStore = store.get('project')
const log = require('../utils/log')
const {getProjectById, ProjectVersion, addProjectVersion} = require('./project')
const child_process = require('child_process')
const uuid = require('../utils/uuid')
const {runPromiseInSequence, formatDate} = require('../utils/utils')

const renderShell = {
    async fn({stage, context}) {
        return {
            ...stage,
            shell: new Function('with(this){return `' + (stage.shell || '').replace(/`/, '\`') + '`}').bind(context)()
        }
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

        runPromiseInSequence(stages.map((item, index) => () => runStage.fn({
            stage: item,
            index,
            version,
            length: stages.length,
            context
        })))
    }
}

const runStage = {
    async fn({stage, index, version, length , context}) {
        log('运行shell: ' + stage.shell)
        let version_stage = {
            name: stage.name,
            state: 'pending',
            start: formatDate()
        }
        version.stages[index] = version_stage
        let task = taskShellLog[version.id]

        let errorCallback = async e => {
            version_stage.state = 'error'
            await addProjectVersion.fn({version, state: 'error', projectId: task.projectId})
            throw e
        }
        let successCallback = async () => {
            task.log.push({
                id: uuid(),
                msg: `第${index + 1}步: ${stage.name} - 结束\n\n\n`
            })
            version_stage.end = formatDate()
            version_stage.state = 'ok'
            if (index === length - 1) {
                await addProjectVersion.fn({version, state: 'ok', projectId: task.projectId})
                task.loaded = true
            }
        }

        try {
            task.log.push({
                id: uuid(),
                msg: `第${index + 1}步: ${stage.name} - 开始\n`
            })
            let _p = new Promise(r => r())
            switch (stage.api){
                case 'initGitLogToMsg':
                    let _arr = await getLastGitCommitInfo.fn({pwd: context.project.store_pwd, size: 10})
                    _arr.some(obj => {
                        if(obj.commit === context.project.current_commit){
                            context.updateProject({key: 'current_commit' , value: _arr[0].commit})
                            return true
                        }
                        context.msg = (context.msg || '') + `\n提交信息: ${obj.info}\n作者: ${obj.commit_author}\n提交时间: ${obj.commit_date}\n`
                    })

                    await successCallback()
                    break;
                default:
                    let { shell } = await renderShell.fn({stage , context})
                    let { stdout } = child_process.spawn(shell, {shell: true})
                    stdout.on('data', m => {
                        task.log.push({
                            id: uuid(),
                            msg: m.toString()
                        })
                    })
                    _p = new Promise(res => {
                        stdout.on('close', async () => {
                            await successCallback()
                            res(true)
                        })
                    })
            }
            return _p.catch(errorCallback)
        } catch (e) {
            await errorCallback(e)
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
    async fn({pwd, size = 10}) {
        let {stdout} = child_process.spawn(`cd ${pwd} && git log -${size} --no-merges`, {shell: true})
        let d = ''
        stdout.on('data', m => {
            d += m.toString()
        })
        return new Promise(res => {
            let arr = []
            stdout.on('close', () => {
                d.split('commit')
                    .filter(item => Boolean(item.trim()))
                    .forEach(item => {
                        let data = {}
                        item.split(/\n/)
                            .forEach(it => {

                                let flag = [
                                    {
                                        reg: /^Author:/,
                                        key: 'commit_author'
                                    },
                                    {
                                        reg: /^Date:/,
                                        key: 'commit_date'
                                    },
                                    {
                                        reg: /(\d|[a-f]){40}/,
                                        key: 'commit',
                                        format: v => v.trim()
                                    }
                                ].some(({reg, key , format}) => {
                                    if (reg.test(it)) {
                                        data[key] = format ? format(it) : it.replace(reg, '').trim()
                                        return true
                                    }
                                })
                                if (!flag && Boolean(it)) {
                                    data['info'] = it.trim()
                                }
                            })
                        arr.push(data)
                    })
                res(arr)
            })
        })
    }
}

module.exports = {
    runDeploy: {
        method: 'post',
        async fn({res, req}) {

            let {id, projectId,  msg = ''} = req.body

            let _uuid = ''

            let loaded = true

            if (msg) {
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
                let context = JSON.parse(JSON.stringify({
                    deploy,
                    project,
                    user: res._user,
                    current_date: formatDate(),
                    msg,
                }))

                context.next_version = Number(context.project.current_version) + 1
                context.old_dir = context.project.deploy_dir + '/back/web_' + context.current_date
                context.updateProject = ({key , value}) => {
                    project[key] = value
                    projectStore.cacheData()
                }
                context.msg += `\n发布者: ${context.user.name}\n发布时间: ${context.current_date}\n发布版本: ${context.next_version}\n`
                await runStages.fn({stages: deploy.stages, id: _uuid, projectId, context})
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