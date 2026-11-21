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
  if [[ $CMD == install ]] && ! grep -qE '^(OPENROUTER_API_KEY|AI_URL)=.+' "$ROOT/functions.env" 2>/dev/null; then
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
  # контейнеры работают не от root: стартовые SQL и конфиги должны читаться (umask 077 их закрывал);
  # данные базы не трогаем — Postgres требует для них 0700
  find "$SB" -path "$SB/volumes/db/data" -prune -o -exec chmod go+rX {} +
  chmod 711 "$ROOT"

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
            bare = v  # двоеточия внутри ${A:-${B:-8000}} не считаются
            while re.search(r'\$\{[^{}]*\}', bare):
                bare = re.sub(r'\$\{[^{}]*\}', 'X', bare)
            if bare.count(':') == 1 and not re.match(r'^(\d+\.\d+\.\d+\.\d+|\[)', v):
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
  overlay_tutor
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
  if grep -q '^AI_URL=' "$ROOT/functions.env"; then ok 'Бипыч — через ИИ-шлюз Beget'
  elif grep -q '^OPENROUTER_API_KEY=.\+' "$ROOT/functions.env"; then ok 'ключ OpenRouter сохранён'
  else warn 'ключ для Бипыча не задан — подключи ИИ-шлюз: bash install.sh ai'; fi

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
	@hidden {
		path /.git /.git/* /.github/* /supabase/* /tools/* /tests/* /server/* /docs/* /api/* *.md /vercel.json
		not path /legal/*
	}
	handle @hidden {
		respond 404
	}
	handle /ops* {
		reverse_proxy 127.0.0.1:8099
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
if not sys.argv[2].endswith('sslip.io'):
    print('www.%s {\n\tredir https://%s{uri} permanent\n}' % (sys.argv[2], sys.argv[2]))
PY
  chmod 644 "$ROOT/Caddyfile"
  ok "HTTPS-настройки для $DOMAIN готовы (заголовки безопасности как на Vercel)"
}

# Бипыч из другой ветки репозитория (пока поддержка ИИ-шлюза не в main): /opt/vektor/functions-ref
overlay_tutor() {
  [[ -s $ROOT/functions-ref ]] || return 0
  local ref f tmp; ref=$(cat "$ROOT/functions-ref"); tmp=$(mktemp -d)
  for f in index.ts method.ts; do
    curl -fsSL --max-time 30 "https://raw.githubusercontent.com/ignorov3-maker/vektor-math-lab/$ref/supabase/functions/tutor/$f" -o "$tmp/$f" || { warn "функция Бипыча из ветки $ref не скачалась — оставляю версию из main"; rm -rf "$tmp"; return 0; }
  done
  cp "$tmp"/*.ts "$SB/volumes/functions/tutor/"; chmod -R go+rX "$SB/volumes/functions/tutor"; rm -rf "$tmp"
  ok "функция Бипыча — из ветки $ref"
}

# ---------- Бипыч через ИИ-шлюз Beget (рубли, работает с российского сервера) ----------
AI_GW=https://api-llm.beget.com/v1/chat/completions
AI_GW_MODEL=deepseek-v4-flash
ai_setup() {
  say 'Бипыч через ИИ-шлюз Beget'
  [[ -n ${AI_KEY:-} ]] || die 'ключ не введён'
  local code tmp
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 40 -H @<(printf 'Authorization: Bearer %s\n' "$AI_KEY") -H 'Content-Type: application/json' \
    -d "{\"model\":\"$AI_GW_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Ответь одним словом: ок\"}],\"max_tokens\":5}" "$AI_GW" || true)
  case $code in
    200) ok 'ключ работает: шлюз ответил' ;;
    401|403) die "шлюз не принял ключ (код $code) — проверь ключ в панели Beget" ;;
    402) die 'на балансе Beget нет денег для ИИ-шлюза (код 402) — пополни баланс' ;;
    *) die "шлюз не ответил как нужно (код $code)" ;;
  esac
  tmp=$(mktemp)
  grep -vE '^(AI_URL|AI_API_KEY|AI_MODEL)=' "$ROOT/functions.env" > "$tmp" || true
  { cat "$tmp"; echo "AI_URL=$AI_GW"; echo "AI_MODEL=$AI_GW_MODEL"; printf 'AI_API_KEY=%s\n' "$AI_KEY"; } > "$ROOT/functions.env"
  rm -f "$tmp"; chmod 600 "$ROOT/functions.env"; unset AI_KEY
  ok 'ключ сохранён в /opt/vektor/functions.env (виден только root)'
  [[ -s $ROOT/functions-ref ]] || echo claude/beget > "$ROOT/functions-ref"
  overlay_tutor
  (cd "$SB" && docker compose up -d --force-recreate --no-deps functions >/dev/null 2>&1) || true
  sleep 5; ok 'функция Бипыча перезапущена'
}

# ProxyAPI: тот же OpenRouter (та же модель и запасная), но через российский шлюз с оплатой в рублях
PROXY_URL=https://api.proxyapi.ru/openrouter/v1/chat/completions
proxy_setup() {
  say 'Бипыч через ProxyAPI (OpenRouter за рубли)'
  [[ -n ${AI_KEY:-} ]] || die 'ключ не введён'
  local code tmp
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 40 -H @<(printf 'Authorization: Bearer %s\n' "$AI_KEY") -H 'Content-Type: application/json' \
    -d '{"model":"deepseek/deepseek-v4-flash","models":["deepseek/deepseek-v4-flash","google/gemini-2.5-flash-lite"],"messages":[{"role":"user","content":"Ответь одним словом: ок"}],"max_tokens":5}' "$PROXY_URL" || true)
  case $code in
    200) ok 'ключ работает: ProxyAPI ответил' ;;
    401|403) die "ProxyAPI не принял ключ (код $code) — проверь ключ" ;;
    402) die 'на балансе ProxyAPI нет денег (код 402) — пополни баланс' ;;
    *) die "ProxyAPI ответил кодом $code — пришли вывод Claude" ;;
  esac
  tmp=$(mktemp)
  grep -vE '^(AI_URL|AI_API_KEY|AI_MODEL|OPENROUTER_URL|OPENROUTER_API_KEY)=' "$ROOT/functions.env" > "$tmp" || true
  { cat "$tmp"; echo "OPENROUTER_URL=$PROXY_URL"; printf 'OPENROUTER_API_KEY=%s\n' "$AI_KEY"; } > "$ROOT/functions.env"
  rm -f "$tmp"; chmod 600 "$ROOT/functions.env"; unset AI_KEY
  ok 'ключ сохранён в /opt/vektor/functions.env (виден только root)'
  (cd "$SB" && docker compose up -d --force-recreate --no-deps functions >/dev/null 2>&1) || true
  sleep 5; ok 'функция Бипыча перезапущена'
}

# ---------- админка сервера: https://<домен>/ops/ ----------
ops_code() {  # одноразовый код первого входа, 2 часа
  local c; c=$(tr -dc 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' </dev/urandom | head -c 8 || true)
  printf '{"code":"%s","until":%s}\n' "$c" "$(( $(date +%s) + 7200 ))" > "$ROOT/ops-setup"; chmod 600 "$ROOT/ops-setup"
  OPS_CODE=$c
}
ops_setup() {
  say 'Админка сервера'
  local self ref; self=$(readlink -f "$0"); ref=$(cat "$ROOT/ops-ref" 2>/dev/null || echo claude/beget)
  [[ $self == "$ROOT/install.sh" ]] || cp "$self" "$ROOT/install.sh"; chmod 700 "$ROOT/install.sh"
  if curl -fsSL --max-time 60 "https://raw.githubusercontent.com/ignorov3-maker/vektor-math-lab/$ref/tools/beget/ops.py" -o "$ROOT/ops.py.new" && python3 -m py_compile "$ROOT/ops.py.new"; then
    mv "$ROOT/ops.py.new" "$ROOT/ops.py"; chmod 700 "$ROOT/ops.py"
  else rm -f "$ROOT/ops.py.new"; [[ -f $ROOT/ops.py ]] || { warn 'админка не скачалась с GitHub'; return 0; }; fi
  cat > /etc/systemd/system/vektor-ops.service <<UNIT
[Unit]
Description=Vektor server admin (/ops)
After=network-online.target docker.service
[Service]
ExecStart=/usr/bin/python3 $ROOT/ops.py
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload; systemctl enable -q vektor-ops; systemctl restart vektor-ops
  OPS_CODE=""
  if [[ ! -f $ROOT/ops-pass ]]; then ops_code; fi
  ok "админка: https://$(cat "$ROOT/domain")/ops/"
}

# ---------- автообновление: сервер сам берёт исправления с GitHub ----------
# Каждые 5 минут: если изменилась ветка со скриптом (/opt/vektor/ops-ref, по умолчанию claude/beget)
# или main с сайтом — повторный запуск установки (он ничего не ломает и ключи не трогает).
autoupdate() {
  say 'Автообновление'
  [[ -s $ROOT/ops-ref ]] || echo claude/beget > "$ROOT/ops-ref"
  cat > "$ROOT/update.sh" <<'SH'
#!/usr/bin/env bash
set -uo pipefail; umask 077
exec 9>/opt/vektor/.update.lock; flock -n 9 || exit 0
R=https://github.com/ignorov3-maker/vektor-math-lab.git
ref=$(cat /opt/vektor/ops-ref 2>/dev/null || echo claude/beget)
ops=$(git ls-remote "$R" "refs/heads/$ref" | cut -c1-40); [[ -n $ops ]] || { ref=main; ops=$(git ls-remote "$R" refs/heads/main | cut -c1-40); }
site=$(git ls-remote "$R" refs/heads/main | cut -c1-40)
[[ -n $ops && -n $site ]] || exit 0
now="$ops $site"; [[ "$now" == "$(cat /opt/vektor/.update-state 2>/dev/null)" ]] && exit 0
echo "$(date -u +%FT%TZ) обновление: скрипт $ref@${ops:0:8}, сайт main@${site:0:8}"
curl -fsSL --max-time 60 "https://raw.githubusercontent.com/ignorov3-maker/vektor-math-lab/$ops/tools/beget/install.sh" -o /opt/vektor/install.sh.new || exit 0
bash -n /opt/vektor/install.sh.new || exit 0
mv /opt/vektor/install.sh.new /opt/vektor/install.sh
if bash /opt/vektor/install.sh install </dev/null >/opt/vektor/update-last.log 2>&1; then echo "$now" > /opt/vektor/.update-state; echo "$(date -u +%FT%TZ) готово"
else echo "$(date -u +%FT%TZ) ОШИБКА — /opt/vektor/update-last.log"; fi
SH
  chmod 700 "$ROOT/update.sh"
  echo "*/5 * * * * root $ROOT/update.sh >> $ROOT/update.log 2>&1" > /etc/cron.d/vektor-update
  chmod 644 /etc/cron.d/vektor-update
  ok "сервер раз в 5 минут проверяет GitHub (скрипт: $(cat "$ROOT/ops-ref"), сайт: main) и обновляется сам; журнал — /opt/vektor/update.log"
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
    (( i > 18 )) && auth_broken && { BAD=$bad; return 1; }
    sleep 5
  done
  BAD=$bad; return 1
}

auth_broken() {  # без grep -q: при pipefail ранний выход grep давал ложный ответ
  local n
  n=$(cd "$SB" && docker compose logs --no-color --since 45s 2>&1 | grep -c 'password authentication failed' || true)
  (( ${n:-0} > 0 ))
}

# база ещё пустая и не та, что стандартная: пересоздать на стандартном образе Supabase
fallback_pg() {
  warn "Postgres $(cat "$ROOT/pg-image"): $1 — пересоздаю пустую базу на стандартном образе Supabase"
  wipe_db
  echo default > "$ROOT/pg-image"; write_override
}
# база может лежать и в папке, и в томе Docker: удалить оба (только пока данные не копировались)
wipe_db() {
  [[ ! -f $ROOT/.data-copied ]] || die 'данные уже скопированы — удалять базу нельзя'
  (cd "$SB" && docker compose down -v --remove-orphans >/dev/null 2>&1) || true
  rm -rf "$SB/volumes/db/data" "$ROOT/.db-initialized"
}
can_fallback() { [[ ! -f $ROOT/.data-copied && $(cat "$ROOT/pg-image") != default ]]; }

start_stack() {
  docker compose up -d db >/dev/null 2>&1 || true
  if ! wait_db; then
    can_fallback && { fallback_pg 'база не запустилась'; return 2; }
    docker logs --tail 40 supabase-db 2>&1; die 'база не запускается'
  fi
  touch "$ROOT/.db-initialized"
  ok "база работает: $(docker exec supabase-db postgres --version)"
  docker compose up -d >/dev/null 2>&1 || true
  docker compose up -d --force-recreate --no-deps functions >/dev/null 2>&1 || true
  BAD=""
  wait_all && return 0
  if auth_broken && can_fallback; then fallback_pg 'служебным ролям не выставились пароли'; return 2; fi
  for c in $BAD; do echo "--- ${c#/}"; docker logs --tail 30 "${c#/}" 2>&1 | sed 's/^/     /'; done
  die "не поднялись контейнеры:$BAD"
}

up() {
  say 'Запуск (первый раз скачивание займёт 5–15 минут)'
  cd "$SB"
  if can_fallback && [[ -f $ROOT/.db-initialized ]] && auth_broken; then
    fallback_pg 'служебным ролям не выставились пароли'
  fi
  docker compose pull -q
  local rc=0
  start_stack || rc=$?
  if (( rc == 2 )); then docker compose pull -q; start_stack; fi
  ok "все контейнеры Supabase работают: $(docker compose ps --services --status running | tr '\n' ' ')"

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
  # тот же запрос, что шлёт сайт (сайт и API на одном домене — предварительного OPTIONS у браузера нет)
  c=$(code -X POST "https://$DOMAIN/functions/v1/tutor" -H "Origin: https://$DOMAIN" -H "apikey: $anon" -H "Authorization: Bearer $anon" -H 'Content-Type: application/json' -d '{"mode":"lesson","topic":"concept","token":"x","history":[{"role":"user","content":"привет"}]}')
  [[ $c == 401 || $c == 400 || $c == 200 ]] && ok "функция Бипыча на месте (без входа ученика отвечает $c — так и должно быть)" || warn "функция Бипыча отвечает кодом $c"
  if grep -q '^AI_URL=' "$ROOT/functions.env" 2>/dev/null; then ok 'Бипыч работает через ИИ-шлюз Beget'
  elif grep -q '^OPENROUTER_URL=https://api.proxyapi' "$ROOT/functions.env" 2>/dev/null; then ok 'Бипыч работает через ProxyAPI'
  elif grep -q '^OPENROUTER_API_KEY=.\+' "$ROOT/functions.env" 2>/dev/null; then ok 'Бипыч настроен на OpenRouter'
  else warn 'ключ для Бипыча не задан — подключи: bash install.sh ai'; fi
  c=$(code "https://$DOMAIN/AGENTS.md"); [[ $c == 404 ]] && ok 'служебные файлы репозитория скрыты' || warn "служебные файлы видны (код $c)"
  if ! grep -qE '^(AI_URL=|OPENROUTER_URL=https://api.proxyapi)' "$ROOT/functions.env" 2>/dev/null; then
    c=$(code "https://openrouter.ai/api/v1/models")
    [[ $c == 200 ]] && ok 'OpenRouter доступен с сервера' || warn "OpenRouter с сервера недоступен (код $c) — подключи ИИ-шлюз Beget: bash install.sh ai"
  fi
  ok "память: занято $(free -m | awk '/Mem:/{print $3}') из $(free -m | awk '/Mem:/{print $2}') МБ, swap занят $(free -m | awk '/Swap:/{print $3}') МБ"
}

summary() {
  say 'ИТОГ — скопируй отсюда и до конца и пришли Claude'
  echo "   сайт: https://$(cat "$ROOT/domain")"
  echo "   Postgres: $(cat "$ROOT/pg-image")   Supabase commit: $(cut -c1-10 "$ROOT/supabase-commit" 2>/dev/null)"
  echo "   данные: $([[ -f $ROOT/.data-copied ]] && echo скопированы || echo 'не копировались')"
  if ((${#WARNS[@]})); then echo '   замечания:'; printf '     - %s\n' "${WARNS[@]}"; else echo '   замечаний нет'; fi
  echo "   админка: https://$(cat "$ROOT/domain")/ops/"
  if [[ -n ${OPS_CODE:-} ]]; then echo "   ПЕРВЫЙ ВХОД В АДМИНКУ: https://$(cat "$ROOT/domain")/ops/#code=$OPS_CODE   (код $OPS_CODE, действует 2 часа)"; fi
  echo '   Пароли лежат на сервере: /opt/vektor/supabase/.env и /opt/vektor/functions.env. В чат их не присылай.'
  echo '   Не забудь сменить пароль root командой: passwd'
}

# диагностика паролей ролей без вывода самих секретов
diag() {
  cd "$SB"
  local pw r c v
  pw=$(env_get POSTGRES_PASSWORD)
  echo "строк POSTGRES_PASSWORD в .env: $(grep -c '^POSTGRES_PASSWORD=' .env), длина: ${#pw}"
  echo "файлы: $(ls -1 *.yml 2>/dev/null | tr '\n' ' ')"
  echo "db образ: $(docker inspect -f '{{.Config.Image}}' supabase-db 2>/dev/null)"
  echo "db тома: $(docker inspect -f '{{range .Mounts}}{{.Destination}} {{end}}' supabase-db 2>/dev/null)"
  for c in supabase-db supabase-storage supabase-auth supabase-rest realtime-dev.supabase-realtime supabase-pooler; do
    v=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$c" 2>/dev/null || true)
    if [[ -z $v ]]; then echo "$c: нет контейнера"; continue; fi
    printf '%s: пароль из .env найден в окружении — %s; переменные с паролем: %s\n' "$c" \
      "$(grep -qF -- "$pw" <<<"$v" && echo да || echo НЕТ)" \
      "$(grep -oE '^[A-Z_]*(PASSWORD|DATABASE_URL|DB_URL|PGRST_DB_URI|DB_PASSWORD)[A-Z_]*' <<<"$v" | tr '\n' ' ')"
  done
  for r in supabase_admin postgres authenticator supabase_auth_admin supabase_storage_admin; do
    if docker exec -e PGPASSWORD="$pw" supabase-db psql -h 127.0.0.1 -U "$r" -d postgres -Atc 'select 1' >/dev/null 2>&1; then echo "вход $r по паролю из .env: да"; else echo "вход $r по паролю из .env: НЕТ"; fi
  done
  echo "базы: $(docker exec -e PGPASSWORD="$pw" supabase-db psql -h 127.0.0.1 -U supabase_admin -d postgres -Atc 'select string_agg(datname, $$ $$) from pg_database' 2>&1)"
  echo "init-файлы: $(ls volumes/db 2>&1 | tr '\n' ' ')"
  echo "--- первичная настройка базы (ошибки и миграции):"
  docker logs supabase-db 2>&1 | grep -vE '_supabase" does not exist|connection authorized|connection received' \
    | grep -iE 'error|fatal|warn|migrat|init|running|_supabase|skipp' | head -30 | cut -c1-170 || true
}

case $CMD in
  install)
    ask; exec > >(tee -a "$LOG") 2>&1
    base; firewall; supabase_prepare; site_prepare; up; exposure; ops_setup; autoupdate; data; backup; status; summary ;;
  data)
    DOMAIN=$(cat "$ROOT/domain"); ask; exec > >(tee -a "$LOG") 2>&1
    data; backup; status; summary ;;
  reset)   # пустую базу пересоздать заново и продолжить установку
    ask; exec > >(tee -a "$LOG") 2>&1
    say 'Сброс пустой базы'; wipe_db; ok 'база и её тома удалены'
    base; firewall; supabase_prepare; site_prepare; up; exposure; data; backup; status; summary ;;
  domain)  # bash install.sh domain vektorstudy.ru — сменить домен и перевыпустить настройки
    [[ -n ${2:-} ]] || die 'укажи домен: bash install.sh domain example.ru'
    printf '%s\n' "$2" > "$ROOT/domain"; DOMAIN=$2
    CMD=install; ask; exec > >(tee -a "$LOG") 2>&1
    base; firewall; supabase_prepare; site_prepare; up; exposure; data; backup; status; summary ;;
  ai)   # bash install.sh ai proxyapi — через ProxyAPI; bash install.sh ai — через ИИ-шлюз Beget
    [[ -f $SB/.env ]] || die 'сначала установка: bash install.sh'
    if [[ ${2:-} == proxyapi ]]; then printf 'Ключ ProxyAPI (proxyapi.ru → Ключи API; ввод не виден): '
    else printf 'Ключ ИИ-шлюза Beget (панель → ИИ-шлюз → Создать ключ; ввод не виден): '; fi
    read -rs AI_KEY </dev/tty || true; echo
    exec > >(tee -a "$LOG") 2>&1
    if [[ ${2:-} == proxyapi ]]; then proxy_setup; else ai_setup; fi
    autoupdate; status; summary ;;
  autoupdate) exec > >(tee -a "$LOG") 2>&1; autoupdate ;;
  admin)  # bash install.sh admin — поставить админку и автообновление (без ключей и вопросов)
    exec > >(tee -a "$LOG") 2>&1; DOMAIN=$(cat "$ROOT/domain"); OR_KEY=""
    site_prepare; (docker rm -f vektor-caddy >/dev/null 2>&1; docker run -d --name vektor-caddy --restart unless-stopped --network host \
      -v "$ROOT/Caddyfile:/etc/caddy/Caddyfile:ro" -v "$APP:/srv/site:ro" -v "$ROOT/public:/srv/conf:ro" \
      -v vektor_caddy_data:/data -v vektor_caddy_config:/config caddy:2 >/dev/null) && ok 'веб-сервер перезапущен'
    ops_setup; autoupdate; summary ;;
  ops-code) ops_code; echo "Код первого входа: $OPS_CODE (2 часа). Ссылка: https://$(cat "$ROOT/domain")/ops/#code=$OPS_CODE" ;;
  # вызываются из админки: секрет приходит на stdin и нигде не печатается
  ai-set)
    AI_KEY=$(head -c 4096 | tr -d '\r\n '); exec > >(tee -a "$LOG") 2>&1
    case ${2:-} in proxyapi) proxy_setup ;; beget) ai_setup ;; *) die 'неизвестный провайдер' ;; esac
    status; summary ;;
  data-set)
    SOURCE_DB=$(head -c 4096 | tr -d '\r\n'); DOMAIN=$(cat "$ROOT/domain"); exec > >(tee -a "$LOG") 2>&1
    [[ $SOURCE_DB =~ ^postgres(ql)?:// ]] || die 'строка должна начинаться с postgresql://'
    data; unset SOURCE_DB; backup; status; summary ;;
  rootpw-set)  # из админки: новый пароль на stdin, в журнал не попадает
    P=$(head -c 512 | tr -d '\r\n'); [[ ${#P} -ge 12 && $P != *:* ]] || die 'пароль короче 12 символов или с двоеточием'
    printf 'root:%s\n' "$P" | chpasswd && echo '   ✓ пароль root сменён'; unset P ;;
  backup-now) exec > >(tee -a "$LOG") 2>&1; say 'Бэкап'; "$ROOT/backup.sh" && ok 'бэкап сделан' ;;
  diag) diag ;;
  status) exec > >(tee -a "$LOG") 2>&1; status; summary ;;
  *) die "неизвестная команда $CMD (install | ai | data | domain | reset | status | diag)" ;;
esac
