let resources = [
    {
        name: 'index',
        type: 'css',
        path: 'css/',
        version: 1,
        id: 1
    },
    {
        name: 'elementPlus',
        type: 'css',
        path: 'lib/',
        version: 1,
        id: 2,
    },
    {
        name: 'tailwind',
        type: 'css',
        path: 'css/',
        version: 1,
        id: 3,
    },
    {
        name: 'jquery',
        type: 'js',
        path: 'lib/',
        version: 1,
        id: 4,
    },
    {
        name: 'socket.io',
        type: 'js',
        path: 'lib/',
        version: 1,
        id: 5,
    },
    {
        name: 'elementPlus',
        type: 'js',
        path: 'lib/',
        version: 1,
        id: 7
    },
    {
        name: 'vue',
        type: 'js',
        path: 'lib/',
        version: 1,
        id: 6,
    },
    {
        name: 'subscribePublish',
        type: 'js',
        path: 'render/',
        version: 1,
        id: 8
    },
    {
        name: 'md5',
        type: 'js',
        path: 'render/',
        version: 1,
        id: 9
    },
    {
        name: 'uuid',
        type: 'js',
        path: 'render/',
        version: 1,
        id: 10
    },
    {
        name: 'utils',
        type: 'js',
        path: 'js/',
        version: 1,
        id: 11
    },
    {
        name: 'observeMap',
        type: 'js',
        path: 'js/',
        version: 1,
        id: 12
    },
    {
        name: 'main',
        type: 'js',
        path: 'js/',
        version: 1,
        id: 13
    }
]

class IndexStore {
    request = null
    indexDB = window.indexedDB || window.webkitindexedDB
    name = 'store'
    version = 1
    objectStore = {
        name: 'static',
        keyPath: 'id'
    }

    constructor(config = {}) {
        Object.keys(config).forEach(k => this[k] = config[k])
        if (IndexStore.instance) {
            return this
        }
        this.getInstance()
    }

    async getInstance() {
        if (IndexStore.instance) return IndexStore.instance
        this.request = this.indexDB.open(this.name, this.version)
        return IndexStore.instance = new Promise((resolve, reject) => {
            this.request.onerror = () => {
                reject({type: 'error'})
            }

            this.request.onsuccess = (e) => {
                IndexStore.instance = e.target.result
                resolve(e.target.result)
            }

            this.request.onupgradeneeded = (e) => {
                if (!e.target.result.objectStoreNames.contains(this.objectStore.name)) {
                    e.target.result.createObjectStore(this.objectStore.name, {keyPath: this.objectStore.keyPath})
                }
                resolve(e.target.result)
            }
        })
    }

    async transaction(writeable = true) {
        let instance = await this.getInstance()
        return await instance.transaction([this.objectStore.name], writeable ? 'readwrite' : 'readonly').objectStore(this.objectStore.name)
    }

    // 关掉数据库
    async close() {
        let instance = await this.getInstance()
        await instance.close()
        IndexStore.instance = null
        return {type: 'success'}
    }

    rowMixin(row) {
        return {
            id: getIndexStoreId(),
            version: 1,
            resource: '',
            name: '',
            ...row
        }
    }

    async add(rows) {
        let transaction = await this.transaction()
        rows = [rows].flat(2)
        return Promise.all(rows.map(row => {
            return new Promise((res, rej) => {
                let result = transaction.add(this.rowMixin(row))
                result.onerror = rej
                result.onsuccess = res
            })
        }))
    }

    async readAll() {
        let transaction = await this.transaction(false)
        let res = []
        return new Promise((resolve, reject) => {
            transaction.openCursor().onsuccess = (e) => {
                let cursor = e.target.result;
                if (cursor) {
                    res.push(cursor.value)
                    cursor.continue()
                } else {
                    resolve(res)
                }
            }
            transaction.openCursor().onerror = reject
        })
    }

    async readRowByKey(select = []) {
        select = [select].flat(2)
        let transaction = await this.transaction(false)
        return Promise.all(select.map(({key = 'name', value = ''}) => {
            return new Promise((resolve) => {
                let res
                if (key === 'id') {
                    res = transaction.get(value)
                } else {
                    res = transaction.index(key).get(value)
                }
                res.onsuccess = function (v) {
                    resolve(v?.target?.result)
                }
                res.onerror = () => resolve(null)
            })
        }))
    }

    async put(rows) {
        rows = [rows].flat(2)
        let readRes = await this.readRowByKey(rows.map(row => ({key: 'id', value: row.id})))
        let transaction = await this.transaction()
        return Promise.all(readRes.map((row, index) => {
            return new Promise((resolve, reject) => {
                let res = transaction[row ? 'put' : 'add'](row ? this.rowMixin(row) : rows[index])
                res.onerror = reject
                res.onsuccess = resolve
            })
        }))
    }
}

IndexStore.instance = null
IndexStore.nextId = localStorage.getItem('IndexStoreId') || 1
let getIndexStoreId = () => IndexStore.nextId = (IndexStore.nextId - 0) + 1
let indexStore = new IndexStore()
let resourceMap = {
    'js': {
        tag: 'script',
        src: 'src'
    },
    'css': {
        tag: 'style',
        remoteTag: 'link',
        src: 'href',
        'setAttributes': {
            rel: 'stylesheet'
        }
    }
};
let getResourceTagItem = (resource, isRemote = false) => {
    let _map = resourceMap[resource.type]
    let tagItem = document.createElement(isRemote ? (_map.remoteTag || _map.tag) : _map.tag)
    Object.keys((_map.setAttributes || {})).forEach(k => tagItem.setAttribute(k, _map.setAttributes[k]))
    return {
        tagItem,
        _map
    }
}


Promise.all(resources.map(resource => {
    let url = `./${resource.path}${resource.name}.${resource.type}`
    return indexStore.readRowByKey({key: 'id', value: resource.id})
        .then(res => {
            if (!res || (res[0]?.version !== resource.version)) {
                return fetch(url)
                    .then(r => r.text())
                    .then(resourceText => {
                        resource.resource = resourceText
                        indexStore.put(resource)
                        return resourceText
                    })
            }
            return res[0]?.resource || ''
        })
        .then((html = '') => {
            return new Promise((resolve, reject) => {
                let {tagItem} = getResourceTagItem(resource)

                tagItem.onload = () => {
                    resolve()
                }
                tagItem.onerror = () => {
                    reject()
                }
                tagItem.innerHTML = html
                document.head.appendChild(tagItem)
            })
        })
        .catch(e => {
            console.log(e, 'last 2th e ----------------')
            return new Promise((resolve, reject) => {
                let {tagItem, _map} = getResourceTagItem(resource, true)
                tagItem.setAttribute(_map.src, `./${resource.path}${resource.name}.${resource.type}`)
                document.head.appendChild(tagItem)
                tagItem.onload = (e) => resolve({resourceText: tagItem.innerHTML, tagItem, e})
                tagItem.onerror = reject
            })
        })
}))
    .then(async () => {
        await window.main()
    })
    .catch(e => {
        console.log(e, 'last e ----------------')
    })