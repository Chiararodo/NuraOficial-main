// src/store/auth.ts
import { defineStore } from 'pinia'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/composables/useSupabase'

type State = {
  user: User | null
  ready: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): State => ({
    user: null,
    ready: false,
  }),

  actions: {
    /** Hidrata estado inicial y escucha cambios de auth */
    async initAuth() {
      // 1) estado actual
      const { data } = await supabase.auth.getSession()
      this.user = data.session?.user ?? null
      this.ready = true

      // 2) suscripción a cambios (login/logout/token refresh)
      supabase.auth.onAuthStateChange((_event, session) => {
        this.user = session?.user ?? null
      })
    },

    /** Refresca por si lo necesitás manualmente */
    async reload() {
      const { data } = await supabase.auth.getSession()
      this.user = data.session?.user ?? null
    },

    /** Wrapper de signOut */
    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      this.user = null
    },

    /** Por si querés limpiar todo */
    $reset() {
      this.user = null
      this.ready = false
    },
  },
})
