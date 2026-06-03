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

export const docsWorkspace = new Workspace({
  id: 'docs',
  name: 'Docs Workspace',
  filesystem: new LocalFilesystem({
    basePath: path.join(ROOT, 'workspaces', 'docs'),
  }),
  mounts: {
    '/project': new LocalFilesystem({
      basePath: path.join(ROOT, 'workspaces', 'project'),
      readOnly: true,
    }),
  },
  skills: [path.join(os.homedir(), '.agents', 'skills')],
});
