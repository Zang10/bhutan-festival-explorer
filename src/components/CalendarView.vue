<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import EventCard from './EventCard.vue'
const props = defineProps({ events: { type: Array, required: true }, activeMonthKey: { type: String, default: '2027-02' }, highlightedEventId: { type: String, default: '' } })
const emit = defineEmits(['update:activeMonthKey'])
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
const activeDate = computed(() => new Date(`${props.activeMonthKey}-01T00:00:00`))
const activeMonth = computed(() => activeDate.value.getMonth())
const year = computed(() => activeDate.value.getFullYear())
watch(() => props.activeMonthKey, (key) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) emit('update:activeMonthKey', '2027-02')
})
const days = computed(() => {
  const first = new Date(year.value, activeMonth.value, 1).getDay()
  const total = new Date(year.value, activeMonth.value + 1, 0).getDate()
  return [...Array(first).fill(null), ...Array.from({ length: total }, (_, index) => index + 1)]
})
const datedMonthEvents = computed(() => props.events.filter((event) => event.month === monthNames[activeMonth.value] && event.startDate && event.endDate))
const undatedMonthEvents = computed(() => props.events.filter((event) => event.month === monthNames[activeMonth.value] && (!event.startDate || !event.endDate)))
const monthEvents = computed(() => [...datedMonthEvents.value, ...undatedMonthEvents.value])
const undatedEvents = computed(() => props.events.filter((event) => !event.startDate || !event.endDate))
const monthKey = computed(() => `${year.value}-${String(activeMonth.value + 1).padStart(2, '0')}`)
const eventsFor = (day) => day ? datedMonthEvents.value.filter((event) => {
  if (!event.startDate) return false
  const date = new Date(`${event.startDate}T00:00:00`)
  return date.getFullYear() === year.value && date.getMonth() === activeMonth.value && date.getDate() === day
}) : []
const seasonMonthKeys = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(2027, 1 + index, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
})
function moveMonth(step) {
  const currentIndex = seasonMonthKeys.indexOf(props.activeMonthKey)
  const nextIndex = (currentIndex + step + seasonMonthKeys.length) % seasonMonthKeys.length
  emit('update:activeMonthKey', seasonMonthKeys[nextIndex])
}
async function jumpToMonth(monthKeyValue, eventId) {
  const [targetYear, targetMonth] = monthKeyValue.split('-').map(Number)
  emit('update:activeMonthKey', monthKeyValue)
  await nextTick()
  document.getElementById(monthKeyValue)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  if (eventId) document.getElementById(`event-${eventId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  return targetYear
}
async function jumpToDatesTbc(eventId) {
  await nextTick()
  document.getElementById('dates-tbc')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  if (eventId) document.getElementById(`event-${eventId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
defineExpose({ jumpToMonth, jumpToDatesTbc })
</script>
<template>
  <section class="calendar-panel" aria-label="Festival calendar">
    <div class="calendar-heading"><div><p class="eyebrow">PLAN YOUR YEAR</p><h2>{{ monthNames[activeMonth] }} <span>{{ year }}</span></h2></div><div class="month-nav"><button type="button" aria-label="Previous month" @click="moveMonth(-1)">←</button><button type="button" aria-label="Next month" @click="moveMonth(1)">→</button></div></div>
    <div class="calendar-grid calendar-days" aria-hidden="true"><span v-for="day in ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']" :key="day">{{ day }}</span></div>
    <div class="calendar-grid date-grid"><div v-for="(day, index) in days" :key="`${activeMonth}-${index}`" class="date-cell" :class="{ 'is-today': day === new Date().getDate() && activeMonth === new Date().getMonth() && year === new Date().getFullYear() }"><span v-if="day" class="day-number">{{ day }}</span><RouterLink v-for="event in eventsFor(day)" :key="event.id" class="calendar-event" :to="`/events/${event.id}`">{{ event.name }}</RouterLink></div></div>
    <div v-if="undatedMonthEvents.length" class="undated-month-row"><span class="undated-month-label">Dates to be confirmed</span><RouterLink v-for="event in undatedMonthEvents" :key="event.id" class="undated-month-chip" :to="`/events/${event.id}`">{{ event.name }}</RouterLink></div>
    <div class="calendar-upcoming" :id="monthKey"><div class="section-heading"><div><p class="eyebrow">THIS MONTH</p><h3>{{ monthEvents.length }} festival{{ monthEvents.length === 1 ? '' : 's' }} to discover</h3></div></div><div v-if="monthEvents.length" class="event-grid"><EventCard v-for="event in monthEvents" :key="event.id" :event="event" :highlighted="highlightedEventId === event.id" /></div><div v-else class="empty-state"><span class="empty-icon">✳</span><h3>No festivals this month</h3><p>No festivals listed this month. Bhutan's festival calendar is quietest during the monsoon.</p></div></div>
    <section v-if="undatedEvents.length" id="dates-tbc" class="calendar-upcoming dates-tbc"><div class="section-heading"><div><p class="eyebrow">FESTIVAL DATES TO BE ANNOUNCED</p><h3>Dates TBC</h3></div></div><div class="event-grid"><EventCard v-for="event in undatedEvents" :key="event.id" :event="event" :highlighted="highlightedEventId === event.id" /></div></section>
  </section>
</template>
