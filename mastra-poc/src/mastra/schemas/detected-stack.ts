import { z } from 'zod/v4';

export const detectedStackSchema = z.object({
  languages: z.array(z.string()).describe('Lenguajes de programación detectados (ej: ["typescript", "python"])'),
  frontend: z
    .object({
      framework: z.string().describe('Framework frontend (ej: React, Vue, Angular)'),
      libs: z.array(z.string()).describe('Librerías frontend (ej: Next.js, Tailwind CSS)'),
    })
    .nullable()
    .describe('Configuración frontend o null si no aplica'),
  backend: z
    .object({
      framework: z.string().describe('Framework backend (ej: NestJS, FastAPI, Express)'),
      libs: z.array(z.string()).describe('Librerías backend (ej: TypeORM, SQLAlchemy)'),
    })
    .nullable()
    .describe('Configuración backend o null si no aplica'),
  runCommands: z.object({
    dev: z.string().optional().describe('Comando para iniciar en desarrollo (ej: npm run dev)'),
    build: z.string().optional().describe('Comando para compilar/build'),
    start: z.string().optional().describe('Comando para iniciar en producción'),
    compose: z.boolean().describe('True si existe docker-compose.yml'),
  }),
  port: z.number().optional().describe('Puerto principal de la aplicación (si se pudo detectar)'),
  conventions: z
    .array(z.string())
    .describe('Convenciones detectadas (ej: ["ESLint", "Prettier", "Jest", "Playwright"])'),
  inferred: z
    .boolean()
    .describe('True si el stack se infirió de manifiestos (sin AGENTS.md); false si vino de AGENTS.md'),
});

export type DetectedStack = z.infer<typeof detectedStackSchema>;
