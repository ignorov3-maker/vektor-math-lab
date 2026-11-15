#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"
: "${TARGET_DB:?Set TARGET_DB}"
: "${TARGET_EXPECTED_DB:?Set the expected target database name}"
: "${RESTORE_CONFIRM:?Set RESTORE_CONFIRM to the expected database name}"
: "${DUMP_FILE:?Set DUMP_FILE}"
[[ "$RESTORE_CONFIRM" == "$TARGET_EXPECTED_DB" ]] || { echo 'Target confirmation mismatch' >&2; exit 1; }
actual=$(db_query "$TARGET_DB" -c 'select current_database()')
[[ "$actual" == "$TARGET_EXPECTED_DB" ]] || { echo 'Connected to an unexpected database' >&2; exit 1; }
if [[ -n "${SOURCE_DB:-}" ]]; then
  source_id=$(db_query "$SOURCE_DB" -c "select current_database()||':'||coalesce(inet_server_addr()::text,'local')||':'||inet_server_port()")
  target_id=$(db_query "$TARGET_DB" -c "select current_database()||':'||coalesce(inet_server_addr()::text,'local')||':'||inet_server_port()")
  [[ "$source_id" != "$target_id" ]] || { echo 'Source and target are the same database' >&2; exit 1; }
fi
existing=$(db_query "$TARGET_DB" -c "select count(*) from pg_tables where schemaname='public' and tablename like 'vk_%'")
[[ "$existing" == 0 || "${REPLACE_APPLICATION:-0}" == 1 ]] || { echo 'Target contains application tables. Use a fresh target or explicitly set REPLACE_APPLICATION=1 after taking a backup.' >&2; exit 1; }
need_file "$DUMP_FILE"; need_file "$DUMP_FILE.sha256"
(cd "$(dirname "$DUMP_FILE")" && sha256sum --check --status "$(basename "$DUMP_FILE").sha256")
command -v pg_restore >/dev/null
pg_restore --dbname="$TARGET_DB" --clean --if-exists --no-owner --exit-on-error --single-transaction "$DUMP_FILE"
echo 'Restore committed atomically. Run verify.sh before opening access.'
