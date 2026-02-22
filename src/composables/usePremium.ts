import { ref, computed } from 'vue'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

const cached = ref<boolean | null>(null)
const loading = ref(false)

export function usePremium() {
  const auth = useAuthStore()
  const isPremium = computed(() => cached.value === true)

  async function refresh() {
    const uid = auth.user?.id
    if (!uid) {
      cached.value = false
      return
    }

    const cachedLs = localStorage.getItem('nura_is_premium')
    if (cachedLs === 'true') cached.value = true

    loading.value = true
    const { data, error } = await supabase
      .from('profiles')
      .select('premium')
      .eq('id', uid)
      .maybeSingle()

    loading.value = false
    if (!error) {
      cached.value = !!data?.premium
      localStorage.setItem('nura_is_premium', cached.value ? 'true' : 'false')
    }
  }

  return { isPremium, loading, refresh }
}