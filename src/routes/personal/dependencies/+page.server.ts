import { UsersMiddlewares } from '#lib/server/UsersMiddlewares.ts';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDataSource } from '#lib/server/database.ts';
import { EntidadUsuario } from '#lib/server/users/user.entity.ts';
import { EntidadPersonal } from '#lib/server/personal/entities/personal.entity.ts';
import { EntidadArea } from '#lib/server/areas/entities/area.entity.ts';

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


    if(session.user.tipo !== "A") {
        return redirect(303, '/');    }

    const dependencias = await (await getDataSource()).getRepository(EntidadArea).find({
        select: { id:true, nombre:true },
    }).then((dptos) => dptos.map(dpto=>({...dpto})));
    

    return { dependencias };
}
