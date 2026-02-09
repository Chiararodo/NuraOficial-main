import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from '@/store/auth'
import './style.css'

const bootstrap = async () => {
  const app = createApp(App)
  app.use(createPinia())


  const auth = useAuthStore()
  await auth.initAuth()

  app.use(router)
  app.mount('#app')
}

bootstrap()
