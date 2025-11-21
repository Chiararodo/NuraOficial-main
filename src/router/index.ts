// src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// Públicas
import Splash from '@/pages/Splash.vue'
import Login from '@/pages/Login.vue'
import Register from '@/pages/Register.vue'
import Onboarding from '@/pages/Onboarding.vue'
import Onboarding2 from '@/pages/Onboarding2.vue'
import Onboarding3 from '@/pages/Onboarding3.vue'

// App (autenticadas)
import Home from '@/pages/Home.vue'
import Cartilla from '@/pages/Cartilla.vue'
import Agendar from '@/pages/Agendar.vue'
import Contenido from '@/pages/Contenido.vue'
import Perfil from '@/pages/Perfil.vue'
import Foro from '@/pages/Foro.vue'
import ForoNuevo from '@/pages/ForoNuevo.vue'
import ForoVer from '@/pages/ForoVer.vue'
import Chatbot from '@/pages/Chatbot.vue'
import Notificaciones from '@/pages/Notificaciones.vue'
import Diary from '@/pages/Diary.vue'

import { supabase } from '@/composables/useSupabase'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'splash', component: Splash },

  // Públicas
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Register },

  // Onboarding (requiere sesión)
  { path: '/onboarding', name: 'onboarding', component: Onboarding },
  { path: '/onboarding2', name: 'onboarding2', component: Onboarding2 },
  { path: '/onboarding3', name: 'onboarding3', component: Onboarding3 },

  // Área privada
  {
    path: '/app',
    component: () => import('@/layouts/AppShell.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: 'home', name: 'home', component: Home },
      { path: 'cartilla', name: 'cartilla', component: Cartilla },
      { path: 'agendar', name: 'agendar', component: Agendar },
      { path: 'contenido', name: 'contenido', component: Contenido },
      { path: 'perfil', name: 'perfil', component: Perfil },

      // EDITAR PERFIL
      {
        path: 'perfil/editar',
        name: 'perfil-editar',
        component: () => import('@/pages/PerfilEditar.vue')
      },

      // FORO
      { path: 'foro', name: 'foro', component: Foro },
      { path: 'foro/new', name: 'foro-new', component: ForoNuevo },
      { path: 'foro/:id', name: 'foro-view', component: ForoVer },

      // CHATBOT
      { path: 'chatbot', name: 'chatbot', component: Chatbot },

      // DIARIO
      { path: 'diario', name: 'diario', component: Diary },
      { path: "mood-success", name: "mood-success", component: () => import('@/pages/MoodSuccess.vue') },
      { path: 'diario/entradas', name: 'diario-entradas', component: () => import('@/pages/DiarioEntradas.vue') },
      


{
  path: 'mood-success',
  name: 'mood-success',
  component: () => import('@/pages/MoodSuccess.vue')
},

      // NOTIFICACIONES
      {
        path: 'notificaciones',
        name: 'notificaciones',
        component: Notificaciones
      },

      // PREMIUM (todos dentro de /app)
      {
        path: 'premium',
        name: 'premium',
        component: () => import('@/pages/Premium.vue')
      },
      {
        path: 'premium/checkout',
        name: 'premium-checkout',
        component: () => import('@/pages/PremiumCheckout.vue')
      },
      {
        path: 'premium/confirmado',
        name: 'premium-confirm',
        component: () => import('@/pages/PremiumConfirm.vue')
      },

      // PRIVACIDAD / IDIOMA
      {
        path: 'privacidad',
        name: 'privacidad',
        component: () => import('@/pages/Privacidad.vue')
      },
      {
        path: 'idioma',
        name: 'idioma',
        component: () => import('@/pages/Idioma.vue')
      },

      // Redirect por defecto
      { path: '', redirect: '/app/home' }
    ]
  },

  // Fallback
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, left: 0 }
  }
})

/* =========== Guard de autenticación =========== */

const ONBOARDING_PATHS = new Set(['/onboarding', '/onboarding2', '/onboarding3'])

router.beforeEach(async (to) => {
  if (to.name === 'splash') return

  const { data } = await supabase.auth.getSession()
  const session = data.session
  const user = session?.user
  const isAuthed = !!user

  if (to.meta.requiresAuth && !isAuthed) return '/login'
  if (!isAuthed && ONBOARDING_PATHS.has(to.path)) return '/login'

  if (isAuthed && (to.path === '/login' || to.path === '/register'))
    return '/app/home'

  return true
})
