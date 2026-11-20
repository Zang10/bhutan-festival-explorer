import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import EventDetailView from '../views/EventDetailView.vue'
import SavedView from '../views/SavedView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import CreditsView from '../views/CreditsView.vue'
const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/events/:id', name: 'event', component: EventDetailView, props: true },
  { path: '/saved', name: 'saved', component: SavedView },
  { path: '/credits', name: 'credits', component: CreditsView },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
]

if (import.meta.env.DEV) {
  routes.splice(routes.length - 1, 0, {
    path: '/audit', name: 'audit', component: () => import('../views/AuditView.vue'),
  })
}

export default createRouter({
  history: createWebHistory(),
  async scrollBehavior(to, from, savedPosition) {
    if (to.path === from.path) return false
    if (savedPosition) {
      await nextTick()
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      return savedPosition
    }
    return { top: 0 }
  },
  routes,
})

