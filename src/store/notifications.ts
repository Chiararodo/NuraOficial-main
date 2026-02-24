import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/composables/useSupabase'
import { useAuthStore } from '@/store/auth'

export const useNotificationsStore = defineStore('notifications', () => {
  const count = ref(0)
  const channel = ref<ReturnType<typeof supabase.channel> | null>(null)
  const auth = useAuthStore()

  async function refreshTodayCount() {
    if (!auth.user) {
      count.value = 0
      return
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('is_read', false)

    if (error) {
      console.error('Error contando notificaciones', error)
      return
    }

    count.value = data?.length ?? 0
  }

  function initRealtime() {
    if (!auth.user) return
    if (channel.value) return

    const ch = supabase
      .channel('notifications-count-' + auth.user.id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${auth.user.id}`,
        },
        () => {
          refreshTodayCount()
        }
      )
      .subscribe()

    channel.value = ch
  }

  async function markAsRead(id: string) {
    if (!auth.user) return

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', auth.user.id)

    if (error) {
      console.error('Error marcando como leída desde store', error)
      return
    }

    refreshTodayCount()
  }

  return {
    count,
    refreshTodayCount,
    initRealtime,
    markAsRead,
  }
})
