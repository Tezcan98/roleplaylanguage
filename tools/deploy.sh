#!/usr/bin/env bash
# Publishes the promo site (site/) and the game (web/ built into dist/) on anadoluailesi.com.tr:
#   https://anadoluailesi.com.tr/            the promo site
#   https://anadoluailesi.com.tr/oyun/<dil>/ the game (tr, en, ar, ur, es, fr: the language of the meanings)
# Server: tezcan@31.77.63.14. The folder and the nginx file there keep the old name (/var/www/sehem2.com.tr,
# /etc/nginx/sites-available/sehem2.com.tr) — only names, the old domain sehem2.com.tr is given up. Usage: tools/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=tezcan@31.77.63.14

npm run build -w web >/dev/null
STAGE=$(mktemp -d)
trap 'rm -rf "${STAGE:?}"' EXIT
cp -r site/. "$STAGE/"
cp -r web/dist "$STAGE/oyun"
echo "to upload: $(du -sh "$STAGE" | cut -f1)"

# upload into a fresh folder, then swap it in (visitors never see half an upload).
# The server's ssh sometimes drops a new connection at once (throttling): a few tries.
upload() {
tar czf - -C "$STAGE" . | ssh -o BatchMode=yes -o ConnectTimeout=15 -i "$HOME/.ssh/id_ed25519" "$HOST" '
  set -e
  sudo rm -rf /var/www/sehem2.com.tr.new /var/www/sehem2.com.tr.old
  sudo mkdir /var/www/sehem2.com.tr.new
  sudo tar xzf - -C /var/www/sehem2.com.tr.new
  sudo chown -R root:root /var/www/sehem2.com.tr.new
  sudo find /var/www/sehem2.com.tr.new -type d -exec chmod 755 {} +
  sudo find /var/www/sehem2.com.tr.new -type f -exec chmod 644 {} +
  sudo mv /var/www/sehem2.com.tr /var/www/sehem2.com.tr.old
  sudo mv /var/www/sehem2.com.tr.new /var/www/sehem2.com.tr
  sudo rm -rf /var/www/sehem2.com.tr.old
  echo "live: $(sudo du -sh /var/www/sehem2.com.tr | cut -f1)"'
}
for try in 1 2 3 4; do upload && exit 0; echo "upload failed (try $try), again in 10 s…"; sleep 10; done
exit 1
