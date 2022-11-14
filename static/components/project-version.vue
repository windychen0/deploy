<template>
  <div class="flex h-full border">
    <div class="flex-1 h-full flex-wrap px-1.5 py-1" >
      <div class="mt-1 w-full flex" v-for="obj in data.keyArr" :key="obj.key" >
        <div class="w-20" >{{obj.label}} :</div> <div class="flex-1" >{{obj.format ? obj.format(currentData[obj.key]) : currentData[obj.key]}}</div>
      </div>
    </div>
    <ul class="w-20 border-l border-gray-300 shadow-md h-full overflow-y-auto">
      <el-tooltip
          effect="dark"
          trigger="contextmenu"
          v-for="item in data.versionList" :key="item.id"
      >
        <template #content >
          <div>发布信息：{{item.msg}}</div>
          <div>发布时间：{{item.start}}</div>
          <div>持续到：{{item.end || "现在"}}</div>
        </template>

      <li @click="data.active = item.id" :class="['px-1.5 py-1 mt-1 hover:text-blue-500 text-gray-500 duration-300 rounded-sm cursor-pointer' , data.active === item.id && 'right-list-active']" >
        <div class="w-full overflow-ellipsis overflow-hidden whitespace-nowrap">{{item.msg}}</div>
        <div class="w-full overflow-ellipsis overflow-hidden whitespace-nowrap" >{{item.start}}-{{item.end || '现在'}}</div>
      </li>
      </el-tooltip>
    </ul>
  </div>
</template>

<script setup >

let projectList = store.projectList;

Vue.onMounted(() => {
  Vue.watch(store.currentProjectId , () => {
    ajax({
      url: '/api/project/getVersionListById',
      data: {
        id: store.currentProjectId
      }
    })
  } , { immediate: true })
})

let data = Vue.reactive({
  versionList: [],
  active: null,
  keyArr: [
    {
      key: 'msg',
      label: '发布信息'
    },
    {
      key: 'start',
      label: '打包开始时间'
    },
    {
      key: 'finish',
      label: '打包完成时间(发布时间)'
    },
    {
      key: 'end',
      label: '持续到',
      format(v){
        return v||'现在'
      }
    },
    {
      key: 'state',
      label: '状态',
      format(v) {
        return v === 'ok' ? '正常' : '异常';
      }
    },
    {
      key: 'deployer',
      label: '发布者'
    }
  ]
})

subscribePublish.$on('setProjectVersionList' , _data => {
  data.versionList = _data
  data.active = _data[0]?.id || null
})

return {
  name: "project-version",
  data: data,
  currentData: Vue.computed(() => data.active ? data.versionList.find(i => i.id === data.active) : {})
}
</script>

<style scoped>

</style>