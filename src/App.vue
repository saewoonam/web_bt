<template>
<div id="dynamic-component-demo">
      <button
        v-for="tab in tabs"
        v-bind:key="tab"
        v-bind:class="['tab-button', { active: currentTab === tab }]"
        v-on:click="currentTab = tab"
      >
        {{ tab }}
      </button>

      <keep-alive>
        <component v-bind:is="currentTabComponent" class="tab"></component>
      </keep-alive>
    </div>
</template>

<script>
      import tabTracking from "./components/ETTracking";
      import tabProcessing from "./components/ETProcessing"
      import tabManagement from "./components/ETManagement";

      export default {
        name: "NISTET",
        components: {tabTracking, tabProcessing, tabManagement},
        data: function() {
          return {
          currentTab: "Tracking",
          tabs: ["Tracking", "Processing", "Management"]
          };
        },
        computed: {
          currentTabComponent: function() {
            return "tab-" + this.currentTab.toLowerCase();
          }
        },
        created() {
        }
        
      };
</script>

<style>
.tab-button {
  padding: 6px 10px;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
  border: 1px solid #ccc;
  cursor: pointer;
  background: #f0f0f0;
  margin-bottom: -1px;
  margin-right: -1px;
}
.tab-button:hover {
  background: #e0e0e0;
}
.tab-button.active {
  background: #e0e0e0;
}
.tab {
  border: 1px solid #ccc;
  padding: 10px;
}
.posts-tab {
  display: flex;
}
.posts-sidebar {
  max-width: 40vw;
  margin: 0;
  padding: 0 10px 0 0;
  list-style-type: none;
  border-right: 1px solid #ccc;
}
.posts-sidebar li {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  cursor: pointer;
}
.posts-sidebar li:hover {
  background: #eee;
}
.posts-sidebar li.selected {
  background: lightblue;
}
.selected-post-container {
  padding-left: 10px;
}
.selected-post > :first-child {
  margin-top: 0;
  padding-top: 0;
}

.round-button {
    display: inline-block;
    border-radius: 50%;
    color: #000000;
    box-shadow: 0 0 4px gray;
}

.round-button:hover {
    background: #777555;
    box-shadow: 0 0 4px gray;
}

.round-button:active {
  transform: translateY(2px);
  box-shadow: 0 0 2px gray;
}

</style>
