# Подключение регистрации

Регистрация выключена по умолчанию. Не включать до утверждения `legal/consent.md` и `legal/privacy.md` юристом. После получения файлов `node tools/legal-sync.mjs VERSION` выдаст SQL с версией и хешами для применения владельцем. Скрипт не включает регистрацию.

1. Владелец включает расширение `http` в схеме `extensions` и Vault в Supabase. В Vault сохраняет `VEKTOR_MAIL_URL` (HTTPS-адрес `/functions/v1/mail`) и `VEKTOR_MAIL_SERVICE_KEY` (service_role того же проекта). Таблицы Vault браузеру недоступны. Ключи не передавать в чат.
2. Развернуть Edge Function `mail`; в Edge Secrets задать `UNISENDER_KEY`, `MAIL_FROM`, `CAPTCHA_SERVER_KEY`, `SITE_URL`. Служебные `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` предоставляет окружение. `SITE_URL` должен совпадать с `vk_settings.site.url`. Секреты провайдеров база не хранит.
3. Владелец добавляет публичный клиентский ключ виджета в `vk_settings.site.captcha_site_key`. Страница получает его через `vektor_public_config`. В `config.js` остаётся только публичный Supabase anon; серверный ключ капчи хранится только в Edge Secrets. Настроить домены виджета для сайта и предпросмотра.
4. Для тестового проекта без Unisender можно включить Edge Secret `MAIL_TEST_MODE=true`: письмо попадёт в тестовый лог. На рабочем сервере этот режим выключен. Без рабочего ключа и без тестового режима отправка закрыта.
5. Владелец устанавливает HTTPS-адрес в поле `url` объекта `vk_settings.site`, сохраняя `captcha_site_key`. После SQL-изменений выполнить `notify pgrst, 'reload schema';`. Проверить полный цикл регистрации, подтверждения, сброса и одноразовость ссылок. Затем на своей почте проверить доставку в Яндекс, Mail.ru, Gmail, SPF/DKIM/DMARC домена.
6. После проверки текста и доставки владелец включает `signup_open`. Существующий вход работает и при выключенной регистрации.

Проверка капчи всегда серверная и закрывается при ошибках сети. [API проверки SmartCaptcha](https://yandex.cloud/ru/docs/smartcaptcha/quickstart). Письма отправляются по [официальному API Unisender Go](https://godocs.unisender.ru/web-api-ref). HTTP-статус и ответ сервиса проверяются; секреты и ответы провайдеров клиенту не выдаются. Ссылки содержат токен в `#fragment`, после чтения страница удаляет его из адреса. В БД хранится только SHA-256 токена.
