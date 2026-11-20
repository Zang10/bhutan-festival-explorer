<script setup>
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
const dark = ref(localStorage.getItem('festival-explorer-theme') === 'dark')
function applyTheme(value) {
  document.documentElement.dataset.theme = value ? 'dark' : 'light'
  localStorage.setItem('festival-explorer-theme', value ? 'dark' : 'light')
}
applyTheme(dark.value)
watch(dark, applyTheme)
</script>
<template>
  <header class="nav-wrap"><nav class="navbar page-width" aria-label="Main navigation">
    <RouterLink class="brand" to="/" aria-label="Festival Explorer home"><span class="brand-mark">✳</span><span>festival<span class="brand-light">explorer</span></span></RouterLink>
    <div class="nav-links"><RouterLink to="/">Explore</RouterLink><RouterLink to="/saved">My list</RouterLink><button class="theme-toggle" type="button" :aria-label="dark ? 'Switch to light mode' : 'Switch to dark mode'" @click="dark = !dark">{{ dark ? '☼' : '☾' }}</button></div>
  </nav></header>
</template>
