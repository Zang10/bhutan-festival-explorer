<script setup>
import { computed } from 'vue'
import { useFiltersStore } from '../stores/filters'
const props = defineProps({ events: { type: Array, required: true } })
const emit = defineEmits(['search-enter'])
const filters = useFiltersStore()
const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
const regions = computed(() => [...new Set(props.events.map((event) => event.region))].sort())
const types = computed(() => [...new Set(props.events.map((event) => event.type))].sort())
</script>
<template>
  <section class="filter-panel" aria-label="Search and filter festivals">
    <label class="search-box"><span aria-hidden="true">⌕</span><input v-model="filters.search" type="search" placeholder="Search festivals, places…" aria-label="Search festivals and places" @keydown.enter.prevent="emit('search-enter')"><kbd>⌘ K</kbd></label>
    <div class="filter-controls">
      <label><span class="sr-only">Month</span><select v-model="filters.month"><option value="">Any month</option><option v-for="month in months" :key="month" :value="month">{{ month }}</option></select></label>
      <label><span class="sr-only">Region</span><select v-model="filters.region"><option value="">Any region</option><option v-for="region in regions" :key="region">{{ region }}</option></select></label>
      <label><span class="sr-only">Event type</span><select v-model="filters.type"><option value="">Any type</option><option v-for="type in types" :key="type">{{ type }}</option></select></label>
      <div class="view-switch" role="group" aria-label="Choose results view"><button type="button" :aria-pressed="filters.view === 'calendar'" @click="filters.view = 'calendar'">▦ <span>Calendar</span></button><button type="button" :aria-pressed="filters.view === 'map'" @click="filters.view = 'map'">⌖ <span>Map</span></button></div>
    </div>
  </section>
</template>
