/**
 * Mails to the operator (reports for now). The SMTP server is on another machine; this side calls
 * its HTTP API:
 *
 *   POST MAIL_API_URL   Authorization: Bearer MAIL_API_KEY
 *        { to, subject, text }  → 2xx when it was taken
 *
 * TODO (docs/TODO.md): the API's real address, its request shape and auth are not settled yet —
 * adjust `send()` when access to that server is given. Until MAIL_API_URL is set, mails are only
 * logged (the report itself is kept and listed on /api/reports either way).
 */
export class Mailer {
  constructor({ url = '', key = '', to = '', fetchImpl = fetch, log = console.log } = {}) {
    Object.assign(this, { url, key, to, fetchImpl, log });
  }

  static fromEnv(env, log = console.log) {
    return new Mailer({ url: env.MAIL_API_URL ?? '', key: env.MAIL_API_KEY ?? '', to: env.REPORT_MAIL_TO ?? '', log });
  }

  get enabled() { return !!(this.url && this.to); }

  /** True when the mail API took it. */
  async send({ subject, text, to = this.to }) {
    if (!this.enabled) { this.log(`[mail] not configured (MAIL_API_URL / REPORT_MAIL_TO): "${subject}"`); return false; }
    const res = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(this.key ? { Authorization: `Bearer ${this.key}` } : {}) },
      body: JSON.stringify({ to, subject, text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`mail API ${res.status}`);
    return true;
  }
}
