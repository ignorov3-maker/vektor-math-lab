# Вектор на своём сервере (Beget VPS)

Один скрипт `install.sh` ставит всё на чистую Ubuntu 22.04/24.04 (2 ядра, 4 ГБ хватает):

- swap 4 ГБ, Docker, firewall (снаружи только SSH, 80, 443);
- self-hosted Supabase со всеми сервисами, включая analytics; Postgres той же версии, что в облаке (17);
- новые пароли и ключи — генерируются на сервере, лежат в `/opt/vektor/supabase/.env` и `/opt/vektor/functions.env` (права 600), в вывод не попадают;
- сайт из ветки `main` и функция Бипыча `tutor`; HTTPS-сертификат Caddy получает сам; заголовки безопасности — как в `vercel.json`;
- наружу открыты только `/rest/v1` и `/functions/v1`; Postgres, Studio, analytics и Kong слушают только `127.0.0.1` (скрипт это проверяет и останавливается, если не так);
- копирование данных из облачного Supabase (`tools/migrate/dump.sh` → восстановление одной транзакцией → `verify.sh`);
- ежедневный бэкап в `/opt/vektor/backups`, хранится 14 дней.

## Запуск

На Windows: PowerShell → `ssh root@<IP сервера>` → пароль (при вводе не виден) → затем:

```
curl -fsSL https://raw.githubusercontent.com/ignorov3-maker/vektor-math-lab/claude/beget/tools/beget/install.sh -o install.sh && bash install.sh
```

Скрипт в начале задаёт три вопроса, потом работает сам 10–20 минут:

1. **Домен** — Enter оставляет временный `<ip-через-дефисы>.sslip.io`. Свой домен: сначала A-запись на IP сервера, потом повторный запуск с `DOMAIN=vektor.example.ru bash install.sh`.
2. **Ключ OpenRouter** — тот же, что в секретах Supabase (или новый с openrouter.ai). Enter — пропустить.
3. **Строка подключения к облачной базе** — Supabase → Connect → Session pooler → URI, вместо `[YOUR-PASSWORD]` пароль базы. Enter — пропустить, позже `bash install.sh data`.

В конце печатается блок «ИТОГ» без секретов — его присылать Claude.

Повторный запуск безопасен: обновляет сайт и функции из `main`, ключи и данные не трогает.

## Studio (панель базы)

Наружу закрыта. С компьютера: `ssh -L 8000:127.0.0.1:8000 root@<IP>` и открыть `http://localhost:8000`. Логин и пароль: на сервере `grep DASHBOARD_ /opt/vektor/supabase/.env`.

## Что это пока не делает

Это пробная копия: пилот продолжает работать на Vercel и облачном Supabase. То, что дети делают после копирования, на новый сервер не попадает. Переключение (режим `maintenance`, финальная копия, смена `config.js` на Vercel или перенос домена) — отдельным шагом по `tools/migrate/README.md`. Почта (`mail`) не настраивается: Vault в облаке пуст, Unisender не подключён.
