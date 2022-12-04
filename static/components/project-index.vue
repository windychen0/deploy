<template>
  <div class="relative">
    <el-tabs
        type="border-card"
        v-model="activeName"
        class="demo-tabs h-full flex flex-col">
      <el-tab-pane v-for="item in tabs" :key="item.name" :label="item.label" :name="item.name">
        <component :is="`project-${item.name}`"></component>
      </el-tab-pane>
    </el-tabs>

    <div class="absolute right-2 flex" style="top: 4px;" >
      <el-button v-show="activeName === 'deploy'" @click="toDeploy" type="primary" class="w-5"  size="mini">发布</el-button>
      <el-select v-model="store.currentProjectId" class="ml-1" placeholder="请选择项目">
        <el-option
            v-for="item in projectList"
            :key="item.id"
            :label="item.name"
            :value="item.id"
        />
      </el-select>
    </div>

    <el-dialog v-model="deployDialog.show" title="版本发布">
        <div class="w-full">

          <span>钉钉消息</span><el-input class="w-full" v-model="deployDialog.msg"></el-input>

          <ul class="mt-1 w-full px-1.5 py-1 bg-gray-800 text-gray-400" v-if="deployDialog.msgArr.length" style="max-height: 400px;overflow-y: auto">
            <div class="w-full mt-1" v-for="m in deployDialog.msgArr" :key="m.id">{{m.msg}}</div>
          </ul>

          <div class="w-full flex mt-1">
            <el-button @click="deployDialog.show = false">关闭</el-button>
            <el-button @click="toSend" type="primary" :disable="deployDialog.disabled" >发送</el-button>
          </div>
        </div>
    </el-dialog>
  </div>
</template>

<script setup>
let {
  currentProjectId,
  projectList
} = store

let activeName = Vue.ref('version')
let tabs = [
  {
    name: 'version',
    label: '版本详情'
  },
  {
    name: 'git',
    label: 'gitLog'
  },
  {
    name: 'deploy',
    label: '发布脚本',
  },
  {
    name: 'variate',
    label: '变量管理'
  }
]

let deployDialog = Vue.reactive({
  show: false,
  msgArr: [],
  msg: '',
  disabled: false
})

let timer = null

Vue.watch(() => deployDialog.show , () => {
  if(!deployDialog.show){
    deployDialog.msgArr = []
    deployDialog.msg = ''
  }
})

return {
  tabs,
  activeName,
  currentProjectId,
  projectList,
  toDeploy(){
    deployDialog.show = true
  },
  toSend(){
    ajax({
      url: '/api/deploy/runDeploy',
      method: "post",
      data: {
        id: store.currentDeployId,
        projectId: store.currentProjectId,
        msg: deployDialog.msg
      }
    })
        .then(({id})=> {
          timer = setInterval(() => {
            ajax({
              url:'/api/deploy/getDeployProgress',
              method: 'get',
              data:{
                id,
                messageId: deployDialog.msgArr.length ? deployDialog.msgArr[deployDialog.msgArr.length - 1].id : undefined
              }
            }).then(d => {
              let t = d.data['sendDeployProgress' + id]
              console.log({t, d, id})
              if(t){
                deployDialog.msgArr = [ ...deployDialog.msgArr , ...t.messageArr]
                if(t.loaded){
                  clearInterval(timer)
                  timer = null
                }
              }
            })
          } , 1000)

        })
  },
  deployDialog,
  store
}
</script>

<style>

</style>