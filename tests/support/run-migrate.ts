import { execFile } from 'node:child_process';
import path from 'node:path';

export const migrateScript = path.resolve(__dirname, '../../scripts/migrate.mjs');

export type RunResult = { code: number; stdout: string; stderr: string };

/** Ejecuta el script de migración como lo haría la build de Vercel: un proceso Node aparte, sin heredar variables de BD. */
export function runMigrate(env: Record<string, string | undefined>): Promise<RunResult> {
  const clean: NodeJS.ProcessEnv = { ...process.env };
  delete clean.DATABASE_MIGRATION_URL;
  delete clean.DATABASE_URL;
  delete clean.VERCEL_ENV;
  return new Promise((resolve) => {
    execFile(process.execPath, [migrateScript], { env: { ...clean, ...env }, timeout: 60_000 }, (err, stdout, stderr) => {
      const code = err ? (typeof err.code === 'number' ? err.code : 1) : 0;
      resolve({ code, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}
