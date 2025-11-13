const CACHE_NAME = 'padelathome-cache-v1';
// Lista de archivos base para que la app cargue offline
const urlsToCache = [
  '/',
  '/login.html',
  '/dashboard.html',
  '/admin.html',
  '/style.css',
  '/main.js',
  '/login.js',
  '/dashboard.js',
  '/admin.js',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png'
  // Nota: Las imágenes de los iconos deben existir en /public/images/
];

// Evento 'install': Guarda los archivos base en la caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento 'fetch': Intercepta las peticiones de la aplicación
self.addEventListener('fetch', event => {
  // Ignora todas las peticiones a la API, esas siempre deben ir a la red
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Estrategia "Cache First":
  // Intenta servir el archivo desde la caché. Si no está, ve a la red.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Servir desde la caché
        }
        return fetch(event.request); // Ir a la red
      })
  );
});