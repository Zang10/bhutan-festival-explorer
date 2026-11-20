<script setup>
import { computed, onMounted, ref } from 'vue'
import events from '../data/events.json'
import { readAuditReviews, saveAuditReviews } from '../utils/auditReviews'
import boundariesUrl from '../data/bhutan-dzongkhags.geojson?url'

const calendarSource = 'https://abto.org.bt/webroot/images/files/tentative_festival_dates_2027-1.pdf'
const calendar2027 = {
  'punakha-dromche':['2027-02-13','2027-02-15'],'punakha-tshechu':['2027-02-16','2027-02-18'],
  'paro-tshechu':['2027-03-18','2027-03-22'],'thimphu-drubchen':['2027-10-05','2027-10-05'],
  'wangdue-tshechu':['2027-10-08','2027-10-10'],'thimphu-tshechu':['2027-10-10','2027-10-12'],
  'jakar-tshechu':['2027-11-06','2027-11-09'],'black-necked-crane-festival':['2027-11-11','2027-11-11'],
  'jambay-drup':['2027-11-14','2027-11-17'],'mongar-tshechu':['2027-12-06','2027-12-08'],
  'trashigang-tshechu':['2027-12-07','2027-12-09'],'trongsa-tshechu':['2028-01-05','2028-01-09'],
  'gomphukora':['2027-03-16','2027-03-18'],'domkhar-tshechu':['2027-04-16','2027-04-18'],'ura-yakchoe':['2027-04-18','2027-04-22'],'chhukha-tshechu':['2027-11-06','2027-11-08'],
  'gasa-tshechu':['2027-03-16','2027-03-18'],'druk-wangyel-tshechu':['2027-12-13','2027-12-13'],
  'lhuentse-tshechu':['2028-01-05','2028-01-09'],'samdrup-jongkhar-tshechu':['2028-01-10','2028-01-12'],
}
const reviews = ref(readAuditReviews())
const sources = ref({})
const autoFlags = ref({})
const loading = ref(true)
const exporting = ref(false)
const normalize = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const textFor = (meta) => normalize([meta?.title, meta?.description, ...(meta?.categories || [])].join(' '))
function relevantPlaceTerms(event) {
  const venue = event.venue || ''
  const region = event.region || ''
  const aliases = event.region === 'Chhukha' ? ['Chukha Dzong', 'Chukha'] : []
  return [venue, region, ...aliases].filter(Boolean).map(normalize).filter((term) => term.length > 2)
}
function onPolygon(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi || 1e-20) + xi) inside = !inside
  }
  return inside
}
function geometryContains(geometry, lng, lat) {
  if (geometry.type === 'Polygon') return onPolygon(lng, lat, geometry.coordinates[0]) && !geometry.coordinates.slice(1).some((hole) => onPolygon(lng, lat, hole))
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some((poly) => onPolygon(lng, lat, poly[0]) && !poly.slice(1).some((hole) => onPolygon(lng, lat, hole)))
  return false
}
function canonicalRegion(region) {
  return ({ 'Chhukha':'Chukha', 'Lhuentse':'Lhuntse', 'Thimphu':'Thimpu' })[region] || region
}
function setReview(event, field, value) {
  reviews.value = { ...reviews.value, [event.id]: { ...(reviews.value[event.id] || {}), [field]: value } }
  saveAuditReviews(reviews.value)
}
function reviewFor(event) { return reviews.value[event.id] || {} }
function resetReview(event) {
  const next = { ...reviews.value }
  delete next[event.id]
  reviews.value = next
  saveAuditReviews(next)
}
function exportReview() {
  const payload = events.map((event) => ({ id:event.id, name:event.name, verified:event.verified, verificationNotes:event.verificationNotes, review:reviewFor(event), automaticFlags:autoFlags.value[event.id] || [] }))
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' }))
  const link = document.createElement('a')
  link.href = url; link.download = 'festival-audit-review.json'; link.click(); URL.revokeObjectURL(url)
}
const flaggedCount = computed(() => Object.values(autoFlags.value).filter((items) => items.length).length)
function metadataTitle(source) {
  try { return decodeURIComponent(new URL(source).pathname.split('/wiki/')[1] || '').replace(/_/g, ' ').replace(/^File:/i, '') }
  catch { return '' }
}
onMounted(async () => {
  try {
    const [boundaryResponse] = await Promise.all([fetch(boundariesUrl)])
    const geojson = await boundaryResponse.json()
    const polygons = geojson.features.filter((f) => f.properties?.shapeType !== 'ADM0')
    const titles = [...new Set(events.map((e) => metadataTitle(e.imageSource)).filter(Boolean))]
    const api = new URL('https://commons.wikimedia.org/w/api.php')
    api.search = new URLSearchParams({ action:'query', format:'json', origin:'*', titles:titles.map((t) => `File:${t}`).join('|'), prop:'imageinfo|categories', iiprop:'extmetadata', cllimit:'max' }).toString()
    const commonsResponse = await fetch(api)
    const commons = await commonsResponse.json()
    const pages = Object.values(commons.query?.pages || {})
    const byTitle = new Map(pages.map((page) => [normalize(page.title.replace(/^File:/i,'')), page]))
    for (const event of events) {
      const page = byTitle.get(normalize(metadataTitle(event.imageSource)))
      const ext = page?.imageinfo?.[0]?.extmetadata || {}
      const meta = { title:page?.title?.replace(/^File:/i,''), description:ext.ImageDescription?.value?.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim() || '', categories:(page?.categories || []).map((cat) => cat.title.replace(/^Category:/,'')), source:event.imageSource }
      sources.value[event.id] = meta
      const terms = relevantPlaceTerms(event)
      const commonsText = textFor(meta)
      const placeFlag = !meta.title || !terms.some((term) => commonsText.includes(term))
      const regionPoly = polygons.find((f) => normalize(f.properties?.shapeName) === normalize(canonicalRegion(event.region)))
      const coordinateFlag = !regionPoly || !geometryContains(regionPoly.geometry, Number(event.lng), Number(event.lat))
      const expected = calendar2027[event.id]
      const dateFlag = !expected || event.startDate !== expected[0] || event.endDate !== expected[1]
      const flags = []
      if (placeFlag) flags.push('Commons title, description, and categories do not mention the event dzongkhag or venue.')
      if (event.imageIsVenue) flags.push('Image is marked as a venue photo, not a festival photo.')
      if (coordinateFlag) flags.push('Coordinates are outside the polygon for this event’s dzongkhag, or the region could not be matched.')
      if (dateFlag) flags.push('Dates are not confirmed against a dated entry in the Department of Tourism 2027 calendar.')
      autoFlags.value[event.id] = flags
    }
  } catch (error) {
    console.error('Unable to load audit source metadata', error)
    for (const event of events) autoFlags.value[event.id] = ['Automatic source check could not be completed.']
  } finally { loading.value = false }
})
</script>

<template>
  <main class="audit-page">
    <header class="audit-header"><div><p class="eyebrow">PRIVATE REVIEW WORKSPACE</p><h1>Festival audit.</h1><p>Review every entry before marking it verified. Automatic flags are prompts for your review.</p></div><button type="button" class="share-button" @click="exportReview">Export review JSON</button></header>
    <p v-if="loading" class="audit-status" aria-live="polite">Loading Commons records and dzongkhag boundaries…</p>
    <p v-else class="audit-status" aria-live="polite">{{ flaggedCount }} of {{ events.length }} events have automatic flags. “Verified” remains under your control in the source data.</p>
    <article v-for="event in events" :key="event.id" class="audit-row">
      <div class="audit-event-image"><img :src="event.image" :alt="event.imageAlt"><span v-if="event.imageIsVenue">Venue photo</span></div>
      <div class="audit-event-details"><div class="audit-title-row"><h2>{{ event.name }}</h2><span :class="['audit-verified', event.verified ? 'is-verified':'']">{{ event.verified ? 'Verified':'Unverified' }}</span></div>
        <p><strong>Dzongkhag:</strong> {{ event.region }} · <strong>Venue:</strong> {{ event.venue || 'Not specified' }}</p>
        <p><strong>Dates:</strong> {{ event.startDate && event.endDate ? `${event.startDate} – ${event.endDate}` : 'Dates TBC' }}</p>
        <p class="audit-coordinates"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 22s8-7.3 8-13A8 8 0 1 0 4 9c0 5.7 8 13 8 13Z"/><circle cx="12" cy="9" r="2.5"/></svg><strong>Coordinates:</strong> {{ event.lat }}, {{ event.lng }}</p>
        <p><strong>Image source:</strong> <a :href="event.imageSource" target="_blank" rel="noopener noreferrer">Commons file page ↗</a></p>
        <div class="audit-commons"><strong>Commons title:</strong> {{ sources[event.id]?.title || 'Unavailable' }}<br><strong>Description:</strong> {{ sources[event.id]?.description || 'No description available' }}<br><strong>Categories:</strong> {{ sources[event.id]?.categories?.join(' · ') || 'No categories available' }}</div>
        <p><strong>Date source:</strong> <a :href="event.dateSource || calendarSource" target="_blank" rel="noopener noreferrer">Department of Tourism calendar ↗</a></p>
        <ul v-if="autoFlags[event.id]?.length" class="audit-flags"><li v-for="flag in autoFlags[event.id]" :key="flag">{{ flag }}</li></ul><p v-else class="audit-no-flags">No automatic flags.</p>
        <fieldset class="audit-checks"><legend>Your review</legend>
          <label v-for="[field,label] in [['imageCorrect','Image correct'],['venueCorrect','Venue correct'],['datesCorrect','Dates correct'],['coordinatesCorrect','Coordinates correct']]" :key="field"><input type="checkbox" :checked="reviewFor(event)[field] === true" @change="setReview(event,field,$event.target.checked)"><span>{{ label }}</span></label>
          <p class="audit-unchecked-note">Unchecked after review means incorrect. Use reset to return to unreviewed.</p>
        </fieldset>
        <label class="audit-notes"><span>Review notes</span><textarea :value="reviewFor(event).notes || ''" rows="2" @input="setReview(event,'notes',$event.target.value)" /></label>
        <button v-if="reviewFor(event) && Object.keys(reviewFor(event)).length" type="button" class="audit-reset" @click="resetReview(event)">Reset this review</button>
      </div>
    </article>
    <p v-if="!loading" class="audit-footer">{{ events.length }} festivals · Review choices are saved in this browser and can be exported as JSON.</p>
  </main>
</template>
<style scoped>
.audit-page{max-width:1120px;margin:0 auto;padding:36px 22px 70px;color:var(--ink)}
.audit-header{display:flex;align-items:end;justify-content:space-between;gap:20px;padding:15px 0 25px;border-bottom:1px solid var(--line)}
.audit-header h1{font:600 clamp(36px,5vw,54px)/1.1 'Playfair Display',serif;margin:0 0 9px}
.audit-header p:not(.eyebrow){color:var(--muted);font-size:12px;line-height:1.6;margin:0;max-width:610px}.audit-header .eyebrow{margin-bottom:8px}
.audit-status,.audit-footer{font-size:12px;color:var(--muted);padding:14px 0}
.audit-row{display:grid;grid-template-columns:minmax(230px,32%) minmax(0,1fr);gap:22px;padding:23px 0;border-bottom:1px solid var(--line)}
.audit-event-image{height:220px;position:sticky;top:20px;background:var(--soft);border:1px solid var(--line);border-radius:5px;overflow:hidden}.audit-event-image img{width:100%;height:100%;object-fit:cover}.audit-event-image>span{position:absolute;left:10px;bottom:10px;background:var(--surface);padding:5px 8px;border-radius:3px;font-size:10px}
.audit-title-row{display:flex;justify-content:space-between;gap:12px;align-items:start}.audit-title-row h2{font:600 24px/1.2 'Playfair Display',serif;margin:0 0 10px}.audit-verified{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#8a5540;border:1px solid currentColor;padding:4px 6px;border-radius:3px;white-space:nowrap}.audit-verified.is-verified{color:var(--green)}
.audit-event-details>p{font-size:11px;line-height:1.6;color:var(--muted);margin:7px 0}.audit-event-details a{color:var(--green);text-underline-offset:2px}.audit-coordinates{display:flex;align-items:center;gap:5px}.audit-coordinates svg{height:15px;width:15px;fill:none;stroke:var(--gold);stroke-width:2;margin-right:2px}
.audit-commons{padding:10px 12px;background:var(--soft);border-radius:4px;color:var(--muted);font-size:10px;line-height:1.65;overflow-wrap:anywhere}.audit-commons strong{color:var(--ink)}
.audit-flags{list-style:none;margin:11px 0;padding:0;display:grid;gap:6px}.audit-flags li{border-left:3px solid #b45d42;padding:5px 8px;background:#b45d4212;color:var(--ink);font-size:10px;line-height:1.45}.audit-no-flags{color:var(--green)!important}
.audit-checks{border:0;padding:10px 0 6px;margin:0;display:flex;align-items:center;flex-wrap:wrap;gap:12px}.audit-checks legend{font-size:11px;font-weight:700;padding:0 0 8px}.audit-checks label{display:flex;align-items:center;gap:5px;font-size:10px;color:var(--ink);cursor:pointer}.audit-checks input{accent-color:var(--green);width:15px;height:15px}.audit-unchecked-note{flex:1 0 100%;font-size:9px;color:var(--muted);margin:0}
.audit-notes{display:grid;gap:5px;font-size:10px;font-weight:700;margin-top:7px}.audit-notes textarea{width:100%;resize:vertical;border:1px solid var(--line);border-radius:3px;padding:8px;background:var(--surface);color:var(--ink);font:11px 'DM Sans',sans-serif}.audit-reset{margin-top:8px;border:0;background:none;color:var(--muted);text-decoration:underline;font-size:10px;cursor:pointer}
@media(max-width:680px){.audit-page{padding:22px 14px 50px}.audit-header{align-items:start;flex-direction:column}.audit-row{grid-template-columns:1fr;gap:13px}.audit-event-image{position:relative;top:auto;height:200px}.audit-title-row h2{font-size:21px}}
</style>
