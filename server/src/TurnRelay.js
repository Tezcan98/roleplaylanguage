/**
 * Small TURN relay for one-to-one voice calls (phones on mobile data can rarely reach each
 * other directly). Runs inside the village server with node-turn (pure Node, no system
 * packages). Every player gets a random, short-lived account at join; it is removed when
 * they leave. Relaying to private / loopback addresses is refused, so the relay can't be
 * used to reach services on the server or its network.
 */
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { isIP } from 'node:net';

const require = createRequire(import.meta.url);

const PRIVATE_V4 = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
];
const v4 = (ip) => ip.split('.').reduce((n, x) => (n << 8) + Number(x), 0) >>> 0;

/** True for addresses a relay must never send to (loopback, private, link-local, multicast, IPv6). */
export function blockedPeer(address) {
  if (isIP(address) !== 4) return true; // the relay is IPv4 only; refuse anything else
  const ip = v4(address);
  return PRIVATE_V4.some(([base, bits]) => (ip >>> (32 - bits)) === (v4(base) >>> (32 - bits)));
}

export class TurnRelay {
  #users = new Map(); // player id → username

  /**
   * @param {object} o
   * @param {string} o.publicIp   the server's public IPv4 (listening and relay address)
   * @param {string[]} o.urls     turn: URLs handed to the players
   */
  /** `allowPrivate` only for local tests (both browsers on 127.0.0.1). */
  constructor({ publicIp, urls, port = 3478, minPort = 49160, maxPort = 49260, realm = 'yilmaz-ailesi', allowPrivate = false, log = console.log }) {
    const Turn = require('node-turn');
    const allocation = require('node-turn/lib/allocation.js');
    const permit = allocation.prototype.permit;
    allocation.prototype.permit = function guardedPermit(address) {
      if (!allowPrivate && blockedPeer(String(address))) { log(`[turn] refused relay to ${address}`); return; }
      return permit.call(this, address);
    };
    this.urls = urls;
    this.server = new Turn({
      listeningPort: port, listeningIps: [publicIp], relayIps: [publicIp], externalIps: publicIp,
      minPort, maxPort, authMech: 'long-term', credentials: {}, realm, debugLevel: 'OFF',
    });
    this.server.start();
    log(`[turn] relay on ${publicIp}:${port} (ports ${minPort}-${maxPort})`);
  }

  /** A fresh account for this player (replaces an old one). */
  issue(id) {
    this.release(id);
    const username = `${id}-${randomBytes(4).toString('hex')}`;
    const credential = randomBytes(12).toString('base64url');
    this.server.addUser(username, credential);
    this.#users.set(id, username);
    return { urls: this.urls, username, credential };
  }

  release(id) {
    const u = this.#users.get(id);
    if (!u) return;
    this.server.removeUser(u);
    this.#users.delete(id);
  }

  stop() { this.server.stop(); }
}
