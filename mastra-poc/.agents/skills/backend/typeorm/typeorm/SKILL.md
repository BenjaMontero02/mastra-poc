---
name: typeorm
description: Aplica patrones TypeORM en este proyecto (NestJS 11 + PostgreSQL). Usa cuando escribas entidades, repositorios, migraciones, relaciones o queries. Triggers: TypeORM, entidad, repositorio, migración, query builder, relacion, columna, FK.
---

# TypeORM en este Proyecto

## Stack
- NestJS 11 + TypeORM + PostgreSQL
- Patrón: Data Mapper (nunca Active Record)
- `synchronize: false` siempre — solo migraciones
- Módulos: entidades en `data.module.ts`, repositorios en `src/repository/`

## Workflow: nueva entidad

1. Crear entidad en `src/entities/` (ver convenciones abajo)
2. Registrar entidad en `src/modules/data.module.ts`
3. Crear repositorio customizado en `src/repository/`
4. Generar migración: `npx typeorm migration:generate src/migrations/<Nombre> -d src/data-source.ts`
5. Verificar que `down()` deshace correctamente el `up()`

## Convenciones de entidades

```typescript
@Entity('nombre_tabla')   // snake_case explícito
export class NombreEntidad {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Columnas nullable: siempre | null
  @Column({ type: 'varchar', nullable: true })
  campo: string | null;

  // FKs: columna explícita + relación
  @ManyToOne(() => Parent, p => p.children)
  @JoinColumn({ name: 'parent_id' })
  parent: Parent;

  @Column()
  parentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## Repositorios en NestJS

```typescript
@Injectable()
export class EntidadRepository {
  constructor(
    @InjectRepository(Entidad)
    private readonly repo: Repository<Entidad>,
  ) {}

  // Lógica de query va aquí, no en el service
  findByThing(thingId: string): Promise<Entidad[]> {
    return this.repo.find({ where: { thingId } });
  }
}
```

## Query Builder

Usar para joins, aggregaciones y subqueries complejos.
**Siempre** parametrizar — nunca interpolar strings:

```typescript
// ✅ Correcto
.where('user.id = :id', { id })

// ❌ Prohibido
.where(`user.id = '${id}'`)
```

## Transacciones

```typescript
await dataSource.transaction(async (manager) => {
  await manager.save(entity1);
  await manager.save(entity2);
  // Si falla → rollback automático
});
```

## Seguridad
- **Nunca** interpolar variables en SQL crudo
- Raw SQL: `queryRunner.query('SELECT ... WHERE id = $1', [id])`
- Inputs validados en DTOs antes de llegar al repositorio

## Migraciones
- Generar desde entidades, no escribir manualmente desde cero
- `down()` obligatorio y funcional
- Naming descriptivo: `AddStatusToAgent1234567890123`

Ver [reference.md](references/reference.md) para ejemplos completos de entidades, relaciones y patterns.