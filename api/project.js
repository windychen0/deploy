const store = require('../utils/store')
const projectStore = store.get('project')
const uuid = require('../utils/uuid')
const { formatDate } = require('../utils/utils')

const getProjectById = {
    async fn({id}){
        let list = await projectStore.get('list')
        return Array.isArray(id) ? list.filter(item => id.includes(item.id)) : (list.find(item => item.id === id) || null)
    }
}

const addProjectVersion = {
    async fn({version , state , projectId}){
        let _store = store.get('project-'+ projectId)
        let list = JSON.parse(JSON.stringify(await _store.get('versionList' , [])))
        let current_version = list[0]
        if(current_version){
            current_version.finish = formatDate()
        }
        list.unshift(version)

        _store.set('versionList' , list)

        let projectList = await store.get('project').get('list')
        store.get('project').cacheData()
        let _p = projectList.find(item => item.id === projectId)
        _p && (_p.current_version = version.version)
        version.state = state || 'ok'
    }
}

class ProjectVersion{
    constructor(config = {}) {
        let defaultConfig = {
            "id": uuid(),
            "msg": "",
            "version": 1,
            "start": "2022/11/12-23:07",
            // "finish": "2022/11/12-23:12",
            // "end": "2022/11/12-23:59",
            "state": "pending",
            // "deployer": "chenleqiang",
            "stages": [],
            "gitLastCommit": "706751f1d653b33e01c0ad2"
        }
        let res = {
            ...defaultConfig,
            ...config
        }
        Object.keys(res).forEach(k => this[k] = res[k])
        return this
    }
}

module.exports = {
    addProjectVersion,
    ProjectVersion,
    getProjectById,
    getVersionListById: {
        method: 'get',
        async fn({res, req}) {
            const {id} = req.query
            if (!id) {
                return res.restful = {
                    code: 400,
                    msg: '异常请求,没有id'
                }
            }
            let list = await store.get(`project-${id}`).get('versionList', [])
            return res.restful = {
                data: {
                    emitKey: ['setProjectVersionList'],
                    data: {
                        setProjectVersionList: list
                    }
                }
            }
        }
    },
    getDeployShellsById: {
        method: 'get',
        async fn({res , req}){
            const {id} = req.query
            if (!id) {
                return res.restful = {
                    code: 400,
                    msg: '异常请求,没有id'
                }
            }
            let list = await store.get(`project-deploy-${id}`).get('list', [])
            res.restful = {
                data: {
                    emitKey: ['setDeployShellList'],
                    data: {
                        setDeployShellList: list
                    }
                }
            }
        }
    },
}