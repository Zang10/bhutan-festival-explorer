const STORAGE_KEY = 'festival-audit-reviews'

export function readAuditReviews() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

export function isImageMarkedWrong(eventId) {
  return readAuditReviews()[eventId]?.imageCorrect === false
}

export function saveAuditReviews(reviews) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews))
  window.dispatchEvent(new CustomEvent('festival-audit-updated'))
}
