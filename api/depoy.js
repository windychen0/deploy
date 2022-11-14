const store = require('../utils/store')
const log = require('../utils/log')
const { getProjectById , ProjectVersion , addProjectVersion } = require('./project')
const Restful = require('../utils/restful')
const child_process = require('child_process')
const uuid = require('../utils/uuid')
const {runPromiseInsequence , formatDate} = require('../utils/utils')

const renderShell = {
    async fn({stages , context}){
        return stages.map(stage => {
            return {
                ...stage,
                shell: (stage.shell || '').replace(/\${[\w|\s]+}/g , $ => {
                    let fnStr = '' , res = '' ; context = context || {}
                    try{
                        fnStr = 'with(this){return ' + $.replace(/^[\s+]?\${/ , '')
                        res = new Function(fnStr).call(context)
                    }catch (e) {
                        log('渲染shell异常: ' + e.message + '   位置: api.deploy.renderShell')
                    }
                    log('渲染shell: \n' + JSON.stringify({fnStr , context , res}) )
                    return res
                })
            }
        })
    }
}

let taskShellLog = {}

const runStages = {
    async fn({stages , id , projectId , context}){
        let version = new ProjectVersion({id , version: context.next_version})
        taskShellLog[id] = {
            version,
            log: [],
            projectId,
            loaded: false
        }
        runPromiseInsequence(stages.map((item , index) => () => runStage.fn({stage: item , index , version , length: stages.length})))
    }
}

const runStage = {
    async fn({stage , index , version ,length}){
        let version_stage = {
            name: stage.name,
            state: 'pending',
            start: formatDate()
        }
        version.stages[index] = version_stage
        let task = taskShellLog[version.id]

        try{
            task.log.push({
                id: uuid(),
                msg: `第${index + 1}步: ${stage.name} - 开始\n`
            })
            console.log(stage.shell)
            let { stdout } = child_process.spawn(stage.shell , {shell: true})
            stdout.on('data' , m => {
                task.log.push({
                    id: uuid(),
                    msg: m.toString()
                })
            })

            return await new Promise(res => {
                stdout.on('close' , () => {
                    task.log.push({
                        id: uuid(),
                        msg: `第${index + 1}步: ${stage.name} - 结束\n\n\n`
                    })
                    version_stage.end = formatDate()
                    if(index === length - 1){
                        addProjectVersion.fn({version , state: 'ok' , projectId: task.projectId})
                        task.loaded = true
                    }
                    res(true)
                })
            })
                .catch(e => {
                    addProjectVersion.fn({version , state: 'error' , projectId: task.projectId})
                    throw e
                })
        }catch (e){
            await addProjectVersion.fn({version , state: 'error' , projectId: task.projectId})
            throw e
        }
    }
}

const getDeployByProjectId = {
    async fn({projectId , id}){
        let list = await store.get('project-deploy-' + projectId).get('list')
        let res = list.find(item => item.id === id)
        return res || null
    }
}

const getLastGitCommitInfo = {
    async fn({pwd , size = 1}){
        let {stdout} = child_process.spawn(`cd ${pwd} && git log -${size}` , {shell: true})
        let d = ''
        stdout.on('data' , m => {
            d += m.toString()
        })
        return new Promise(res => {
            stdout.on('close' , () => {
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
                    data.slice(1)
                )
            })
        })
    }
}

module.exports = {
    runDeploy: {
        method: 'post',
        async fn({res , req}){

            let { id , projectId, username = '', msg = '' } = req.body

            let _uuid = ''

            let loaded = true

            msg = (msg + '\n') || ''

            let hasTask = Object.values(taskShellLog).some(item => {
                if(item && (item.projectId === projectId)){
                    _uuid = item.id
                    loaded = item.loaded
                    return true
                }
            })

            // 如果没有任务或者是完成了任务
            if(!hasTask || loaded){
                _uuid = uuid()
                let deploy = await getDeployByProjectId.fn({ projectId , id })
                let project =  await getProjectById.fn({id: projectId})
                msg += ((await getLastGitCommitInfo.fn({pwd: project.store_pwd , size: 1}))[0] || '').trim()
                let context = JSON.parse(JSON.stringify({
                    ...deploy,
                    ...project,
                    current_user: username,
                    current_date: formatDate().replace(/\//g , '-').replace(/:/g,'-'),
                    msg,
                }))

                context.next_version = Number(context.current_version) + 1
                context.old_dir = context.deploy_dir + context.current_date.replace(/\//g , '-').replace(/:/g,'-') + '_' + context.current_version

                let stages = await renderShell.fn({stages: deploy.stages , context})

                runStages.fn({stages , id: _uuid , projectId , context})
            }

            return res.json(new Restful({data: {
                id: _uuid
            }}))
        }
    },
    getDeployProgress: {
        method: 'get',
        async fn({res , req}){
            const {id , messageId} = req.query

            let messageArr = taskShellLog[id]?.log || []
            let loaded = !!(taskShellLog[id]?.loaded)
            if(messageId){
                let idx = messageArr.findIndex(m => m.id === messageId)
                if(idx !== -1){
                    messageArr = messageArr.slice(idx + 1)
                }
            }
            return res.json(new Restful({
                data: {
                    emitKey: ['sendDeployProgress' + id],
                    data: {
                        ['sendDeployProgress' + id]: {
                            messageArr ,
                            loaded
                        },
                    }
                }
            }))
        }
    }
}