#!/usr/bin/env bash
source "$(dirname "$0")/common.sh"
: "${SOURCE_DB:?Set SOURCE_DB}"; : "${TARGET_DB:?Set TARGET_DB}"
tables_sql="select quote_ident(schemaname)||'.'||quote_ident(tablename) from pg_tables where schemaname='public' order by tablename"
source_tables=$(db_query "$SOURCE_DB" -c "$tables_sql")
target_tables=$(db_query "$TARGET_DB" -c "$tables_sql")
[[ "$source_tables" == "$target_tables" ]] || { echo 'FAIL: table lists differ' >&2; exit 1; }
while IFS= read -r table; do
  [[ -n "$table" ]] || continue
  source_count=$(db_query "$SOURCE_DB" -c "select count(*) from $table")
  target_count=$(db_query "$TARGET_DB" -c "select count(*) from $table")
  source_hash=$(db_query "$SOURCE_DB" -c "copy(select md5(to_jsonb(t)::text) from $table t order by 1) to stdout" | sha256sum | cut -d' ' -f1)
  target_hash=$(db_query "$TARGET_DB" -c "copy(select md5(to_jsonb(t)::text) from $table t order by 1) to stdout" | sha256sum | cut -d' ' -f1)
  [[ "$source_count" == "$target_count" && "$source_hash" == "$target_hash" ]] || { echo "FAIL: $table" >&2; exit 1; }
  echo "OK: $table ($source_count rows, matching checksum)"
done <<< "$source_tables"
# Сверяем ещё счётчики serial и эффективные права браузера, а не только данные.
for query in \
  "select sequencename,last_value from pg_sequences where schemaname='public' order by sequencename" \
  "select c.relname,c.relrowsecurity,has_table_privilege('anon',c.oid,'select'),has_table_privilege('anon',c.oid,'insert') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname" \
  "select p.oid::regprocedure::text,has_function_privilege('anon',p.oid,'execute'),has_function_privilege('authenticated',p.oid,'execute'),p.prosecdef,p.proconfig::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1"; do
  [[ "$(db_query "$SOURCE_DB" -c "$query")" == "$(db_query "$TARGET_DB" -c "$query")" ]] || { echo 'FAIL: sequences or security settings differ' >&2; exit 1; }
done
echo 'VERIFY OK'
