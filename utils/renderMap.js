const fs = require('fs')
const path = require('path')

let renderMap = {}

function loadFile(file){
    return new Promise(res => {
        fs.readFile(path.resolve(__dirname ,`./${file}`) , 'utf8' , (err , data) => {
            if(err) {
                renderMap[file] = false
                return res(`console.log("render${file}失败")`)
            }
            let d = data.toString()
            let index = d.indexOf('module.export')
            if(index !== -1){
                d = d.slice(0 , index)
            }
            renderMap[file] = d
            return res(d)
        })
    })
}

module.exports = new Proxy(renderMap , {
    async get( _ , k ){
        if(renderMap[k] === undefined){
            return loadFile(k)
        }
        return renderMap[k] || `console.log("render${k}失败")`
    },
    set(){

    }
})