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

import { supabase } from '@/composables/useSupabase'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'splash', component: Splash },

  // Públicas
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Register },

  // Onboarding (requiere sesión)
  { path: '/onboarding', name: 'onboarding', component: Onboarding },
  { path: '/onboarding2', name: 'onboarding2', component: Onboarding2 },

  // Área privada /app
  {
    path: '/app',
    component: () => import('@/layouts/AppShell.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: 'home', name: 'home', component: Home },

      // Cartilla / turnos
      { path: 'cartilla', name: 'cartilla', component: Cartilla },
      { path: 'agendar', name: 'agendar', component: Agendar },
      { path: 'agendar/eventos', name: 'agendar-eventos', component: AgendarEventos },
      { path: 'agendar/sesiones', name: 'agendar-sesiones', component: AgendarSesiones },

      // Contenido
      { path: 'contenido', name: 'contenido', component: Contenido },

      // Perfil
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

      // Medicaciones
      {
        path: 'medicaciones',
        name: 'Medicaciones',
        component: () => import('@/pages/Medicamentos.vue')
      },

      // Foro
      { path: 'foro', name: 'foro', component: Foro },
      { path: 'foro/new', name: 'foro-new', component: ForoNuevo },
      { path: 'foro/:id', name: 'foro-view', component: ForoVer },

      // Chatbot
      { path: 'chatbot', name: 'chatbot', component: Chatbot },

      // Diario
      { path: 'diario', name: 'diario', component: Diary },
      {
        path: 'diario/entradas',
        name: 'diario-entradas',
        component: () => import('@/pages/DiarioEntradas.vue')
      },

      // Notificaciones
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

      // Premium
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

      // Términos (privado)
      {
        path: 'terminos',
        name: 'terminos',
        component: () => import('@/pages/Terminos.vue')
      },

      // Privacidad / idioma
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

      // Redirect por defecto dentro de /app
      { path: '', redirect: '/app/home' }
    ]
  },

  // Reset password (fuera de /app, sin auth)
  {
    path: '/auth/reset-password',
    name: 'reset-password',
    component: () => import('@/pages/ResetPassword.vue')
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

const ONBOARDING_PATHS = new Set(['/onboarding', '/onboarding2'])

// cache simple del perfil
let profileCache: { id: string; terms_accepted?: boolean } | null = null

router.beforeEach(async (to, from) => {
  if (to.name === 'splash') return

  // 1) Sesión actual
  const { data } = await supabase.auth.getSession()
  const session = data.session
  const user = session?.user
  const isAuthed = !!user

  // 2) Rutas que requieren auth
  if (to.meta.requiresAuth && !isAuthed) return '/login'
  if (!isAuthed && ONBOARDING_PATHS.has(to.path)) return '/login'

  // 3) Usuario logueado y yendo a login/register -> mandarlo al home
  if (isAuthed && (to.path === '/login' || to.path === '/register')) {
    return '/app/home'
  }

  // 4) Chequeo de TÉRMINOS solo si está logueado
  if (isAuthed) {
    // refrescar cache si:
    // - nunca se cargó
    // - venimos desde terminos (acaba de aceptar)
    // - vamos a home (para asegurar que ya está actualizado)
    // - vamos a terminos (por seguridad)
    const mustRefresh =
      !profileCache ||
      to.name === 'home' ||
      to.name === 'terminos' ||
      from.name === 'terminos'

    if (mustRefresh) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, terms_accepted')
        .eq('id', user!.id)
        .maybeSingle()

      profileCache = prof ?? null
    }

    const termsAccepted = profileCache?.terms_accepted === true

    // Si NO aceptó y está tratando de entrar a /app (cualquier sección) que no sea terminos
    if (!termsAccepted && to.path.startsWith('/app') && to.name !== 'terminos') {
      return '/app/terminos'
    }

    // Si YA aceptó y viene a terminos, lo mandamos al home
    if (termsAccepted && to.name === 'terminos') {
      return '/app/home'
    }
  }

  return true
})