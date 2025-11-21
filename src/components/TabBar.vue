<template>
    <footer class="tabbar">
      <RouterLink to="/app/home"      class="item" aria-label="Inicio">🏠</RouterLink>
      <RouterLink to="/app/cartilla"  class="item" aria-label="Cartilla">📒</RouterLink>
      <RouterLink to="/app/agendar"   class="item plus" aria-label="Agendar">＋</RouterLink>
      <RouterLink to="/app/contenido" class="item" aria-label="Contenido">🎬</RouterLink>
      <RouterLink to="/app/perfil"    class="item" aria-label="Perfil">👤</RouterLink>
    </footer>
  </template>
  
  <style scoped>
  .tabbar{
    position: fixed; left: 0; right: 0; bottom: 0;
    display: flex; justify-content: space-around; align-items: center;
    padding: .6rem 10px calc(.6rem + env(safe-area-inset-bottom));
    background: #37B3B3; color: #fff; z-index: 40;
    box-shadow: 0 -6px 20px rgba(0,0,0,.10);
    border-top-left-radius: 14px; border-top-right-radius: 14px;
  }
  
  .item{ font-size: 1.25rem; line-height: 1; text-decoration: none; color: #fff; }
  
  .plus{
    font-size: 1.6rem; background: #85b6e0; padding: .12rem .74rem; border-radius: 14px;
    box-shadow: 0 6px 14px rgba(0,0,0,.15);
  }
  
  /* activo */
  :deep(a.router-link-active){ filter: brightness(1.1); }
  
  /* ⛔️ oculto en pantallas ≥900px (desktop) */
  @media (min-width: 900px){
    .tabbar{ display: none; }
  }
  </style>
  