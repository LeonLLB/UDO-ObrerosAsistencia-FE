import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TipoUsuario } from './tipo-usuario';

@Entity({ name: 'usuarios' })
export class EntidadUsuario {
	@PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  cedula!: string;

  @Column({ type: 'varchar', length: 100 })
  nombres!: string;

  @Column({ type: 'varchar', length: 100 })
  apellidos!: string;

  @Column({ type: 'varchar', length: 1 })
  tipo!: TipoUsuario;

  @Column({ type: 'tinyint', default: 0 })
  status!: 0 | 1;

  @Column({
    name: 'clave',
    type: 'varchar',
    length: 255,
    select: false,
    nullable: true,
    default: null
  })
  claveHash!: string | null;

}
