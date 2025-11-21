<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const title = 'Notificaciones'

// estado simple guardado en localStorage (solo front)
const bienestar = ref(true)
const profesional = ref(true)
const appUpdates = ref(true)

onMounted(() => {
  try {
    const saved = JSON.parse(
      localStorage.getItem('nura_notifications') ?? '{}',
    )
    if (typeof saved.bienestar === 'boolean') bienestar.value = saved.bienestar
    if (typeof saved.profesional === 'boolean')
      profesional.value = saved.profesional
    if (typeof saved.appUpdates === 'boolean')
      appUpdates.value = saved.appUpdates
  } catch {
    // ignore
  }
})

watch([bienestar, profesional, appUpdates], () => {
  const payload = {
    bienestar: bienestar.value,
    profesional: profesional.value,
    appUpdates: appUpdates.value,
  }
  localStorage.setItem('nura_notifications', JSON.stringify(payload))
})

function goBack() {
  router.back()
}
</script>

<template>
  <main class="page">
    <header class="top">
      <button class="back-btn" type="button" @click="goBack">
        ←
      </button>
      <h1 class="title">{{ title }}</h1>
    </header>

    <section class="card">
      <p class="intro">
        Acá vas a ver y configurar tus avisos del sistema y de tu profesional.
      </p>

      <div class="list">
        <!-- Bienestar -->
        <article class="item">
          <div>
            <h2 class="item-title">Recordatorios de bienestar</h2>
            <p class="item-sub">
              Ejercicios, chequeos emocionales y tips para tu día a día.
            </p>
          </div>
          <label class="switch">
            <input v-model="bienestar" type="checkbox" />
            <span class="slider" />
          </label>
        </article>

        <!-- Profesional -->
        <article class="item">
          <div>
            <h2 class="item-title">Novedades de tu profesional</h2>
            <p class="item-sub">
              Material nuevo, cambios de turno y mensajes importantes.
            </p>
          </div>
          <label class="switch">
            <input v-model="profesional" type="checkbox" />
            <span class="slider" />
          </label>
        </article>

        <!-- Sistema -->
        <article class="item">
          <div>
            <h2 class="item-title">Actualizaciones de Nura</h2>
            <p class="item-sub">
              Avisos de seguridad, nuevas funciones y mejoras de la app.
            </p>
          </div>
          <label class="switch">
            <input v-model="appUpdates" type="checkbox" />
            <span class="slider" />
          </label>
        </article>
      </div>

      <p class="hint">
        Podés cambiar estas opciones cuando quieras desde tu perfil.
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
  font-size: 1.6rem;
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
  padding: 18px 18px 20px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.09);
  border: 1px solid #e2edf7;
}

.intro {
  margin: 0 0 14px;
  color: #4b5563;
  font-size: 0.96rem;
}

.list {
  display: grid;
  gap: 10px;
  margin-bottom: 10px;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 14px;
  background: #f8fafc;
}

.item-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
  color: #0f172a;
}

.item-sub {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: #6b7280;
}

/* Switch */
.switch {
  position: relative;
  width: 46px;
  height: 26px;
  display: inline-block;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #e5e7eb;
  transition: 0.2s;
  border-radius: 999px;
}

.slider::before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 4px;
  top: 4px;
  background-color: white;
  transition: 0.2s;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.4);
}

.switch input:checked + .slider {
  background-color: #50bdbd;
}

.switch input:checked + .slider::before {
  transform: translateX(18px);
}

.hint {
  margin: 8px 0 0;
  font-size: 0.85rem;
  color: #6b7280;
}
</style>
