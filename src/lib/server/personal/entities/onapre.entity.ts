import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'onapre' })
export class EntidadOnapre {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'int', unsigned: true })
	rango!: number;

	@Column({ name: 'clase_funcionario', type: 'varchar', length: 4 })
	claseFuncionario!: string;

	@Column({ name: 'tipo_personal', type: 'varchar', length: 1 })
	tipoPersonal!: 'A' | 'O';

	@Column({ name: 'salario_base', type: 'decimal', precision: 12, scale: 2 })
	salarioBase!: string;
}
