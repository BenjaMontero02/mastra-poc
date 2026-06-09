---
name: tailwind-best-practices
description: Reglas y estándares de calidad para usar Tailwind CSS en proyectos React/JSX. Aplica esta skill siempre que vayas a crear, modificar o revisar componentes que usen Tailwind: cuando alguien pida un componente nuevo, refactorizar clases, crear variantes, revisar consistencia visual, o implementar estados (hover, focus, disabled, loading, error). También aplica cuando se detecten valores arbitrarios, clases duplicadas, o falta de accesibilidad en el código existente.
---

# Tailwind CSS — Reglas y Buenas Prácticas

## Cuándo aplica esta skill

- Crear o modificar componentes React con Tailwind
- Revisar o refactorizar clases existentes
- Implementar variantes o estados visuales
- Detectar patrones repetidos que deben abstraerse

---

## 1. Clases utilitarias en JSX

Usá clases directamente en JSX **solo cuando el estilo sea simple y específico** del componente. Si el `className` crece, se vuelve repetitivo o difícil de leer, extraelo.

**Simple → inline está bien:**
```tsx
<div className="flex items-center gap-2 p-4">
```

**Complejo → extraer con `cn()` o `cva()`:**
```tsx
// ✅ Con cn() para condicionales
const classes = cn(
  "flex items-center gap-2 rounded-md px-4 py-2",
  isActive && "bg-primary text-white",
  isDisabled && "opacity-50 cursor-not-allowed"
);

// ✅ Con cva() para variantes de componente
const button = cva("inline-flex items-center rounded-md font-medium transition-colors", {
  variants: {
    variant: {
      primary: "bg-primary text-white hover:bg-primary/90",
      ghost:   "bg-transparent hover:bg-muted",
    },
    size: {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-base",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});
```

---

## 2. No duplicar patrones visuales

Si el mismo conjunto de clases aparece en más de un componente, **abstraelo**. Las pequeñas variaciones entre componentes similares son una señal de que falta un componente base.

- Cards, botones, inputs, badges, layouts → si se repiten, deben vivir en `components/ui/`
- No copies y pegues bloques de clases con diferencias mínimas sin justificación

---

## 3. Tokens de Tailwind, no valores arbitrarios

Evitá valores como `w-[373px]`, `mt-[17px]`, `text-[#3a4b5c]`. Usá los tokens del sistema de diseño.

| En vez de... | Usá... |
|:-------------|:-------|
| `w-[373px]` | `w-96` / `max-w-sm` |
| `mt-[17px]` | `mt-4` / `mt-5` |
| `text-[#3a4b5c]` | `text-primary` / token de color |
| `text-[13px]` | `text-sm` |

Los valores arbitrarios son aceptables **solo cuando no existe equivalente** en la escala de Tailwind y hay una razón técnica concreta (ej: integrar con un componente externo que fuerza dimensiones exactas).

---

## 4. Orden de clases

Mantené un orden consistente para que el código sea predecible y legible:

```
layout → spacing → sizing → typography → colors → effects → states
```

Ejemplo:
```tsx
className="flex flex-col          // layout
           gap-4 p-6              // spacing
           w-full max-w-lg        // sizing
           text-sm font-medium    // typography
           bg-white text-gray-900 // colors
           rounded-lg shadow-md   // effects
           hover:shadow-lg        // states
           focus-visible:ring-2"  // states
```

Si la lógica de clases es compleja, extraela a una función o `cn()`.

---

## 5. Estados visuales obligatorios

Siempre que un elemento sea interactivo o tenga estados posibles, definí **todos los estados relevantes**:

```tsx
className={cn(
  // base
  "inline-flex items-center gap-2 rounded-md px-4 py-2 transition-colors",
  // hover
  "hover:bg-primary/90",
  // focus (accesibilidad)
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  // active
  "active:scale-95",
  // disabled
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
)}
```

Estados a contemplar según el tipo de componente:
- **Botones / links**: `hover`, `focus-visible`, `active`, `disabled`
- **Inputs / forms**: `focus`, `disabled`, `invalid` / error, `placeholder`
- **Contenido dinámico**: `loading` (skeleton o spinner), `empty` (estado vacío), `error`

---

## 6. Accesibilidad visual

- **Foco visible**: nunca remover `outline` sin reemplazarlo por `focus-visible:ring-*`
- **No solo color para estados**: acompañá el color con un ícono, texto o borde (ej: campo en error → borde rojo + ícono + mensaje)
- **Contraste**: usá colores del sistema que garanticen relación de contraste adecuada; evitá `text-gray-300` sobre `bg-white`
- **Tamaño de tap target**: elementos clickeables mínimo `h-10` / `min-w-10` para mobile

---

## 7. Mobile-first

Empezá siempre desde el diseño más pequeño y agregá breakpoints hacia arriba:

```tsx
// ✅ mobile-first
className="flex-col md:flex-row"

// ❌ desktop-first (evitar)
className="flex-row max-md:flex-col"
```

Breakpoints en orden: base → `sm:` → `md:` → `lg:` → `xl:` → `2xl:`

---

## 8. No usar `!important`

Si necesitás `!important` (`!text-red-500`), es una señal de que hay un conflicto de especificidad que debe resolverse desde la raíz. Revisá el orden de aplicación de clases o la composición del componente.

---

## 9. Calidad visual mínima esperada

Todo componente, incluso cuando el foco sea funcional, debe cumplir:

- **Espaciado equilibrado**: usar escala de spacing de Tailwind (4, 6, 8, 12...)
- **Jerarquía visual clara**: tamaños de texto y pesos que distingan heading, body, caption
- **Tipografía legible**: línea de base coherente, no mezclar tamaños sin criterio
- **Estados bien definidos**: no dejar estados sin estilo
- **Aspecto profesional y coherente** con el resto de la aplicación

Antes de crear un patrón nuevo, verificá si ya existe uno reutilizable en el proyecto.
