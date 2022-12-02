function changeRem() {
    document.querySelector('html').style.fontSize = screen.width / 24 + 'px'
}

function ajax(config = {
    prefix: 'api',
    moduleName: '',
    fn: '',
    method: 'get',
    data: {},
    ignore: false
}) {
    config.method = config.method || 'get';
    let isGet = config.method === 'get';
    config.data = config.data || {};
    if (config.url) {
        let _url = config.url.split('/').filter(Boolean)
        config.prefix = _url[0]
        config.moduleName = _url[1]
        config.fn = _url[2]
    }

    let token = localStorage.getItem('deploy-token')
    let emitKey = config.data.mid || `${config.prefix}-${config.moduleName}-${config.fn}`
    let url = `/${config.prefix}/${config.moduleName}/${config.fn}`

    if (_socket) {
        _socket.$emit(config.prefix, {...config.data, token})
        return new Promise(resolve => {
            subscribePublish.$on(config.data.mid, resolve)
        })
    }

    if (isGet) {
        let d = Object.keys(config.data)
        if(d.length){
            url += '?'
            d.forEach(k => {
                url += `${k}=${config.data[k]}&`
            })
            url = url.slice(0 , -1)
        }
    }

    return fetch(url, {
        body: isGet ? undefined : JSON.stringify({
            ...config.data,
            token
        }),
        method: config.method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': (vueStore.userInfo && vueStore.userInfo.token) || ''
        }
    })
        .then(r => r.json())
        .then(res => {
            resolveAjaxData(res, emitKey)
            if (res.code !== 200) {
                if(res.code){
                    config.ignore = true
                }
                let e = new Error('请求异常')
                e.data = res.data
                throw e
            }
            return res.data
        })
        .catch(e => {
            !config.ignore && ElementPlus.ElMessage.error(e.message || JSON.stringify(e, null, 4))
            throw e
        })
}

function resolveAjaxData(res, emitKey) {
    console.log('------------------resolveAjaxData---------------------------')
    console.log({res, emitKey})
    let r = res.data
    return r.emitKey instanceof Array ? r.emitKey.map(key => subscribePublish.$emit(key, r.data[key])) : subscribePublish.$emit(r.emitKey || emitKey, r.data)
}

function getComponent(componentName) {
    return fetch(`/components/${componentName}.vue`)
        .then(r => r.text())
        .then(res => {
            let rt = {}
            let arr = Array.from($(res))
            arr.forEach(tag => {
                if (!rt.template && tag.tagName && tag.tagName.toLocaleLowerCase() === 'template') {
                    rt.template = $(tag).html()
                }
                if (!rt.setup && tag.tagName && tag.tagName.toLocaleLowerCase() === 'script') {
                    rt.setup = new Function('let store = Vue.inject(\'vueStore\')\n' + $(tag).html())
                }
            })

            return rt
        })
}

function changeHash(route) {
    if (!route) {
        route = formatHash(location.hash)
    }
    location.hash = formatToHash(route)
}

function formatHash(hash = '') {
    let path = hash.replace('#', '')
    let query = {}

    if (hash.includes('?')) {
        let arr = hash.split('?').filter(Boolean)
        path = arr[0].replace(/\/?#\//, '')
        arr[1].split('&').forEach(item => {
            if (Boolean(item)) {
                let t = item.split('=').filter(Boolean)
                query[t[0]] = t[1]
            }
        })
    }
    return {
        path,
        query
    }
}

function formatToHash({path = '', query = {}}) {
    let hash = `#${path}`
    let querys = Object.keys(query)
    if (querys.length) {
        hash += '?'
        querys.forEach(k => {
            hash += `${k}=${query[k]}`
        })
    }
    return hash
}