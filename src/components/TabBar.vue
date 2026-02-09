<template>
  <footer class="tabbar">
    <!-- HOME -->
    <RouterLink to="/app/home" class="item" aria-label="Inicio">
      <img :src="isActive('/app/home') ? '/icons/homeactive.png' : '/icons/home.png'" />
    </RouterLink>

    <!-- CARTILLA -->
    <RouterLink to="/app/cartilla" class="item" aria-label="Cartilla">
      <img :src="isActive('/app/cartilla') ? '/icons/cartillaactive.png' : '/icons/cartilla.png'" />
    </RouterLink>

    <!-- AGENDAR (PLUS) -->
    <RouterLink to="/app/agendar" class="item plus" aria-label="Agendar">
      <img :src="isActive('/app/agendar') ? '/icons/+active.png' : '/icons/+.png'" />
    </RouterLink>

    <!-- CONTENIDO -->
    <RouterLink to="/app/contenido" class="item1" aria-label="Contenido">
      <img :src="isActive('/app/contenido') ? '/icons/contenidoactive.png' : '/icons/contenido.png'" />
    </RouterLink>

    <!-- PERFIL -->
    <RouterLink to="/app/perfil" class="item1"aria-label="Perfil">
      <img :src="isActive('/app/perfil') ? '/icons/perfilactive.png' : '/icons/perfil.png'" />
    </RouterLink>
  </footer>
</template>

<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()

// Marca activo por inicio de ruta (home cuenta como /app/home y /app/home/loquesea)
const isActive = (path) => route.path.startsWith(path)
</script>

<style scoped>
.tabbar {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: .6rem 10px calc(.6rem + env(safe-area-inset-bottom));
  background: #37B3B3;
  color: #fff;
  z-index: 40;
  box-shadow: 0 -6px 20px rgba(0,0,0,.10);
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
}

.tabbar .item img {
  width: 35px;
  height: 35px;
}

.tabbar .item.plus img {
  width: 42px;
  height: 42px;
}

.tabbar .item1 img { 
  width: 40px; 
  height: 40px; 
  object-fit: contain; 
  }

.tabbar .item.plus {
  padding: .25rem;
  border-radius: 50%;
  background: #85b6e0;
  box-shadow: 0 4px 10px rgba(0,0,0,.12);
}

@media (min-width: 900px){
  .tabbar { display: none; }
}
</style>
