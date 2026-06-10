import { Workspace, LocalFilesystem } from '@mastra/core/workspace';
import { DockerSandbox } from '@mastra/docker';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { PROJECT_ROOT, SKILLS_DIR } from './paths';

/**
 * Dynamic skills resolver for frontend architect workspace.
 *
 * Loads skills dynamically based on detected stack in requestContext.
 * Always loads: frontend/_core (universal principles)
 * Dynamic: framework (react, vue, svelte, etc.), styling (tailwind, css-modules), libs (axios, zustand, etc.)
 *
 * Expected requestContext key: 'detectedStack' with shape:
 * { frontend?: { framework?: string, libs?: string[] }, ... }
 *
 * Fallback: If detectedStack not available, loads all frontend skills (graceful degradation).
 *
 * IMPORTANT: Returns absolute paths (host filesystem) for use with sandbox-based workspace.
 * Skills are resolved relative to SKILLS_DIR/frontend and converted to absolute paths.
 */
function resolveFrontendSkills(context: { requestContext?: any }): string[] {
  const skillsBase = path.join(SKILLS_DIR, 'frontend');
  const paths: string[] = [];

  // Always load universal core principles first (absolute path)
  paths.push(path.join(skillsBase, '_core'));

  try {
    const detectedStack = context.requestContext?.get?.('detectedStack');

    if (detectedStack && typeof detectedStack === 'object') {
      const frontend = detectedStack.frontend;

      if (frontend) {
        // Add framework-specific skills (handle aliases: next/nextjs → react)
        if (frontend.framework) {
          const framework = frontend.framework.toLowerCase();
          const normalizedFramework =
            framework.includes('next') ? 'react' :
            framework === 'angular' ? 'angular' :
            framework === 'vue' ? 'vue' :
            framework === 'svelte' ? 'svelte' :
            framework === 'solid' ? 'solid' :
            'react'; // default fallback

          const skillPath = path.join(skillsBase, normalizedFramework);
          if (!paths.includes(skillPath)) {
            paths.push(skillPath);
          }
        }

        // Add library-specific skills
        if (Array.isArray(frontend.libs)) {
          for (const lib of frontend.libs) {
            const libLower = lib.toLowerCase();
            // Map lib names to folder names if needed
            const libFolder =
              libLower.includes('tailwind') ? 'tailwind' :
              libLower === 'axios' ? 'axios' :
              libLower === 'zustand' ? 'react' : // zustand is in react folder
              libLower === 'react-query' || libLower === 'tanstack-query' ? 'react' :
              null;

            if (libFolder) {
              const skillPath = path.join(skillsBase, libFolder);
              if (!paths.includes(skillPath)) {
                paths.push(skillPath);
              }
            }
          }
        }
      }
    } else {
      // Fallback: load all frontend skills (absolute paths)
      // This maintains backward compatibility when detectedStack is unavailable
      const allFrontendDirs = fs.readdirSync(skillsBase, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
        .map(dirent => path.join(skillsBase, dirent.name));

      // Ensure _core is first
      const corePath = path.join(skillsBase, '_core');
      const coreIndex = allFrontendDirs.indexOf(corePath);
      if (coreIndex > -1) {
        allFrontendDirs.splice(coreIndex, 1);
      }

      return [corePath, ...allFrontendDirs];
    }
  } catch (error) {
    // If resolver fails, return all frontend skills as safe fallback (absolute paths)
    const allFrontendDirs = fs.readdirSync(skillsBase, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map(dirent => path.join(skillsBase, dirent.name));

    const corePath = path.join(skillsBase, '_core');
    const coreIndex = allFrontendDirs.indexOf(corePath);
    if (coreIndex > -1) {
      allFrontendDirs.splice(coreIndex, 1);
    }

    return [corePath, ...allFrontendDirs];
  }

  return paths;
}

/**
 * Dynamic skills resolver for backend architect workspace.
 *
 * Loads skills dynamically based on detected stack in requestContext.
 * Always loads: backend/_core (universal principles), backend/typescript (shared language)
 * Dynamic: framework (nestjs, fastify, express, etc.), orm (typeorm, prisma, sequelize, etc.)
 *
 * Expected requestContext key: 'detectedStack' with shape:
 * { backend?: { framework?: string, libs?: string[] }, ... }
 *
 * Fallback: If detectedStack not available, loads all backend skills (graceful degradation).
 *
 * IMPORTANT: Returns absolute paths (host filesystem) for use with sandbox-based workspace.
 * Skills are resolved relative to SKILLS_DIR/backend and converted to absolute paths.
 */
function resolveBackendSkills(context: { requestContext?: any }): string[] {
  const skillsBase = path.join(SKILLS_DIR, 'backend');
  const paths: string[] = [];

  // Always load universal core principles and TypeScript (language used across all backends) - absolute paths
  paths.push(path.join(skillsBase, '_core'));
  paths.push(path.join(skillsBase, 'typescript'));

  try {
    const detectedStack = context.requestContext?.get?.('detectedStack');

    if (detectedStack && typeof detectedStack === 'object') {
      const backend = detectedStack.backend;

      if (backend) {
        // Add framework-specific skills (handle aliases: nest/nestjs → nestjs)
        if (backend.framework) {
          const framework = backend.framework.toLowerCase();
          const normalizedFramework =
            framework.includes('nest') ? 'nestjs' :
            framework === 'express' ? 'nestjs' : // Express in this setup lives in nestjs folder (fastify-best-practices)
            framework === 'fastify' ? 'nestjs' :
            'nestjs'; // default fallback

          const skillPath = path.join(skillsBase, normalizedFramework);
          if (!paths.includes(skillPath)) {
            paths.push(skillPath);
          }
        }

        // Add ORM/library-specific skills
        if (Array.isArray(backend.libs)) {
          for (const lib of backend.libs) {
            const libLower = lib.toLowerCase();
            // Map lib names to folder names
            const libFolder =
              libLower.includes('typeorm') ? 'typeorm' :
              libLower.includes('prisma') ? 'prisma' :
              libLower === 'sequelize' ? 'typeorm' : // similar patterns
              null;

            if (libFolder) {
              const skillPath = path.join(skillsBase, libFolder);
              if (!paths.includes(skillPath)) {
                paths.push(skillPath);
              }
            }
          }
        }
      }
    } else {
      // Fallback: load all backend skills (absolute paths)
      // This maintains backward compatibility when detectedStack is unavailable
      const allBackendDirs = fs.readdirSync(skillsBase, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
        .map(dirent => path.join(skillsBase, dirent.name));

      // Ensure _core and typescript are first
      const corePath = path.join(skillsBase, '_core');
      const tsPath = path.join(skillsBase, 'typescript');

      const coreIndex = allBackendDirs.indexOf(corePath);
      const tsIndex = allBackendDirs.indexOf(tsPath);

      if (coreIndex > -1) allBackendDirs.splice(coreIndex, 1);
      if (tsIndex > -1) allBackendDirs.splice(allBackendDirs.indexOf(tsPath), 1);

      return [corePath, tsPath, ...allBackendDirs];
    }
  } catch (error) {
    // If resolver fails, return all backend skills as safe fallback (absolute paths)
    const allBackendDirs = fs.readdirSync(skillsBase, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map(dirent => path.join(skillsBase, dirent.name));

    const corePath = path.join(skillsBase, '_core');
    const tsPath = path.join(skillsBase, 'typescript');

    const coreIndex = allBackendDirs.indexOf(corePath);
    const tsIndex = allBackendDirs.indexOf(tsPath);

    if (coreIndex > -1) allBackendDirs.splice(coreIndex, 1);
    if (tsIndex > -1) allBackendDirs.splice(allBackendDirs.indexOf(tsPath), 1);

    return [corePath, tsPath, ...allBackendDirs];
  }

  return paths;
}

export const skillsWorkspace = new Workspace({
  id: 'skills',
  name: 'Global Skills',
  filesystem: new LocalFilesystem({
    basePath: path.join(os.homedir(), '.agents', 'skills'),
  }),
  skills: ['.'],
});

/**
 * Sandbox compartido para todo el pipeline (sandbox-only storage).
 *
 * IMPORTANTE: NO hay bind mount del workspace al host. El repo clonado vive
 * exclusivamente en el filesystem del contenedor (/workspace/<taskId>) y se
 * destruye en el teardown. La persistencia del trabajo se garantiza con el
 * push de la rama feature al final del ciclo (siempre, pase o no pase QA).
 *
 * El socket de Docker se monta para que el code-supervisor pueda levantar la
 * app con docker compose (contenedores hermanos con puertos publicados al
 * host, donde corre el browser de QA). Ver docker/README.md para el tradeoff
 * de seguridad y la ruta de hardening (socket-proxy).
 */
export const projectSandbox = new DockerSandbox({
  id: 'mastra-task-sandbox',
  image: 'mastra-sandbox:latest',
  workingDir: '/workspace',
  env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN || '' },
  volumes: {
    '/var/run/docker.sock': '/var/run/docker.sock',
  },
});

export const projectWorkspace = new Workspace({
  id: 'project',
  name: 'Project Workspace',
  sandbox: projectSandbox,
  skills: [path.join(os.homedir(), '.agents', 'skills')],
});

export const frontendArchitectWorkspace = new Workspace({
  id: 'frontend-architect',
  name: 'Frontend Architect Skills',
  sandbox: projectSandbox,
  skills: resolveFrontendSkills,
});

export const backendArchitectWorkspace = new Workspace({
  id: 'backend-architect',
  name: 'Backend Architect Skills',
  sandbox: projectSandbox,
  skills: resolveBackendSkills,
});

export const qaWorkspace = new Workspace({
  id: 'qa',
  name: 'QA Workspace',
  // Comparte el sandbox del proyecto: QA lee el codigo del repo dentro del
  // contenedor via execute_command (no hay filesystem del host).
  sandbox: projectSandbox,
  skills: [path.join(SKILLS_DIR, 'qa')],
});

export const docsWorkspace = new Workspace({
  id: 'docs',
  name: 'Docs Workspace',
  filesystem: new LocalFilesystem({
    basePath: path.join(PROJECT_ROOT, 'workspaces', 'docs'),
  }),
  skills: [path.join(os.homedir(), '.agents', 'skills')],
});
