<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import EventCard from '../components/EventCard.vue'
import { useEventsStore } from '../stores/events'
import { useSavedStore } from '../stores/saved'
const route = useRoute()
const router = useRouter()
const eventsStore = useEventsStore()
const saved = useSavedStore()
const copied = ref(false)
const sharedIds = ref(null)
function parseIds(value) {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? [...new Set(raw.split(',').filter(Boolean))].filter((id) => eventsStore.getById(id)) : null
}
function syncFromUrl() { sharedIds.value = parseIds(route.query.ids) }
syncFromUrl()
watch(() => route.query.ids, syncFromUrl)
const displayIds = computed(() => sharedIds.value ?? saved.ids)
const displayEvents = computed(() => displayIds.value.map((id) => eventsStore.getById(id)).filter(Boolean))
const isSharedView = computed(() => sharedIds.value !== null)
async function removeEvent(id) {
  if (saved.has(id)) saved.remove(id)
  if (isSharedView.value) {
    const next = sharedIds.value.filter((savedId) => savedId !== id)
    await router.replace({ query: { ids: next.join(',') } })
  }
}
async function copyShareLink() {
  const ids = isSharedView.value ? sharedIds.value : saved.ids
  const query = isSharedView.value || ids.length ? { ids: ids.join(',') } : {}
  await router.replace({ query })
  const url = new URL(router.resolve({ name: 'saved', query }).href, window.location.origin).toString()
  try { await navigator.clipboard.writeText(url) }
  catch {
    const field = document.createElement('textarea')
    field.value = url
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.append(field)
    field.select()
    document.execCommand('copy')
    field.remove()
  }
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 2200)
}
</script>
<template>
  <div class="saved-page"><NavBar /><main class="page-width saved-main">
    <RouterLink class="back-link" to="/">← <span>Explore festivals</span></RouterLink>
    <section class="saved-heading"><div><p class="eyebrow">YOUR PERSONAL COLLECTION</p><h1>{{ isSharedView ? 'A festival list to explore.' : 'Keep the good things close.' }}</h1><p>{{ isSharedView ? 'Someone shared these Bhutan festivals with you.' : 'Save the festivals you love and start planning your journey.' }}</p></div><button class="share-button" type="button" @click="copyShareLink"><span>↗</span>{{ copied ? 'Link copied!' : 'Copy shareable link' }}</button></section>
    <div class="saved-count"><span>{{ displayEvents.length }} {{ displayEvents.length === 1 ? 'festival' : 'festivals' }}</span><span v-if="isSharedView" class="shared-badge">SHARED LIST</span></div>
    <div v-if="displayEvents.length" class="saved-grid"><article v-for="event in displayEvents" :key="event.id" class="saved-card-wrap"><EventCard :event="event" :show-save="false" /><button class="remove-saved" type="button" :aria-label="`Remove ${event.name} from this list`" @click="removeEvent(event.id)">× <span>Remove</span></button></article></div>
    <div v-else class="saved-empty"><div class="empty-illustration">♡</div><p class="eyebrow">A LITTLE SPACE FOR WONDER</p><h2>{{ isSharedView ? 'This shared list is empty.' : 'Your list is waiting.' }}</h2><p>{{ isSharedView ? 'The shared festivals may have been removed.' : 'Save a festival that speaks to you. It will be right here when you return.' }}</p><RouterLink class="explore-button" to="/">Explore festivals <span>→</span></RouterLink></div>
  </main><footer class="site-footer page-width"><span>✳ festival explorer</span><span>Made for the curious. Rooted in respect. · <a href="/credits">Photo credits</a></span></footer></div>
</template>
