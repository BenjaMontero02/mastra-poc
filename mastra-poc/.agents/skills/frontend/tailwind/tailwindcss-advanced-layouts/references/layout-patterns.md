# Patrones de Layout Avanzados con Tailwind CSS

Esta referencia contiene ejemplos prácticos de layouts avanzados con CSS Grid, Flexbox, Container Queries y más.

---

## CSS Grid

### Holy Grail Layout

```html
<!-- Layout básico -->
<div class="grid min-h-screen grid-rows-[auto_1fr_auto]">
  <header class="bg-white shadow">Header</header>
  <div class="grid grid-cols-[250px_1fr_300px]">
    <aside class="bg-gray-50 p-4">Sidebar</aside>
    <main class="p-6">Main Content</main>
    <aside class="bg-gray-50 p-4">Right Sidebar</aside>
  </div>
  <footer class="bg-gray-800 text-white">Footer</footer>
</div>

<!-- Responsive -->
<div class="grid min-h-screen grid-rows-[auto_1fr_auto]">
  <header>Header</header>
  <div class="grid grid-cols-1 md:grid-cols-[250px_1fr] lg:grid-cols-[250px_1fr_300px]">
    <aside class="order-2 md:order-1">Sidebar</aside>
    <main class="order-1 md:order-2">Main</main>
    <aside class="order-3 hidden lg:block">Right</aside>
  </div>
  <footer>Footer</footer>
</div>
```

### Grid Template Areas

```css
@utility grid-areas-dashboard {
  grid-template-areas:
    "header header header"
    "nav main aside"
    "nav footer footer";
}

@utility area-header { grid-area: header; }
@utility area-nav { grid-area: nav; }
@utility area-main { grid-area: main; }
@utility area-aside { grid-area: aside; }
@utility area-footer { grid-area: footer; }
```

```html
<div class="grid grid-areas-dashboard grid-cols-[200px_1fr_250px] grid-rows-[60px_1fr_40px] min-h-screen">
  <header class="area-header bg-white shadow">Header</header>
  <nav class="area-nav bg-gray-100">Navigation</nav>
  <main class="area-main p-6">Main Content</main>
  <aside class="area-aside bg-gray-50 p-4">Sidebar</aside>
  <footer class="area-footer bg-gray-800 text-white">Footer</footer>
</div>
```

### Auto-Fill y Auto-Fit

```html
<!-- Auto-fill: Crea tracks aunque estén vacíos -->
<div class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6">
  <div class="bg-white rounded-lg shadow p-4">Card 1</div>
  <div class="bg-white rounded-lg shadow p-4">Card 2</div>
</div>

<!-- Auto-fit: Colapsa tracks vacíos -->
<div class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">
  <!-- Cards se estiran para llenar espacio -->
</div>

<!-- Con min() para containers pequeños -->
<div class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
  <!-- Maneja edge case de container menor que minmax -->
</div>
```

### Subgrid

```css
@utility subgrid-cols {
  grid-template-columns: subgrid;
}

@utility subgrid-rows {
  grid-template-rows: subgrid;
}
```

```html
<div class="grid grid-cols-4 gap-4">
  <div class="col-span-2 grid subgrid-cols gap-4">
    <div>Alineado a columna 1 del padre</div>
    <div>Alineado a columna 2 del padre</div>
  </div>
</div>
```

---

## Flexbox Avanzado

### Distribución de Espacio

```html
<!-- Primer/último en bordes -->
<div class="flex justify-between">
  <div>First</div>
  <div>Second</div>
  <div>Third</div>
</div>

<!-- Espacio igual en todos lados -->
<div class="flex justify-around">
  <div>Item</div>
  <div>Item</div>
</div>

<!-- Doble espacio entre items que en bordes -->
<div class="flex justify-evenly">
  <div>Item</div>
  <div>Item</div>
</div>
```

### Sizing Flexible

```html
<!-- Iguales -->
<div class="flex">
  <div class="flex-1">1/3</div>
  <div class="flex-1">1/3</div>
  <div class="flex-1">1/3</div>
</div>

<!-- Primer item 2x -->
<div class="flex">
  <div class="flex-[2]">2/4</div>
  <div class="flex-1">1/4</div>
  <div class="flex-1">1/4</div>
</div>

<!-- Fijo + flexible -->
<div class="flex">
  <div class="w-64 shrink-0">Fixed 256px</div>
  <div class="flex-1 min-w-0">Flexible</div>
</div>

<!-- Prevenir shrink con truncate -->
<div class="flex min-w-0">
  <div class="shrink-0">Icon</div>
  <div class="min-w-0 truncate">Texto largo que trunca</div>
</div>
```

### Masonry con Flexbox

```html
<div class="flex flex-col flex-wrap h-[800px] gap-4">
  <div class="w-[calc(33.333%-1rem)] h-48">Item 1</div>
  <div class="w-[calc(33.333%-1rem)] h-64">Item 2</div>
  <div class="w-[calc(33.333%-1rem)] h-32">Item 3</div>
</div>
```

---

## Container Queries

### Básico

```css
@plugin "@tailwindcss/container-queries";
```

```html
<div class="@container">
  <div class="flex flex-col @md:flex-row @lg:grid @lg:grid-cols-3 gap-4">
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
  </div>
</div>
```

### Containers con Nombre

```html
<div class="@container/sidebar">
  <nav class="@[200px]/sidebar:flex-col @[300px]/sidebar:flex-row">
    Navigation
  </nav>
</div>

<div class="@container/main">
  <article class="@[600px]/main:prose-lg @[900px]/main:prose-xl">
    Content
  </article>
</div>
```

### Unidades de Container

```html
<div class="@container">
  <h1 class="text-[5cqw]">Escala con ancho del container</h1>
  <p class="text-[3cqi]">Escala con inline size</p>
</div>
```

---

## Posicionamiento

### Sticky

```html
<!-- Header sticky -->
<header class="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b">
  Navigation
</header>

<!-- Sidebar sticky -->
<aside class="sticky top-20 h-[calc(100vh-5rem)] overflow-auto">
  Sidebar content
</aside>

<!-- Table header sticky -->
<div class="overflow-auto max-h-96">
  <table>
    <thead class="sticky top-0 bg-white shadow">
      <tr>
        <th class="sticky left-0 bg-white z-10">Corner</th>
        <th>Column 2</th>
      </tr>
    </thead>
  </table>
</div>
```

### Fixed

```html
<!-- Bottom nav mobile -->
<nav class="fixed bottom-0 inset-x-0 z-50 bg-white border-t md:hidden">
  <div class="flex justify-around py-2">
    <a href="#">Home</a>
    <a href="#">Search</a>
  </div>
</nav>

<!-- FAB -->
<button class="fixed bottom-6 right-6 z-40 rounded-full bg-brand-500 p-4 shadow-lg">
  <PlusIcon />
</button>
```

### Z-Index Sistema

```css
@theme {
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;
  --z-toast: 800;
}

@utility z-dropdown { z-index: var(--z-dropdown); }
@utility z-sticky { z-index: var(--z-sticky); }
@utility z-modal { z-index: var(--z-modal); }
@utility z-toast { z-index: var(--z-toast); }
```

---

## Scroll y Overflow

### Custom Scrollbars

```css
@utility scrollbar-thin {
  scrollbar-width: thin;
}

@utility scrollbar-none {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

@utility scrollbar-none::-webkit-scrollbar {
  display: none;
}

@utility scrollbar-custom {
  scrollbar-color: oklch(0.7 0 0) oklch(0.95 0 0);
}

@utility scrollbar-custom::-webkit-scrollbar {
  width: 8px;
}

@utility scrollbar-custom::-webkit-scrollbar-thumb {
  background: oklch(0.7 0 0);
  border-radius: 4px;
}
```

### Scroll Snap

```html
<!-- Carousel horizontal -->
<div class="flex snap-x snap-mandatory overflow-x-auto gap-4 pb-4">
  <div class="snap-start shrink-0 w-80">Card 1</div>
  <div class="snap-start shrink-0 w-80">Card 2</div>
</div>

<!-- Secciones full-page -->
<div class="h-screen snap-y snap-mandatory overflow-y-auto">
  <section class="h-screen snap-start">Section 1</section>
  <section class="h-screen snap-start">Section 2</section>
</div>

<!-- Con padding offset -->
<div class="snap-x scroll-pl-6 overflow-x-auto">
  <div class="snap-start">...</div>
</div>
```

### Scroll Margin para Anchors

```html
<section id="about" class="scroll-mt-20">
  <!-- Aparece debajo del header fijo al navegar -->
</section>
```

---

## Aspect Ratio y Object Fit

```html
<!-- Video responsivo -->
<div class="aspect-video bg-gray-100">
  <video class="h-full w-full object-cover">...</video>
</div>

<!-- Avatar circular -->
<div class="aspect-square rounded-full overflow-hidden">
  <img src="avatar.jpg" class="h-full w-full object-cover" />
</div>

<!-- Ratios custom -->
<div class="aspect-[4/3]">4:3</div>
<div class="aspect-[21/9]">Ultra-wide</div>

<!-- Object position -->
<div class="h-64 overflow-hidden">
  <img src="portrait.jpg" class="h-full w-full object-cover object-top" />
</div>

<img class="object-cover object-[25%_75%]" src="..." />
```

---

## Spacing Avanzado

### Propiedades Lógicas (RTL/LTR)

```html
<div class="ps-4 pe-6 ms-auto">
  Respeta dirección del texto
</div>
```

### Dividers

```html
<!-- Vertical -->
<ul class="divide-y divide-gray-200">
  <li class="py-4">Item 1</li>
  <li class="py-4">Item 2</li>
</ul>

<!-- Horizontal -->
<div class="flex divide-x divide-gray-200">
  <div class="px-4">Section 1</div>
  <div class="px-4">Section 2</div>
</div>
```

### Negative Margins (Bleeds)

```html
<!-- Full-bleed en container con padding -->
<article class="px-6">
  <p>Contenido con padding</p>
  <img src="hero.jpg" class="-mx-6 w-[calc(100%+3rem)]" />
  <p>Más contenido</p>
</article>

<!-- Pull quote que rompe márgenes -->
<div class="max-w-prose mx-auto px-4">
  <blockquote class="-mx-8 md:-mx-16 px-8 md:px-16 py-8 bg-gray-100">
    Quote destacado
  </blockquote>
</div>
```

---

## Multi-Column Layout

```html
<!-- Columnas responsivas -->
<div class="columns-1 sm:columns-2 lg:columns-3 gap-8">
  <p>Contenido fluye entre columnas...</p>
</div>

<!-- Columnas de ancho fijo -->
<div class="columns-[300px] gap-6">
  <p>Crea tantas columnas de 300px como quepan</p>
</div>

<!-- Prevenir breaks -->
<div class="columns-2">
  <div class="break-inside-avoid mb-4">
    Card que no se divide
  </div>
</div>
```

---

## Patrones Responsivos

### Container + Media Queries

```html
<div class="@container">
  <div class="
    @md:flex @md:gap-4
    lg:grid lg:grid-cols-2
  ">
    Content
  </div>
</div>
```

### Visibilidad por Breakpoint

```html
<nav>
  <button class="md:hidden">Menu</button>
  <ul class="hidden md:flex gap-4">
    <li>Home</li>
    <li>About</li>
  </ul>
</nav>
```

### Fluid Sizing con Clamp

```html
<section class="py-[clamp(2rem,5vw,6rem)] px-[clamp(1rem,3vw,4rem)]">
  Padding responsivo
</section>

<div class="mx-auto w-full max-w-[clamp(300px,90vw,1200px)]">
  Container responsivo
</div>
```

---

## Print Styles

```html
<!-- Ocultar al imprimir -->
<nav class="print:hidden">Navigation</nav>

<!-- Solo al imprimir -->
<div class="hidden print:block">Contenido solo impreso</div>

<!-- Estilos de impresión -->
<article class="print:text-black print:bg-white">
  <a href="..." class="text-blue-500 print:text-black print:underline">
    Link
  </a>
</article>

<!-- Control de page breaks -->
<div class="print:break-inside-avoid">
  Mantener junto en una página
</div>

<div class="print:break-before-page">
  Empieza en página nueva
</div>
```

---

## Best Practices

1. **Usar Grid para 2D, Flexbox para 1D**
2. **Prevenir overflow**: `min-w-0` en flex items con `truncate`
3. **Sizing semántico**: `max-w-prose` para lectura, `container` para secciones
4. **Testear todos los breakpoints**
