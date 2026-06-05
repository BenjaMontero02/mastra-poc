# Skill: Schema Layer

## Propósito

Crear, modificar o refactorizar modelos Sequelize: definición de tablas, tipos de columnas, constraints, timestamps y asociaciones entre modelos.

## Patrones del proyecto

### Estructura base de un modelo

```typescript
export {};
const { DataTypes } = require('sequelize');
const Seque = require('../configuration/database');

const MiModelo = Seque.define(
    'MI_TABLA',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        nombre: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        descripcion: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        estado: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'activo',
        },
        usuario_email: {
            type: DataTypes.STRING(254),
            allowNull: false,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        metadata: {
            type: DataTypes.TEXT, // JSON almacenado como TEXT
            allowNull: true,
        },
    },
    {
        tableName: 'MI_TABLA',
        createdAt: true,
        updatedAt: true,
    },
);

module.exports = { MiModelo };
```

### Tipos de datos comunes

| Campo            | DataType                | Notas                                   |
| ---------------- | ----------------------- | --------------------------------------- |
| PK autoincrement | `DataTypes.INTEGER`     | `primaryKey: true, autoIncrement: true` |
| Email            | `DataTypes.STRING(254)` | Máximo RFC 5321                         |
| Nombre corto     | `DataTypes.STRING(100)` | Nombres, títulos                        |
| Estado           | `DataTypes.STRING(50)`  | Con `defaultValue`                      |
| Texto largo      | `DataTypes.TEXT`        | Observaciones, contenido HTML           |
| Boolean          | `DataTypes.BOOLEAN`     | Con `defaultValue: false`               |
| FK integer       | `DataTypes.INTEGER`     | `allowNull: false` si es requerida      |
| JSON como texto  | `DataTypes.TEXT`        | Parsear manualmente en servicio         |
| Orden/índice     | `DataTypes.INTEGER`     | Para ordenamiento manual                |

### Archivo de asociaciones (associations.ts)

```typescript
const { MiModelo } = require('./mi_modelo');
const { OtroModelo } = require('./otro_modelo');
const { RelacionModelo } = require('./relacion_modelo');

// ─── Asociaciones ─────────────────────────────────────────────────────────────

// Uno a muchos
MiModelo.hasMany(OtroModelo, {
    foreignKey: 'mi_modelo_id',
    as: 'otros',
});
OtroModelo.belongsTo(MiModelo, {
    foreignKey: 'mi_modelo_id',
    as: 'padre',
});

// Self-referencial (árbol de preguntas)
MiModelo.hasMany(MiModelo, {
    foreignKey: 'parent_id',
    as: 'children',
});
MiModelo.belongsTo(MiModelo, {
    foreignKey: 'parent_id',
    as: 'parent',
});

// Many-to-many via tabla intermedia
MiModelo.belongsToMany(OtroModelo, {
    through: RelacionModelo,
    foreignKey: 'mi_modelo_id',
    otherKey: 'otro_modelo_id',
});

module.exports = {
    MiModelo,
    OtroModelo,
    RelacionModelo,
};
```

### Reglas de diseño

1. **Un archivo por modelo**: `com_declaraciones.ts`, `com_preguntas.ts`, etc.
2. **tableName explícito**: Siempre declarar `tableName` para evitar pluralización automática.
3. **Timestamps declarados**: `createdAt: true, updatedAt: true` (o false si no aplican).
4. **PK con nombre descriptivo**: `id_declaracion`, `id_pregunta` (snake_case con prefijo de tabla).
5. **Foreign keys como INTEGER**: Referencia al PK de la tabla relacionada.
6. **Asociaciones centralizadas en `associations.ts`**: Evita circular imports.
7. **Re-exportar desde associations**: Los controllers/services importan desde `associations.ts`.

### Convenciones de naming

```
Tabla: COM_DECLARACIONES (UPPER_SNAKE para tabla SQL)
Modelo: ComDeclaraciones (PascalCase para variable JS)
Archivo: com_declaraciones.ts (snake_case para archivo)
PK: id_declaracion (snake_case con prefijo)
FK: tipo_ddjj_id (snake_case referenciando tabla)
```

### Mejores prácticas (mejoras sobre el proyecto actual)

1. **Validaciones a nivel de modelo**: Usar `validate` de Sequelize para constraints.

    ```typescript
    email: {
        type: DataTypes.STRING(254),
        allowNull: false,
        validate: {
            isEmail: true,
            notEmpty: true,
        },
    }
    ```

2. **Indexes para queries frecuentes**:

    ```typescript
    {
        tableName: 'MI_TABLA',
        indexes: [
            { fields: ['usuario_email'] },
            { fields: ['estado', 'createdAt'] },
            { unique: true, fields: ['nombre', 'tipo_id'] },
        ],
    }
    ```

3. **Evitar JSON en TEXT sin getter/setter**:

    ```typescript
    metadata: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const raw = this.getDataValue('metadata');
            return raw ? JSON.parse(raw) : null;
        },
        set(value: any) {
            this.setDataValue('metadata', value ? JSON.stringify(value) : null);
        },
    }
    ```

4. **Soft deletes** (si aplica):

    ```typescript
    {
        tableName: 'MI_TABLA',
        paranoid: true, // agrega deletedAt
    }
    ```

5. **No usar `any` en asociaciones**: Definir tipos para los resultados de includes.

### Export

```typescript
module.exports = { MiModelo };
```
