<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import FilterBar from '../components/FilterBar.vue'
import CalendarView from '../components/CalendarView.vue'
import MapView from '../components/MapView.vue'
import { useEventsStore } from '../stores/events'
import { useFiltersStore } from '../stores/filters'
const eventsStore = useEventsStore()
const filters = useFiltersStore()
const router = useRouter()
const seasonMonthKeys = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(2027, 1 + index, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
})
const today = new Date()
const todayMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
const defaultMonthKey = todayMonthKey >= seasonMonthKeys[0] && todayMonthKey <= seasonMonthKeys.at(-1)
  ? todayMonthKey
  : seasonMonthKeys[0]
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
const navigationStorageKey = 'festival-explorer-navigation'
const queryValue = (key) => {
  const value = router.currentRoute.value.query[key]
  return Array.isArray(value) ? value[0] : value
}
let savedNavigation = {}
try {
  savedNavigation = JSON.parse(sessionStorage.getItem(navigationStorageKey) || '{}')
} catch {
  savedNavigation = {}
}
const queryMonth = queryValue('month')
const legacyMonthFilter = queryMonth && monthNames.includes(queryMonth) ? queryMonth : undefined
const restoredCalendarMonth = queryMonth && seasonMonthKeys.includes(queryMonth)
  ? queryMonth
  : seasonMonthKeys.includes(savedNavigation.calendarMonth) ? savedNavigation.calendarMonth : defaultMonthKey
const restoredFilterMonth = queryValue('filterMonth') ?? legacyMonthFilter ?? savedNavigation.month ?? ''
filters.calendarMonth = restoredCalendarMonth
filters.month = restoredFilterMonth
filters.search = queryValue('search') ?? savedNavigation.search ?? ''
filters.region = queryValue('region') ?? savedNavigation.region ?? ''
filters.type = queryValue('type') ?? savedNavigation.type ?? ''
const restoredView = queryValue('view') ?? savedNavigation.view ?? 'calendar'
filters.view = ['calendar','map'].includes(restoredView) ? restoredView : 'calendar'
const calendarRef = ref(null)
const highlightedEventId = ref('')
const searchSummary = ref('')
const searchCycleIndex = ref(-1)
let highlightTimer
const filteredEvents = computed(() => eventsStore.events.filter((event) => {
  const text = `${event.name} ${event.region} ${event.summary}`.toLowerCase()
  return (!filters.search || text.includes(filters.search.toLowerCase())) && (!filters.month || event.month === filters.month) && (!filters.region || event.region === filters.region) && (!filters.type || event.type === filters.type)
}))
const seasonMatches = computed(() => filteredEvents.value
  .filter((event) => !(event.startDate && event.endDate) || (event.startDate >= '2027-02-01' && event.startDate <= '2028-01-31'))
  .sort((a, b) => {
    if (!(a.startDate && a.endDate)) return (b.startDate && b.endDate) ? 1 : a.name.localeCompare(b.name)
    if (!(b.startDate && b.endDate)) return -1
    return a.startDate.localeCompare(b.startDate)
  }))
const searchMonthGroups = computed(() => {
  const groups = new Map()
  for (const event of seasonMatches.value) {
    const key = event.startDate && event.endDate ? event.startDate.slice(0, 7) : 'dates-tbc'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(event)
  }
  return [...groups.entries()]
})
watch(() => filters.month, (month) => {
  if (!month) return
  const monthKey = seasonMonthKeys.find((key) => monthNames[Number(key.slice(5, 7)) - 1] === month)
  if (monthKey) filters.calendarMonth = monthKey
})
watch([() => filters.search, () => filters.month, () => filters.region, () => filters.type], () => {
  searchCycleIndex.value = -1
  searchSummary.value = ''
  highlightedEventId.value = ''
})
function syncNavigationState() {
  const navigation = {
    calendarMonth: filters.calendarMonth || defaultMonthKey,
    search: filters.search,
    month: filters.month,
    region: filters.region,
    type: filters.type,
    view: filters.view,
  }
  try { sessionStorage.setItem(navigationStorageKey, JSON.stringify(navigation)) } catch { /* Storage can be unavailable in private browsing. */ }
  if (router.currentRoute.value.name !== 'home') return
  const query = {
    month: navigation.calendarMonth,
    view: navigation.view,
    ...(navigation.search ? { search: navigation.search } : {}),
    ...(navigation.month ? { filterMonth: navigation.month } : {}),
    ...(navigation.region ? { region: navigation.region } : {}),
    ...(navigation.type ? { type: navigation.type } : {}),
  }
  const currentQuery = router.currentRoute.value.query
  if (Object.keys(query).every((key) => currentQuery[key] === query[key]) && Object.keys(currentQuery).length === Object.keys(query).length) return
  router.replace({ name: 'home', query })
}
onMounted(syncNavigationState)
watch([() => filters.calendarMonth, () => filters.search, () => filters.month, () => filters.region, () => filters.type, () => filters.view], syncNavigationState, { flush: 'post' })
async function navigateSearchResults() {
  const matches = seasonMatches.value
  if (!matches.length) return
  const groups = searchMonthGroups.value
  searchCycleIndex.value = (searchCycleIndex.value + 1) % groups.length
  const [monthKey, monthMatches] = groups[searchCycleIndex.value]
  const datedMonths = groups.filter(([key]) => key !== 'dates-tbc').length
  const hasUndated = groups.some(([key]) => key === 'dates-tbc')
  if (!datedMonths) searchSummary.value = `${matches.length} ${matches.length === 1 ? 'festival found' : 'festivals found'} with dates TBC`
  else if (hasUndated) searchSummary.value = `${matches.length} festivals found in ${datedMonths} ${datedMonths === 1 ? 'month' : 'months'} and Dates TBC`
  else searchSummary.value = `${matches.length} ${matches.length === 1 ? 'festival found' : 'festivals found'} in ${datedMonths} ${datedMonths === 1 ? 'month' : 'months'}`
  const target = monthMatches[0]
  highlightedEventId.value = target.id
  if (filters.view === 'map') filters.view = 'calendar'
  await nextTick()
  if (monthKey === 'dates-tbc') await calendarRef.value?.jumpToDatesTbc(target.id)
  else await calendarRef.value?.jumpToMonth(monthKey, target.id)
  window.clearTimeout(highlightTimer)
  highlightTimer = window.setTimeout(() => { highlightedEventId.value = '' }, 2000)
}
</script>
<template>
  <div class="home-page"><NavBar />
    <main>
      <section class="hero page-width"><div class="hero-copy"><p class="eyebrow"><span></span> THE KINGDOM OF BHUTAN</p><h1>Find your way to<br><em>something sacred.</em></h1><p class="hero-intro">A year of color, culture, and connection.<br>Discover Bhutan’s festivals, one valley at a time.</p><a class="hero-cta" href="#discover">Explore the calendar <span>↓</span></a></div><div class="hero-visual"><img src="/images/hero-paro-taktsang.jpg" alt="Paro Taktsang, or Tiger’s Nest Monastery, perched on a cliff in Bhutan’s Paro Valley"><div class="image-caption"><span class="caption-sparkle">✳</span><span>Paro Taktsang, Bhutan<small>Festivals across the kingdom</small></span></div><span class="hero-stamp">DRUK<br>YUL</span></div><div class="hero-decoration" aria-hidden="true">✳</div></section>
      <section id="discover" class="discover-section page-width"><div class="section-heading discover-heading"><div><p class="eyebrow">THE FESTIVAL COLLECTION</p><h2>Make room for wonder.</h2></div><p>From highland valleys to ancient dzongs,<br>find the gathering that calls to you.</p></div>
        <FilterBar :events="eventsStore.events" @search-enter="navigateSearchResults" />
        <div class="results-heading" aria-live="polite"><p><strong>{{ filteredEvents.length }}</strong> {{ filteredEvents.length === 1 ? 'festival' : 'festivals' }} found<small v-if="searchSummary" class="search-summary">{{ searchSummary }}</small></p><button v-if="filters.search || filters.month || filters.region || filters.type" class="clear-filters" type="button" @click="filters.reset()">Clear filters <span>×</span></button></div>
        <div v-if="eventsStore.isLoading" class="event-grid" aria-label="Loading festivals"><div v-for="i in 3" :key="i" class="skeleton-card"><div class="skeleton-block"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>
        <MapView v-else-if="filters.view === 'map' && filteredEvents.length" :events="filteredEvents" />
        <div v-else-if="filters.view === 'map'" class="empty-state"><span class="empty-icon">⌖</span><h3>No festivals on the map</h3><p>Try adjusting your search or filters.</p><button class="text-button" type="button" @click="filters.reset()">Clear all filters →</button></div>
        <CalendarView v-else-if="filteredEvents.length" ref="calendarRef" :events="filteredEvents" v-model:active-month-key="filters.calendarMonth" :highlighted-event-id="highlightedEventId" />
        <div v-else class="empty-state"><span class="empty-icon">✳</span><h3>No festivals found</h3><p>Try a different search or clear your filters.</p><button class="text-button" type="button" @click="filters.reset()">Clear all filters →</button></div>
      </section>
      <footer class="site-footer page-width"><span>✳ festival explorer</span><span class="footer-note"><span>Made for the curious. Rooted in respect. · <a href="/credits">Photo credits</a></span><small class="photo-credit">Photo: <a href="https://commons.wikimedia.org/wiki/File:Paro_Taktsang,_Bhutan_(edited).jpg" target="_blank" rel="noopener noreferrer">Nina R / UnpetitproleX, Wikimedia Commons</a> · <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener noreferrer">CC BY 2.0</a> · cropped and compressed</small></span></footer>
    </main>
  </div>
</template>


