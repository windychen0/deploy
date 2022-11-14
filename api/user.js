const store = require('../utils/store')
const Restful = require('../utils/restful')
const userStore = store.get('user')
const projectStore = store.get('project')
const md5 = require('../utils/md5')

async function getUserProjectList(arr = [] , keyArr = []){
    let list = await projectStore.get('list' , []);
    return list.map(item => {
        if(arr.includes(item.id)){
            let rt = {};
            (keyArr && keyArr.length) ? keyArr.forEach(key => rt[key] = item[key]) : (rt = item)
            return rt
        }
        return null
    }).filter(Boolean)
}

module.exports = {
    getToken: {
        method: 'post',
        async fn({res , req}){
            let {name , pwd } = req.body

            if(!name || !pwd){
                return res.json(new Restful({code: 401 , data: {
                    emitKey: ['message'],
                    data: {
                        message: '请输入用户名和密码'
                    }
                }}))
            }

            let list = await userStore.get('list' , [])
            let user = list.find(item => item.name === name.trim())

            if(!user || (md5(user.pwd) !== pwd)){
                return res.json(new Restful({code: 401 , data: {
                    emitKey: ['message'],
                    data: {
                        message: '用户名与密码不一致，请重新输入'
                    }
                }}))
            }
            const projectList = await getUserProjectList(user.project || [] , ['id' , 'name'])
            return res.json(new Restful({
                data: {
                    emitKey: ['setVueStore' , 'addComponentFromPermission'],
                    data: {
                        setVueStore: [
                            {
                                key: 'userInfo',
                                value: {
                                    ...user,
                                    pwd: undefined,
                                    token: '9527888'
                                }
                            },
                            {
                                key: 'projectList',
                                value: projectList
                            },
                            {
                                key: 'currentProjectId',
                                value: projectList[0]?.id || ''
                            }
                        ],
                        addComponentFromPermission: [
                            'app-view',
                            'project-index',
                            'project-version',
                            'user-index',
                            'home-index'
                        ]
                    }
                }
            }))
        }
    }
}