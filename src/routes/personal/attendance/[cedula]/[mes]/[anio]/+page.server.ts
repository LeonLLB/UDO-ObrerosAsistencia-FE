import { redirect } from '@sveltejs/kit';
import { UsersMiddlewares } from '#lib/server/UsersMiddlewares.ts';
import type { PageServerLoad } from './$types';

const SESSION_COOKIE = 'x-token';
const SESSION_DURATION_SECONDS = 20 * 60;

export const load: PageServerLoad = async ({ cookies, url, params }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) redirect(303, '/login');

	const session = await UsersMiddlewares.checkIfUserLoggedIn(token);
	if (!session) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/login');
	}

	cookies.set(SESSION_COOKIE, session.token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		path: '/',
		maxAge: SESSION_DURATION_SECONDS
	});

	return {
		cedula: params.cedula,
		mes: params.mes,
		anio: params.anio
	};
};
