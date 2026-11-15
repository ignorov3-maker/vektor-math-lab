#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"
: "${SOURCE_DB:?Set SOURCE_DB in the operator environment}"
: "${DUMP_FILE:?Set DUMP_FILE outside the repository}"
[[ ! -e "$DUMP_FILE" ]] || { echo 'Refusing to overwrite an archive' >&2; exit 1; }
command -v pg_dump >/dev/null
tmp="${DUMP_FILE}.partial"
trap 'rm -f -- "$tmp"' EXIT
# ACL сохраняются: --no-acl сделал бы security-definer функции общедоступными.
pg_dump --dbname="$SOURCE_DB" --format=custom --no-owner --schema=public --schema=extensions --file="$tmp"
mv -- "$tmp" "$DUMP_FILE"
(cd "$(dirname "$DUMP_FILE")" && sha256sum -- "$(basename "$DUMP_FILE")" > "$(basename "$DUMP_FILE").sha256")
echo 'Application archive and SHA-256 ready. Vault and provider secrets are not included.'
