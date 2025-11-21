<template>
  <footer class="site-footer">
    <p>© {{ new Date().getFullYear() }} Nura — Todos los derechos reservados</p>
  </footer>
</template>

<style scoped>
.site-footer {
  display: none; /* oculto en mobile */
  padding: 18px 16px;
  color: #ffffff;
  text-align: center;
  background: #50bdbd;
  box-shadow: 0 -6px 18px rgba(0,0,0,.05);
  border-top: 1px solid #eef2f7;
  margin-top: auto;
}

@media (min-width: 900px) {
  .site-footer { display: block; }
}
</style>
