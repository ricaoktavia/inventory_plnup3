import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// If already logged in, redirect to dashboard
	if (locals.user) {
		throw redirect(302, '/');
	}
};

export const actions = {
	login: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString();
		const password = data.get('password')?.toString();

		if (!username || !password) {
			return fail(400, { error: 'Username dan Password harus diisi.' });
		}

		// Simple Auth (Checking plain text as instructed for MVP dummy data)
		const [user] = await db.select().from(users).where(eq(users.username, username));

		if (!user || user.passwordHash !== password) {
			return fail(401, { error: 'Kombinasi Username dan Password salah.' });
		}

		// Create pseudo-session
		cookies.set('session', user.id.toString(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 7 // 1 week
		});

		throw redirect(302, '/');
	}
} satisfies Actions;
