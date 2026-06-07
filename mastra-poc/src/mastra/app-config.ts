import { z } from 'zod/v4';
import fs from 'fs';
import path from 'path';

function loadEnvFile(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env');
  const result: Record<string, string> = {};
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
      }
    }
  } catch {}
  return result;
}

const envFile = loadEnvFile();

const envSchema = z.object({
  GITHUB_TOKEN: z.string().default(''),
});

const merged = { ...process.env, ...envFile };
const parsed = envSchema.safeParse(merged);

if (!parsed.success) {
  console.warn('Missing or invalid environment variables:', parsed.error.flatten());
}

export const appConfig = {
  githubToken: parsed.success ? parsed.data.GITHUB_TOKEN : '',
} as const;
