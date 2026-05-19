import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { transactions } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Protect all routes except /login and /validasi (Public QR Code Scan)
	if (!locals.user && url.pathname !== '/login' && !url.pathname.startsWith('/validasi')) {
		throw redirect(302, '/login');
	}

	let pendingRequestCount = 0;
	if (locals.user && locals.user.role === 'ADMIN_UP3') {
		const result = await db
			.select({ count: count() })
			.from(transactions)
			.where(and(eq(transactions.type, 'DISTRIBUTION'), eq(transactions.status, 'REQUESTED')));
		pendingRequestCount = result[0].count;
	}

	return {
		user: locals.user,
		pendingRequestCount
	};
};
