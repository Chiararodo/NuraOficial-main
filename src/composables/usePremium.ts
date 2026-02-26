import { ref, computed } from 'vue'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

const cached = ref<boolean | null>(null)
const loading = ref(false)

/** Función suelta: el router la puede llamar */
export async function refreshPremiumCache(userId: string) {
  const cachedLs = localStorage.getItem('nura_is_premium')
  if (cachedLs === 'true') return

  const { data, error } = await supabase
    .from('profiles')
    .select('premium, plan')
    .eq('id', userId)
    .maybeSingle()

  if (!error) {
    const isPrem = data?.premium === true || data?.plan === 'premium'
    localStorage.setItem('nura_is_premium', isPrem ? 'true' : 'false')
  }
}

export function usePremium() {
  const auth = useAuthStore()
  const isPremium = computed(() => cached.value === true)

  async function refresh() {
    const uid = auth.user?.id
    if (!uid) {
      cached.value = false
      return
    }

    // toma rápido desde LS si ya está
    const cachedLs = localStorage.getItem('nura_is_premium')
    if (cachedLs === 'true') cached.value = true

    loading.value = true
    const { data, error } = await supabase
      .from('profiles')
      .select('premium, plan')
      .eq('id', uid)
      .maybeSingle()
    loading.value = false

    if (!error) {
      const isPrem = data?.premium === true || data?.plan === 'premium'
      cached.value = isPrem
      localStorage.setItem('nura_is_premium', isPrem ? 'true' : 'false')
    }
  }

  return { isPremium, loading, refresh }
}