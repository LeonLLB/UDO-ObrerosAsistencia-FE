import { redirect } from '@sveltejs/kit';
import { getDataSource } from '#lib/server/database.ts';
import { UsersMiddlewares } from '#lib/server/UsersMiddlewares.ts';
import type { PageServerLoad } from './$types';

const SESSION_COOKIE = 'x-token';

type ConceptRow = {
	id: number;
	codigo: string;
	descripcion: string;
	tipoConcepto: 'D' | 'F' | 'V';
	formula: string | null;
	esAsignacion: number;
	autoAsignar: number;
};

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) redirect(303, '/login');

	const session = await UsersMiddlewares.checkIfUserLoggedIn(token);
	if (!session) {
		redirect(303, '/login');
	}


	if (session.user.tipo !== 'A') redirect(303, '/');

	const rows = (await (await getDataSource()).query(
		`SELECT id, codigo, descripcion, tipo_concepto AS tipoConcepto,
			formula, es_asignacion AS esAsignacion, auto_asignar AS autoAsignar
		FROM conceptos
		ORDER BY tipo_concepto ASC, codigo ASC`
	)) as ConceptRow[];

	return {
		concepts: rows.map((concept) => ({
			...concept,
			esAsignacion: Number(concept.esAsignacion),
			autoAsignar: Number(concept.autoAsignar)
		}))
	};
};
