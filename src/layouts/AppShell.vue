<script setup lang="ts">
import NuraHeader from '@/components/NuraHeader.vue'
import TabBar from '@/components/TabBar.vue'
</script>

<template>
  <div class="app-shell">
    <NuraHeader />

    <main class="app-main">
      <RouterView />
    </main>

    <!-- Mobile only -->
    <TabBar class="tabbar-only-mobile" />
  </div>
</template>


<style scoped>
.app-main {
  min-height: calc(100dvh - 64px);
  padding-bottom: 82px;
}

@media (min-width: 900px) {
  .app-main {
    padding-bottom: 0;
  }
  .tabbar-only-mobile {
    display: none;
  }
}
</style>