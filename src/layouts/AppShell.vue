<template>
    <div class="app-shell">
      <NuraHeader />
  
      <main>
        <RouterView />
      </main>
  
      <!-- Mobile only -->
      <TabBar />
  
      <!-- Desktop only -->
      
    </div>
  </template>
  
  <script setup lang="ts">
  import NuraHeader from '@/components/NuraHeader.vue'
  import TabBar from '@/components/TabBar.vue'
  import Footer from '@/components/Footer.vue'
  </script>
  
  <style scoped>
  /* Altura de header para calcular el espacio del contenido */
  :root, :host{ --hdr: 64px; --tabbar: 82px; }
  
  /* En mobile dejamos espacio para el TabBar.
     El header es sticky, por eso no restamos su altura aquí. */
  main{
    min-height: calc(100dvh - var(--hdr));
    padding-bottom: var(--tabbar);
  }
  
  /* En desktop no hay tabbar */
  @media (min-width: 900px){
    main{ padding-bottom: 0; }
  }
  </style>
  