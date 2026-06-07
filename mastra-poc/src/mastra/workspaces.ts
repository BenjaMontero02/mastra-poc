import { Workspace, LocalFilesystem } from '@mastra/core/workspace';
import { DockerSandbox } from '@mastra/docker';
import os from 'os';
import path from 'path';
import fs from 'fs';

const ROOT = path.resolve(process.cwd(), '..');

const SANDBOX_ROOT = path.join(ROOT, 'sandbox');
const CURRENT_FILE = path.join(SANDBOX_ROOT, 'current');
const DEFAULT_PROJECT = path.join(ROOT, 'workspaces', 'project');

function getActiveSandboxPath(): string {
  try {
    const relative = fs.readFileSync(CURRENT_FILE, 'utf-8').trim();
    if (!relative) return DEFAULT_PROJECT;
    const resolved = path.resolve(SANDBOX_ROOT, relative);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      return resolved;
    }
  } catch {}
  return DEFAULT_PROJECT;
}

export const skillsWorkspace = new Workspace({
  id: 'skills',
  name: 'Global Skills',
  filesystem: new LocalFilesystem({
    basePath: path.join(os.homedir(), '.agents', 'skills'),
  }),
  skills: ['.'],
});

export const projectWorkspace = new Workspace({
  id: 'project',
  name: 'Project Workspace',
  filesystem: () => new LocalFilesystem({ basePath: getActiveSandboxPath() }),
  sandbox: new DockerSandbox({
    image: 'node:22',
    workingDir: '/workspace',
    env: {"GITHUB_TOKEN": process.env.GITHUB_TOKEN || ''},
    volumes: {
      [SANDBOX_ROOT]: '/workspace',
    },
  }),
  skills: [path.join(os.homedir(), '.agents', 'skills')],
});

export const frontendArchitectWorkspace = new Workspace({
  id: 'frontend-architect',
  name: 'Frontend Architect Skills',
  filesystem: new LocalFilesystem({
    basePath: path.join(process.cwd(), '.agents', 'skills', 'frontend'),
  }),
  skills: ['.'],
});

export const backendArchitectWorkspace = new Workspace({
  id: 'backend-architect',
  name: 'Backend Architect Skills',
  filesystem: new LocalFilesystem({
    basePath: path.join(process.cwd(), '.agents', 'skills', 'backend'),
  }),
  skills: ['.'],
});

export const qaWorkspace = new Workspace({
  id: 'qa',
  name: 'QA Workspace',
  filesystem: () => new LocalFilesystem({ basePath: getActiveSandboxPath() }),
  skills: [path.join(process.cwd(), '.agents', 'skills', 'qa')],
});

export const docsWorkspace = new Workspace({
  id: 'docs',
  name: 'Docs Workspace',
  filesystem: new LocalFilesystem({
    basePath: path.join(ROOT, 'workspaces', 'docs'),
  }),
  skills: [path.join(os.homedir(), '.agents', 'skills')],
});
