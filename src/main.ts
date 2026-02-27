import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from '@/store/auth'
import './style.css'
import { i18n } from './i18n'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

const bootstrap = async () => {
  const app = createApp(App)

  app.use(createPinia())
  app.use(i18n)
  app.use(router)

  const auth = useAuthStore()
  await auth.initAuth()

  //  registra SW en prod
  registerSW({ immediate: true })

  app.mount('#app')
}

bootstrap()