# Mail API (mail.te-robotik.com.tr)

`mail-api.cjs` is the small service that sends Türk Ailem's mails. It runs on the **mail machine** (root@31.58.245.116:
Postfix + OpenDKIM for sorexdigital.com), not on the game server. The game server (`server/src/Mailer.js`) posts to it.

- Service `anadolu-mail` (systemd, user `anadolumail`, `/opt/anadolu-mail/mail-api.cjs`, listens on 127.0.0.1:8095).
- Settings and the key: `/etc/anadolu-mail.env` (0640, root:anadolumail) — `MAIL_API_KEY`, `FROM` (bildirim@sorexdigital.com), `FROM_NAME`, `PER_HOUR` (120), `PER_RECIPIENT_HOUR` (6), `ALLOW_TO` (empty = any recipient).
- HTTPS: nginx file `/etc/nginx/sites-available/anadolu-mail` (server `mail.te-robotik.com.tr`, only `/anadolu-mail/`; the Let's Encrypt cert of that name).
- DNS of sorexdigital.com already has SPF (ip4:31.58.245.116), DKIM (`mail._domainkey`), DMARC and MX → this machine.
- The game server's side: drop-in `/etc/systemd/system/yilmaz-village.service.d/mail.conf` (`MAIL_API_URL`, `MAIL_API_KEY`, `REPORT_MAIL_TO`).

```
POST https://mail.te-robotik.com.tr/anadolu-mail/send     Authorization: Bearer <MAIL_API_KEY>
{ "to", "subject", "text", "html"?, "replyTo"?, "fromName"?, "attachments"?: [{ "filename", "contentType", "content": "<base64>" }] }
→ 200 { ok, id } | 400 | 401 | 413 | 429 | 502        GET /anadolu-mail/health → { ok: true }
```

Updating: copy the file to `/opt/anadolu-mail/` and `systemctl restart anadolu-mail`. Not touched: the other sites, Postfix, OpenDKIM.
