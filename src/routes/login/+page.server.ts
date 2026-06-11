import { fail, redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// If already logged in, redirect to dashboard
	if (locals.user) {
		throw redirect(303, `${base}/`);
	}
};

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString();
		const password = data.get('password')?.toString();

		if (!username || !password) {
			return fail(400, { error: 'Username dan Password harus diisi.' });
		}

		// Check plain text password
		const [user] = await db.select().from(users).where(eq(users.username, username));

		if (!user || user.passwordHash !== password) {
			return fail(401, { error: 'Kombinasi Username dan Password salah.' });
		}

		// Create pseudo-session
		cookies.set('session', user.id.toString(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			// Deployment currently uses plain HTTP (:3000), so Secure cookies are ignored by browser.
			secure: false,
			maxAge: 60 * 60 * 24 * 7 // 1 week
		});

		throw redirect(303, `${base}/`);
	}
} satisfies Actions;
