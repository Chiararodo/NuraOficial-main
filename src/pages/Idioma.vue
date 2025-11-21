<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const showModal = ref(true)
// idioma “real” de la app (fijo por ahora)
const lang = 'es-AR'

function goBack() {
  router.back()
}

function closeModal() {
  showModal.value = false
}
</script>

<template>
  <main class="page">
    <header class="top">
      <button class="back-btn" type="button" @click="goBack">
        ←
      </button>
      <h1 class="title">Idioma</h1>
    </header>

    <section class="card">
      <p class="intro">
        Por el momento Nura está disponible únicamente en castellano. En futuras
        versiones vamos a ir sumando otros idiomas.
      </p>

      <p class="current">
        Idioma actual: <strong>Español (Argentina)</strong>
      </p>

      <div class="options">
        <div class="option disabled">
          <div class="dot active" />
          <div class="option-body">
            <span class="option-title">Español (Argentina)</span>
            <span class="option-sub">Idioma actual de la aplicación.</span>
          </div>
        </div>

        <div class="option disabled">
          <div class="dot" />
          <div class="option-body">
            <span class="option-title">Otros idiomas</span>
            <span class="option-sub">
              Próximamente vamos a habilitar más opciones.
            </span>
          </div>
        </div>
      </div>

      <p class="hint">
        Cuando la app esté disponible en otros idiomas, vas a poder elegirlos
        desde esta misma sección.
      </p>
    </section>

    <!-- MODAL: cambio de idioma no disponible -->
    <div v-if="showModal" class="modal-backdrop">
      <div class="modal-card">
        <h2 class="modal-title">Cambio de idioma no disponible</h2>
        <p class="modal-text">
          Por el momento, Nura solo está habilitada en castellano. Estamos
          trabajando para sumar más idiomas próximamente.
        </p>

        <button class="modal-btn" type="button" @click="closeModal">
          Entendido
        </button>
      </div>
    </div>
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
  margin: 0 0 10px;
  color: #4b5563;
  font-size: 0.96rem;
}

.current {
  margin: 0 0 14px;
  font-size: 0.93rem;
  color: #111827;
}

.options {
  display: grid;
  gap: 8px;
  margin-bottom: 10px;
}

.option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 14px;
  background: #f8fafc;
}

.option.disabled {
  opacity: 0.8;
}

.dot {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid #cbd5e1;
  margin-top: 4px;
}

.dot.active {
  border-color: #50bdbd;
  background: #50bdbd;
}

.option-body {
  display: flex;
  flex-direction: column;
}

.option-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
}

.option-sub {
  font-size: 0.84rem;
  color: #6b7280;
}

.hint {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: #94a3b8;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 40;
}

.modal-card {
  max-width: 420px;
  width: 100%;
  background: #ffffff;
  border-radius: 18px;
  padding: 20px 18px 16px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.35);
  border: 1px solid #e2edf7;
  text-align: center;
}

.modal-title {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.modal-text {
  margin: 0 0 16px;
  font-size: 0.95rem;
  color: #475569;
}

.modal-btn {
  border: none;
  border-radius: 14px;
  padding: 0.6rem 1.4rem;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  color: #ffffff;
  background: #50bdbd;
  box-shadow: 0 10px 22px rgba(80, 189, 189, 0.45);
  width: 100%;
}
</style>
