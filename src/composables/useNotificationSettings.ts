import { ref, computed } from 'vue'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

export type NotificationSettings = {
  bienestar: boolean
  profesional: boolean
  app_updates: boolean
}

const LS_KEY = 'nura_notifications'

const defaults: NotificationSettings = {
  bienestar: true,
  profesional: true,
  app_updates: true
}

function safeParseLS(): Partial<NotificationSettings> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function useNotificationSettings() {
  const auth = useAuthStore()
  const loading = ref(false)
  const settings = ref<NotificationSettings>({ ...defaults })

  function loadFromLocal() {
    const saved = safeParseLS()
    settings.value = {
      bienestar: typeof saved.bienestar === 'boolean' ? saved.bienestar : defaults.bienestar,
      profesional: typeof saved.profesional === 'boolean' ? saved.profesional : defaults.profesional,
      app_updates: typeof saved.app_updates === 'boolean' ? saved.app_updates : defaults.app_updates
    }
  }

  async function loadFromSupabase() {
    if (!auth.user) return
    loading.value = true

    const { data, error } = await supabase
      .from('notification_settings')
      .select('bienestar,profesional,app_updates')
      .eq('user_id', auth.user.id)
      .maybeSingle()

    loading.value = false

    if (error) return

    if (data) {
      settings.value = {
        bienestar: !!data.bienestar,
        profesional: !!data.profesional,
        app_updates: !!data.app_updates
      }
      localStorage.setItem(LS_KEY, JSON.stringify(settings.value))
    }
  }

  async function upsertToSupabase(next?: Partial<NotificationSettings>) {
    if (!auth.user) return
    if (next) settings.value = { ...settings.value, ...next }

    localStorage.setItem(LS_KEY, JSON.stringify(settings.value))

    await supabase.from('notification_settings').upsert(
      {
        user_id: auth.user.id,
        bienestar: settings.value.bienestar,
        profesional: settings.value.profesional,
        app_updates: settings.value.app_updates
      },
      { onConflict: 'user_id' }
    )
  }

  function categoryEnabled(category: 'bienestar' | 'profesional' | 'app_updates') {
    return !!settings.value[category]
  }

  const ready = computed(() => !loading.value)

  return {
    settings,
    loading,
    ready,
    loadFromLocal,
    loadFromSupabase,
    upsertToSupabase,
    categoryEnabled
  }
}