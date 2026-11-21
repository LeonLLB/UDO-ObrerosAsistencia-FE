import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { UsersMiddlewares } from '#lib/server/UsersMiddlewares.ts';

const SESSION_COOKIE = 'x-token';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	const token = cookies.get(SESSION_COOKIE);
	const isLoginPage = url.pathname === '/login';

	console.log(token)

	if (!token) {
		if (!isLoginPage) redirect(303, '/login');
		return { user: null };
	}

	const session = await UsersMiddlewares.checkIfUserLoggedIn(token);
	
	console.log(session)
	
	if (!session) {
		if (!isLoginPage) redirect(303, '/login');
		return { user: null };
	}


	if (isLoginPage) redirect(303, '/');
	return { user: session.user };
};
