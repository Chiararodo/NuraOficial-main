<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import {
  appWasInstalled,
  clearInstallPrompt,
  deferredInstallPrompt,
} from '@/services/installPrompt'

const deferredPrompt =
  deferredInstallPrompt

const isIOS = ref(false)
const isInstalled = ref(false)

const showHelpModal = ref(false)
const installing = ref(false)

const collapsed = ref(
  sessionStorage.getItem(
    'nura-install-collapsed'
  ) === 'true'
)

let displayModeMediaQuery:
  MediaQueryList | null = null

/*
 * El aviso aparece únicamente cuando:
 *
 * 1. La app todavía no está instalada.
 * 2. Estamos en iOS, donde se instala manualmente.
 * 3. O el navegador entregó beforeinstallprompt.
 */
const showInstallUI = computed(() => {
  return (
    !isInstalled.value &&
    (
      isIOS.value ||
      deferredPrompt.value !== null
    )
  )
})

const showInstallBanner = computed(() => {
  return (
    showInstallUI.value &&
    !collapsed.value
  )
})

const showInstallBubble = computed(() => {
  return (
    showInstallUI.value &&
    collapsed.value
  )
})

const installButtonText = computed(() => {
  if (installing.value) {
    return 'Abriendo…'
  }

  if (isIOS.value) {
    return 'Agregar a inicio'
  }

  return 'Instalar'
})

const installDescription = computed(() => {
  if (isIOS.value) {
    return 'Agregá Nura a tu pantalla de inicio.'
  }

  if (deferredPrompt.value) {
    return 'Instalá Nura para abrirla más rápido.'
  }

  return 'Guardá Nura como una app.'
})

function detectInstalledMode() {
  const navigatorWithStandalone =
    window.navigator as Navigator & {
      standalone?: boolean
    }

  return (
    window
      .matchMedia(
        '(display-mode: standalone)'
      )
      .matches ||
    navigatorWithStandalone
      .standalone === true
  )
}

function detectIOS() {
  const userAgent =
    navigator.userAgent.toLowerCase()

  const regularIOS =
    /iphone|ipad|ipod/.test(userAgent)

  const iPadOS =
    navigator.platform === 'MacIntel' &&
    navigator.maxTouchPoints > 1

  return regularIOS || iPadOS
}

function refreshState() {
  isIOS.value = detectIOS()

  isInstalled.value =
    detectInstalledMode() ||
    appWasInstalled.value

  if (isInstalled.value) {
    clearInstallPrompt()

    showHelpModal.value = false
    collapsed.value = false

    sessionStorage.removeItem(
      'nura-install-collapsed'
    )
  }
}

async function handleInstallClick() {
  if (installing.value) {
    return
  }

  /*
   * En iPhone y iPad no existe
   * beforeinstallprompt.
   */
  if (isIOS.value) {
    showHelpModal.value = true
    return
  }

  const promptEvent =
    deferredPrompt.value

  /*
   * Si no existe el evento, mostramos
   * las instrucciones manuales.
   */
  if (!promptEvent) {
    showHelpModal.value = true
    return
  }

  installing.value = true

  try {
    /*
     * Abre el diálogo nativo de Chrome,
     * Edge o el navegador compatible.
     */
    await promptEvent.prompt()

    const choice =
      await promptEvent.userChoice

    /*
     * El evento no puede reutilizarse,
     * independientemente del resultado.
     */
    clearInstallPrompt()

    if (
      choice.outcome === 'accepted'
    ) {
      collapsed.value = false

      sessionStorage.removeItem(
        'nura-install-collapsed'
      )
    }
  } catch (error) {
    console.error(
      'No se pudo abrir el instalador:',
      error
    )

    showHelpModal.value = true
  } finally {
    installing.value = false
    refreshState()
  }
}

function collapseBanner() {
  collapsed.value = true

  sessionStorage.setItem(
    'nura-install-collapsed',
    'true'
  )
}

function openInstallHelp() {
  showHelpModal.value = true
}

function closeModal() {
  showHelpModal.value = false
}

function handleDisplayModeChange() {
  refreshState()
}

/*
 * Si la instalación se completa, el archivo global
 * modifica appWasInstalled y este watch actualiza
 * inmediatamente el componente.
 */
watch(
  appWasInstalled,
  (installed) => {
    if (installed) {
      refreshState()
    }
  }
)

onMounted(() => {
  refreshState()

  /*
   * Solamente dejamos dentro de onMounted
   * el listener de display-mode.
   *
   * beforeinstallprompt y appinstalled
   * ya se escuchan globalmente desde main.ts.
   */
  displayModeMediaQuery =
    window.matchMedia(
      '(display-mode: standalone)'
    )

  displayModeMediaQuery.addEventListener(
    'change',
    handleDisplayModeChange
  )
})

onBeforeUnmount(() => {
  displayModeMediaQuery
    ?.removeEventListener(
      'change',
      handleDisplayModeChange
    )
})
</script>

<template>
  <Transition name="install-slide">
    <aside
      v-if="showInstallBanner"
      class="install-banner"
      aria-label="Instalar la aplicación Nura"
    >
     <div class="install-banner__icon" aria-hidden="true">
  <img
    src="/icons/NuriBienvenida.png"
    alt=""
  />
</div>

      <div class="install-banner__copy">
        <strong>Instalá Nura</strong>
        <span>{{ installDescription }}</span>
      </div>

      <button
        class="install-banner__action"
        type="button"
        :disabled="installing"
        @click="handleInstallClick"
      >
        {{ installButtonText }}
      </button>

      <button
  class="install-banner__close"
  type="button"
  aria-label="Minimizar aviso de instalación"
  @click="collapseBanner"
>
  ×
</button>
    </aside>
  </Transition>

<Transition name="install-bubble">
  <button
    v-if="showInstallBubble"
    class="install-bubble"
    type="button"
    aria-label="Ver cómo instalar Nura"
    title="Instalar Nura"
    @click="openInstallHelp"
  >
    <img
      src="/icons/NuriBienvenida.png"
      alt=""
      aria-hidden="true"
    />

    <span class="install-bubble__tooltip">
  Instalar Nura
</span>
  </button>
</Transition>

  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="showHelpModal"
        class="install-modal-backdrop"
        @click.self="closeModal"
      >
        <section
          class="install-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-modal-title"
        >
          <button
            class="install-modal__close"
            type="button"
            aria-label="Cerrar"
            @click="closeModal"
          >
            ×
          </button>

          <div class="install-modal__icon" aria-hidden="true">
  <img
    src="/icons/NuriBienvenida.png"
    alt=""
  />
</div>

          <h2
            id="install-modal-title"
            class="install-modal__title"
          >
            {{
              isIOS
                ? 'Agregar Nura al inicio'
                : 'Instalar Nura'
            }}
          </h2>

          <div
            v-if="isIOS"
            class="install-modal__body"
          >
            <p>
              Para usar Nura como una aplicación:
            </p>

            <ol>
              <li>
                Abrí esta página desde
                <strong>Safari</strong>.
              </li>

              <li>
                Tocá el botón
                <strong>Compartir</strong>.
              </li>

              <li>
                Elegí
                <strong>
                  Agregar a pantalla de inicio
                </strong>.
              </li>

              <li>
                Confirmá tocando
                <strong>Agregar</strong>.
              </li>
            </ol>
          </div>

          <div
  v-else
  class="install-modal__body"
>
  <p>
    Podés instalar Nura en tu computadora y usarla como una aplicación.
  </p>

  <ol>
    <li>
      Tocá el botón
      <strong>Instalar ahora</strong>.
    </li>

    <li>
      Confirmá la instalación en la ventana del navegador.
    </li>

    <li>
      Nura quedará disponible desde el escritorio o el menú de aplicaciones.
    </li>
  </ol>

  <p v-if="!deferredPrompt">
    Si no aparece el instalador, abrí el menú del navegador
    <strong>⋮</strong>
    y elegí
    <strong>Instalar Nura</strong>
    o
    <strong>Instalar aplicación</strong>.
  </p>
</div>

<button
  v-if="!isIOS && deferredPrompt"
  class="install-modal__install"
  type="button"
  :disabled="installing"
  @click="handleInstallClick"
>
  {{ installing ? 'Abriendo…' : 'Instalar ahora' }}
</button>

        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* =====================================================
   BANNER DE INSTALACIÓN
===================================================== */

.install-banner {
  position: fixed;
  left: 10px;
  bottom: calc(74px + env(safe-area-inset-bottom));
  z-index: 55;
  width:320px;
  min-height:64px;
  padding:10px 42px 10px 12px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(26, 23, 228, 0.2);
  border-radius: 16px;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow:
    0 10px 26px rgba(15, 23, 42, 0.12),
    0 2px 8px rgba(15, 23, 42, 0.06);
}

.install-banner__icon {
  width: 44px;
  height: 44px;
  flex: 0 0 34px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
}

.install-banner__icon img {
  width: 58px;
  height: 58px;
  max-width: none;
  display: block;
  object-fit: contain;
  transform: scale(1.45);
  animation: nuri-install-float 2.8s ease-in-out infinite;
}

.install-banner__copy {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.install-banner__copy strong {
  color: #0f172a;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.15;
}

.install-banner__copy span {
  overflow: hidden;
  color: #475569;
  font-size: 0.8rem;
  line-height: 1.35;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.install-banner__action {
  min-height: 34px;
  padding: 0px 18px;
  border: none;
  border-radius: 999px;
  background: #50bdbd;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition:.25s;
}

.install-banner__action:hover{
    background:#3ea9a9;
    transform:translateY(-2px);
    box-shadow:0 10px 20px rgba(80,189,189,.35);
}

.install-banner__close {
  position: absolute;
  top: 3px;
  right: 4px;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #64748b;
  font-size: 1rem;
  cursor: pointer;
}

@keyframes nuri-install-float {
  0%,
  100% {
    transform: scale(1.45) translateY(0) rotate(0deg);
  }

  50% {
    transform: scale(1.45) translateY(-3px) rotate(-2deg);
  }
}

/* =====================================================
   MODAL
===================================================== */

.install-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.52);
  backdrop-filter: blur(4px);
}

.install-modal {
  position: relative;
  width: 70%;
  padding: 20px;
  border: 1px solid #e2edf7;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.22);
}

.install-modal__install {
  min-height: 40px;
  margin-top: 20px;
  margin-right: 8px;
  padding: 9px 18px;
  border: none;
  border-radius: 999px;
  background: #50bdbd;
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.install-modal__install:hover:not(:disabled) {
  background: #3ea9a9;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(80, 189, 189, 0.3);
}

.install-modal__install:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.install-modal__close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #f1f5f9;
  color: #475569;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}

.install-modal__icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  margin-bottom: 14px;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(80, 189, 189, 0.2);
}

.install-modal__icon img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.install-modal__title {
  margin: 0 34px 8px 0;
  font-size: 1rem;
  font-weight: 800;
}

.install-modal__body {
  font-size: 0.78rem;
  line-height: 1.5;
}

.install-modal__body p {
  margin: 0 0 12px;
}

.install-modal__body ol {
  margin: 0;
  padding-left: 20px;
}

.install-modal__body li + li {
  margin-top: 8px;
}

.install-modal__body strong {
  color: #0f172a;
}

.install-modal__ok {
  min-height: 28px;
  margin-top: 20px;
  padding: 6px 14px;
  border: none;
  border-radius: 999px;
  background: #50bdbd;
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
   display: flex;
  justify-content: flex-end;
  gap: 1px;
  flex-wrap: wrap;
}

.install-modal__ok:hover {
  background: #419b9b;
}

/* =====================================================
   TRANSICIONES
===================================================== */

.install-slide-enter-active,
.install-slide-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.install-slide-enter-from,
.install-slide-leave-to {
  opacity: 0;
  transform: translateY(18px);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* =====================================================
   RESPONSIVE
===================================================== */

@media (max-width: 520px) {
  .install-banner {
    right: auto;
    left: 8px;
    bottom: calc(72px + env(safe-area-inset-bottom));
    width: min(220px, calc(100vw - 16px));
    min-height: 50px;
    padding: 7px 30px 7px 7px;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    gap: 6px;
    border-radius: 14px;
  }

  .install-banner__icon {
    width: 34px;
    height: 34px;
  }

  .install-banner__icon img {
    width: 31px;
    height: 31px;
  }

  .install-banner__copy strong {
    font-size: 0.7rem;
  }

  .install-banner__copy span {
    font-size: 0.55rem;
  }

  .install-banner__action {
    min-height: 27px;
    padding: 5px 8px;
    font-size: 0.61rem;
  }
}

@media (max-width: 360px) {
  .install-banner {
    width: min(130px, calc(100vw - 16px));
    left: 8px;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 6px;
  
  }

  .install-banner__icon {
    width: 34px;
    height: 34px;
  }

  .install-banner__icon img {
    width: 30px;
    height: 30px;
  }

  .install-banner__action {
    grid-column: 2;
    justify-self: start;

    min-height: 26px;
    padding: 5px 9px;
  }

  .install-banner__copy span {
    display: none;
  }
}

/* Accesibilidad: desactiva animaciones si el usuario lo pidió */
@media (prefers-reduced-motion: reduce) {
  .install-banner,
  .install-banner *,
  .install-modal,
  .install-modal * {
    transition: none !important;
  }
}

/* =====================================================
   BOTÓN MINIATURA DE NURI
===================================================== */

.install-bubble {
  position: fixed;
  left: 12px;
  bottom: calc(78px + env(safe-area-inset-bottom));
  z-index: 55;
  width: 55px;
  height: 55px;
  display: grid;
  place-items: center;
  padding: 4px;
  border: 2px solid rgba(80, 189, 189, 0.4);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  overflow: visible;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow:
    0 12px 28px rgba(15, 23, 42, 0.16),
    0 4px 10px rgba(15, 23, 42, 0.08);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.install-bubble img {
  width: 49px;
  height: 49px;
  display: block;
  object-fit: contain;
  border-radius: 50%;
  animation: nuri-bubble-float 2.8s ease-in-out infinite;
}

.install-bubble__badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 19px;
  height: 19px;
  display: grid;
  place-items: center;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #50bdbd;
  color: #ffffff;
  font-size: 0.8rem;
  font-weight: 800;
  line-height: 1;
}

.install-bubble__tooltip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  transform: translateY(-50%) translateX(-4px);
  padding: 5px 9px;
  border-radius: 999px;
  background: #50bdbd;
  color: #ffffff;
  font-size: 0.62rem;
  font-weight: 700;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  box-shadow: 0 8px 18px rgba(15, 118, 110, 0.22);
  transition:
    opacity 0.18s ease,
    transform 0.18s ease,
    visibility 0.18s ease;
}

@media (hover: hover) {
  .install-bubble:hover {
    transform: translateY(-4px) scale(1.06);
    background: #ffffff;
    border-color: #50bdbd;
    box-shadow:
      0 16px 34px rgba(80, 189, 189, 0.26),
      0 5px 12px rgba(15, 23, 42, 0.1);
  }

  .install-bubble:hover .install-bubble__tooltip {
    opacity: 1;
    visibility: visible;

    transform: translateY(-50%) translateX(0);
  }
}

.install-bubble:active {
  transform: scale(0.96);
}

@keyframes nuri-bubble-float {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }

  50% {
    transform: translateY(-4px) rotate(-3deg);
  }
}

.install-bubble-enter-active,
.install-bubble-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.install-bubble-enter-from,
.install-bubble-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

@media (max-width: 520px) {
  .install-bubble {
    left: 9px;
    bottom: calc(73px + env(safe-area-inset-bottom));
    width: 50px;
    height: 50px;
  }

  .install-bubble img {
    width: 43px;
    height: 43px;
  }

  .install-bubble__badge {
    width: 18px;
    height: 18px;
    font-size: 0.72rem;
  }

  .install-bubble__tooltip {
    display: none;
  }
}

@media (max-width: 360px) {
  .install-bubble {
    width: 48px;
    height: 48px;
  }

  .install-bubble img {
    width: 40px;
    height: 40px;
  }
}


</style>