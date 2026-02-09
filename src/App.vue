<script setup lang="ts">
import { watch } from 'vue'
import Footer from '@/components/Footer.vue'
import { useAuthStore } from '@/store/auth'
import { useNotificationsStore } from '@/store/notifications'

const auth = useAuthStore()
const notif = useNotificationsStore()

watch(
  () => auth.user,
  (u) => {
    if (u) {
      notif.initRealtime()
      notif.refreshTodayCount()
    } else {
      // opcional: limpiar cuando se desloguea
      notif.refreshTodayCount()
    }
  },
  { immediate: true }
)
</script>



<template>
<h1 class="visually-hidden"> App
</h1>
  <div id="app" class="app-wrapper min-h-screen bg-nura-bg text-nura-text">
    <div class="app-content">
      <RouterView />
    </div>
    <!-- Footer para desktop -->
    <Footer />
  </div>
</template>


<style>
:root {
  --nura-green: #50bdbd;
  --nura-blue: #85b6e0;
  --nura-purple: #633266;
  --nura-bg: #f5f5f5;
  --nura-text: #000000;
}


.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
}

/* Fuente global */
body {
  font-family: 'Poppins', 'Segoe UI', sans-serif;
  margin: 0;
  background-color: var(--nura-bg);
  color: var(--nura-text);
}

/* Estilos utilitarios */
h1, h2, h3, h4, h5 {
  color: var(--nura-green);
}

button {
  background-color: var(--nura-purple);
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
  transition: 0.2s;
}

button:hover {
  background-color: var(--nura-blue);
}
</style>
