import { defineStore } from 'pinia'
import data from '../data/events.json'
export const useEventsStore = defineStore('events', { state: () => ({ events: data, isLoading: false }), getters: { getById: (state) => (id) => state.events.find((event) => event.id === id) } })
