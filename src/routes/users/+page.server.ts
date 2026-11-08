import { UsersMiddlewares } from '#lib/server/UsersMiddlewares.ts';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDataSource } from '#lib/server/database.ts';
import { EntidadUsuario } from '#lib/server/users/user.entity.ts';

const SESSION_COOKIE = 'x-token';

export const load: PageServerLoad = async ({cookies,url}) => {

    const token = cookies.get(SESSION_COOKIE);

    if (!token) {
        return {  };
    }

    const session = await UsersMiddlewares.checkIfUserLoggedIn(token);

    if (!session) {
        return redirect(303, '/login');
    }

    cookies.set(SESSION_COOKIE, session.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: url.protocol === 'https:',
        path: '/',
        maxAge: 20 * 60
    });

    const users = await (await getDataSource()).getRepository(EntidadUsuario).find({
        select: { id:true,cedula: true, nombres: true, apellidos: true, status: true, tipo: true }
    }).then((users) => users.map(user=>({...user})));
    

    return { users };
}
