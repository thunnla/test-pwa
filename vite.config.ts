import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: null, // Manual registration trong +layout.svelte
			devOptions: {
				enabled: false // PWA disabled in dev mode
			},
			includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'robots.txt'],
			manifest: {
				name: 'Lam Thuong PWA Test',
				short_name: 'PWA Test',
				description: 'Test PWA offline capability with SvelteKit',
				theme_color: '#ffffff',
				background_color: '#ffffff',
				display: 'standalone',
				start_url: '/',
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
				// SvelteKit: Dùng /offline làm fallback page
				navigateFallback: 'index.html',
				navigateFallbackAllowlist: [/^(?!\/__)/], // Allow all except __sveltekit routes
				// Precache offline page và start URL
				additionalManifestEntries: [
					// { url: '/offline', revision: null },
					{ url: '/', revision: null }
				],
				cleanupOutdatedCaches: true,
				skipWaiting: true,
				clientsClaim: true,

				runtimeCaching: [
					// === NetworkFirst cho navigation requests (documents/HTML pages) ===
					{
						urlPattern: ({ request }) => request.mode === 'navigate',
						handler: 'NetworkFirst',
						options: {
							cacheName: 'pages-cache',
							networkTimeoutSeconds: 5,
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// === CacheFirst Strategy ===

					// Images: 30-40MB (ước tính ~150-200 entries, avg ~200KB/image)
					{
						urlPattern: /\.(?:png|jpg|jpeg|gif|webp|svg|ico|bmp)$/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'images-cache',
							expiration: {
								maxEntries: 200, // Target ~30-40MB
								maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// Audio files: 20-30MB (ước tính ~10-15 entries, avg ~2MB/audio)
					{
						urlPattern: /\.(?:mp3|wav|ogg|m4a|aac|flac)$/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'audio-cache',
							expiration: {
								maxEntries: 15, // Target ~20-30MB
								maxAgeSeconds: 60 * 60 * 24 * 60 // 60 days
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// Map tiles (OFFLINE CRITICAL): 40-50MB (ước tính ~800-1000 entries, avg ~50KB/tile)
					// Leaflet tiles từ OpenStreetMap hoặc tile servers khác
					{
						urlPattern: /\/(\d+)\/(\d+)\/(\d+)\.(png|jpg|jpeg)$/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'map-tiles-cache',
							expiration: {
								maxEntries: 1000, // Target ~40-50MB - OFFLINE CRITICAL
								maxAgeSeconds: 60 * 60 * 24 * 90 // 90 days
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// Map tiles từ tile.openstreetmap.org và các CDN khác
					{
						urlPattern: /^https?:\/\/(.*\.)?(openstreetmap|thunderforest|stamen|mapbox|tile)\.(org|com)\/.*\.(png|jpg|jpeg)$/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'map-tiles-cdn-cache',
							expiration: {
								maxEntries: 1000, // Target ~40-50MB - OFFLINE CRITICAL
								maxAgeSeconds: 60 * 60 * 24 * 90 // 90 days
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// Fonts
					{
						urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'fonts-cache',
							expiration: {
								maxEntries: 20,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// JS/CSS static assets
					{
						urlPattern: /\.(?:js|css)$/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'static-assets-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// === NetworkFirst Strategy ===

					// API requests
					{
						urlPattern: /^https?:\/\/.*\/api\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							networkTimeoutSeconds: 10,
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 5 * 60 // 5 minutes
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					}
				]
			}
		})
	]
});
