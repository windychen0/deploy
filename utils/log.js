const fs = require('fs')
const path = require('path')
module.exports = function log(msg = ''){
    let date = new Date()
    msg = typeof msg === 'string' ? msg : JSON.stringify(msg)
    fs.writeFile(path.resolve(__dirname , `./cache/log.log`) , `----------------${date.getFullYear()}.${date.getMonth() + 1}.${date.getDay()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}----------------\n\n${msg}\n\n\n` , {flag: 'a'}, () => {})
}