import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ cookies }) => {
		cookies.delete('session', {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false
		});
		throw redirect(303, `${base}/login`);
	}
};
