import { defineStore } from 'pinia'
import events from '../data/events.json'
const validEventIds = new Set(events.map((event) => event.id))
const storageKey = 'festival-explorer-saved'
const readSaved = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]')
    if (!Array.isArray(stored)) return []
    const ids = [...new Set(stored.filter((id) => typeof id === 'string' && validEventIds.has(id)))]
    if (ids.length !== stored.length) localStorage.setItem(storageKey, JSON.stringify(ids))
    return ids
  } catch { return [] }
}
export const useSavedStore = defineStore('saved', {
  state: () => ({ ids: readSaved() }),
  getters: { has: (state) => (id) => state.ids.includes(id) },
  actions: {
    persist() { try { localStorage.setItem(storageKey, JSON.stringify(this.ids)) } catch { /* Storage can be unavailable. */ } },
    toggle(id) {
      if (!validEventIds.has(id)) return
      this.ids = this.ids.includes(id) ? this.ids.filter((savedId) => savedId !== id) : [...this.ids, id]
      this.persist()
    },
    remove(id) { this.ids = this.ids.filter((savedId) => savedId !== id); this.persist() },
  },
})
