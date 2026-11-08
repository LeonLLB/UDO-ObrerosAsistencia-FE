import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { UsersMiddlewares } from '#lib/server/UsersMiddlewares.ts';

const SESSION_COOKIE = 'x-token';
const SESSION_DURATION_SECONDS = 20 * 60;

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	const token = cookies.get(SESSION_COOKIE);
	const isLoginPage = url.pathname === '/login';

	if (!token) {
		if (!isLoginPage) redirect(303, '/login');
		return { user: null };
	}

	const session = await UsersMiddlewares.checkIfUserLoggedIn(token);
	if (!session) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		if (!isLoginPage) redirect(303, '/login');
		return { user: null };
	}

	cookies.set(SESSION_COOKIE, session.token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		path: '/',
		maxAge: SESSION_DURATION_SECONDS
	});

	if (isLoginPage) redirect(303, '/');
	return { user: session.user };
};
