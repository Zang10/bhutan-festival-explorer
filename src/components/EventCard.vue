<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useSavedStore } from '../stores/saved'
const props = defineProps({ event: { type: Object, required: true }, showSave: { type: Boolean, default: true }, highlighted: { type: Boolean, default: false } })
const saved = useSavedStore()
const imageWrong = computed(() => props.event.imageStatus === 'wrong')
const dateLabel = computed(() => props.event.startDate
  ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${props.event.startDate}T00:00:00`))
  : 'Dates TBC')
</script>
<template>
  <article :id="`event-${event.id}`" class="event-card" :class="{ 'event-card-highlighted': highlighted }">
    <RouterLink class="card-image-link" :to="`/events/${event.id}`" :aria-label="`Explore ${event.name}`"><div v-if="imageWrong" class="photo-placeholder" role="img" :aria-label="`${event.name} image awaiting correction`"><span>{{ event.name }}</span><small>Photo coming soon</small></div><img v-else class="card-image" :src="event.image" :alt="event.imageAlt || `Festival scene in ${event.region}, Bhutan`" :style="{ objectPosition: event.imagePosition || 'center' }" loading="lazy"><span class="card-date">{{ dateLabel }}</span><span v-if="event.imageIsVenue && !imageWrong" class="venue-card-label">Venue photo</span></RouterLink>
    <div class="card-content"><div class="card-meta"><span>{{ event.region }}</span><span class="meta-dot">·</span><span>{{ event.type }}</span></div><RouterLink class="card-title" :to="`/events/${event.id}`">{{ event.name }}</RouterLink><p>{{ event.summary }}</p><button v-if="showSave" class="save-icon" type="button" :aria-label="saved.has(event.id) ? 'Remove from my list' : 'Save to my list'" @click="saved.toggle(event.id)">{{ saved.has(event.id) ? '♥' : '♡' }}</button></div>
  </article>
</template>
