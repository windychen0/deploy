const store = require('../utils/store')
const userStore = store.get('user')
const projectStore = store.get('project')
const md5 = require('../utils/md5')
const constMap = require('../utils/const')
const uuid = require("../utils/uuid");
const authStore = store.get('auth');

async function getUserProjectList(arr = [], keyArr = []) {
    let list = await projectStore.get('list', []);
    return list.map(item => {
        if (arr.includes(item.id)) {
            let rt = {};
            (keyArr && keyArr.length) ? keyArr.forEach(key => rt[key] = item[key]) : (rt = item)
            return rt
        }
        return null
    }).filter(Boolean)
}

const getToken = {
    async fn(user) {
        return uuid(user.name)
    }
}

module.exports = {
    login: {
        method: 'post',
        ignoreAuth: true,
        checks: {
            AllNotNull: {
                arg: ['name' , 'pwd'],
                req: ['body']
            },
        },
        async fn({res, req}) {

            let {name, pwd} = req.body

            if (!name || !pwd) {
                return res.restful = {
                    code: 401, data: {
                        emitKey: [constMap.EMIT_KEY.MESSAGE],
                        data: {
                            [constMap.EMIT_KEY.MESSAGE]: '请输入用户名和密码'
                        }
                    }
                }
            }

            let list = await userStore.get('list', [])
            let user = list.find(item => item.name === name.trim())

            if (!user || (md5(user.pwd) !== pwd)) {
                return res.restful = {
                    code: 401, data: {
                        emitKey: ['message'],
                        data: {
                            message: {
                                type: 'error',
                                message: '用户名与密码不匹配'
                            }
                        }
                    }
                }
            }
            const projectList = await getUserProjectList(user.project || [], ['id', 'name'])
            let userMap = await authStore.get('userMap' , {})
            let token = await getToken.fn(user)

            let _user = {
                ...user,
                pwd: undefined,
                token
            }

            userMap[token] = _user
            authStore.set('userMap' , userMap)
            res.restful = {
                data: {
                    emitKey: ['setVueStore', 'addComponentFromPermission'],
                    data: {
                        setVueStore: [
                            {
                                key: 'userInfo',
                                value: _user
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
            }
        }
    },
}