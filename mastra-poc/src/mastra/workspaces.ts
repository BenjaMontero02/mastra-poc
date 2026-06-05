import { Workspace, LocalFilesystem } from '@mastra/core/workspace';
import os from 'os';
import path from 'path';

const ROOT = path.resolve(process.cwd(), '..');

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
  filesystem: new LocalFilesystem({
    basePath: path.join(ROOT, 'workspaces', 'project'),
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
  name: 'QA Output',
  filesystem: new LocalFilesystem({
    basePath: path.join(ROOT, 'workspaces', 'project', 'qa-output'),
  }),
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
