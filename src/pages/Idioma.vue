<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

type NuraLocale = 'es-AR' | 'en'

const router = useRouter()
const { locale, t } = useI18n()

const currentLocale = computed(() => locale.value as NuraLocale)

function goBack() {
  router.back()
}

function applyLanguage(next: NuraLocale) {
  locale.value = next
  localStorage.setItem('nura_locale', next)
  document.documentElement.lang = next
}

function setLanguage(next: NuraLocale) {
  if (currentLocale.value === next) return
  applyLanguage(next)
}

/**
 * Blindaje:
 * si el locale cambia por cualquier otra razón (otra pantalla, init async, etc),
 * igual mantenemos localStorage + lang sincronizados.
 */
watch(
  () => locale.value,
  (next) => {
    const safe = (next === 'es-AR' || next === 'en') ? next : 'es-AR'
    localStorage.setItem('nura_locale', safe)
    document.documentElement.lang = safe
  },
  { immediate: true }
)
</script>

<template>
  <h1 class="visually-hidden">{{ t('language.title') }}</h1>

  <main class="page">
    <header class="top">
      <button class="back-link" type="button" @click="goBack" aria-label="Volver">
        <span class="arrow">←</span>
      </button>
      <h1 class="title">{{ t('language.title') }}</h1>
    </header>

    <section class="card">
      <p class="intro">
        {{ t('language.intro') }}
      </p>

      <p class="current">
        {{ t('language.current') }}
        <strong>
          {{ currentLocale === 'en' ? 'English' : 'Español (Argentina)' }}
        </strong>
      </p>

      <div class="options">
        <!-- Español -->
        <button
          class="option"
          type="button"
          :class="{ active: currentLocale === 'es-AR' }"
          @click="setLanguage('es-AR')"
        >
          <span class="dot" :class="{ active: currentLocale === 'es-AR' }" />
          <span class="option-body">
            <span class="option-title">Español (Argentina)</span>
            <span class="option-sub">{{ t('language.esSub') }}</span>
          </span>
        </button>

        <!-- English -->
        <button
          class="option"
          type="button"
          :class="{ active: currentLocale === 'en' }"
          @click="setLanguage('en')"
        >
          <span class="dot" :class="{ active: currentLocale === 'en' }" />
          <span class="option-body">
            <span class="option-title">English</span>
            <span class="option-sub">{{ t('language.enSub') }}</span>
          </span>
        </button>
      </div>

      <p class="hint">
        {{ t('language.hint') }}
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
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

.back-link {
  border: none;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.arrow {
  font-size: 1.5rem;
  color: #46bdbd;
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
  gap: 10px;
  margin-bottom: 10px;
}

.option {
  width: 100%;
  border: none;
  background: #f8fafc;
  border-radius: 14px;
  padding: 12px 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background-color 0.12s ease;
}

.option:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
}

.option.active {
  background: #eefcfc;
  box-shadow: 0 10px 22px rgba(80, 189, 189, 0.18);
}

.dot {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid #cbd5e1;
  margin-top: 4px;
  flex: 0 0 auto;
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
  font-weight: 700;
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

/* Accesibilidad */
.visually-hidden {
  position: absolute !important;
  height: 1px;
  width: 1px;
  overflow: hidden;
  clip: rect(1px, 1px, 1px, 1px);
  white-space: nowrap;
}
</style>
