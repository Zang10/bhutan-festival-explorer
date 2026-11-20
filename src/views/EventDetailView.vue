<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import ChecklistItem from '../components/ChecklistItem.vue'
import { useEventsStore } from '../stores/events'
import { useSavedStore } from '../stores/saved'
const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const events = useEventsStore()
const saved = useSavedStore()
const event = computed(() => events.getById(props.id))
const imageWrong = computed(() => event.value?.imageStatus === 'wrong')
const dateFormatter = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' })
const dateRange = computed(() => {
  if (!event.value) return ''
  if (!event.value.startDate || !event.value.endDate) return 'Dates to be announced'
  const start = new Date(`${event.value.startDate}T00:00:00`)
  const end = new Date(`${event.value.endDate}T00:00:00`)
  if (event.value.startDate === event.value.endDate) return dateFormatter.format(start)
  const sameMonth = start.getMonth() === end.getMonth()
  if (sameMonth) return `${new Intl.DateTimeFormat('en', { month: 'long' }).format(start)} ${start.getDate()}–${dateFormatter.format(end).split(' ').slice(-2).join(' ')}`
  return `${dateFormatter.format(start)} – ${dateFormatter.format(end)}`
})
const galleryImages = computed(() => {
  if (!event.value) return []
  const mainImage = {
    src: event.value.image,
    alt: event.value.imageAlt,
    credit: event.value.imageCredit,
    source: event.value.imageSource,
  }
  if (imageWrong.value) return []
  return [mainImage, ...(Array.isArray(event.value.gallery) ? event.value.gallery : [])]
})
const activeImage = ref('')
const activePhoto = computed(() => galleryImages.value.find((photo) => photo.src === activeImage.value) || galleryImages.value[0])
const checklistState = ref({})
const checklistKey = computed(() => `festival-checklist-${props.id}`)
function readChecklist() {
  try { checklistState.value = JSON.parse(localStorage.getItem(checklistKey.value) || '{}') }
  catch { checklistState.value = {} }
}
watch(() => props.id, readChecklist, { immediate: true })
watch(event, (value) => { activeImage.value = value?.imageStatus === 'wrong' ? (value?.gallery?.[0]?.src || '') : (value?.image || '') }, { immediate: true })
function setChecklist(index, value) {
  checklistState.value = { ...checklistState.value, [index]: value }
  localStorage.setItem(checklistKey.value, JSON.stringify(checklistState.value))
}
const checkedCount = computed(() => Object.values(checklistState.value).filter(Boolean).length)
const nearbyUrl = computed(() => event.value ? `https://www.google.com/maps/search/places+near+${encodeURIComponent(event.value.name + ' ' + event.value.region + ' Bhutan')}/@${event.value.lat},${event.value.lng},14z` : '#')
</script>
<template>
  <div v-if="event" class="detail-page">
    <NavBar />
    <main class="page-width detail-main">
      <RouterLink class="back-link" to="/">← <span>All festivals</span></RouterLink>
      <div class="detail-intro"><div><p class="eyebrow"><span class="detail-region">{{ event.region }}</span><span class="detail-separator">·</span>{{ event.type }}</p><h1>{{ event.name }}</h1><div class="detail-date"><span>◷</span> {{ dateRange }}<small>{{ event.datesNote }}</small></div></div><button class="save-button" :class="{ saved: saved.has(event.id) }" type="button" @click="saved.toggle(event.id)"><span>{{ saved.has(event.id) ? '♥' : '♡' }}</span> {{ saved.has(event.id) ? 'Saved to my list' : 'Save to my list' }}</button></div>
      <section class="detail-gallery" :class="{ 'single-image': galleryImages.length < 2, 'venue-note-visible': event.imageIsVenue && !imageWrong && activePhoto?.src === event.image }" :aria-label="galleryImages.length > 1 ? 'Festival image gallery' : 'Festival image'">
        <div class="gallery-main"><div v-if="!activePhoto" class="photo-placeholder detail-photo-placeholder" role="img" :aria-label="`${event.name} image awaiting correction`"><span>{{ event.name }}</span><small>Photo coming soon</small></div><img v-else :src="activePhoto.src" :alt="activePhoto.alt || `Festival scene in ${event.region}, Bhutan`"><span v-if="!imageWrong" class="gallery-label">BHUTAN · {{ event.region.toUpperCase() }}</span><a v-if="activePhoto?.source && activePhoto?.credit" class="image-credit" :href="activePhoto.source" target="_blank" rel="noopener noreferrer">Photo: {{ activePhoto.credit }}</a></div>
        <div v-if="galleryImages.length > 1" class="gallery-thumbs"><button v-for="(photo, index) in galleryImages" :key="photo.src" type="button" :class="{ active: activeImage === photo.src }" :aria-label="`Show festival image ${index + 1}: ${photo.alt || `Festival scene in ${event.region}, Bhutan`}`" @click="activeImage = photo.src"><img :src="photo.src" :alt="photo.alt || `Festival scene in ${event.region}, Bhutan`"></button></div>
      </section>
      <p v-if="event.imageIsVenue && !imageWrong && activePhoto?.src === event.image" class="venue-photo-note">Venue photo, not from the festival itself.</p>
      <div class="detail-columns"><div class="detail-story"><section class="detail-section"><p class="eyebrow">A GATHERING TO REMEMBER</p><h2>More than a festival.</h2><p class="detail-summary">{{ event.summary }}</p><a class="nearby-link" :href="nearbyUrl" target="_blank" rel="noopener noreferrer"><span class="nearby-icon">⌖</span><span>Explore nearby places<small>Open {{ event.region }} in Google Maps</small></span><span class="link-arrow">↗</span></a></section>
        <section class="detail-section etiquette-section"><p class="eyebrow">BE A THOUGHTFUL GUEST</p><h2>A little local etiquette.</h2><ul class="etiquette-list"><li v-for="tip in event.etiquette" :key="tip"><span class="etiquette-mark">✳</span>{{ tip }}</li></ul></section></div>
        <aside class="plan-card"><div class="plan-top"><div><p class="eyebrow">YOUR FESTIVAL PLAN</p><h2>Plan your visit.</h2></div><span class="plan-symbol">✳</span></div><p class="plan-intro">A few thoughtful preparations go a long way.</p><div class="checklist-items"><ChecklistItem v-for="(item, index) in event.checklist" :key="item" :item="item" :checked="!!checklistState[index]" @toggle="setChecklist(index, $event)" /></div><div class="plan-progress"><span>{{ checkedCount }} of {{ event.checklist.length }} ready</span><div class="progress-track"><span :style="{ width: `${event.checklist.length ? checkedCount / event.checklist.length * 100 : 0}%` }"></span></div></div></aside></div>
      <section class="more-section"><div class="more-heading"><div><p class="eyebrow">KEEP EXPLORING</p><h2>Let the journey unfold.</h2></div><RouterLink to="/">See all festivals <span>→</span></RouterLink></div></section>
    </main><footer class="site-footer page-width"><span>✳ festival explorer</span><span>Made for the curious. Rooted in respect. · <a href="/credits">Photo credits</a></span></footer>
  </div>
  <main v-else class="detail-not-found"><span class="empty-icon">✳</span><h1>Festival not found</h1><p>That festival may have moved. Explore the full calendar to find another.</p><button class="text-button" @click="router.push('/')">Back to festivals →</button></main>
</template>
