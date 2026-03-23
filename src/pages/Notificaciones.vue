<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationSettings } from '@/composables/useNotificationSettings'

const router = useRouter()
const title = 'Notificaciones'

const gate = useNotificationSettings()

const bienestar = computed({
  get: () => gate.settings.value.bienestar,
  set: (v: boolean) => (gate.settings.value.bienestar = v)
})

const profesional = computed({
  get: () => gate.settings.value.profesional,
  set: (v: boolean) => (gate.settings.value.profesional = v)
})

const appUpdates = computed({
  get: () => gate.settings.value.app_updates,
  set: (v: boolean) => (gate.settings.value.app_updates = v)
})

onMounted(async () => {
  gate.loadFromLocal()
  await gate.loadFromSupabase()
})

watch(
  () => [
    gate.settings.value.bienestar,
    gate.settings.value.profesional,
    gate.settings.value.app_updates
  ],
  async () => {
    await gate.upsertToSupabase()
  }
)

function goBack() {
  router.back()
}
</script>

<template>
  <h1 class="visually-hidden">Notificaciones</h1>

  <main class="page">
    <header class="top">
      <button class="back-link" type="button" @click="goBack" aria-label="Volver">
        <span class="arrow">←</span>
      </button>

      <div class="top-text">
        <p class="kicker">Preferencias</p>
        <h2 class="title">{{ title }}</h2>
      </div>
    </header>

    <section class="card" aria-labelledby="notifications-title">
      <h2 id="notifications-title" class="section-title">Configuración de avisos</h2>

      <p class="intro">
        Acá vas a ver y configurar tus avisos del sistema y de tu profesional.
      </p>

      <div class="list">
        <article class="item">
          <div class="item-copy">
            <h3 class="item-title">Recordatorios de bienestar</h3>
            <p class="item-sub">
              Ejercicios, chequeos emocionales y tips para tu día a día.
            </p>
          </div>

          <label class="switch" aria-label="Activar recordatorios de bienestar">
            <input v-model="bienestar" type="checkbox" />
            <span class="slider" />
          </label>
        </article>

        <article class="item">
          <div class="item-copy">
            <h3 class="item-title">Novedades de tu profesional</h3>
            <p class="item-sub">
              Material nuevo, cambios de turno y mensajes importantes.
            </p>
          </div>

          <label class="switch" aria-label="Activar novedades de tu profesional">
            <input v-model="profesional" type="checkbox" />
            <span class="slider" />
          </label>
        </article>

        <article class="item">
          <div class="item-copy">
            <h3 class="item-title">Actualizaciones de Nura</h3>
            <p class="item-sub">
              Avisos de seguridad, nuevas funciones y mejoras de la app.
            </p>
          </div>

          <label class="switch" aria-label="Activar actualizaciones de Nura">
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
  padding: 20px 18px 48px;
  background: #ffffff;
  min-height: calc(100dvh - 64px);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.top {
  width: 100%;
  max-width: 760px;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.top-text {
  display: grid;
  gap: 2px;
}

.kicker {
  margin: 0;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 800;
}

.title {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 800;
  color: #50bdbd;
}

.back-link {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 999px;
  background: #e8fbf8;
  color: #50bdbd;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    transform 0.18s ease,
    box-shadow 0.2s ease;
}

@media (hover: hover) {
  .back-link:hover {
    background: #d8f6f1;
    transform: translateY(-1px);
    box-shadow: 0 8px 16px rgba(80, 189, 189, 0.14);
  }
}

.arrow {
  font-size: 1.35rem;
  line-height: 1;
}

.card {
  width: 100%;
  max-width: 760px;
  background: #ffffff;
  border-radius: 18px;
  padding: 20px 20px 18px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  border: 1px solid #e2edf7;
  box-sizing: border-box;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    background-color 0.22s ease,
    border-color 0.22s ease;
}

@media (hover: hover) {
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
    background: #ffffff;
  }
}

.section-title {
  margin: 0 0 8px;
  font-size: 1.15rem;
  font-weight: 800;
  color: #50bdbd;
}

.intro {
  margin: 0 0 14px;
  color: #4b5563;
  font-size: 0.96rem;
  line-height: 1.45;
}

.list {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 14px 14px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e8eef5;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

@media (hover: hover) {
  .item:hover {
    background: #eefafa;
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(80, 189, 189, 0.12);
    border-color: #d7f1ef;
  }
}

.item-copy {
  min-width: 0;
}

.item-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.item-sub {
  margin: 4px 0 0;
  font-size: 0.88rem;
  color: #6b7280;
  line-height: 1.4;
}

.switch {
  position: relative;
  width: 48px;
  height: 28px;
  flex: 0 0 auto;
  display: inline-block;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  inset: 0;
  cursor: pointer;
  background-color: #e5e7eb;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
  border-radius: 999px;
}

.slider::before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 4px;
  top: 4px;
  background-color: white;
  transition: transform 0.2s ease;
  border-radius: 50%;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.25);
}

.switch input:checked + .slider {
  background-color: #50bdbd;
  box-shadow: 0 0 0 3px rgba(80, 189, 189, 0.14);
}

.switch input:checked + .slider::before {
  transform: translateX(20px);
}

.hint {
  margin: 8px 0 0;
  font-size: 0.88rem;
  color: #6b7280;
  line-height: 1.4;
}

.visually-hidden {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

@media (max-width: 680px) {
  .page {
    padding: 16px 12px 96px;
  }

  .title {
    font-size: 1.35rem;
  }

  .card {
    padding: 16px 14px;
    border-radius: 16px;
  }

  .item {
    padding: 12px 12px;
    align-items: flex-start;
  }

  .item-title {
    font-size: 0.96rem;
  }

  .item-sub {
    font-size: 0.84rem;
  }
}
</style>