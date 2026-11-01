#!/bin/sh
# Copia de seguridad de Postgres: un volcado comprimido cada día a las 03:15
# (hora del servidor) y se conservan los últimos BACKUP_KEEP_DAYS días.
set -eu

KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
DIR=/backups
export PGPASSWORD="$POSTGRES_PASSWORD"

run_backup() {
  ts=$(date +%Y%m%d-%H%M)
  file="$DIR/anpi-$ts.dump"
  echo "[backup] $(date -Iseconds) creando $file"
  if pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f "$file.tmp"; then
    mv "$file.tmp" "$file"
    echo "[backup] ok ($(du -h "$file" | cut -f1))"
  else
    rm -f "$file.tmp"
    echo "[backup] ERROR: pg_dump ha fallado" >&2
    return 1
  fi
  find "$DIR" -name 'anpi-*.dump' -type f -mtime "+$KEEP_DAYS" -print -delete
}

if [ "${1:-}" = "now" ]; then
  run_backup
  exit $?
fi

# Una copia nada más arrancar, para comprobar que todo funciona.
run_backup || true

while true; do
  now=$(date +%s)
  next=$(date -d "$(date +%Y-%m-%d) 03:15" +%s 2>/dev/null || echo 0)
  if [ "$next" -le "$now" ]; then next=$((next + 86400)); fi
  if [ "$next" -le 86400 ]; then sleep 86400; else sleep $((next - now)); fi
  run_backup || true
done
