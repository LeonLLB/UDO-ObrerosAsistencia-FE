import {
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn
} from 'typeorm';
import { EntidadPersonal } from '../../personal/entities/personal.entity';

@Entity({ name: 'permisos_personal' })
export class EntidadPermiso {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'text' })
	descripcion!: string;

	@Column({ type: 'text' })
	patologia!: string;

	@Column({ name: 'fecha_inicio', type: 'date' })
	fechaInicio!: string;

	@Column({ name: 'fecha_fin', type: 'date' })
	fechaFin!: string;

	@Column({ type: 'tinyint', default: 1 })
	status!: 0 | 1;

	@ManyToOne(() => EntidadPersonal, { nullable: false, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'personal_id' })
	personal!: EntidadPersonal;
}
