# TypeORM Reference — Ejemplos Completos

## Configuración TypeScript requerida

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true
  }
}
```

## Entidad completa con todas las columnas

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, VersionColumn } from 'typeorm';

@Entity('productos')
export class Producto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'boolean', default: true })
  disponible: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({
    type: 'enum',
    enum: ['activo', 'inactivo', 'pendiente'],
    default: 'pendiente',
  })
  estado: 'activo' | 'inactivo' | 'pendiente';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null; // soft delete

  @VersionColumn()
  version: number;
}
```

## Relaciones

### One-to-One

```typescript
@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Perfil, perfil => perfil.usuario, { cascade: true })
  @JoinColumn()
  perfil: Perfil;
}

@Entity('perfiles')
export class Perfil {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bio: string;

  @OneToOne(() => Usuario, usuario => usuario.perfil)
  usuario: Usuario;
}
```

### One-to-Many / Many-to-One

```typescript
@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => Post, post => post.autor)
  posts: Post[];
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  titulo: string;

  @ManyToOne(() => Usuario, usuario => usuario.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'autor_id' })
  autor: Usuario;

  @Column()
  autorId: string; // FK explícita
}
```

### Many-to-Many

```typescript
@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToMany(() => Tag, tag => tag.posts)
  @JoinTable({
    name: 'post_tags',
    joinColumn: { name: 'post_id' },
    inverseJoinColumn: { name: 'tag_id' },
  })
  tags: Tag[];
}

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nombre: string;

  @ManyToMany(() => Post, post => post.tags)
  posts: Post[];
}
```

## Repositorio customizado completo

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AgentRepository {
  constructor(
    @InjectRepository(Agent)
    private readonly repo: Repository<Agent>,
  ) {}

  findAll(): Promise<Agent[]> {
    return this.repo.find();
  }

  findById(id: string): Promise<Agent | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByStatus(status: AgentStatus): Promise<Agent[]> {
    return this.repo.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }

  findWithSkills(agentId: string): Promise<Agent | null> {
    return this.repo.findOne({
      where: { id: agentId },
      relations: ['skills'],
    });
  }

  async create(dto: CreateAgentDto): Promise<Agent> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateAgentDto): Promise<Agent> {
    await this.repo.update({ id }, dto);
    return this.repo.findOneOrFail({ where: { id } });
  }

  softDelete(id: string): Promise<void> {
    return this.repo.softDelete({ id }).then(() => undefined);
  }
}
```

## Query Builder avanzado

```typescript
// Con joins y paginación
const result = await this.repo
  .createQueryBuilder('agent')
  .leftJoinAndSelect('agent.skills', 'skill')
  .where('agent.status = :status', { status: 'approved' })
  .andWhere('skill.active = :active', { active: true })
  .orderBy('agent.createdAt', 'DESC')
  .skip(offset)
  .take(limit)
  .getManyAndCount();

// Aggregaciones
const stats = await this.repo
  .createQueryBuilder('agent')
  .select('agent.status', 'status')
  .addSelect('COUNT(*)', 'count')
  .groupBy('agent.status')
  .getRawMany();

// Insert bulk
await this.repo
  .createQueryBuilder()
  .insert()
  .into(Agent)
  .values(agentsArray)
  .orIgnore()
  .execute();
```

## Transacciones con QueryRunner

```typescript
const queryRunner = dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  await queryRunner.manager.save(entity1);
  await queryRunner.manager.save(entity2);
  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```

## Migración completa

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAgents1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'agents',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'status', type: 'enum', enum: ['draft', 'pending', 'approved', 'rejected'], default: "'draft'" },
          { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('agents', new TableIndex({
      name: 'IDX_AGENTS_STATUS',
      columnNames: ['status'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('agents', 'IDX_AGENTS_STATUS');
    await queryRunner.dropTable('agents');
  }
}
```

## Configuración DataSource

```typescript
// src/data-source.ts
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/entities/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  poolSize: 10,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
```

## NestJS Module Integration

```typescript
// data.module.ts
TypeOrmModule.forRoot({
  type: 'postgres',
  // ...config
  entities: [Agent, Skill, User],
  migrations: ['dist/migrations/**/*.js'],
  synchronize: false,
});

// feature module
TypeOrmModule.forFeature([Agent])
```

## Índices y soft delete

```typescript
@Entity()
@Index(['email'])
@Index(['firstName', 'lastName'])
export class User {
  @Column()
  @Index({ unique: true })
  email: string;

  // Soft delete: requires DeleteDateColumn
  @DeleteDateColumn()
  deletedAt: Date | null;
}

// Soft delete en repositorio
await repo.softDelete({ id });
await repo.restore({ id });
await repo.find({ withDeleted: true }); // incluye eliminados
```
