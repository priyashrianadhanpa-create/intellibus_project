// IntelliBus AI Service Worker
const CACHE_NAME = 'intellibus-cache-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/vite.svg',
  '/manifest.json'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/v1/') || event.request.url.includes('/ws/')) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }
      return fetch(event.request).catch(() => {
        return caches.match('/')
      })
    })
  )
})

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'IntelliBus Alert', body: 'Campus bus arriving!' }
  event.waitUntil(
    self.registration.showNotification(data.title || 'IntelliBus AI Alert', {
      body: data.body,
      icon: '/vite.svg',
      badge: '/vite.svg'
    })
  )
})
