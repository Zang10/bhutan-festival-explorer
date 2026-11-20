<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import NavBar from '../components/NavBar.vue'
import events from '../data/events.json'

const credits = computed(() => events.flatMap((event) => {
  const main = [{
    key: event.id,
    event: event.name,
    author: event.imageAuthor,
    license: event.imageLicense,
    source: event.imageSource,
    verified: event.creditVerified,
  }]
  const gallery = (Array.isArray(event.gallery) ? event.gallery : []).map((photo, index) => {
    const [author = '', license = ''] = (photo.credit || '').split(' · ')
    return { key: `${event.id}-gallery-${index}`, event: event.name, author, license, source: photo.source, verified: true }
  })
  return [...main, ...gallery]
}))
const allCredits = computed(() => [{
  key: 'home-hero',
  event: 'Festival Explorer home hero',
  author: 'Nina R / UnpetitproleX',
  license: 'CC BY 2.0',
  source: 'https://commons.wikimedia.org/wiki/File:Paro_Taktsang,_Bhutan_(edited).jpg',
  verified: true,
}, ...credits.value])
</script>

<template>
  <div class="credits-page">
    <NavBar />
    <main class="page-width credits-main">
      <RouterLink class="back-link" to="/">← <span>Explore festivals</span></RouterLink>
      <p class="eyebrow">IMAGE ATTRIBUTION</p>
      <h1>Photo credits.</h1>
      <p class="credits-intro">Creators, licenses, and source pages for images used across Festival Explorer.</p>
      <p class="credits-site-note">Festival dates come from the ABTO / Department of Tourism tentative 2027 calendar (updated 14 February 2025) and may change. Always confirm with local organizers before travelling.</p>
      <div class="credits-table-wrap">
        <table class="credits-table">
          <thead><tr><th scope="col">Event</th><th scope="col">Author</th><th scope="col">License</th><th scope="col">Source</th></tr></thead>
          <tbody>
            <tr v-for="credit in allCredits" :key="credit.key">
              <td>{{ credit.event }}</td>
              <td>{{ credit.author }}<small v-if="credit.verified === false" class="credit-unverified">Attribution could not be confirmed</small></td>
              <td>{{ credit.license }}</td>
              <td><a :href="credit.source" target="_blank" rel="noopener noreferrer">Wikimedia Commons ↗</a></td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
    <footer class="site-footer page-width"><span>✳ festival explorer</span><span>Made for the curious. Rooted in respect. · <a href="/credits">Photo credits</a><br><small>Festival dates may change; confirm with local organizers.</small></span></footer>
  </div>
</template>
