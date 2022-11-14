const __utils = {
    runPromiseInsequence: (array, value) => array.reduce((promiseChain, currentFunction)=>promiseChain.then(currentFunction), Promise.resolve(value)),
    formatDate(date = new Date()){
        return `${date.getFullYear()}/${date.getMonth()+1}/${date.getDay()}-${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
    }
}

module.exports = __utils