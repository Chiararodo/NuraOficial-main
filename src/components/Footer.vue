<template>
  <footer class="site-footer">
    <p>© {{ new Date().getFullYear() }} Nura — Todos los derechos reservados</p>
  </footer>
</template>

<style scoped>
.site-footer {
  width: 100%;
  padding: 14px 16px;
  color: #ffffff;
  text-align: center;
  background: rgba(80, 189, 189, 0.96);
  box-shadow: 0 -6px 18px rgba(0, 0, 0, 0.05);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  margin-top: auto;
  box-sizing: border-box;
}

.site-footer p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .site-footer {
    padding: 12px 14px;
  }

  .site-footer p {
    font-size: 0.85rem;
  }
}
</style>