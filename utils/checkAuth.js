const store = require('../utils/store')
const constMap = require("./const");
const authStore = store.get('auth');

module.exports = {
    async fn(token){
        let rtData = {
            code: 401,
            data: {
                emitKey: [constMap.EMIT_KEY.MESSAGE , constMap.EMIT_KEY.SET_VUE_STORE],
                data: {
                    [constMap.EMIT_KEY.MESSAGE]: '请重新登录',
                    [constMap.EMIT_KEY.SET_VUE_STORE]: [
                        {
                            key: 'userInfo',
                            value: {}
                        }
                    ]
                }
            }
        }

        if(!token){
            return rtData
        }

        let map = await authStore.get('userMap' , {})
        if(!map[token]){
            return rtData
        }

        return map[token]
    }
}