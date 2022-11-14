<template>
  <div class="flex h-full border">
    <div class="flex-1 h-full flex-wrap px-1.5 py-1 overflow-y-auto" >
      <div class="mt-2 w-full" v-for="(item , index) in (currentData.stages || [])" :key="item.shell" >
        <div class="flex mt-1 w-full" >
          <div class="w-5" >第{{index + 1}}步 :</div> <div class="flex-1" >{{item.name}}</div>
        </div>
        <div class="mt-1 w-full px-1.5 py-1 bg-gray-800 text-gray-400 rounded-sm leading-1" v-text="formatShell(item.shell)" ></div>
      </div>
    </div>
    <ul class="w-20 border-l border-gray-300 shadow-md h-full">
      <el-tooltip
          effect="dark"
          trigger="contextmenu"
          v-for="item in data.list" :key="item.id"
      >
        <template #content >
          <div>脚本名称：{{item.name}}</div>
          <div>最后编辑者：{{item.lastEditor}}</div>
        </template>

      <li @click="data.active = item.id" :class="['px-1.5 py-1 mt-1 hover:text-blue-500 text-gray-500 duration-300 rounded-sm cursor-pointer' , data.active === item.id && 'right-list-active']" >
        <div class="w-full overflow-ellipsis overflow-hidden whitespace-nowrap">{{item.name}}</div>
        <div class="w-full overflow-ellipsis overflow-hidden whitespace-nowrap" >{{item.lastEditor}}</div>
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
      url: '/api/project/getDeployShellsById',
      data: {
        id: store.currentProjectId
      }
    })
  } , { immediate: true })
})

let data = Vue.reactive({
  list: [],
  active: null,
})

subscribePublish.$on('setDeployShellList' , _data => {
  data.list = _data
  data.active = _data[0]?.id || null
})

return {
  name: "project-version",
  data: data,
  currentData: Vue.computed(() => data.active ? data.list.find(i => i.id === data.active) : {}),
  formatShell(code){
    return code
  }
}
</script>

<style scoped>

</style>