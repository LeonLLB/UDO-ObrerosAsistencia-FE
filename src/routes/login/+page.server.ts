import { UsersMiddlewares } from '#lib/server/UsersMiddlewares.ts';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const SESSION_COOKIE = 'x-token';

export const load: PageServerLoad = async ({cookies,url}) => {

    const token = cookies.get(SESSION_COOKIE);

    if (!token) {
        return {  };
    }

    const session = await UsersMiddlewares.checkIfUserLoggedIn(token);
    if (session) {
        cookies.set(SESSION_COOKIE, session.token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: url.protocol === 'https:',
            path: '/',
            maxAge: 20 * 60
        });
        return redirect(303, '/');
    }

   return {}


};
