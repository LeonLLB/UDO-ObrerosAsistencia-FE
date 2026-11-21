import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { UsersMiddlewares } from '#lib/server/UsersMiddlewares.ts';

const SESSION_COOKIE = 'x-token';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) redirect(303, '/login');

	const session = await UsersMiddlewares.checkIfUserLoggedIn(token);
	if (!session) {
		redirect(303, '/login');
	}


	if (session.user.tipo !== 'A') redirect(303, '/');

	return {};
};
