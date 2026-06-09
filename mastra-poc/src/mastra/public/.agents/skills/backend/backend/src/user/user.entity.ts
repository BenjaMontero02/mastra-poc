import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  entraId: string;

  @Column()
  email: string;

  @Column()
  name: string;

  @Column({ default: 'user' })
  role: string;
}
