#!/usr/bin/env bash
set -euo pipefail
umask 077
command -v psql >/dev/null || { echo 'Install PostgreSQL client tools' >&2; exit 1; }
db_query() { local connection="$1"; shift; PGOPTIONS='-c timezone=UTC -c datestyle=ISO,MDY' psql --dbname="$connection" -X -qAt -v ON_ERROR_STOP=1 "$@"; }
need_file() { [[ -f "$1" ]] || { echo 'Archive not found' >&2; exit 1; }; }
