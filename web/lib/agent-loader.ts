import fs from 'fs';
import path from 'path';

const AGENTS_DIR = path.join(process.cwd(), 'agents');

export function loadAgent(agentName: string): string {
  const dir = path.join(AGENTS_DIR, agentName);
  const agentMd = fs.readFileSync(path.join(dir, 'Agent.md'), 'utf-8');
  const skillsMd = fs.readFileSync(path.join(dir, 'Skills.md'), 'utf-8');
  return `${agentMd}\n\n---\n\n${skillsMd}`;
}

export function loadAllAgents(): string {
  const agentNames = fs.readdirSync(AGENTS_DIR).filter((name) =>
    fs.statSync(path.join(AGENTS_DIR, name)).isDirectory()
  );
  return agentNames
    .map((name) => {
      const agentMd = fs.readFileSync(path.join(AGENTS_DIR, name, 'Agent.md'), 'utf-8');
      return `### ${name}\n${agentMd}`;
    })
    .join('\n\n---\n\n');
}
