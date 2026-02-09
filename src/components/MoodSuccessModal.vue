<script setup lang="ts">
import { computed } from 'vue'

type Mood = 'triste' | 'normal' | 'bien' | 'muybien'

const props = defineProps<{
  open: boolean
  mood: Mood
  date: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'writeDiary'): void
}>()

const moodLabelMap: Record<Mood, string> = {
  triste: 'Triste',
  normal: 'Normal',
  bien: 'Bien',
  muybien: 'Muy bien'
}

const moodImgMap: Record<Mood, string> = {
  triste: '/icons/nuri-triste.png',
  normal: '/icons/nuri-normal.png',
  bien: '/icons/nuri-bien.png',
  muybien: '/icons/nuri-muybien.png'
}

const moodLabel = computed(() => moodLabelMap[props.mood] ?? '—')
const nuriPath = computed(
  () => moodImgMap[props.mood] ?? '/icons/NuriBienvenida.png'
)
</script>

<template>
  <div v-if="open" class="mood-modal-backdrop" @click.self="emit('close')">
    <div class="mood-modal-card">
      <button class="mood-modal-close" type="button" @click="emit('close')">
        ×
      </button>

      <img :src="nuriPath" alt="Nuri" class="mood-nuri" />

      <h2 class="mood-title">¡Estado registrado!</h2>
      <p class="mood-subtitle">
        Hoy te sentiste: <strong>{{ moodLabel }}</strong>
      </p>

      <p v-if="date" class="mood-date">
        Fecha: {{ date }}
      </p>

      <div class="mood-actions">
        <button type="button" class="mood-foro-btn" @click="emit('writeDiary')">
          Escribí cómo te sentís
        </button>
      </div>
    </div>
  </div>
</template>

<<style scoped>
.mood-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 10px;
}

/* Mobile-first: hasta 599px */
.mood-modal-card {
  position: relative;
  text-align: center;
  background: #ffffff;
  padding: 22px 18px 26px;
  width: 100%;
  max-width: 90vw;        /* clave para que se adapte en iPhone */
  border-radius: 20px;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.25);
  animation: moodFadeIn 0.2s ease-out;
}

.mood-modal-close { width: 34px; height: 34px; border-radius: 50%; background: #f0f4f8; border: none; font-size: 1.1rem; font-weight: 500; line-height: 1; display: flex; align-items: center; justify-content: center; color: #000000ff; cursor: pointer; transition: all 0.15s ease; } .mood-modal-close:hover { background: #e2e8f0; transform: scale(1.05); }

.mood-nuri {
  width: 120px;
  margin: 24px auto 6px;
}

.mood-title {
  font-size: 1.1rem;
  color: #14a3a3;
  margin: 8px 0 4px;
}

.mood-subtitle {
  color: #444;
  font-size: 0.9rem;
  margin: 0;
}

.mood-date {
  margin-top: 4px;
  font-size: 0.8rem;
  color: #6b7280;
}

.mood-actions {
  margin-top: 18px;
  display: flex;
  justify-content: center;
}

.mood-foro-btn {
  border: none;
  background: #50bdbd;
  color: #ffffff;
  border-radius: 999px;
  padding: 0.55rem 1.5rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 24px rgba(80, 189, 189, 0.35);
  transition: transform 0.12s ease, box-shadow 0.12s ease,
    background-color 0.12s ease;
}

.mood-foro-btn:hover {
  transform: translateY(-1px);
  background: #46aead;
  box-shadow: 0 12px 26px rgba(80, 189, 189, 0.4);
}

.mood-foro-btn:active {
  transform: translateY(0);
  box-shadow: 0 6px 16px rgba(80, 189, 189, 0.28);
}

@keyframes moodFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ≥ 600px: teléfonos grandes / mini-tablet */
@media (min-width: 600px) {
  .mood-modal-card {
    max-width: 420px;
    padding: 28px 22px 32px;
  }

  .mood-nuri {
    width: 150px;
  }

  .mood-title {
    font-size: 1.3rem;
  }

  .mood-subtitle {
    font-size: 0.95rem;
  }
}

/* ≥ 768px: tablet y desktop */
@media (min-width: 768px) {
  .mood-modal-backdrop {
    padding: 16px;
  }

  .mood-modal-card {
    max-width: 440px;
    padding: 32px 26px 38px;
  }

  .mood-nuri {
    width: 170px;
  }

  .mood-title {
    font-size: 1.4rem;
  }

  .mood-subtitle {
    font-size: 1.05rem;
  }

  .mood-date {
    font-size: 0.85rem;
  }
}
</style>
