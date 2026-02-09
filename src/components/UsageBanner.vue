<script setup lang="ts">
defineProps<{
  text: string
  show: boolean
  variant?: 'info' | 'warning'
}>()
</script>

<template>
  <div v-if="show" class="banner" :class="variant === 'warning' ? 'warn' : 'info'">
    <span class="dot" aria-hidden="true"></span>
    <p class="msg">{{ text }}</p>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 14px;
  padding: 10px 12px;
  border: 1px solid #e2edf7;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
}
.banner.info {
  background: #f0fbfa;
}
.banner.warn {
  background: #fff7ed;
  border-color: #fed7aa;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #50bdbd;
  box-shadow: 0 0 0 2px #c8f5ef;
}
.msg {
  margin: 0;
  color: #334155;
  font-weight: 750;
  font-size: 0.95rem;
}
</style>
