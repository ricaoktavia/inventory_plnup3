import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Protect all routes except /login and /validasi (Public QR Code Scan)
	if (!locals.user && url.pathname !== '/login' && !url.pathname.startsWith('/validasi')) {
		throw redirect(302, '/login');
	}

	return {
		user: locals.user
	};
};
