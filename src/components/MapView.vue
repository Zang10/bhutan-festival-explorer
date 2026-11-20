<script setup>
import { nextTick, onBeforeUnmount, onMounted, watch, ref } from 'vue'
import L from 'leaflet'
import boundaryUrl from '../data/bhutan-dzongkhags.geojson?url'

const props = defineProps({ events: { type: Array, required: true } })
const host = ref(null)
let map
let countryLayer
let districtLayer
let districtLabels
let referenceLabels
let festivalPoints
let resizeObserver
let themeObserver
let fitFrame
let fitZoom = 7

let countryFeatures = []
let districtFeatures = []
const typeColors = {
  Religious: '#6f8c66',
  Cultural: '#bf8a40',
  Nature: '#4d8790',
  Food: '#bf705e',
}
const cityLabels = [
  { name: 'Thimphu', lat: 27.4728, lng: 89.639 },
  { name: 'Paro', lat: 27.428, lng: 89.416 },
  { name: 'Punakha', lat: 27.5916, lng: 89.877 },
  { name: 'Bumthang', lat: 27.55, lng: 90.75 },
  { name: 'Trashigang', lat: 27.33, lng: 91.55 },
]
const dzongkhagDisplayNames = { Chukha: 'Chhukha', Lhuntse: 'Lhuentse', Thimpu: 'Thimphu' }
const dateFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' })

function cssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function eventDates(event) {
  if (!event.startDate || !event.endDate) return 'Dates TBC'
  const startDate = new Date(`${event.startDate}T00:00:00`)
  const endDate = new Date(`${event.endDate}T00:00:00`)
  const start = dateFormatter.format(startDate)
  if (event.startDate === event.endDate) return start
  return `${start} – ${dateFormatter.format(endDate)}`
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

function dzongkhagName(feature) {
  const name = feature.properties.shapeName
  return dzongkhagDisplayNames[name] || name
}

function styleCountry() {
  return {
    color: cssColor('--map-outline'),
    weight: 2.5,
    opacity: 1,
    fillColor: cssColor('--paper'),
    fillOpacity: 1,
    interactive: false,
  }
}

function styleDistrict() {
  return {
    color: cssColor('--map-stroke'),
    weight: 1.1,
    opacity: 1,
    fillColor: cssColor('--map-fill'),
    fillOpacity: 1,
  }
}

function updateTheme() {
  if (!map) return
  countryLayer?.setStyle(styleCountry())
  districtLayer?.setStyle(styleDistrict())
  host.value?.style.setProperty('background-color', cssColor('--paper'))
}

function updateDistrictLabels() {
  if (!map || !districtLabels) return
  if (map.getZoom() >= fitZoom + 1 && !map.hasLayer(districtLabels)) districtLabels.addTo(map)
  if (map.getZoom() < fitZoom + 1 && map.hasLayer(districtLabels)) map.removeLayer(districtLabels)
}

function fitCountry() {
  if (!map || !host.value?.clientWidth || !host.value?.clientHeight || !countryLayer) return
  map.invalidateSize({ pan: false })
  const countryBounds = countryLayer.getBounds()
  const paddedBounds = countryBounds.pad(0.1)
  map.setMaxBounds(paddedBounds)
  map.fitBounds(countryBounds, { padding: [20, 20] })
  fitZoom = map.getZoom()
  map.setMinZoom(fitZoom)
  updateDistrictLabels()
}

function scheduleFit() {
  cancelAnimationFrame(fitFrame)
  fitFrame = requestAnimationFrame(fitCountry)
}

function eventDisplayPositions(events) {
  const positions = new Map()
  const assigned = new Set()

  events.forEach((event, index) => {
    if (assigned.has(index)) return
    const group = [index]
    assigned.add(index)
    for (let cursor = 0; cursor < group.length; cursor += 1) {
      const current = events[group[cursor]]
      events.forEach((candidate, candidateIndex) => {
        if (assigned.has(candidateIndex)) return
        const distance = Math.hypot(current.lat - candidate.lat, current.lng - candidate.lng)
        if (distance <= 0.05) {
          assigned.add(candidateIndex)
          group.push(candidateIndex)
        }
      })
    }

    if (group.length === 1) {
      const eventInGroup = events[group[0]]
      positions.set(eventInGroup.id, { lat: eventInGroup.lat, lng: eventInGroup.lng, offset: false })
      return
    }

    const center = group.reduce((result, eventIndex) => ({
      lat: result.lat + events[eventIndex].lat / group.length,
      lng: result.lng + events[eventIndex].lng / group.length,
    }), { lat: 0, lng: 0 })
    const radius = 0.04 + Math.min(group.length - 2, 3) * 0.003
    const longitudeRadius = radius / Math.cos(center.lat * Math.PI / 180)
    group.forEach((eventIndex, positionIndex) => {
      const angle = -Math.PI / 2 + 2 * Math.PI * positionIndex / group.length
      const eventInGroup = events[eventIndex]
      positions.set(eventInGroup.id, {
        lat: center.lat + Math.sin(angle) * radius,
        lng: center.lng + Math.cos(angle) * longitudeRadius,
        offset: true,
      })
    })
  })

  return positions
}

function makeLegend() {
  const legend = L.control({ position: 'bottomleft' })
  legend.onAdd = () => {
    const container = L.DomUtil.create('div', 'festival-map-legend')
    container.setAttribute('role', 'group')
    container.setAttribute('aria-label', 'Festival type legend')
    container.innerHTML = Object.entries(typeColors).map(([type, color]) => `
      <span class="festival-map-legend-item"><i style="--legend-color:${color}"></i>${type}</span>
    `).join('')
    L.DomEvent.disableClickPropagation(container)
    L.DomEvent.disableScrollPropagation(container)
    return container
  }
  legend.addTo(map)
}

function addReferenceLabels() {
  referenceLabels = L.layerGroup()
  cityLabels.forEach(({ name, lat, lng }) => {
    const icon = L.divIcon({
      className: 'map-reference-icon',
      html: `<span>${escapeHtml(name)}</span>`,
      iconSize: [0, 0],
    })
    L.marker([lat, lng], { icon, interactive: false, keyboard: false, zIndexOffset: -100 }).addTo(referenceLabels)
  })
  referenceLabels.addTo(map)
}

function addDistrictLabels() {
  districtLabels = L.layerGroup()
  districtLayer.eachLayer((layer) => {
    const name = dzongkhagName(layer.feature)
    const tooltip = L.tooltip({
      permanent: true,
      direction: 'center',
      className: 'dzongkhag-label',
      opacity: 0.9,
    }).setLatLng(layer.getBounds().getCenter()).setContent(escapeHtml(name))
    tooltip.addTo(districtLabels)
  })
}

function updateFestivalPoints() {
  if (!map || !festivalPoints) return
  festivalPoints.clearLayers()
  const positions = eventDisplayPositions(props.events)

  props.events.forEach((event) => {
    const position = positions.get(event.id)
    const point = L.circleMarker([position.lat, position.lng], {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillColor: typeColors[event.type] || typeColors.Cultural,
      fillOpacity: 1,
    })
    point.bindTooltip(escapeHtml(event.name), { direction: 'top', offset: [0, -7], className: 'festival-map-tooltip' })
    const venueText = position.offset
      ? `<br><small>Festival location: ${event.lat.toFixed(5)}, ${event.lng.toFixed(5)}</small>`
      : ''
    const popup = `<strong>${escapeHtml(event.name)}</strong><br>${escapeHtml(eventDates(event))}${venueText}<br><a href="/events/${encodeURIComponent(event.id)}">View festival →</a>`
    point.bindPopup(popup, { className: 'festival-map-popup' })
    point.on('add', () => requestAnimationFrame(() => {
      const path = point.getElement()
      if (!path) return
      path.setAttribute('tabindex', '0')
      path.setAttribute('role', 'button')
      path.setAttribute('aria-label', `${event.name}, ${eventDates(event)}`)
      path.addEventListener('keydown', (keyboardEvent) => {
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
          keyboardEvent.preventDefault()
          point.openPopup()
        }
      })
      path.addEventListener('focus', () => point.openTooltip())
      path.addEventListener('blur', () => point.closeTooltip())
    }))
    festivalPoints.addLayer(point)
  })
}

onMounted(async () => {
  const response = await fetch(boundaryUrl)
  const boundaries = await response.json()
  countryFeatures = boundaries.features.filter((feature) => feature.properties.boundaryLevel === 'country')
  districtFeatures = boundaries.features.filter((feature) => feature.properties.boundaryLevel === 'dzongkhag')

  map = L.map(host.value, {
    scrollWheelZoom: false,
    minZoom: 2,
    maxZoom: 13,
    maxBoundsViscosity: 1,
    attributionControl: false,
  }).setView([27.45, 90.45], 7)

  countryLayer = L.geoJSON({ type: 'FeatureCollection', features: countryFeatures }, { style: styleCountry }).addTo(map)
  districtLayer = L.geoJSON({
    type: 'FeatureCollection',
    features: districtFeatures,
  }, {
    style: styleDistrict,
    onEachFeature(feature, layer) {
      const name = dzongkhagName(feature)
      layer.bindTooltip(escapeHtml(name), { sticky: true, className: 'dzongkhag-hover-label' })
      layer.on('mouseover', () => layer.setStyle({ fillColor: cssColor('--map-hover'), weight: 1.5 }))
      layer.on('mouseout', () => districtLayer.resetStyle(layer))
    },
  }).addTo(map)

  addDistrictLabels()
  addReferenceLabels()
  festivalPoints = L.layerGroup().addTo(map)
  updateFestivalPoints()
  makeLegend()

  map.on('zoomend', updateDistrictLabels)
  resizeObserver = new ResizeObserver((entries) => {
    if (entries.some((entry) => entry.contentRect.width > 0 && entry.contentRect.height > 0)) scheduleFit()
  })
  resizeObserver.observe(host.value)
  themeObserver = new MutationObserver(updateTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  await nextTick()
  scheduleFit()
})

watch(() => props.events, updateFestivalPoints, { deep: true })

onBeforeUnmount(() => {
  cancelAnimationFrame(fitFrame)
  resizeObserver?.disconnect()
  themeObserver?.disconnect()
  map?.remove()
})
</script>

<template>
  <section class="map-section" aria-label="Festival locations">
    <div ref="host" class="map-canvas" role="application" aria-label="Interactive map of Bhutan festivals"></div>
    <p class="map-caption">{{ events.length }} festivals across Bhutan <span>·</span> Select a point to explore</p>
    <p class="map-attribution">Boundaries: geoBoundaries (CC BY 4.0)</p>
  </section>
</template>
