/**
 * Mails to the operator (reports for now). The SMTP server is on another machine (the mail machine,
 * sending as bildirim@sorexdigital.com); this side calls its HTTP API (server/mail-api/):
 *
 *   POST MAIL_API_URL   Authorization: Bearer MAIL_API_KEY
 *        { to, subject, text, attachments? }  → 2xx when it was taken
 *        attachments: [{ filename, contentType, content }]  (content base64; the voice pieces of a report)
 *
 * Until MAIL_API_URL is set, mails are only logged (the report itself is kept and listed on
 * /api/reports either way).
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
  async send({ subject, text, to = this.to, attachments = [] }) {
    if (!this.enabled) { this.log(`[mail] not configured (MAIL_API_URL / REPORT_MAIL_TO): "${subject}"`); return false; }
    const res = await this.fetchImpl(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(this.key ? { Authorization: `Bearer ${this.key}` } : {}) },
      body: JSON.stringify({ to, subject, text, ...(attachments.length ? { attachments } : {}) }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`mail API ${res.status}`);
    return true;
  }
}
