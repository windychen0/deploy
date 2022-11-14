class Storage {
    constructor(moduleName = '') {
        if(Storage[moduleName]) return Storage[moduleName];
        this._moduleName = moduleName;
        this._instance = JSON.parse(localStorage.getItem(moduleName) || '{}')
        this.__save = null
        return Storage[moduleName] = this
    }

    get(k){
        return this._instance[k]
    }

    set(k , v){
        this.save()
        return this._instance[k] = v
    }

    save(){
        if(!this.__save){
            this.__save = setTimeout(() => {
                localStorage.setItem(this._moduleName , JSON.stringify(this._instance , null , 4))
                this.__save = null
            } , 10 * 1000)
        }
    }
}