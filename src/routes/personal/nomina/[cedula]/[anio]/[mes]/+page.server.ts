import { error, redirect } from '@sveltejs/kit';
import { getDataSource } from '#lib/server/database.ts';
import { UsersMiddlewares } from '#lib/server/UsersMiddlewares.ts';
import type { PageServerLoad } from './$types';

const SESSION_COOKIE = 'x-token';

type PayrollEmployeeRow = {
	id: number;
	cedula: string;
	nombres: string;
	apellidos: string;
	tipo: 'A' | 'O';
	dependencia: string;
	rango: number | null;
	claseFuncionario: string | null;
	salarioBase: string | null;
	hijosMenores: number | string;
	hijosMenoresEstudian: number | string;
	maximoAcademico: number | null;
};

type DynamicConceptRow = {
	id: number;
	codigo: string;
	descripcion: string;
	formula: string;
	esAsignacion: number;
};

export const load: PageServerLoad = async ({ cookies, url, params }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) redirect(303, '/login');

	const session = await UsersMiddlewares.checkIfUserLoggedIn(token);
	if (!session) {
		redirect(303, '/login');
	}


	const year = Number(params.anio);
	const month = Number(params.mes);
	if (
		!Number.isInteger(year) ||
		year < 1 ||
		!Number.isInteger(month) ||
		month < 1 ||
		month > 12
	) {
		error(400, 'El período de nómina no es válido.');
	}

	const source = await getDataSource();
	const employees = (await source.query(
		`SELECT personal.id, personal.cedula, personal.nombres, personal.apellidos,
			personal.tipo, area.nombre AS dependencia, onapre.rango,
			onapre.clase_funcionario AS claseFuncionario, onapre.salario_base AS salarioBase,
			(SELECT COUNT(*) FROM info_familiar familiar
				WHERE familiar.personal_id = personal.id AND familiar.tipo = 'Hi'
					AND familiar.fecha_nacimiento <= CURDATE()
					AND TIMESTAMPDIFF(YEAR, familiar.fecha_nacimiento, CURDATE()) < 18
			) AS hijosMenores,
			(SELECT COUNT(*) FROM info_familiar familiar
				WHERE familiar.personal_id = personal.id AND familiar.tipo = 'Hi'
					AND familiar.fecha_nacimiento <= CURDATE()
					AND TIMESTAMPDIFF(YEAR, familiar.fecha_nacimiento, CURDATE()) < 18
					AND familiar.estudia = 1
			) AS hijosMenoresEstudian,
			(SELECT MAX(academico.tipo) FROM info_academico academico
				WHERE academico.personal_id = personal.id AND academico.tipo > 0
			) AS maximoAcademico
		FROM personal
		LEFT JOIN areas area ON area.id = personal.area_encargada_id
		LEFT JOIN onapre ON onapre.id = personal.onapre_id
		WHERE personal.cedula = ?
		LIMIT 1`,
		[params.cedula]
	)) as PayrollEmployeeRow[];
	const employee = employees[0];
	if (!employee) error(404, 'No se encontró el trabajador solicitado.');

	const dynamicConcepts = (await source.query(
		`SELECT id, codigo, descripcion, formula, es_asignacion AS esAsignacion
		FROM conceptos
		WHERE tipo_concepto = 'D' AND auto_asignar = 0 AND formula IS NOT NULL
		ORDER BY codigo ASC`
	)) as DynamicConceptRow[];

	return {
		employee: {
			...employee,
			hijosMenores: Number(employee.hijosMenores),
			hijosMenoresEstudian: Number(employee.hijosMenoresEstudian),
			onapre: employee.rango === null
				? null
				: {
						rango: employee.rango,
						claseFuncionario: employee.claseFuncionario,
						salarioBase: employee.salarioBase
					}
		},
		period: { month, year },
		dynamicConcepts: dynamicConcepts.map((concept) => ({
			...concept,
			esAsignacion: Number(concept.esAsignacion) === 1
		}))
	};
};
