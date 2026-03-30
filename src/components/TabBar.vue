<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const isActive = (path) => route.path.startsWith(path)
</script>

<template>
  <footer class="tabbar">
    <RouterLink to="/app/home" class="item" aria-label="Inicio">
      <img :src="isActive('/app/home') ? '/icons/homeactive.png' : '/icons/home.png'" alt="" />
    </RouterLink>

    <RouterLink to="/app/cartilla" class="item" aria-label="Cartilla">
      <img :src="isActive('/app/cartilla') ? '/icons/cartillaactive.png' : '/icons/cartilla.png'" alt="" />
    </RouterLink>

    <RouterLink to="/app/agendar" class="item plus" aria-label="Agendar">
      <img :src="isActive('/app/agendar') ? '/icons/+active.png' : '/icons/+.png'" alt="" />
    </RouterLink>

    <RouterLink to="/app/contenido" class="item" aria-label="Contenido">
      <img :src="isActive('/app/contenido') ? '/icons/contenidoactive.png' : '/icons/contenido.png'" alt="" />
    </RouterLink>

    <RouterLink to="/app/perfil" class="item" aria-label="Perfil">
      <img :src="isActive('/app/perfil') ? '/icons/perfilactive.png' : '/icons/perfil.png'" alt="" />
    </RouterLink>
  </footer>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 8px;
  padding: 0.6rem 10px calc(0.6rem + env(safe-area-inset-bottom));
  background: #37b3b3;
  color: #fff;
  z-index: 40;
  box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.1);
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
}

.item {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.item img {
  width: 35px;
  height: 35px;
  object-fit: contain;
  display: block;
}

.item.plus {
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  border-radius: 999px;
  background: #85b6e0;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}

.item.plus img {
  width: 35px;
  height: 35px;
  object-fit: contain;
  display: block;
}

@media (min-width: 900px) {
  .tabbar {
    display: none;
  }
}
</style>