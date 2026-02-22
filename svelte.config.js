import adapter from '@sveltejs/adapter-netlify';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Use the Netlify adapter so the site deploys and routes correctly on Netlify
		adapter: adapter()
	}
};

export default config;
