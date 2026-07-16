import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Handle Chrome DevTools requests gracefully
	if (event.url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
		return new Response(JSON.stringify({}), {
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	return resolve(event);
};
