#!/usr/bin/env bash
# Publishes the promo site (site/) and the game (web/ built into dist/) on anadoluailesi.com.tr:
#   https://anadoluailesi.com.tr/            the promo site
#   https://anadoluailesi.com.tr/oyun/<dil>/ the game (tr, en, ar, ur, hi, es, fr: the language of the meanings)
# Server: tezcan@31.77.63.14, folder /var/www/anadoluailesi.com.tr, nginx file sites-available/anadoluailesi.com.tr
# (server/deploy/nginx-anadoluailesi.conf; tools/move-to-anadoluailesi.sh moved them from the old sehem2 names once). Usage: tools/deploy.sh
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
  W=/var/www/anadoluailesi.com.tr
  [ -e /etc/nginx/sites-enabled/anadoluailesi.com.tr ] || W=/var/www/sehem2.com.tr # (before tools/move-to-anadoluailesi.sh: the folder nginx serves still has the old name)
  sudo rm -rf $W.new $W.old
  sudo mkdir $W.new
  sudo tar xzf - -C $W.new
  sudo chown -R root:root $W.new
  sudo find $W.new -type d -exec chmod 755 {} +
  sudo find $W.new -type f -exec chmod 644 {} +
  [ -d $W ] && sudo mv $W $W.old
  sudo mv $W.new $W
  sudo rm -rf $W.old
  echo "live: $(sudo du -sh $W | cut -f1) in $W"'
}
for try in 1 2 3 4; do upload && exit 0; echo "upload failed (try $try), again in 10 s…"; sleep 10; done
exit 1
