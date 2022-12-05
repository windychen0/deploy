const __utils = {
    nullArr: [null , undefined , ''],
    runPromiseInSequence: (array, value) => array.reduce((promiseChain, currentFunction)=>promiseChain.then(currentFunction), Promise.resolve(value)),
    formatDate(date = new Date()){
        return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}-${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    },
    checks: {
        async AllNotNull(keys = [] , target = {}){
            return keys.some(key => __utils.nullArr.includes(target[key]))
        }
    }
}

module.exports = __utils