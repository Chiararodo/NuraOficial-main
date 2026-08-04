import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'

import { useAuthStore } from '@/store/auth'

import {
  initInstallPromptListeners,
} from './services/installPrompt'

import './style.css'

/*
 * Registramos el listener de instalación
 * antes de montar Vue.
 *
 * De esta manera no perdemos el evento
 * beforeinstallprompt.
 */
initInstallPromptListeners()

/*
 * Registramos el service worker una sola vez.
 */
registerSW({
  immediate: true,
})

const bootstrap = async () => {
  const app = createApp(App)

  const pinia = createPinia()

  app.use(pinia)
  app.use(i18n)
  app.use(router)

  /*
   * Pinia ya tiene que estar instalada
   * antes de llamar al store.
   */
  const auth = useAuthStore(pinia)

  await auth.initAuth()

  app.mount('#app')
}

bootstrap().catch((error) => {
  console.error(
    'No se pudo iniciar la aplicación:',
    error
  )
})