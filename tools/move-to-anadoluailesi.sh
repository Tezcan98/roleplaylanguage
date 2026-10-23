#!/usr/bin/env bash
# Once: the game's things on the server take the name anadoluailesi.com.tr (they were sehem2.com.tr):
#   /var/www/sehem2.com.tr          → /var/www/anadoluailesi.com.tr   (the site and the game; tools/deploy.sh writes there)
#   /etc/ssl/sehem2                 → /etc/ssl/anadoluailesi          (the certificate for Cloudflare)
#   nginx sites-…/sehem2.com.tr     → sites-…/anadoluailesi.com.tr    (server/deploy/nginx-anadoluailesi.conf; it also mends
#                                     the play numbers' line, /api/play-event and /api/stats, which was written without its value)
# The old address sehem2.com.tr still answers (the apps already out ask it for their updates). Backups first; if nginx
# doesn't take the new file, the old one is put back. semapen.com.tr is not touched. Usage: tools/move-to-anadoluailesi.sh
set -euo pipefail
cd "$(dirname "$0")/.."
HOST=tezcan@31.77.63.14
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=15 -i "$HOME/.ssh/id_ed25519")
scp -o BatchMode=yes -i "$HOME/.ssh/id_ed25519" server/deploy/nginx-anadoluailesi.conf "$HOST:/tmp/anadoluailesi.com.tr.nginx"
"${SSH[@]}" "$HOST" '
  set -e
  STAMP=$(date +%Y%m%d%H%M)
  AV=/etc/nginx/sites-available EN=/etc/nginx/sites-enabled
  [ -f $AV/sehem2.com.tr ] && sudo cp -a $AV/sehem2.com.tr /root/nginx-sehem2.com.tr.bak-$STAMP
  [ -d /var/www/anadoluailesi.com.tr ] || sudo cp -a /var/www/sehem2.com.tr /var/www/anadoluailesi.com.tr
  [ -d /etc/ssl/anadoluailesi ] || sudo cp -a /etc/ssl/sehem2 /etc/ssl/anadoluailesi
  sudo install -m 644 -o root -g root /tmp/anadoluailesi.com.tr.nginx $AV/anadoluailesi.com.tr
  sudo ln -sfn $AV/anadoluailesi.com.tr $EN/anadoluailesi.com.tr
  sudo rm -f $EN/sehem2.com.tr
  if sudo nginx -t; then
    sudo systemctl reload nginx
    sudo mv $AV/sehem2.com.tr /root/nginx-sehem2.com.tr.old-$STAMP 2>/dev/null || true
    [ -d /var/www/sehem2.com.tr ] && sudo mv /var/www/sehem2.com.tr /var/www/sehem2.com.tr.old-$STAMP
    echo "tamam: anadoluailesi.com.tr (eskiler: /root/nginx-sehem2.com.tr.old-$STAMP, /var/www/sehem2.com.tr.old-$STAMP)"
  else
    sudo rm -f $EN/anadoluailesi.com.tr
    sudo ln -sfn $AV/sehem2.com.tr $EN/sehem2.com.tr
    echo "nginx yeni dosyayı kabul etmedi: eskisi geri kondu, hiçbir şey değişmedi" >&2
    exit 1
  fi'
curl -s -m 10 -o /dev/null -w "oyun: %{http_code}  " https://anadoluailesi.com.tr/oyun/
curl -s -m 10 -o /dev/null -w "sunucu: %{http_code}  " https://anadoluailesi.com.tr/health
curl -s -m 10 -o /dev/null -w "oyun sayıları: %{http_code} (204 ya da 400 = çalışıyor)\n" -X POST -H 'Content-Type: application/json' -d '{}' https://anadoluailesi.com.tr/api/play-event
