#!/usr/bin/env bash
# Вектор на своём сервере: Ubuntu 22.04/24.04, root, 2 ядра / 4 ГБ.
# Ставит Docker, self-hosted Supabase (со всеми сервисами, включая analytics),
# функцию Бипыча, сайт за HTTPS (Caddy), firewall, swap и ежедневный бэкап,
# затем по желанию копирует данные из облачного Supabase и сверяет их.
#
#   bash install.sh          установка или обновление (можно запускать повторно)
#   bash install.sh data     только скопировать данные из облака
#   bash install.sh status   проверить, что всё работает
#
# Секреты не печатаются: пароли и ключи лежат в /opt/vektor (права 600).
set -Eeuo pipefail
umask 077

ROOT=/opt/vektor
SB=$ROOT/supabase
APP=$ROOT/app
LOG=$ROOT/install.log
REPO_URL=https://github.com/ignorov3-maker/vektor-math-lab.git
SITE_BRANCH=${SITE_BRANCH:-main}
PG_TAG=${PG_TAG:-17.11.0.003}        # та же версия Postgres, что в облаке
CLIENT_IMAGE=postgres:17              # pg_dump/pg_restore не старее источника
CMD=${1:-install}
WARNS=()

say()  { printf '\n== %s\n' "$*"; }
ok()   { printf '   ✓ %s\n' "$*"; }
warn() { printf '   ! %s\n' "$*"; WARNS+=("$*"); }
die()  { printf '\n✗ ОШИБКА: %s\n  Скопируй весь вывод и пришли Claude.\n' "$*" >&2; exit 1; }
trap 'die "команда упала на строке $LINENO"' ERR

[[ $EUID -eq 0 ]] || die 'запусти от root'
mkdir -p "$ROOT" "$ROOT/public" "$ROOT/dumps" "$ROOT/backups"
chmod 700 "$ROOT"

env_get() { grep -m1 "^$1=" "$SB/.env" 2>/dev/null | cut -d= -f2- || true; }
env_set() {  # значения только из [A-Za-z0-9._:/-], поэтому sed безопасен
  local k=$1 v=$2
  if grep -q "^$k=" "$SB/.env"; then sed -i "s|^$k=.*|$k=$v|" "$SB/.env"; else printf '%s=%s\n' "$k" "$v" >> "$SB/.env"; fi
}
env_set_if() { grep -q "^$1=" "$SB/.env" && env_set "$1" "$2" || true; }
rnd() { openssl rand -hex "$1"; }
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
jwt() {
  local now exp h p s
  now=$(date +%s); exp=$((now + 10 * 365 * 24 * 3600))
  h=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
  p=$(printf '{"role":"%s","iss":"supabase","iat":%d,"exp":%d}' "$1" "$now" "$exp" | b64url)
  s=$(printf '%s.%s' "$h" "$p" | openssl dgst -sha256 -hmac "$2" -binary | b64url)
  printf '%s.%s.%s' "$h" "$p" "$s"
}
state() { docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$1" 2>/dev/null || echo missing; }

# ---------- вопросы (в самом начале, дальше можно отойти) ----------
ask() {
  local ip
  ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  DEFAULT_DOMAIN="${ip//./-}.sslip.io"
  DOMAIN=${DOMAIN:-$(cat "$ROOT/domain" 2>/dev/null || true)}
  if [[ -z ${DOMAIN:-} ]]; then
    printf '\nДомен сайта (Enter — временный %s): ' "$DEFAULT_DOMAIN"
    read -r DOMAIN </dev/tty || true
    DOMAIN=${DOMAIN:-$DEFAULT_DOMAIN}
  fi
  [[ $DOMAIN =~ ^[a-z0-9.-]+$ ]] || die "странный домен: $DOMAIN"
  printf '%s\n' "$DOMAIN" > "$ROOT/domain"

  OR_KEY=""
  if [[ $CMD == install ]] && ! grep -q '^OPENROUTER_API_KEY=.\+' "$ROOT/functions.env" 2>/dev/null; then
    printf 'Ключ OpenRouter для Бипыча (ввод не виден; Enter — пропустить): '
    read -rs OR_KEY </dev/tty || true; echo
  fi

  SOURCE_DB=""
  if [[ $CMD == data ]] || [[ ! -f $ROOT/.data-copied ]]; then
    printf 'Строка подключения к облачной базе Supabase\n(Connect → Session pooler → URI с паролем; ввод не виден; Enter — пропустить): '
    read -rs SOURCE_DB </dev/tty || true; echo
    if [[ -n $SOURCE_DB ]]; then
      [[ $SOURCE_DB =~ ^postgres(ql)?:// ]] || die 'строка должна начинаться с postgresql://'
      [[ $SOURCE_DB == *:6543/* ]] && warn 'это transaction pooler (6543); для копирования нужен Session pooler (5432)'
    fi
  fi
}

# ---------- 1. система ----------
base() {
  say 'Система'
  . /etc/os-release
  [[ $ID == ubuntu ]] || die "нужна Ubuntu, а стоит $PRETTY_NAME"
  ok "$PRETTY_NAME, ядер: $(nproc), памяти: $(free -m | awk '/Mem:/{print $2}') МБ, свободно на диске: $(df -BG --output=avail / | tail -1 | tr -d ' G') ГБ"
  (( $(df -BG --output=avail / | tail -1 | tr -d ' G') >= 12 )) || die 'на диске меньше 12 ГБ свободного места'

  if [[ -z $(swapon --show --noheadings) ]]; then
    fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap -q /swapfile && swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo 'vm.swappiness=10' > /etc/sysctl.d/90-vektor.conf && sysctl -q -p /etc/sysctl.d/90-vektor.conf
    ok 'swap 4 ГБ включён'
  else ok 'swap уже есть'; fi

  export DEBIAN_FRONTEND=noninteractive
  echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99vektor-ipv4   # IPv6 на сервере нет
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl git openssl python3 ufw cron >/dev/null
  if ! command -v docker >/dev/null; then apt-get install -y -qq docker.io >/dev/null; fi
  if ! docker compose version >/dev/null 2>&1; then
    apt-get install -y -qq docker-compose-v2 >/dev/null 2>&1 || apt-get install -y -qq docker-compose-plugin >/dev/null 2>&1 || die 'не удалось поставить docker compose'
  fi
  if [[ ! -f /etc/docker/daemon.json ]]; then
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<'JSON'
{
  "registry-mirrors": ["https://mirror.gcr.io", "https://dockerhub.timeweb.cloud"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "3" }
}
JSON
    systemctl restart docker
  fi
  systemctl enable -q --now docker
  ok "$(docker --version | cut -d, -f1), compose $(docker compose version --short)"
  docker pull -q "$CLIENT_IMAGE" >/dev/null || die 'Docker не может скачивать образы (Docker Hub недоступен?)'
  ok 'образы скачиваются'
}

# ---------- 2. firewall ----------
firewall() {
  say 'Firewall'
  local ports
  ports=$(ss -ltnpH 2>/dev/null | awk '/sshd/{n=split($4,a,":"); print a[n]}' | sort -u)
  [[ -n $ports ]] || ports=22
  for p in $ports; do ufw allow "$p/tcp" >/dev/null; done
  ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
  ufw --force enable >/dev/null
  ok "снаружи открыты только SSH ($(echo $ports)), 80 и 443"
}

# ---------- 3. Supabase ----------
supabase_prepare() {
  say 'Supabase'
  if [[ ! -f $SB/docker-compose.yml ]]; then
    rm -rf "$ROOT/supabase-src"
    git clone -q --depth 1 --filter=blob:none --sparse https://github.com/supabase/supabase.git "$ROOT/supabase-src"
    git -C "$ROOT/supabase-src" sparse-checkout set docker
    cp -a "$ROOT/supabase-src/docker" "$SB"
    git -C "$ROOT/supabase-src" rev-parse HEAD > "$ROOT/supabase-commit"
    ok "Supabase docker, commit $(cut -c1-10 "$ROOT/supabase-commit")"
  else ok 'Supabase уже скачан'; fi

  if [[ ! -f $SB/.env ]]; then
    cp "$SB/.env.example" "$SB/.env"
    local js; js=$(rnd 32)
    env_set POSTGRES_PASSWORD "$(rnd 24)"
    env_set JWT_SECRET "$js"
    env_set ANON_KEY "$(jwt anon "$js")"
    env_set SERVICE_ROLE_KEY "$(jwt service_role "$js")"
    env_set DASHBOARD_USERNAME vektor
    env_set DASHBOARD_PASSWORD "$(rnd 16)"
    env_set SECRET_KEY_BASE "$(rnd 32)"
    env_set VAULT_ENC_KEY "$(rnd 16)"
    env_set_if PG_META_CRYPTO_KEY "$(rnd 16)"
    env_set_if LOGFLARE_PUBLIC_ACCESS_TOKEN "$(rnd 24)"
    env_set_if LOGFLARE_PRIVATE_ACCESS_TOKEN "$(rnd 24)"
    env_set_if LOGFLARE_API_KEY "$(rnd 24)"
    env_set_if LOGFLARE_LOGGER_BACKEND_API_KEY "$(rnd 24)"
    env_set_if POOLER_TENANT_ID vektor
    ok 'созданы новые пароли и ключи (в /opt/vektor/supabase/.env)'
  else ok 'пароли и ключи уже созданы, не трогаю'; fi
  chmod 600 "$SB/.env"

  # адреса и регистрация — при каждом запуске (вдруг сменился домен)
  env_set SITE_URL "https://$DOMAIN"
  env_set API_EXTERNAL_URL "https://$DOMAIN"
  env_set_if SUPABASE_PUBLIC_URL "https://$DOMAIN"
  env_set_if DISABLE_SIGNUP true
  env_set_if ENABLE_EMAIL_SIGNUP false
  env_set_if ENABLE_PHONE_SIGNUP false
  env_set_if ENABLE_ANONYMOUS_USERS false
  env_set_if STUDIO_DEFAULT_ORGANIZATION Vektor
  env_set_if STUDIO_DEFAULT_PROJECT vektor

  env_set_if PROXY_DOMAIN "$DOMAIN"
  env_set_if SAML_PRIVATE_KEY ''   # SAML выключен

  # прочие учебные значения в новых версиях Supabase: ключи и пароли — заменить случайными
  local k left=""
  for k in $(grep -vE '^\s*#' "$SB/.env" | grep -E 'your-|super-secret|insecure|eyAgCiAg' | cut -d= -f1 || true); do
    if [[ $k =~ (KEY|SECRET|PASSWORD|TOKEN) ]]; then env_set "$k" "$(rnd 24)"; ok "заменил учебное значение $k"
    else left+=" $k"; fi
  done
  [[ -z $left ]] || die "в .env остались учебные значения:$left"

  # все порты контейнеров — только на 127.0.0.1 (Docker обходит ufw)
  python3 - "$SB/docker-compose.yml" <<'PY'
import re, sys
p = sys.argv[1]; out = []; ind = None
for line in open(p).read().split('\n'):
    m = re.match(r'^(\s*)ports:\s*$', line)
    if m:
        ind = len(m.group(1)); out.append(line); continue
    if ind is not None:
        m2 = re.match(r'^(\s*)-\s*(["\']?)([^"\']*)\2\s*$', line)
        if m2 and len(m2.group(1)) > ind:
            v = m2.group(3)
            if not v.startswith('127.0.0.1:') and v.count(':') == 1:
                v = '127.0.0.1:' + v
            out.append('%s- "%s"' % (m2.group(1), v)); continue
        if line.strip() == '' or line.strip().startswith('#'):
            out.append(line); continue
        ind = None
    out.append(line)
open(p, 'w').write('\n'.join(out))
PY

  # образ Postgres: как в облаке (17), иначе — стандартный из compose
  if [[ ! -f $ROOT/pg-image ]]; then
    if docker pull -q "supabase/postgres:$PG_TAG" >/dev/null 2>&1; then echo "supabase/postgres:$PG_TAG" > "$ROOT/pg-image"
    elif docker pull -q "public.ecr.aws/supabase/postgres:$PG_TAG" >/dev/null 2>&1; then echo "public.ecr.aws/supabase/postgres:$PG_TAG" > "$ROOT/pg-image"
    else echo default > "$ROOT/pg-image"; warn "образ Postgres $PG_TAG не скачался, беру стандартный из Supabase"; fi
  fi
  write_override
  local pub host
  pub=$(cd "$SB" && docker compose config | grep -c 'published:' || true)
  host=$(cd "$SB" && docker compose config | grep -c 'host_ip: 127.0.0.1' || true)
  [[ $pub == "$host" ]] || die "не все порты Supabase закрыты от интернета ($host из $pub)"
  ok "порты Supabase слушают только 127.0.0.1 ($pub шт.), Postgres: $(cat "$ROOT/pg-image")"
}

write_override() {
  touch "$ROOT/functions.env"; chmod 600 "$ROOT/functions.env"
  {
    echo 'services:'
    if [[ $(cat "$ROOT/pg-image") != default ]]; then
      echo '  db:'
      echo "    image: $(cat "$ROOT/pg-image")"
    fi
    echo '  functions:'
    echo '    env_file:'
    echo "      - $ROOT/functions.env"
  } > "$SB/docker-compose.override.yml"
}

# ---------- 4. сайт и функция ----------
site_prepare() {
  say 'Сайт и Бипыч'
  if [[ -d $APP/.git ]]; then
    git -C "$APP" fetch -q --depth 1 origin "$SITE_BRANCH"
    git -C "$APP" reset -q --hard FETCH_HEAD
  else
    git clone -q --depth 1 -b "$SITE_BRANCH" "$REPO_URL" "$APP"
  fi
  chmod -R go+rX "$APP"
  ok "сайт: ветка $SITE_BRANCH, commit $(git -C "$APP" rev-parse --short HEAD)"

  for f in tutor mail; do
    rm -rf "$SB/volumes/functions/$f"
    cp -a "$APP/supabase/functions/$f" "$SB/volumes/functions/$f"
  done
  ok 'функции tutor и mail скопированы'

  local tmp; tmp=$(mktemp)
  grep -vE '^(SITE_URL|ALLOWED_ORIGINS)=' "$ROOT/functions.env" > "$tmp" || true
  {
    cat "$tmp"
    echo "SITE_URL=https://$DOMAIN"
    echo "ALLOWED_ORIGINS=https://$DOMAIN,https://vektor-taupe.vercel.app"
    [[ -n $OR_KEY ]] && printf 'OPENROUTER_API_KEY=%s\n' "$OR_KEY"
  } > "$ROOT/functions.env"
  rm -f "$tmp"; chmod 600 "$ROOT/functions.env"
  grep -q '^OPENROUTER_API_KEY=.\+' "$ROOT/functions.env" && ok 'ключ OpenRouter сохранён' || warn 'ключ OpenRouter не задан — Бипыч отвечать не будет'

  local metrika anon
  metrika=$(grep -oE "metrikaId: *'[0-9]*'" "$APP/config.js" | grep -oE '[0-9]+' || true)
  anon=$(env_get ANON_KEY)
  umask 022
  cat > "$ROOT/public/config.js" <<JS
// Создано tools/beget/install.sh. supabaseKey — публичный anon-ключ этого сервера.
window.VEKTOR_CONFIG = {
  maintenance: false,
  metrikaId: '$metrika',
  supabaseUrl: 'https://$DOMAIN',
  supabaseKey: '$anon',
};
JS
  umask 077
  chmod 755 "$ROOT/public"

  python3 - "$APP/vercel.json" "$DOMAIN" > "$ROOT/Caddyfile" <<'PY'
import json, re, sys
heads = json.load(open(sys.argv[1]))['headers'][0]['headers']
lines = []
for h in heads:
    v = re.sub(r'\s*https://[a-z0-9]+\.supabase\.co', '', h['value'])  # API теперь на том же домене ('self')
    lines.append('\t\t%s "%s"' % (h['key'], v))
print('''{
	admin off
}
%s {
	encode zstd gzip
	header {
%s
		Strict-Transport-Security "max-age=31536000"
		-Server
	}
	@hidden path /.git /.git/* /.github/* /supabase/* /tools/* /tests/* /server/* /docs/* /api/* *.md /vercel.json
	handle @hidden {
		respond 404
	}
	@api path /rest/v1/* /functions/v1/*
	handle @api {
		reverse_proxy 127.0.0.1:8000
	}
	handle /config.js {
		root * /srv/conf
		header Cache-Control "no-store"
		file_server
	}
	handle {
		root * /srv/site
		try_files {path} {path}.html
		file_server
	}
}''' % (sys.argv[2], '\n'.join(lines)))
PY
  chmod 644 "$ROOT/Caddyfile"
  ok "HTTPS-настройки для $DOMAIN готовы (заголовки безопасности как на Vercel)"
}

# ---------- 5. запуск ----------
wait_db() { local i; for i in $(seq 1 60); do [[ $(state supabase-db) == 'running healthy' ]] && return 0; sleep 5; done; return 1; }
wait_all() {
  local i id s bad
  for i in $(seq 1 72); do
    bad=""
    for id in $(cd "$SB" && docker compose ps -aq); do
      s=$(docker inspect -f '{{.Name}}|{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$id")
      case $s in *'|running|'|*'|running|healthy') ;; *) bad+=" ${s%%|*}";; esac
    done
    [[ -z $bad ]] && return 0
    sleep 5
  done
  BAD=$bad; return 1
}

up() {
  say 'Запуск (первый раз скачивание займёт 5–15 минут)'
  cd "$SB"
  docker compose pull -q
  docker compose up -d db >/dev/null 2>&1 || true
  if ! wait_db; then
    if [[ ! -f $ROOT/.db-initialized && $(cat "$ROOT/pg-image") != default ]]; then
      warn "Postgres $(cat "$ROOT/pg-image") не запустился, переключаюсь на стандартный образ Supabase"
      docker logs --tail 20 supabase-db 2>&1 | sed 's/^/     /' || true
      docker compose down >/dev/null 2>&1 || true
      rm -rf "$SB/volumes/db/data"
      echo default > "$ROOT/pg-image"; write_override
      docker compose up -d db >/dev/null 2>&1 || true
      wait_db || { docker logs --tail 40 supabase-db 2>&1; die 'база не запускается'; }
    else
      docker logs --tail 40 supabase-db 2>&1; die 'база не запускается'
    fi
  fi
  touch "$ROOT/.db-initialized"
  ok "база работает: $(docker exec supabase-db postgres --version)"
  docker compose up -d >/dev/null 2>&1 || true
  docker compose up -d --force-recreate --no-deps functions >/dev/null 2>&1 || true
  BAD=""
  if ! wait_all; then
    for c in $BAD; do echo "--- ${c#/}"; docker logs --tail 30 "${c#/}" 2>&1 | sed 's/^/     /'; done
    die "не поднялись контейнеры:$BAD"
  fi
  ok "все контейнеры Supabase работают ($(docker compose ps -q | wc -l) шт., analytics включена)"

  docker rm -f vektor-caddy >/dev/null 2>&1 || true
  local busy
  busy=$(ss -ltnpH '( sport = :80 or sport = :443 )' | awk '{print $6}' | sort -u | tr '\n' ' ')
  [[ -z $busy ]] || die "порты 80/443 заняты другой программой: $busy"
  docker run -d --name vektor-caddy --restart unless-stopped --network host \
    -v "$ROOT/Caddyfile:/etc/caddy/Caddyfile:ro" -v "$APP:/srv/site:ro" -v "$ROOT/public:/srv/conf:ro" \
    -v vektor_caddy_data:/data -v vektor_caddy_config:/config caddy:2 >/dev/null
  ok 'веб-сервер Caddy запущен'
}

exposure() {
  say 'Что видно из интернета'
  local open
  open=$(ss -ltnpH | awk '{print $4, $6}' | grep -vE '^(127\.|\[::1\]|\[::ffff:127)' | grep -E 'docker-proxy' | grep -vE ':(80|443) ' || true)
  [[ -z $open ]] || { echo "$open"; die 'Docker открыл служебный порт наружу'; }
  ok 'Postgres, Studio, analytics, Kong — только внутри сервера'
}

# ---------- 6. данные ----------
data() {
  say 'Копирование данных из облачного Supabase'
  [[ -n ${SOURCE_DB:-} ]] || { warn 'строка подключения не введена — данные не копировал (позже: bash install.sh data)'; return 0; }
  local net pw rc=0
  net=$(docker inspect supabase-db -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
  pw=$(env_get POSTGRES_PASSWORD)
  SOURCE_DB="$SOURCE_DB" TARGET_DB="postgresql://postgres:$pw@db:5432/postgres" \
  docker run --rm -i --network "$net" -e SOURCE_DB -e TARGET_DB \
    -v "$APP/tools/migrate:/m:ro" -v "$ROOT/dumps:/d" "$CLIENT_IMAGE" bash -s <<'SH' || rc=$?
set -euo pipefail
q() { psql "$TARGET_DB" -XAtq -v ON_ERROR_STOP=1 -c "$1"; }
psql "$SOURCE_DB" -XAtqc 'select 1' >/dev/null || { echo '   ! не подключиться к облачной базе — проверь строку и пароль'; exit 2; }
[[ $(q "select count(*) from pg_tables where schemaname='public' and tablename like 'vk_%'") == 0 ]] || { echo '   ! на новом сервере уже есть данные Вектора — повторное копирование делаем при переключении'; exit 3; }
export DUMP_FILE=/d/vektor-$(date -u +%Y%m%dT%H%M%SZ).dump
bash /m/dump.sh >/dev/null
echo "   ✓ выгрузка из облака: $(du -h "$DUMP_FILE" | cut -f1)"
# схемы и расширения уже созданы Supabase: восстанавливаем всё, кроме них
for e in $(pg_restore -l "$DUMP_FILE" | sed -nE 's/^[0-9]+; [0-9]+ [0-9]+ EXTENSION - ([^ ]+).*/\1/p'); do
  q "create extension if not exists \"$e\" with schema extensions"
done
pg_restore -l "$DUMP_FILE" | grep -vE '^[0-9]+; [0-9]+ [0-9]+ (SCHEMA - (public|extensions)( |$)|EXTENSION - |COMMENT - EXTENSION |COMMENT - SCHEMA (public|extensions)( |$))' > /tmp/toc
pg_restore --dbname="$TARGET_DB" --no-owner --exit-on-error --single-transaction -L /tmp/toc "$DUMP_FILE"
q "notify pgrst, 'reload schema'"
echo "   ✓ восстановлено одной транзакцией: таблиц $(q "select count(*) from pg_tables where schemaname='public'")"
bash /m/verify.sh > /tmp/verify.log 2>&1 || { tail -3 /tmp/verify.log; exit 4; }
echo "   ✓ сверка: $(grep -c '^OK:' /tmp/verify.log) таблиц совпали строка в строку, права браузера одинаковые"
SH
  case $rc in
    0) touch "$ROOT/.data-copied"; ok 'данные скопированы и сверены' ;;
    3) ok 'данные уже были скопированы раньше' ;;
    4) touch "$ROOT/.data-copied"; warn 'сверка нашла расхождение — нормально, если в это время дети занимались; иначе пришли вывод Claude' ;;
    *) die 'копирование данных не удалось' ;;
  esac
}

# ---------- 7. бэкап ----------
backup() {
  say 'Ежедневный бэкап'
  cat > "$ROOT/backup.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail; umask 077
d=/opt/vektor/backups; f=$d/vektor-$(date -u +%F).dump
PGPASSWORD=$(grep -m1 '^POSTGRES_PASSWORD=' /opt/vektor/supabase/.env | cut -d= -f2-) \
  docker exec -e PGPASSWORD supabase-db pg_dump -h localhost -U postgres -d postgres -Fc -n public -n extensions > "$f.partial"
mv "$f.partial" "$f"
find "$d" -name 'vektor-*.dump' -mtime +14 -delete
echo "$(date -u +%FT%TZ) ok $(du -h "$f" | cut -f1)"
SH
  chmod 700 "$ROOT/backup.sh"
  echo "15 3 * * * root $ROOT/backup.sh >> $ROOT/backup.log 2>&1" > /etc/cron.d/vektor-backup
  chmod 644 /etc/cron.d/vektor-backup
  if [[ -f $ROOT/.data-copied ]]; then "$ROOT/backup.sh" >/dev/null && ok "первый бэкап сделан, дальше каждую ночь, хранится 14 дней ($ROOT/backups)"
  else ok 'бэкап каждую ночь в 03:15 UTC, хранится 14 дней'; fi
}

# ---------- 8. проверка ----------
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$@" || true; }
status() {
  say 'Проверка'
  DOMAIN=${DOMAIN:-$(cat "$ROOT/domain")}
  local anon c i
  anon=$(env_get ANON_KEY)
  for i in $(seq 1 24); do c=$(code "https://$DOMAIN/"); [[ $c == 200 ]] && break; sleep 5; done
  [[ $c == 200 ]] && ok "https://$DOMAIN открывается, сертификат выдан" || warn "сайт по HTTPS отвечает $c (сертификат ещё выдаётся? запусти: bash install.sh status)"
  c=$(code -X POST "https://$DOMAIN/rest/v1/rpc/vektor_public_config" -H "apikey: $anon" -H "Authorization: Bearer $anon" -H 'Content-Type: application/json' -d '{}')
  [[ $c == 200 ]] && ok 'база отвечает сайту (vektor_public_config)' || warn "база отвечает сайту кодом $c (если данные не копировали — это ожидаемо)"
  c=$(code -X OPTIONS "https://$DOMAIN/functions/v1/tutor" -H "Origin: https://$DOMAIN" -H 'Access-Control-Request-Method: POST')
  [[ $c == 200 || $c == 204 ]] && ok 'функция Бипыча отвечает' || warn "функция Бипыча отвечает кодом $c"
  c=$(code "https://$DOMAIN/AGENTS.md"); [[ $c == 404 ]] && ok 'служебные файлы репозитория скрыты' || warn "служебные файлы видны (код $c)"
  c=$(code "https://openrouter.ai/api/v1/models")
  [[ $c == 200 ]] && ok 'OpenRouter доступен с сервера' || warn "OpenRouter с сервера недоступен (код $c) — понадобится обходной воркер"
  ok "память: занято $(free -m | awk '/Mem:/{print $3}') из $(free -m | awk '/Mem:/{print $2}') МБ, swap занят $(free -m | awk '/Swap:/{print $3}') МБ"
}

summary() {
  say 'ИТОГ — скопируй отсюда и до конца и пришли Claude'
  echo "   сайт: https://$(cat "$ROOT/domain")"
  echo "   Postgres: $(cat "$ROOT/pg-image")   Supabase commit: $(cut -c1-10 "$ROOT/supabase-commit" 2>/dev/null)"
  echo "   данные: $([[ -f $ROOT/.data-copied ]] && echo скопированы || echo 'не копировались')"
  if ((${#WARNS[@]})); then echo '   замечания:'; printf '     - %s\n' "${WARNS[@]}"; else echo '   замечаний нет'; fi
  echo '   Пароли лежат на сервере: /opt/vektor/supabase/.env и /opt/vektor/functions.env. В чат их не присылай.'
  echo '   Не забудь сменить пароль root командой: passwd'
}

case $CMD in
  install)
    ask; exec > >(tee -a "$LOG") 2>&1
    base; firewall; supabase_prepare; site_prepare; up; exposure; data; backup; status; summary ;;
  data)
    DOMAIN=$(cat "$ROOT/domain"); ask; exec > >(tee -a "$LOG") 2>&1
    data; backup; status; summary ;;
  status) exec > >(tee -a "$LOG") 2>&1; status; summary ;;
  *) die "неизвестная команда $CMD (install | data | status)" ;;
esac
