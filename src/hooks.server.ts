// src/hooks.server.ts
import { db } from '$lib/server/db';
import { users, ulps } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get('session');

	if (sessionToken) {
		const userId = parseInt(sessionToken, 10);
		if (!isNaN(userId)) {
			// Fetch user with ULP data if available
			const [user] = await db
				.select({
					id: users.id,
					username: users.username,
					role: users.role,
					ulpId: users.ulpId,
					ulpName: ulps.name
				})
				.from(users)
				.leftJoin(ulps, eq(users.ulpId, ulps.id))
				.where(eq(users.id, userId));

			if (user) {
				event.locals.user = user;
			}
		}
	}

	return resolve(event);
};
