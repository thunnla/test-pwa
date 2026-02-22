# 📦 Cache Configuration Guide

## 🎯 Cache Strategy Overview

Dự án này sử dụng **Cache API** và **Service Worker** để lưu trữ offline với tổng dung lượng target: **100-150MB**

### CacheFirst Strategy (Ưu tiên Cache)

#### 1. 🖼️ Images Cache
- **Target:** 30-40MB
- **Max Entries:** ~200 images
- **Average Size:** ~200KB/image
- **Expiration:** 30 days
- **Formats:** `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.ico`, `.bmp`

#### 2. 🎵 Audio Cache
- **Target:** 20-30MB  
- **Max Entries:** ~15 audio files
- **Average Size:** ~2MB/audio
- **Expiration:** 60 days
- **Formats:** `.mp3`, `.wav`, `.ogg`, `.m4a`, `.aac`, `.flac`

#### 3. 🗺️ Map Tiles Cache ⭐ OFFLINE CRITICAL
- **Target:** 40-50MB
- **Max Entries:** ~1000 tiles
- **Average Size:** ~50KB/tile
- **Expiration:** 90 days
- **Patterns:**
  - `/{z}/{x}/{y}.(png|jpg)` - standard tile pattern
  - OpenStreetMap CDN
  - Mapbox, Thunderforest, Stamen tile servers

#### 4. 🔤 Fonts Cache
- **Max Entries:** 20 fonts
- **Expiration:** 1 year
- **Formats:** `.woff`, `.woff2`, `.ttf`, `.eot`

#### 5. 📄 Static Assets Cache
- **Max Entries:** 50 files
- **Expiration:** 7 days
- **Formats:** `.js`, `.css`

#### 6. ❌ Video - KHÔNG CACHE
Video không được cache do dung lượng lớn. Chỉ streaming online.

---

### NetworkFirst Strategy (Ưu tiên Network)

#### API Requests
- **Timeout:** 10 seconds
- **Fallback:** Cache nếu network fail
- **Expiration:** 5 minutes
- **Pattern:** `/api/*`

---

### StaleWhileRevalidate Strategy

#### HTML Pages
- **Max Entries:** 20 pages
- **Expiration:** 1 day
- **Behavior:** Show cached version ngay lập tức, update in background

---

## 🛠️ Technologies

### Core PWA
- **vite-plugin-pwa** - PWA plugin cho Vite
- **Workbox** - Service Worker library (auto-generated)

### Map
- **leaflet.js** - Interactive map library
- **leaflet.offline** - Offline map tiles support

### Storage
- **Cache API** - Native browser API cho HTTP caching
- **idb-keyval** - Simple IndexedDB wrapper cho structured data

---

## 📂 File Structure

```
src/
├── lib/
│   └── offline-storage.ts       # Utilities cho Cache API & IndexedDB
├── routes/
│   ├── +page.svelte            # Homepage với cache info
│   ├── map/
│   │   └── +page.svelte        # Map demo với offline tiles
│   ├── audio/
│   │   └── +page.svelte        # Audio cache demo
│   └── offline/
│       └── +page.svelte        # Offline fallback page
vite.config.ts                   # PWA configuration
```

---

## 🧪 Testing Instructions

### 1. Build Production

```bash
npm run build
npm run preview
```

⚠️ **Important:** PWA chỉ hoạt động ở production mode, không hoạt động trong `dev` mode.

### 2. Test Map Offline

1. Mở `http://localhost:4173/map`
2. Pan/zoom map để load tiles
3. Đợi tiles load xong (sẽ tự động cached)
4. Mở DevTools → Network → **Offline**
5. Refresh page → map tiles đã cache vẫn hiển thị

### 3. Test Audio Cache

1. Mở `http://localhost:4173/audio`
2. Play các audio files
3. Đợi audio load xong
4. Tắt network (DevTools → Network → Offline)
5. Refresh page và play lại → audio đã cache vẫn chạy được

### 4. Check Cache Storage

**Chrome DevTools:**
1. F12 → **Application** tab
2. Storage → **Cache Storage**
3. Xem các caches:
   - `images-cache`
   - `audio-cache`
   - `map-tiles-cache`
   - `map-tiles-cdn-cache`
   - `fonts-cache`
   - `static-assets-cache`
   - `api-cache`
   - `pages-cache`

**Check Storage Quota:**
```javascript
// Run in console
const estimate = await navigator.storage.estimate();
const usedMB = estimate.usage / (1024 * 1024);
const quotaMB = estimate.quota / (1024 * 1024);
console.log(`Using ${usedMB.toFixed(2)} MB of ${quotaMB.toFixed(2)} MB`);
```

### 5. Test Service Worker

**DevTools → Application → Service Workers:**
- Verify: Status = **Activated and running**
- Click **Update** để force update
- Click **Unregister** để xóa service worker

---

## 📊 Cache Size Estimation

| Resource Type | Target Size | Max Entries | Avg File Size | Priority |
|---------------|-------------|-------------|---------------|----------|
| Images        | 30-40 MB    | 200         | ~200 KB       | Medium   |
| Audio         | 20-30 MB    | 15          | ~2 MB         | Medium   |
| **Map Tiles** | **40-50 MB** | **1000**   | **~50 KB**    | **HIGH** |
| Fonts         | ~500 KB     | 20          | ~25 KB        | Low      |
| JS/CSS        | ~2 MB       | 50          | ~40 KB        | Medium   |
| **TOTAL**     | **100-150 MB** | **~1285** |               |          |

---

## 🔍 Debugging

### View Cache Contents

```javascript
// Get all cache names
const cacheNames = await caches.keys();
console.log('Caches:', cacheNames);

// View specific cache
const cache = await caches.open('images-cache');
const keys = await cache.keys();
console.log('Images cached:', keys.length);
keys.forEach(req => console.log(req.url));
```

### Clear All Caches

```javascript
const cacheNames = await caches.keys();
await Promise.all(cacheNames.map(name => caches.delete(name)));
console.log('All caches cleared');
```

### Using Utility Functions

```javascript
import { 
  getCacheInfo, 
  getStorageEstimate,
  clearOldCaches 
} from '$lib/offline-storage';

// Get cache info
const info = await getCacheInfo();
console.log(info);

// Get storage quota
const storage = await getStorageEstimate();
console.log(`${storage.usageMB} MB / ${storage.quotaMB} MB`);
```

---

## ⚠️ Important Notes

### Service Worker Caching

- Service Worker **tự động cache** theo patterns đã config
- KHÔNG cần manually call `cache.add()` cho images/audio/tiles
- Service Worker sẽ intercept fetch requests và cache automatically

### Cache Limits

- **maxEntries** giới hạn số lượng entries, KHÔNG phải dung lượng chính xác
- Workbox sẽ tự động xóa old entries khi đạt limit (LRU - Least Recently Used)
- Target size là ước tính dựa trên average file size

### Offline Map Strategy

Map tiles là **OFFLINE CRITICAL** nên có:
- Expiration dài nhất (90 days)
- Max entries cao nhất (1000 tiles)
- Cache pattern phù hợp với tile servers phổ biến

### Video Không Cache

Video có dung lượng quá lớn (hàng trăm MB), không phù hợp cho cache.  
Sử dụng streaming online hoặc download riêng nếu cần offline viewing.

---

## 🚀 Next Steps

1. ✅ Test PWA installability
2. ✅ Test offline functionality
3. ✅ Monitor cache size trong production
4. ✅ Adjust maxEntries nếu cần
5. ⚠️ Implement cache warming strategy (preload critical resources)
6. ⚠️ Add UI để user control cache (clear, update)

---

## 📚 References

- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [Leaflet.js](https://leafletjs.com/)
- [idb-keyval](https://github.com/jakearchibald/idb-keyval)
