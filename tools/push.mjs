#!/usr/bin/env node
/**
 * Publishes a news message that appears in the status bar of the players' phones.
 *
 *   node tools/push.mjs "Title" "Message" [--dry]
 *
 * It writes site/haber.json with a new id and publishes the site (tools/deploy.sh). The app
 * (Android 1.0.37 and later; mobile/android .../NewsWorker.java) reads
 * https://anadoluailesi.com.tr/haber.json about once an hour and shows a message it has not
 * shown before, to the players who said yes to the "Haberler" card. No Firebase, no keys.
 * --dry only prints what would be published.
 */
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dry = process.argv.includes('--dry');
const [title, body] = args;
if (!title || !body) { console.error('usage: node tools/push.mjs "Title" "Message" [--dry]'); process.exit(1); }

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const news = { id: new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14), title, body };
console.log(JSON.stringify(news, null, 2));
if (dry) { console.log('(dry: nothing written, nothing published)'); process.exit(0); }
writeFileSync(join(root, 'site', 'haber.json'), `${JSON.stringify(news, null, 2)}\n`);
execFileSync(join(root, 'tools', 'deploy.sh'), { stdio: 'inherit' });
console.log('published: https://anadoluailesi.com.tr/haber.json');
