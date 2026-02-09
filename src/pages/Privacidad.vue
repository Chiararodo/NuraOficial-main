<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  router.back()
}
</script>

<template>
  <main class="page">
    <header class="top">
      <button class="back-link" type="button" @click="goBack">
        <span class="arrow">←</span>
      </button>
      <h1 class="title">Privacidad y Términos</h1>
    </header>

    <section class="card">
      <p class="intro">
        Acá podés ver de forma clara cómo Nura cuida tu información y cuáles son
        las reglas de uso de la app.
      </p>

      <article class="block">
        <h2 class="subtitle">Tus datos y tu privacidad</h2>
        <ul class="list">
          <li>Tus datos se usan solo para brindarte el servicio de Nura.</li>
          <li>
            La información de salud y bienestar se trata como confidencial.
          </li>
          <li>
            Podés solicitar en cualquier momento la eliminación de tu cuenta.
          </li>
        </ul>
      </article>

      <article class="block">
        <h2 class="subtitle">Uso responsable de Nura</h2>
        <ul class="list">
          <li>
            Nura acompaña tu bienestar, pero no reemplaza una urgencia médica.
          </li>
          <li>
            Ante una situación de riesgo inmediato, contactá a los servicios de
            emergencia de tu zona.
          </li>
          <li>
            Los contenidos y materiales son informativos y de apoyo emocional.
          </li>
        </ul>
      </article>

      <article class="block">
        <h2 class="subtitle">Tus derechos</h2>
        <ul class="list">
          <li>Podés actualizar tus datos desde la sección de Perfil.</li>
          <li>Podés configurar notificaciones y preferencias desde la app.</li>
          <li>
            Si tenés dudas, podés escribirnos desde la sección de asistencia.
          </li>
        </ul>
      </article>

      <p class="foot">
        Esta sección es un resumen amigable. En una versión productiva podrías
        enlazar al texto legal completo de términos y condiciones.
      </p>
    </section>
  </main>
</template>

<style scoped>
.page {
  padding: 18px 16px 32px;
  background: #f5fbfd;
  min-height: calc(100dvh - 64px);
  display: flex;
  flex-direction: column;
  align-items: center;
}


/* Header */
.sub-header {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 1100px;
  margin: 0 auto 14px;
}
.sub-header h1 {
  margin: 0;
  font-size: 1.4rem;
  color: #46bdbd;
  font-weight: 700;
}
.back-link {
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 0;
}
.arrow {
  font-size: 1.5rem;
  color: #46bdbd;
}

.top {
  width: 100%;
  max-width: 720px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

.back-btn {
  border: none;
  background: #50bdbd;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.2);
}

.card {
  width: 100%;
  max-width: 720px;
  background: #ffffff;
  border-radius: 20px;
  padding: 18px 18px 22px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.09);
  border: 1px solid #e2edf7;
}

.intro {
  margin: 0 0 14px;
  color: #4b5563;
  font-size: 0.96rem;
}

.block {
  margin-bottom: 14px;
}

.subtitle {
  margin: 0 0 6px;
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
}

.list {
  margin: 0;
  padding-left: 18px;
  color: #4b5563;
  font-size: 0.93rem;
}

.list li {
  margin-bottom: 4px;
}

.foot {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: #94a3b8;
}
</style>
