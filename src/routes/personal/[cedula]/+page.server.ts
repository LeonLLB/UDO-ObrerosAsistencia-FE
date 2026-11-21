import { error, redirect } from '@sveltejs/kit';
import { getDataSource } from '#lib/server/database.ts';
import { EntidadPersonal } from '#lib/server/personal/entities/personal.entity.ts';
import { UsersMiddlewares } from '#lib/server/UsersMiddlewares.ts';
import type { PageServerLoad } from './$types';

const SESSION_COOKIE = 'x-token';

type AcademicRecordRow = {
	id: number;
	tipo: number;
	anioGraduacion: number;
	universidad: string;
	descripcion: string;
	curriculumId: number | null;
	fechaRegistro: string | null;
	usuarioId: number | null;
	usuarioNombres: string | null;
	usuarioApellidos: string | null;
};

type FamilyRecordRow = {
	id: number;
	tipo: 'Hi' | 'He' | 'P';
	nombres: string;
	apellidos: string;
	cedula: string | null;
	sexo: 'F' | 'M';
	fechaNacimiento: string;
	estudia: 0 | 1;
};

export const load: PageServerLoad = async ({ cookies, url, params }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) redirect(303, '/login');

	const session = await UsersMiddlewares.checkIfUserLoggedIn(token);
	if (!session) {
		redirect(303, '/login');
	}


	const source = await getDataSource();
	const employee = await source.getRepository(EntidadPersonal).findOne({
		where: { cedula: params.cedula },
		select: {
			id: true,
			cedula: true,
			nombres: true,
			apellidos: true,
			tipo: true,
			status: true
		}
	});
	if (!employee) error(404, 'No se encontró el trabajador solicitado.');

	const [academicRows, familyRows] = await Promise.all([
		source.query(
			`SELECT academic.id, academic.tipo, academic.anio_graduacion AS anioGraduacion,
				academic.universidad, academic.descripcion, curriculum.id AS curriculumId,
				DATE_FORMAT(curriculum.fecha_registro, '%Y-%m-%d %H:%i:%s') AS fechaRegistro,
				account.id AS usuarioId, account.nombres AS usuarioNombres, account.apellidos AS usuarioApellidos
			FROM info_academico academic
			LEFT JOIN info_curriculum curriculum ON curriculum.grado_id = academic.id
			LEFT JOIN usuarios account ON account.id = curriculum.usuario_id
			WHERE academic.personal_id = ?
			ORDER BY academic.anio_graduacion DESC, academic.id DESC`,
			[employee.id]
		) as Promise<AcademicRecordRow[]>,
		source.query(
			`SELECT id, tipo, nombres, apellidos, cedula, sexo,
				DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') AS fechaNacimiento, estudia
			FROM info_familiar
			WHERE personal_id = ?
			ORDER BY apellidos ASC, nombres ASC`,
			[employee.id]
		) as Promise<FamilyRecordRow[]>
	]);

	return {
		employee: { ...employee },
		academicRecords: academicRows.map((record) => ({
			id: record.id,
			tipo: record.tipo,
			anioGraduacion: record.anioGraduacion,
			universidad: record.universidad,
			descripcion: record.descripcion,
			curriculum:
				record.curriculumId === null
					? null
					: {
							id: record.curriculumId,
							idUsuario: record.usuarioId ?? 0,
							fechaRegistro: record.fechaRegistro ?? '',
							usuario:
								record.usuarioNombres && record.usuarioApellidos
									? `${record.usuarioNombres} ${record.usuarioApellidos}`
									: undefined
						}
		})),
		familyRecords: familyRows
	};
};
