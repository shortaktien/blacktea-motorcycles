#!/usr/bin/env bash
# Run through the protected production deployment, never from local development.
set -euo pipefail
umask 077
test "$(pwd -P)" = /opt/btm || { echo 'Expected /opt/btm' >&2; exit 1; }
runtime=/opt/btm-runtime
backups=/opt/btm-backups
for directory in "$runtime" "$backups"; do
  test -d "$directory" && test ! -L "$directory" && test -w "$directory" || {
    echo "Provision a private, deploy-user-owned directory first: $directory" >&2; exit 1;
  }
done
compose=(docker compose -f docker-compose.prod.yml)
# Build before interrupting the old backend; a failed build leaves it running.
"${compose[@]}" build
backend_id=$("${compose[@]}" ps -aq backend)
test -n "$backend_id" || { echo 'No existing backend; refusing implicit empty-store initialization.' >&2; exit 1; }
test "$(docker inspect --format '{{.State.Running}}' "$backend_id")" = true
backup=$(mktemp -d "$backups/deploy-XXXXXXXX")
mkdir "$backup/snapshot"
stopped=false
recover_backend() {
  if "$stopped"; then
    # On preparation failure, keep the original container and data available.
    docker start "$backend_id" >/dev/null || true
  fi
}
trap recover_backend EXIT
"${compose[@]}" stop backend
stopped=true
# A stopped container gives a consistent snapshot of accounts, posts and uploads.
docker cp "$backend_id:/app/var/." "$backup/snapshot/"
tar -czf "$backup/runtime.tar.gz" -C "$backup/snapshot" .
tar -tzf "$backup/runtime.tar.gz" >/dev/null
sha256sum "$backup/runtime.tar.gz" > "$backup/runtime.tar.gz.sha256"
(cd "$backup" && sha256sum -c runtime.tar.gz.sha256)
for part in data uploads sessions; do
  target="$runtime/$part"
  test ! -L "$target" || { echo "Symlink refused: $target" >&2; exit 1; }
  mounted=$(docker inspect --format "{{range .Mounts}}{{if eq .Destination \"/app/var/$part\"}}{{.Source}}{{end}}{{end}}" "$backend_id")
  if test -n "$mounted"; then
    test "$mounted" = "$target" || { echo "Unexpected runtime mount: $mounted" >&2; exit 1; }
    test -d "$target"
  else
    # First migration: the running container, not an old host copy, is authoritative.
    if test -e "$target"; then mv "$target" "$backup/previous-$part"; fi
    if test -d "$backup/snapshot/$part"; then
      cp -a "$backup/snapshot/$part" "$target"
      diff -qr "$backup/snapshot/$part" "$target"
    else
      mkdir "$target"
    fi
  fi
done
echo "Verified runtime backup: $backup/runtime.tar.gz"
# No cache mount: every image starts with a fresh Symfony route/container cache.
"${compose[@]}" up -d --no-build --remove-orphans
stopped=false
trap - EXIT
new_backend=$("${compose[@]}" ps -q backend)
for part in data uploads sessions; do
  mounted=$(docker inspect --format "{{range .Mounts}}{{if eq .Destination \"/app/var/$part\"}}{{.Source}}{{end}}{{end}}" "$new_backend")
  test "$mounted" = "$runtime/$part" || { echo "Missing persistent mount: $part" >&2; exit 1; }
done
echo 'Accounts, posts, uploads and sessions are now stored outside the container.'
