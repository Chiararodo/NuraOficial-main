import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from '@/store/auth'
import './style.css'
import { i18n } from './i18n'

const bootstrap = async () => {
  const app = createApp(App)

  // Plugins (una sola instancia)
  app.use(createPinia())
  app.use(i18n)
  app.use(router)

  // Init auth antes de montar
  const auth = useAuthStore()
  await auth.initAuth()

  // Mount una sola vez
  app.mount('#app')
}

bootstrap()
