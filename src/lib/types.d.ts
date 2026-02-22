// Type definitions for project dependencies

// Leaflet types (if @types/leaflet not installed)
declare module 'leaflet' {
	export * from 'leaflet';
}

declare module 'leaflet.offline' {
	export * from 'leaflet.offline';
}

// Extend Window interface for PWA
interface Window {
	deferredPrompt?: BeforeInstallPromptEvent;
}

// BeforeInstallPrompt Event
interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{
		outcome: 'accepted' | 'dismissed';
		platform: string;
	}>;
}
