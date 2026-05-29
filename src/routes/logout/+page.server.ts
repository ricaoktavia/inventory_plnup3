import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ cookies }) => {
		cookies.delete('session', { 
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: false
		});
		throw redirect(302, '/login');
	}
};
