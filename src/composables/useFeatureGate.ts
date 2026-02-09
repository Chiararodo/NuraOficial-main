import { computed, ref, onMounted } from 'vue'
import type { FeatureKey } from '@/utils/usageLimits'
import {
  FEATURE_LIMITS,
  remainingForFree,
  canUseFree,
  incrementUsage,
} from '@/utils/usageLimits'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/composables/useSupabase'

export function useFeatureGate(feature: FeatureKey) {
  const auth = useAuthStore()

  const premium = ref<boolean>(false)
  const loading = ref(true)

  // ✅ hace reactivo el estado de uso (porque localStorage no es reactivo)
  const usageVersion = ref(0)
  function refresh() {
    usageVersion.value++
  }

  async function loadPremium() {
    loading.value = true
    try {
      if (!auth.user) {
        premium.value = false
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('premium')
        .eq('id', auth.user.id)
        .maybeSingle()

      premium.value = !!data?.premium
    } finally {
      loading.value = false
    }
  }

  onMounted(loadPremium)

  const limits = computed(() => FEATURE_LIMITS[feature])

  const freeStats = computed(() => {
    usageVersion.value
    return remainingForFree(feature)
  })

  const canUse = computed(() => {
    usageVersion.value
    if (premium.value) return true
    return canUseFree(feature)
  })

  const bannerText = computed(() => {
    usageVersion.value
    if (premium.value) return ''
    const { remaining, limit } = freeStats.value
    if (!limit) return ''
    return `Te quedan ${remaining} usos hoy`
  })

  function consume(amount = 1) {
    if (premium.value) return
    incrementUsage(feature, amount)
    refresh()
  }

  return {
    premium,
    loading,
    limits,
    freeStats,
    canUse,
    bannerText,
    reloadPremium: loadPremium,
    consume,
    refresh,
  }
}
