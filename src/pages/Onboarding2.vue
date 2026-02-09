<template>
  <h1 class="visually-hidden">Onboarding 2 · Recordatorios</h1>

  <main class="ob-page">
    <section class="ob-card">
      <h2>Elegí tus recordatorios</h2>

      <p class="subtitle">
        Podemos ayudarte a no olvidarte de lo importante.<br />
        ¿Sobre qué te gustaría que Nura te avise?
      </p>

      <!-- Switch de notificaciones -->
      <div class="switch-row">
        <div class="switch-text">
          <span class="switch-label">Recibir notificaciones de Nura</span>
          <p class="switch-caption">
            Serán recordatorios suaves, sin spam. Podés cambiarlos cuando quieras.
          </p>
        </div>

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
            <span>Turnos y meditaciones</span>
          </span>
          <input type="checkbox" v-model="opts.turno" class="check-input" />
          <span class="check"></span>
        </label>

        <label class="option">
          <span class="opt-left">
            <span class="circle-icon">🧘‍♀️</span>
            <span>Pausas de respiración y bienestar diario</span>
          </span>
          <input type="checkbox" v-model="opts.relax" class="check-input" />
          <span class="check"></span>
        </label>

        <label class="option">
          <span class="opt-left">
            <span class="circle-icon">📅</span>
            <span>Agenda y cosas importantes del día</span>
          </span>
          <input type="checkbox" v-model="opts.agenda" class="check-input" />
          <span class="check"></span>
        </label>
      </div>

      <!-- Acciones -->
      <div class="actions">
        <button class="btn btn-secondary" @click="skip">
          Configurarlo más tarde
        </button>
        <button class="btn btn-primary" @click="goNext">
          Continuar
        </button>
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
  // si lo activa, pide permiso del navegador
  if (notifEnabled.value && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        // si no concede, apaga el switch
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
  agenda: false
})

function skip() {
  router.push('/onboarding3')
}

function goNext() {
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
  background: #dbeff1;
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  margin-bottom: 18px;
}

.switch-text {
  text-align: left;
}
.switch-label {
  display: block;
  font-weight: 700;
  margin-bottom: 4px;
}
.switch-caption {
  font-size: 0.85rem;
  color: #425159;
  margin: 0;
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
  background: #50bdbd7a;
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
   background: #50bdbd;
  font-size:1.1rem ;
  font-weight: 530;
  color: #fff;
  border-radius: 999px;
  padding: 10px 14px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
}

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
  background: #ffffffff;
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

.check:hover{
  background: #9be2e2ff;
  box-shadow: inset 0 0 0 3px #50bdbd;
}

/* ===== Botones ===== */
.actions {
  display: grid;
  gap: 12px;
  justify-items: center;
}

.btn {
  width: 74%;
  border: none;
  border-radius: 999px;
  padding: 0.75rem 1rem;
  background: #50bdbd;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.98rem;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(80, 189, 189, 0.35);
  transition: background 0.15s ease, transform 0.08s ease,
    box-shadow 0.15s ease;
}

.btn:hover{
  background: #3ea9a9;
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.4);
}
.btn-primary {
  background: #50bdbd;
  color: #fff;
}
.btn-primary:hover {
  background: #3ea9a9;
}
.btn-secondary {
  background: #48b1b1ad;
  color: #fff;
}
.btn-secondary:hover {
  filter: brightness(0.96);
  background: #50bdbd;
}

/* Responsive pequeño */
@media (min-width: 900px) {
  .ob-card {
    padding: 32px 26px 38px;
  }
}
</style>
