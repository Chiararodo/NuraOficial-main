import {
  ref,
  shallowRef,
} from 'vue'

export type BeforeInstallPromptEvent =
  Event & {
    prompt: () => Promise<void>

    userChoice: Promise<{
      outcome: 'accepted' | 'dismissed'
      platform: string
    }>
  }

/*
 * Guarda globalmente el evento de instalación.
 *
 * shallowRef es suficiente porque nos interesa
 * reaccionar cuando cambia el objeto completo.
 */
export const deferredInstallPrompt =
  shallowRef<BeforeInstallPromptEvent | null>(
    null
  )

/*
 * Se actualiza cuando el navegador confirma
 * que la aplicación fue instalada.
 */
export const appWasInstalled = ref(false)

let listenersInitialized = false

function handleBeforeInstallPrompt(
  event: Event
) {
  /*
   * Evitamos que el navegador muestre su aviso
   * automático para poder abrirlo desde nuestro botón.
   */
  event.preventDefault()

  deferredInstallPrompt.value =
    event as BeforeInstallPromptEvent
}

function handleAppInstalled() {
  deferredInstallPrompt.value = null
  appWasInstalled.value = true
}

/*
 * Se ejecuta una sola vez durante toda
 * la vida de la aplicación.
 */
export function initInstallPromptListeners() {
  if (listenersInitialized) {
    return
  }

  listenersInitialized = true

  window.addEventListener(
    'beforeinstallprompt',
    handleBeforeInstallPrompt
  )

  window.addEventListener(
    'appinstalled',
    handleAppInstalled
  )
}

/*
 * Después de usar el prompt hay que descartarlo,
 * porque cada evento solo puede utilizarse una vez.
 */
export function clearInstallPrompt() {
  deferredInstallPrompt.value = null
}