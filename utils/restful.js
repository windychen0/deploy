class Restful {
    constructor({ code = 200, data = {} , msg = '' }){
        this.code = code
        this.data = data
        this.msg = code === 200 ? 'success' : msg
    }
}

module.exports = Restful