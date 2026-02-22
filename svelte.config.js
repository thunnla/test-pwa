import adapter from '@sveltejs/adapter-netlify';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Use the Netlify adapter so the site deploys and routes correctly on Netlify
		adapter: adapter({
			edge: false, // Disable Edge Functions for better compatibility with static assets
			split: false // Disable splitting to keep all assets in a single bundle
		})
	}
};

export default config;
