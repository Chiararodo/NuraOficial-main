export type Plan = 'free' | 'premium'

export function getPlan(): Plan {
  if (localStorage.getItem('nura_is_premium') === 'true') return 'premium'
  const p = (localStorage.getItem('nura_plan') as Plan | null) || 'free'
  return p === 'premium' ? 'premium' : 'free'
}

function monthKey(base: string) {
  const d = new Date()
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  return `${base}_${ym}`
}

export function canUseChatbot(): boolean {
  if (getPlan() === 'premium') return true
  const key = monthKey('nura_chatbot_uses')
  const uses = Number(localStorage.getItem(key) || '0')
  return uses < 5
}

export function registerChatbotUse() {
  const key = monthKey('nura_chatbot_uses')
  const uses = Number(localStorage.getItem(key) || '0')
  localStorage.setItem(key, String(uses + 1))
}

export function canCreateDiaryEntry(): boolean {
  if (getPlan() === 'premium') return true
  const key = monthKey('nura_diary_entries')
  const count = Number(localStorage.getItem(key) || '0')
  return count < 10
}

export function registerDiaryEntry() {
  const key = monthKey('nura_diary_entries')
  const count = Number(localStorage.getItem(key) || '0')
  localStorage.setItem(key, String(count + 1))
}

export function canCreateForumPost(): boolean {
  return getPlan() === 'premium'
}
