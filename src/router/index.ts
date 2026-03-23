import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// Públicas
import Splash from '@/pages/Splash.vue'
import Login from '@/pages/Login.vue'
import Register from '@/pages/Register.vue'
import Onboarding from '@/pages/Onboarding.vue'
import Onboarding2 from '@/pages/Onboarding2.vue'
import NotificacionesFeed from '@/pages/NotificacionesFeed.vue'

// App (autenticadas)
import Home from '@/pages/Home.vue'
import Cartilla from '@/pages/Cartilla.vue'
import Agendar from '@/pages/Agendar.vue'
import AgendarEventos from '@/pages/AgendarEventos.vue'
import AgendarSesiones from '@/pages/AgendarSesiones.vue'
import Contenido from '@/pages/Contenido.vue'
import Perfil from '@/pages/Perfil.vue'
import Foro from '@/pages/Foro.vue'
import ForoNuevo from '@/pages/ForoNuevo.vue'
import ForoVer from '@/pages/ForoVer.vue'
import Chatbot from '@/pages/Chatbot.vue'
import Notificaciones from '@/pages/Notificaciones.vue'
import Diary from '@/pages/Diary.vue'
import { refreshPremiumCache } from '@/composables/usePremium'

import { supabase } from '@/composables/useSupabase'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'splash', component: Splash },

  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Register },

  { path: '/onboarding', name: 'onboarding', component: Onboarding },
  { path: '/onboarding2', name: 'onboarding2', component: Onboarding2 },

  {
    path: '/app',
    component: () => import('@/layouts/AppShell.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: 'home', name: 'home', component: Home },

      { path: 'cartilla', name: 'cartilla', component: Cartilla },
      { path: 'agendar', name: 'agendar', component: Agendar },
      { path: 'agendar/eventos', name: 'agendar-eventos', component: AgendarEventos },
      { path: 'agendar/sesiones', name: 'agendar-sesiones', component: AgendarSesiones },

      { path: 'contenido', name: 'contenido', component: Contenido },

      { path: 'perfil', name: 'perfil', component: Perfil },
      {
        path: 'perfil/editar',
        name: 'perfil-editar',
        component: () => import('@/pages/PerfilEditar.vue')
      },
      {
        path: 'perfil-publico/:uid',
        name: 'perfil-publico',
        component: () => import('@/pages/PerfilPublico.vue')
      },

      {
        path: 'medicaciones',
        name: 'Medicaciones',
        component: () => import('@/pages/Medicamentos.vue')
      },

      { path: 'foro', name: 'foro', component: Foro },
      { path: 'foro/new', name: 'foro-new', component: ForoNuevo },
      { path: 'foro/:id', name: 'foro-view', component: ForoVer },

      { path: 'chatbot', name: 'chatbot', component: Chatbot },

      { path: 'diario', name: 'diario', component: Diary },
      {
        path: 'diario/entradas',
        name: 'diario-entradas',
        component: () => import('@/pages/DiarioEntradas.vue')
      },

      {
        path: 'admin/usuarios',
        name: 'admin-usuarios',
        component: () => import('@/pages/AdminUsuarios.vue'),
        meta: { requiresAdmin: true }
      },

      {
        path: 'notificaciones',
        name: 'notificaciones',
        component: Notificaciones
      },
      {
        path: 'notis',
        name: 'notificaciones-feed',
        component: NotificacionesFeed
      },

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
      {
        path: 'premium/area',
        name: 'premium-area',
        component: () => import('@/pages/PremiumPage.vue')
      },

      {
        path: 'terminos',
        name: 'terminos',
        component: () => import('@/pages/Terminos.vue')
      },

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

      { path: '', redirect: '/app/home' }
    ]
  },

  {
    path: '/auth/reset-password',
    name: 'reset-password',
    component: () => import('@/pages/ResetPassword.vue')
  },

  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0, left: 0 }
  }
})

const ONBOARDING_PATHS = new Set(['/onboarding', '/onboarding2'])

let profileCache: {
  id: string
  terms_accepted?: boolean
  is_admin?: boolean
  blocked?: boolean | null
} | null = null

router.beforeEach(async (to, from) => {
  if (to.name === 'splash') return

  const { data } = await supabase.auth.getSession()
  const session = data.session
  const user = session?.user
  const isAuthed = !!user

  if (to.meta.requiresAuth && !isAuthed) return '/login'
  if (!isAuthed && ONBOARDING_PATHS.has(to.path)) return '/login'

  if (isAuthed && (to.path === '/login' || to.path === '/register')) {
    return '/app/home'
  }

  if (isAuthed) {
    // 🔥 chequeo real de usuario auth
    const { data: userCheck, error: userCheckError } = await supabase.auth.getUser()

    if (userCheckError || !userCheck?.user) {
      await supabase.auth.signOut()
      return '/login?deleted=1'
    }

    const mustRefresh =
      !profileCache ||
      profileCache.id !== user!.id ||
      to.name === 'home' ||
      to.name === 'terminos' ||
      from.name === 'terminos' ||
      to.meta.requiresAdmin

    if (mustRefresh) {
      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('id, terms_accepted, is_admin, blocked')
        .eq('id', user!.id)
        .maybeSingle()

      // 🔥 si no existe perfil, cerrá sesión y mandá a login
      if (profError || !prof) {
        await supabase.auth.signOut()
        return '/login?deleted=1'
      }

      profileCache = prof
    }

    if (profileCache?.blocked) {
      await supabase.auth.signOut()
      return '/login?blocked=1'
    }

    await refreshPremiumCache(user!.id)

    const termsAccepted = profileCache?.terms_accepted === true

    if (!termsAccepted && to.path.startsWith('/app') && to.name !== 'terminos') {
      return '/app/terminos'
    }

    if (termsAccepted && to.name === 'terminos') {
      return '/app/home'
    }

    if (to.meta.requiresAdmin) {
      const isAdmin = profileCache?.is_admin === true
      if (!isAdmin) return '/app/home'
    }
  }

  return true
})