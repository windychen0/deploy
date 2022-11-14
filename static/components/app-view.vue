<template>
  <div class="h-full flex">
    <el-menu
      :default-active="activeIndex"
      background-color="#545c64"
      text-color="#fff"
      active-text-color="#ffd04b"
      @select="handleSelect"
      class="w-10 h-full border-r border-gray-300 shadow-md"
    >
      <el-menu-item v-for="(v, k) in routeMap" :index="k" :key="k">{{
        v.text
      }}</el-menu-item>
    </el-menu>

    <keep-alive>
      <div class="main w-full flex flex-col">
        <div class="h-3 flex justify-end w-full px-2 items-center border-b border-gray-300 shadow-md">
            <div class="mr-0.5 flex items-center" >
                <el-avatar :size="35" :src="userInfo.img || defaultImg" />
            </div>
            <span>{{userInfo.name}}</span>
        </div>

        <component class="flex-1" :is="routeMap[activeIndex].component" />
      </div>
    </keep-alive>
  </div>
</template>

<script setup>
let defaultImg = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'
let activeIndex = Vue.ref("project");
let routeMap = {
  home: {
    component: "home-index",
    text: "主页",
  },
  project: {
    component: "project-index",
    text: "项目管理",
  },
  user: {
    component: "user-index",
    text: "用户管理",
  },
};
let userInfo = store.userInfo

const handleSelect = (k, kp) => {
  activeIndex.value = k;
};

return {
  handleSelect,
  activeIndex,
  routeMap,
  defaultImg,
  userInfo
};
</script>

<style></style>
