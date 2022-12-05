const path = require('path')
const fs = require('fs')
const log = require('./log')

class Store {
    constructor(){
        // 单例
        if(Store._instance){
            return Store._instance
        }
        this._storage = {

        }
        Store._instance = this
        return Store._instance
    }

    get(moduleName = ''){
        return Store._instance._storage[moduleName] || (Store._instance._storage[moduleName] = new StoreModule(moduleName))
    }
}

class StoreModule {
    constructor(name = '' ){
        this._loaded = false
        this._data = {}
        this._task = null
        this._cacheSplitTime = 10 * 1000
        this._path = path.resolve(__dirname , `../cache/${name}.json`)
    }

    async get(key , initVar = {}){
        if(!this._loaded){
            await this.load()
        }
        return this._data[key] || initVar
    }

    async set(key , value){
        this._data[key] = value
        this.cacheData()
    }

    cacheData(){
        if(this._task === null){
            this._task = setTimeout( () => {
                fs.writeFile(this._path , JSON.stringify(this._data , null , 4) , {flag: 'w'} , err => {
                    log(`缓存文件${err ? '异常' : '成功'}: ${this._path} , 位置: StoreModule.cacheData`)
                    this._task = null
                })
            } , this._cacheSplitTime )
        }
    }

    async load(){
        await this.access(this._path)
        this._data = await this.read(this._path)
        this._loaded = true
    }

    access(_path){
        return new Promise((res , rej) => {
            fs.access(_path , fs.constants.W_OK , err => {
                if(err){
                    if(err.code === 'ENOENT'){
                      return res(`文件: ${_path} 不存在`)
                    }

                    return rej(`错误信息: ${err.msg} , 位置: StoreModule.access`)
                }
                res()
            })
        })
    }

    read(_path){
        return new Promise((res) => {
            fs.readFile(_path , 'utf8' , (err , data) => {
                log(`读取文件${err ? '异常' : '成功'}: ${_path} ${err} , 位置: StoreModule.read`)
                if(err && err.code === 'ENOENT') this.cacheData()
                return res(err ? {} : JSON.parse(data))
            })
        })
    }
}

module.exports = new Store()