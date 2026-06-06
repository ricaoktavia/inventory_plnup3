import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { transactions } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const loginPath = `${base}/login`;
	const validasiPath = `${base}/validasi`;

	// Protect all routes except /login and /validasi (Public QR Code Scan)
	if (!locals.user && url.pathname !== loginPath && !url.pathname.startsWith(validasiPath)) {
		throw redirect(303, loginPath);
	}

	let actionCount = 0;
	if (locals.user && locals.user.role === 'ADMIN_UP3') {
		const result = await db
			.select({ count: count() })
			.from(transactions)
			.where(eq(transactions.status, 'REQUESTED'));
		actionCount = result[0].count;
	}

	return {
		user: locals.user,
		actionCount
	};
};
