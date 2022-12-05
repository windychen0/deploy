
changeRem()

const _socket = null;

let vueStore;

try{
    let info = JSON.parse(localStorage.getItem('vueStore'))
    if(!info){
        throw new Error()
    }
    vueStore = Vue.reactive(info)
}catch (e) {
    Vue.reactive({
        userInfo: {},
        projectList: [],
        currentProjectId: '',
        currentDeployId: ''
    })
}

Vue.watch(vueStore , () => {
    localStorage.setItem('vueStore' , JSON.stringify(vueStore))
})

let routeMap = {
    '/login': {
        path: '/login',
        component:{
            name: 'login',
            setup(){
                let username = Vue.ref('')
                let pwd = Vue.ref('')
                let loginHandle = () => {
                    if(!username.value || !pwd.value) return;
                    ajax({
                        url: '/api/user/login',
                        data: {
                            name: username.value,
                            pwd: md5(pwd.value)
                        },
                        method: 'post'
                    }).then(() => {
                        changeHash({path: '/app-view'})
                    })
                }
                return {
                    username,
                    pwd,
                    loginHandle
                }
            },
            template: `<div id='login' class="h-full flex justify-center" style="background: rgb(70 ,68 ,67);">
                    <div class="px-3 py-5 w-32 flex flex-col" >
                        <div class="logo flex justify-center"><img src="/image/logo.png" class="w-10" /></div>
                        <el-input class="w-full mt-3" v-model="username" placeholder="用户名" />
                        <el-input class="w-full mt-1" v-model="pwd" placeholder="密码" type="password" />
                        <el-button class="w-full mt-1.5" type="primary" @click="loginHandle">登录</el-button>
                    </div>
            </div>`
        }
    }
}

let permissionList = ['login' , 'app-view']

let routeMapProxy = new Proxy(routeMap , {
    get(map , k){
        if(!map[k]){
            let name = k.replace('/' , '')
            // if(!permissionList.includes(name)) return {name: 'page-not-found'}

            return {
                name
            }
        }
        return map[k]
    }
})

const vm = Vue.createApp({
    setup(){

        subscribePublish.$emit('addComponentFromPermission' , ['app-vue' , 'project-index' , 'project-version' , 'project-deploy'] )

        Vue.provide('vueStore' , vueStore)

        let path = Vue.ref(formatHash(location.hash).path)
        if(path.value !== '/login' && !vueStore.userInfo.token){
            location.hash = '#/login'
        }

        window.addEventListener('hashchange' , () => {
            path.value = formatHash(location.hash).path
            if(path.value !== '/login' && !vueStore.userInfo.token){
                path.value = '/login'
            }
        })

        return {
            view: Vue.computed(() => routeMapProxy[path.value])
        }
    },
    template: `
        <component :is="view.component || view.name" />
    `
})
.use(ElementPlus)

Object.keys(observeMap).forEach(k => subscribePublish.$on(k , observeMap[k]))

vm.component('page-not-found' , {
    name: 'page-not-found',
    setup(){
        return {
            goBack(){
                console.log('goBack')
            }
        }
    },
    template: `<div class="w-full h-full flex ">
        <div>页面丢失或无访问权限</div>
        <el-button @click="goBack" >返回</el-button>
    </div>`
})

vm.mount('#app')
