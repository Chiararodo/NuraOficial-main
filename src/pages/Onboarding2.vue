<template>
  <main class="ob-page">
    <section class="ob-card">
      <!-- Título + subtítulo -->
      <h2>Mantenete al día</h2>
      <p class="subtitle">
        Ayudanos a recordar lo importante<br />
        ¿Qué te gustaría activar?
      </p>

      <!-- Switch de notificaciones -->
      <div class="switch-row">
        <span class="switch-label">Permitir notificaciones</span>

        <!-- accesible: input + label como interruptor -->
        <input
          id="notif"
          type="checkbox"
          v-model="notifEnabled"
          class="switch-input"
          @change="onToggleNotif"
        />
        <label for="notif" class="switch"></label>
      </div>

      <!-- Grupo de opciones -->
      <div class="options">
        <label class="option">
          <span class="opt-left">
            <span class="circle-icon">🕒</span>
            <span>Turno y meditación</span>
          </span>
          <input type="checkbox" v-model="opts.turno" class="check-input" />
          <span class="check"></span>
        </label>

        <label class="option">
          <span class="opt-left">
            <span class="circle-icon">🧘‍♀️</span>
            <span>Relajación y manejo del día</span>
          </span>
          <input type="checkbox" v-model="opts.relax" class="check-input" />
          <span class="check"></span>
        </label>

        <label class="option">
          <span class="opt-left">
            <span class="circle-icon">📅</span>
            <span>Agenda</span>
          </span>
          <input type="checkbox" v-model="opts.agenda" class="check-input" />
          <span class="check"></span>
        </label>
      </div>

      <!-- Acciones -->
      <div class="actions">
        <button class="btn btn-secondary" @click="skip">Ahora no</button>
        <button class="btn btn-primary" @click="goNext">Continuar</button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// interruptor de notificaciones
const notifEnabled = ref(false)

async function onToggleNotif() {
  // si lo activan, pedimos permiso del navegador
  if (notifEnabled.value && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        // si no conceden, apagamos el switch
        notifEnabled.value = false
      }
    } catch {
      notifEnabled.value = false
    }
  }
}

// opciones de recordatorios
const opts = ref({
  turno: true,
  relax: false,
  agenda: false,
})

function skip() {
  // omitir esta pantalla → ir a la 3
  router.push('/onboarding3')
}

function goNext() {
  // acá guardarías en Supabase si querés (opcional)
  // p.ej. user_metadata con preferencias
  router.push('/onboarding3')
}
</script>

<style scoped>
/* ===== Fondo igual al splash ===== */
.ob-page {
  min-height: 100dvh;
  background: url('/bgs/splash.png') center/cover no-repeat;
  display: flex;
  justify-content: center;
  align-items: start;
  padding: 48px 16px 32px;
}

/* ===== Card central ===== */
.ob-card {
  width: 100%;
  max-width: 540px;
  background: #ffffff;
  border-radius: 60px;
  padding: 28px 20px 34px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.2);
  text-align: center;
}

/* Título / subtítulo en paleta Nura */
h2 {
  color: #50bdbd;
  font-weight: 800;
  letter-spacing: 0.3px;
  font-size: 1.9rem;
  margin: 8px 0 6px;
}
.subtitle {
  color: #2c2c2c;
  opacity: 0.9;
  margin-bottom: 18px;
  line-height: 1.5;
}

/* ===== Switch de notificaciones ===== */
.switch-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  background: #dbeff1; /* celeste muy claro como en mockup */
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  margin-bottom: 18px;
}

.switch-label {
  text-align: left;
  font-weight: 700;
}

/* input escondido, label es el interruptor */
.switch-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch {
  width: 82px;
  height: 40px;
  border-radius: 999px;
  background: #85b6e0;
  display: inline-block;
  position: relative;
  transition: 0.25s ease;
}
.switch::after {
  content: '';
  position: absolute;
  top: 6px;
  left: 6px;
  width: 28px;
  height: 28px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: 0.25s ease;
}
.switch-input:checked + .switch {
  background: #50bdbd;
}
.switch-input:checked + .switch::after {
  transform: translateX(42px);
}

/* ===== Caja de opciones ===== */
.options {
  background: #dbeff1;
  border-radius: 18px;
  padding: 16px 12px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 22px;
}

.option {
  background: #66b8bc; /* tira hacia #50bdbd pero un poco más fría para contraste */
  border-radius: 16px;
  padding: 12px 14px;
  color: #fff;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px;
}

/* izquierda: icono redondo + texto */
.opt-left {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}
.circle-icon {
  width: 36px;
  height: 36px;
  display: inline-grid;
  place-items: center;
  background: #dff5f5;
  color: #50bdbd;
  border-radius: 50%;
  font-size: 18px;
}

/* checkbox custom a la derecha */
.check-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.check {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 2px solid #e6f2f7;
  background: #ffffff20;
  display: inline-block;
  box-shadow: inset 0 0 0 3px transparent;
  transition: 0.2s ease;
}
.option:has(.check-input:checked) .check {
  background: #ffffff;
  box-shadow: inset 0 0 0 3px #50bdbd;
}

/* ===== Botones ===== */
.actions {
  display: grid;
  gap: 12px;
  justify-items: center;
}
.btn {
  width: 70%;
  border: none;
  border-radius: 16px;
  padding: 0.9rem 1.2rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.25);
  transition: 0.25s ease;
}
.btn-primary {
  background: #85b6e0;
  color: #fff;
}
.btn-primary:hover {
  background: #50bdbd;
}
.btn-secondary {
  background: #a7c1df;
  color: #fff;
}
.btn-secondary:hover {
  filter: brightness(0.96);
}

/* Responsive pequeño */
@media (min-width: 900px) {
  .ob-card {
    padding: 32px 26px 38px;
  }
}
</style>
