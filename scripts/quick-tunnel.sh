#!/usr/bin/env bash
# Run Cloudflare Quick Tunnel so the trycloudflare.com URL works.
# (With default config loaded, the named tunnel ingress takes over and the quick URL returns 404.)
set -e
CONFIG_DIR="${HOME}/.cloudflared"
CONFIG="${CONFIG_DIR}/config.yml"
BAK="${CONFIG_DIR}/config.yml.bak"
if [[ -f "$CONFIG" ]]; then
  mv "$CONFIG" "$BAK"
  trap 'mv "$BAK" "$CONFIG" 2>/dev/null || true' EXIT
fi
exec cloudflared tunnel --url http://localhost:3000 --protocol http2
