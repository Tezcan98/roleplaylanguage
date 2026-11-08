import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const root = new URL('../../', import.meta.url);
execFileSync('npm', ['run', 'build', '-w', 'web'], { cwd: root, stdio: 'inherit' });
const target = new URL('../www/', import.meta.url);
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(new URL('../../web/dist/', import.meta.url), target, { recursive: true });
