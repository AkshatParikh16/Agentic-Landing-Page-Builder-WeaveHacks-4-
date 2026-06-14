import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DIR = path.join(process.cwd(), '.results');

export function saveResult(html: string, meta?: { finalScore?: number }): string {
  fs.mkdirSync(DIR, { recursive: true });
  const id = crypto.randomBytes(8).toString('hex');
  fs.writeFileSync(path.join(DIR, `${id}.html`), html, 'utf-8');
  if (meta) {
    fs.writeFileSync(path.join(DIR, `${id}.json`), JSON.stringify(meta), 'utf-8');
  }
  return id;
}

export function getResultHtml(id: string): string | null {
  const safe = id.replace(/[^a-f0-9]/gi, '');
  if (!safe) return null;
  const file = path.join(DIR, `${safe}.html`);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf-8');
}

export function getResultMeta(id: string): { finalScore?: number } | null {
  const safe = id.replace(/[^a-f0-9]/gi, '');
  const file = path.join(DIR, `${safe}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}
