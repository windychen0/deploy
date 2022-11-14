const observeMap = {
    setVueStore(data = {key: '' , value: ''}){
        if(data instanceof Array){
            return data.forEach(({key , value}) => {
                vueStore[key] = value
            })
        }
        return vueStore[data.key] = data.value
    },
    addComponentFromPermission(nameArr = []){
        // TODO 卧槽我想不通啊  这里为什么要显示声明加载主页才能进
        vm.component('app-view' , Vue.defineAsyncComponent(resolve => getComponent('app-view').then(resolve)))
        nameArr.forEach(name => {
            vm.component(name , Vue.defineAsyncComponent(resolve => getComponent(name).then(resolve)))
        })
    },
}