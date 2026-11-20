import { defineStore } from 'pinia'
export const useFiltersStore = defineStore('filters', { state: () => ({ search: '', month: '', region: '', type: '', view: 'calendar', calendarMonth: '' }), actions: { reset() { this.search = ''; this.month = ''; this.region = ''; this.type = '' } } })
