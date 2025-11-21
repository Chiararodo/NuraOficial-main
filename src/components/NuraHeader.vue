<template>
    <header class="nura-header">
      <!-- Logo -->
      <RouterLink to="/app/home" class="logo-link">
        <img src="/logos/OFICIALwhite.png" alt="Nura" class="logo" />
      </RouterLink>
  
      <!-- Nav (solo desktop) -->
      <nav class="topnav desktop-only">
        <RouterLink to="/app/home">Inicio</RouterLink>
        <RouterLink to="/app/cartilla">Cartilla</RouterLink>
        <RouterLink to="/app/agendar">Agendar</RouterLink>
        <RouterLink to="/app/contenido">Contenido</RouterLink>
        <RouterLink to="/app/perfil">Perfil</RouterLink>
      </nav>
  
      <!-- Acciones -->
      <div class="header-actions">
        <RouterLink to="/app/notificaciones" class="icon-btn" title="Notificaciones">
          <img src="/icons/notif.png" alt="Notificaciones" />
        </RouterLink>
  
        <RouterLink to="/app/chatbot" class="icon-btn" title="Chatbot">
          <img src="/icons/chat.png" alt="Chatbot" />
        </RouterLink>
  
        <!-- Botón instalar solo en desktop -->
        <div class="desktop-only">
          <InstallButton />
        </div>
      </div>
    </header>
  </template>
  
  <script setup lang="ts">
  import { RouterLink } from 'vue-router'
  import InstallButton from './InstallButton.vue'
  </script>
  
  <style scoped>
  .nura-header{
    position: sticky; top: 0; z-index: 50;
    background: #46bdbd; color: #fff;
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 24px;
    box-shadow: 0 3px 12px rgba(0,0,0,.08);
    min-height: 64px;
  }
  
  .logo-link{ display:flex; align-items:center; }
  .logo{ height: 38px; width: auto; }
  
/* Nav desktop */
.topnav{ 
  display:flex; 
  gap:26px; 
  font-weight:500; 
}

.topnav a{ 
  color:#fff; 
  text-decoration:none; 
  font-size:1rem; 
}

.topnav a:hover{ 
  text-decoration:underline; 
}

/* Estado activo */
.topnav a.router-link-active,
.topnav a.router-link-exact-active {
  color:#633266;
  text-decoration:none;
}

  
  /* Acciones (logo + iconos siempre visibles) */
  .header-actions{
    display:flex; align-items:center; gap:16px;
  }
  
  /* Botones de íconos */
  .icon-btn{
    display:flex; align-items:center; justify-content:center;
    background:transparent; border:none; padding:6px; cursor:pointer;
    transition: transform .2s ease;
  }
  .icon-btn:hover{ transform: scale(1.1); }
  .icon-btn img{ width:26px; height:26px; filter: brightness(0) invert(1); }
  </style>
  