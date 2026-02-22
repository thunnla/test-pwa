import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: null,
			devOptions: {
				enabled: false
			},
			includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'robots.txt'],
			manifest: {
				name: 'Lam Thuong PWA Cache Test',
				short_name: 'PWA Test',
				description: 'PWA cache and offline capability test tool',
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
				// Không dùng navigateFallback với SSR (Netlify adapter) — gây crash
				// "non-precached-url: index.html" khi offline
				navigateFallback: null,
				cleanupOutdatedCaches: true,
				skipWaiting: true,
				clientsClaim: true,
				additionalManifestEntries: [
					{ url: '/pwa-test', revision: null },
					{ url: '/image-test', revision: null },
					{ url: '/audio-test', revision: null },
					{ url: '/map-test', revision: null },
					{ url: '/report', revision: null },
				],
				runtimeCaching: [
					// ── Local map tiles ──
					{
						urlPattern: /\/map-tiles\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'local-map-tiles-cache',
							expiration: {
								maxEntries: 2000,
								maxAgeSeconds: THIRTY_DAYS
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					{
						urlPattern: ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
						handler: 'NetworkFirst',
						options: {
							cacheName: 'pages-cache',
							networkTimeoutSeconds: 3,
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 * 7
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// ── Test assets: Images ──
					{
						urlPattern: /\/test-assets\/images\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'test-images-cache',
							expiration: {
								maxEntries: 500,
								maxAgeSeconds: THIRTY_DAYS
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// ── Test assets: Audio ──
					{
						urlPattern: /\/test-assets\/audio\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'test-audio-cache',
							expiration: {
								maxEntries: 500,
								maxAgeSeconds: THIRTY_DAYS
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// ── Test assets: Map tiles ──
					{
						urlPattern: /\/test-assets\/map\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'test-map-cache',
							expiration: {
								maxEntries: 500,
								maxAgeSeconds: THIRTY_DAYS
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// ── Navigation requests (HTML pages) ──
					// StaleWhileRevalidate: serve cache ngay khi refresh offline
					// NetworkFirst sẽ chờ timeout → user thấy "không có mạng" trước khi fallback
					{
						urlPattern: ({ request }) => request.mode === 'navigate',
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'pages-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 * 7
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// ── General images ──
					{
						urlPattern: /\.(?:png|jpg|jpeg|gif|webp|svg|ico|bmp)$/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'images-cache',
							expiration: {
								maxEntries: 200,
								maxAgeSeconds: THIRTY_DAYS
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// ── General audio ──
					{
						urlPattern: /\.(?:mp3|wav|ogg|m4a|aac|flac)$/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'audio-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 * 60
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// ── Map tiles (OpenStreetMap, etc.) ──
					{
						urlPattern: /^https?:\/\/(.*\.)?(openstreetmap|thunderforest|stamen|mapbox|tile)\.(org|com)\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'map-tiles-cdn-cache',
							expiration: {
								maxEntries: 1000,
								maxAgeSeconds: 60 * 60 * 24 * 90
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// ── Fonts ──
					{
						urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'fonts-cache',
							expiration: {
								maxEntries: 20,
								maxAgeSeconds: 60 * 60 * 24 * 365
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// ── Static JS/CSS ──
					{
						urlPattern: /\.(?:js|css)$/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'static-assets-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 * 7
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},

					// ── API requests ──
					{
						urlPattern: /^https?:\/\/.*\/api\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							networkTimeoutSeconds: 10,
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 5 * 60
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
