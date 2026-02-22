# 🚀 Lam Thuong PWA Test

Progressive Web App test project với SvelteKit + vite-plugin-pwa

## 🎯 Features

- ✅ **Offline-first PWA** với Service Worker
- ✅ **Smart caching strategies** (CacheFirst, NetworkFirst)
- ✅ **100-150MB cache** cho images, audio, map tiles
- ✅ **Offline map** với Leaflet.js
- ✅ **Audio caching** cho offline playback
- ✅ **IndexedDB storage** với idb-keyval
- ✅ **Install prompt** cho PWA installation

## 📦 Tech Stack

- **Framework:** SvelteKit (TypeScript)
- **Build Tool:** Vite
- **PWA Plugin:** vite-plugin-pwa (Workbox)
- **Map:** Leaflet.js + leaflet.offline
- **Storage:** Cache API + idb-keyval

## 🚀 Quick Start

### Development

```sh
npm install
npm run dev
```

⚠️ **Note:** PWA is disabled in dev mode. Use production build to test PWA features.

### Production Build & Preview

```sh
npm run build
npm run preview
```

Then open `http://localhost:4173`

## 📂 Project Structure

```
src/
├── lib/
│   ├── offline-storage.ts       # Cache API & IndexedDB utilities
│   ├── CacheWidget.svelte       # Reusable cache info widget
│   └── types.d.ts              # TypeScript definitions
├── routes/
│   ├── +page.svelte            # Homepage với cache info
│   ├── map/+page.svelte        # Offline map demo (Leaflet)
│   ├── audio/+page.svelte      # Audio cache demo
│   └── offline/+page.svelte    # Offline fallback page
vite.config.ts                   # PWA & cache configuration
```

## 🗺️ Cache Configuration

### Total Cache Budget: 100-150MB

| Resource | Size | Entries | Strategy | Expiration |
|----------|------|---------|----------|------------|
| **Map Tiles** | 40-50MB | ~1000 | CacheFirst | 90 days |
| Images | 30-40MB | ~200 | CacheFirst | 30 days |
| Audio | 20-30MB | ~15 | CacheFirst | 60 days |
| Fonts | ~500KB | 20 | CacheFirst | 1 year |
| JS/CSS | ~2MB | 50 | CacheFirst | 7 days |
| API | - | 50 | NetworkFirst | 5 min |
| Video | ❌ NO CACHE | - | - | - |

**Map tiles** are marked as **OFFLINE CRITICAL** with longest expiration and highest priority.

📖 **Detailed guide:** See [CACHE_CONFIG.md](./CACHE_CONFIG.md)

## 🧪 Testing

### 1. Test Offline Map

1. Build production: `npm run build && npm run preview`
2. Open `/map` page
3. Pan/zoom to load map tiles
4. Open DevTools → Network → **Offline**
5. Refresh → cached tiles still work!

### 2. Test Audio Cache

1. Open `/audio` page
2. Play audio files (auto-cached by Service Worker)
3. Enable offline mode
4. Refresh → audio still plays!

### 3. Check Cache Storage

**Chrome DevTools:**
- F12 → Application → Cache Storage
- View caches: `images-cache`, `audio-cache`, `map-tiles-cache`, etc.

**Check Storage Quota:**
```javascript
const estimate = await navigator.storage.estimate();
console.log(`Using ${(estimate.usage / 1024 / 1024).toFixed(2)} MB`);
```

## 🛠️ Key Files

### [`vite.config.ts`](./vite.config.ts)
PWA configuration với Workbox runtime caching strategies.

### [`src/lib/offline-storage.ts`](./src/lib/offline-storage.ts)
Utilities cho Cache API và IndexedDB:
- `cacheResource()` - Cache một resource
- `getCachedResource()` - Lấy từ cache
- `saveToIDB()` - Lưu vào IndexedDB
- `getFromIDB()` - Lấy từ IndexedDB
- `getStorageEstimate()` - Check storage quota

### [`src/lib/CacheWidget.svelte`](./src/lib/CacheWidget.svelte)
Reusable component hiển thị cache info.

## 📚 Documentation

- [CACHE_CONFIG.md](./CACHE_CONFIG.md) - Chi tiết cache strategies & testing guide
- [.github/copilot-instructions.md](.github/copilot-instructions.md) - Development rules

## 🔍 Service Worker

Service Worker được auto-generated bởi vite-plugin-pwa (Workbox).

**⚠️ DO NOT create custom `src/service-worker.ts`**

Tất cả cache configuration được config trong `vite.config.ts` → `workbox` option.

## 💡 Tips

### Clear All Caches

```javascript
// Run in browser console
const cacheNames = await caches.keys();
await Promise.all(cacheNames.map(name => caches.delete(name)));
await navigator.serviceWorker.getRegistration().then(r => r?.unregister());
location.reload();
```

### Force Update Service Worker

DevTools → Application → Service Workers → **Update**

### iOS Safari

iOS Safari không support `beforeinstallprompt`.  
User phải manually: Share → Add to Home Screen

## 🐛 Troubleshooting

### PWA không install được?

Check:
- ✅ HTTPS hoặc localhost
- ✅ Valid manifest.json
- ✅ Service Worker registered
- ✅ App chưa installed
- ✅ Browser support (Chrome, Edge, Opera OK; Safari limited)

### Service Worker không update?

1. DevTools → Application → Service Workers
2. Check "Update on reload"
3. Click "Update" hoặc "Unregister"
4. Hard refresh: `Ctrl+Shift+R`

### Cache không hoạt động?

1. Check production build: `npm run build && npm run preview`
2. DevTools → Network → check "Service Worker" column
3. DevTools → Application → Cache Storage → verify cache exists

## 📖 References

- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [Leaflet.js](https://leafletjs.com/)
- [idb-keyval](https://github.com/jakearchibald/idb-keyval)

## 📝 License

MIT

