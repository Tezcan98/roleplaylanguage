import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
const source = new URL('../www/', import.meta.url);
if (!existsSync(source)) throw new Error('Missing www: run npm run prepare:web before uploading to EAS.');
const target = new URL('../ios/App/public/', import.meta.url);
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, { recursive: true });
cpSync(new URL('../runtime-config.json', import.meta.url), new URL('../ios/App/capacitor.config.json', import.meta.url));
