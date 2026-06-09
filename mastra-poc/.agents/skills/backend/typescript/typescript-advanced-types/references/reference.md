# TypeScript Advanced Types — Referencia Completa

## Genéricos

### Con constraints

```typescript
// Constraint básico
function logLength<T extends { length: number }>(item: T): T {
  console.log(item.length);
  return item;
}

// Múltiples parámetros
function merge<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

// Constraint con keyof
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

## Conditional Types

```typescript
// Básico
type IsString<T> = T extends string ? true : false;

// Con infer — extraer tipos internos
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type ElementType<T> = T extends (infer U)[] ? U : never;
type PromiseType<T> = T extends Promise<infer U> ? U : never;
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

// Distributivo sobre unions
type ToArray<T> = T extends any ? T[] : never;
type StrOrNumArray = ToArray<string | number>; // string[] | number[]

// Nombres de tipo
type TypeName<T> = T extends string ? 'string'
  : T extends number ? 'number'
  : T extends boolean ? 'boolean'
  : T extends Function ? 'function'
  : 'object';
```

## Mapped Types

```typescript
// Transformar todas las propiedades
type Readonly<T> = { readonly [P in keyof T]: T[P] };
type Partial<T> = { [P in keyof T]?: T[P] };
type Required<T> = { [P in keyof T]-?: T[P] };

// Key remapping con as
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

// Filtrar propiedades por tipo
type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

// Ejemplo: solo las propiedades numéricas
interface Mixed { id: number; name: string; age: number; active: boolean; }
type OnlyNumbers = PickByType<Mixed, number>; // { id: number; age: number }
```

## Template Literal Types

```typescript
// Generar nombres de eventos
type EventName = 'click' | 'focus' | 'blur';
type EventHandler = `on${Capitalize<EventName>}`; // "onClick" | "onFocus" | "onBlur"

// String manipulation
type Upper = Uppercase<'hello'>;       // "HELLO"
type Lower = Lowercase<'HELLO'>;       // "hello"
type Cap = Capitalize<'john'>;         // "John"
type Uncap = Uncapitalize<'John'>;     // "john"

// Rutas tipadas
type Path<T> = T extends object
  ? { [K in keyof T]: K extends string ? `${K}` | `${K}.${Path<T[K]>}` : never }[keyof T]
  : never;
```

## Utility Types built-in

```typescript
type PartialUser = Partial<User>;              // todos opcionales
type RequiredUser = Required<PartialUser>;     // todos requeridos
type ReadonlyUser = Readonly<User>;            // todos readonly
type UserName = Pick<User, 'name' | 'email'>; // seleccionar props
type UserNoPass = Omit<User, 'password'>;      // quitar props
type T1 = Exclude<'a' | 'b' | 'c', 'a'>;     // "b" | "c"
type T2 = Extract<'a' | 'b' | 'c', 'a' | 'b'>; // "a" | "b"
type T3 = NonNullable<string | null | undefined>; // string
type PageInfo = Record<'home' | 'about', { title: string }>;
type Ret = ReturnType<typeof myFunction>;
type Params = Parameters<typeof myFunction>;
```

## Type Guards

```typescript
// User-defined type guard
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Guard genérico para arrays
function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

// Assertion function
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') throw new Error('Not a string');
}

// Guard para objetos con propiedades específicas
function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K,
): obj is T & Record<K, unknown> {
  return key in obj;
}
```

## Discriminated Unions

```typescript
// Estado de operación asíncrona
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading'; requestId: string }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function handle<T>(state: AsyncState<T>): void {
  switch (state.status) {
    case 'success':
      console.log(state.data); // T
      break;
    case 'error':
      console.log(state.error.message); // string
      break;
  }
}

// Resultado de operación (patrón Railway)
type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };
```

## Patrones Avanzados

### Deep Readonly / Deep Partial

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function ? T[P] : DeepReadonly<T[P]>
    : T[P];
};

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Array<infer U> ? Array<DeepPartial<U>> : DeepPartial<T[P]>
    : T[P];
};
```

### Type-Safe Event Emitter

```typescript
type EventMap = {
  'user:created': { id: string; name: string };
  'user:updated': { id: string };
};

class TypedEventEmitter<T extends Record<string, any>> {
  private listeners: { [K in keyof T]?: Array<(data: T[K]) => void> } = {};

  on<K extends keyof T>(event: K, cb: (data: T[K]) => void): void {
    (this.listeners[event] ??= []).push(cb);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    this.listeners[event]?.forEach(cb => cb(data));
  }
}
```

### Type Testing

```typescript
type AssertEqual<T, U> = [T] extends [U]
  ? [U] extends [T] ? true : false
  : false;

type Test1 = AssertEqual<string, string>; // true
type Test2 = AssertEqual<string, number>; // false
```

## Configuración strict — referencia rápida

| Opción | Qué habilita |
|--------|--------------|
| `strict` | Activa todas las opciones strict |
| `strictNullChecks` | `null`/`undefined` no son asignables a otros tipos |
| `noImplicitAny` | Error si TypeScript infiere `any` |
| `strictFunctionTypes` | Chequeo covariante/contravariante en funciones |
| `strictPropertyInitialization` | Propiedades de clase deben inicializarse en el constructor |
