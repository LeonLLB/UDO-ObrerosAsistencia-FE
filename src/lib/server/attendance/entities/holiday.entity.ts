import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'feriados' })
export class EntidadFeriado {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'text' })
	descripcion!: string;

	@Column({ name: 'fecha_inicio', type: 'date' })
	fechaInicio!: string;

	@Column({ name: 'fecha_fin', type: 'date' })
	fechaFin!: string;
}
