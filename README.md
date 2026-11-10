# Light Visual Site

Статический сайт Nimbus: лендинг с загрузками и личный кабинет. Отдельного сервера и сборки не требует — это обычные HTML, CSS и JS.

## Что внутри

| Файл | Назначение |
| --- | --- |
| `index.html` | Главная: возможности, каталог, клиент, темы, загрузки, установка, FAQ, changelog |
| `account.html` | Вход и регистрация, профиль с UUID, смена сервера аккаунтов |
| `style.css` | Оформление сайта, адаптив до 360 px |
| `script.js` | Темы, мобильное меню, анимации появления, копирование SHA256 |
| `account.js` | Запросы к NimbusAuthServer, токен сессии, сервер в localStorage |
| `downloads/` | Установщик, portable ZIP, jar клиента 2.0.4, `SHA256SUMS.txt` |
| `assets/` | Логотип и скриншоты лаунчера и установщика |

## Локальный просмотр

Из папки `NimbusSite` запусти любой статический сервер, например:

```
npx serve .
```

Открой `http://localhost:3000`. Открывать `index.html` напрямую через `file://` не стоит: личный кабинет делает fetch-запросы, а браузер блокирует их для локальных файлов.

## Публикация

Подойдёт любой статический хостинг: GitHub Pages, Cloudflare Pages, Netlify, Vercel или обычный nginx. Корнем сайта должен быть `index.html`.

### Вариант 1. GitHub Pages + GitHub Releases (бесплатно)

Крупные файлы нельзя класть в репозиторий: GitHub отклоняет файлы больше 100 МБ, а ZIP весит 118 МБ. Поэтому сайт публикуется на Pages, а установщик и архив — через Releases.

1. Создай на GitHub репозиторий, например `nimbus-site` (можно приватный или публичный).
2. Загрузи в него файлы из `NimbusSite`, **кроме** `downloads/LightVisualLauncher-Setup-1.3.2.exe` и `downloads/LightVisualLauncher-1.3.2-win32-x64.zip`. Папку `downloads` оставь — в ней должны быть jar и `SHA256SUMS.txt` (они маленькие).
3. Открой **Releases → Draft a new release**. Тег: `v1.3.2`, заголовок: `Light Visual 1.3.2`.
4. Прикрепи к релизу четыре файла: установщик, ZIP, jar и `SHA256SUMS.txt`. Нажми **Publish release**.
5. Включи Pages: **Settings → Pages → Source: Deploy from a branch**, ветка `main`, папка `/ (root)`.
6. Сайт откроется по адресу `https://<user>.github.io/<repo>/`.
7. Замени ссылки на установщик и ZIP в `index.html` (в hero и в блоке загрузок) на адреса релиза:

```
https://github.com/<user>/<repo>/releases/download/v1.3.2/LightVisualLauncher-Setup-1.3.2.exe
https://github.com/<user>/<repo>/releases/download/v1.3.2/LightVisualLauncher-1.3.2-win32-x64.zip
```

Ссылку на jar и `SHA256SUMS.txt` можно оставить локальной, если файлы лежат в репозитории.

Если предпочитаешь git, из папки `NimbusSite`:

```
git init
git add .
git commit -m "Light Visual site 1.3.2"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

В `.gitignore` уже исключены exe и zip, поэтому большие файлы не попадут в репозиторий. Их загрузи через Releases (пункт 3–4).

### Вариант 2. Cloudflare Pages или Netlify

Эти хостинги тоже не принимают крупные файлы (у Cloudflare Pages лимит 25 МБ на файл). Схема та же: сайт на хостинге, установщик и ZIP — в Releases или объектном хранилище (Cloudflare R2, S3).

- **Cloudflare Pages:** создай проект, подключи репозиторий, build command оставь пустым, output directory — `/`.
- **Netlify:** перетащи папку сайта в Netlify Drop или подключи репозиторий, publish directory — `.`.

### Свой домен

На Pages это **Settings → Pages → Custom domain**. У Cloudflare и Netlify домен добавляется в настройках проекта. После подключения домена сайт будет доступен по `https://`, сертификат выдаётся автоматически.


## Сервер аккаунтов

Личный кабинет обращается к `NimbusAuthServer` напрямую из браузера. Адрес по умолчанию — `https://nimbus-auth.netlify.app`.

Его можно изменить двумя способами:

- на странице `account.html` открыть **«Сервер аккаунтов»**, ввести адрес и нажать «Сохранить»;
- передать адрес в ссылке: `account.html?server=https://auth.example.com` — он сохранится в localStorage.

Сервер хранит аккаунты, поэтому адрес должен быть постоянным. Сейчас используется бесплатный сервер на Netlify Functions + Blobs: `https://nimbus-auth.netlify.app`, исходники — в репозитории `nimbus-auth-netlify`. В `NimbusAuthServer/README.md` описаны локальный запуск, Docker и Render.

### HTTPS обязателен

Сайт на `https://` не сможет обратиться к серверу на `http://` — браузер заблокирует запрос как mixed content. Для публичного сайта нужен auth-сервер с HTTPS, например Render, Vercel или свой сервер с Let's Encrypt. Исключение — локальная проверка на `http://127.0.0.1`.

CORS на стороне `NimbusAuthServer` уже включён: разрешены `GET`, `POST`, `OPTIONS` и заголовки `Content-Type`, `Authorization`.

## Обновление версии

1. Замени файлы в `downloads` на новые сборки.
2. Пересчитай контрольные суммы:

```
Get-ChildItem downloads -File | Where-Object { $_.Name -ne 'SHA256SUMS.txt' } | ForEach-Object {
  "{0}  {1}" -f (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower(), $_.Name
} | Set-Content downloads\SHA256SUMS.txt -Encoding ASCII
```

3. Обнови версии, размеры и хэши в блоке `#download` файла `index.html`.
4. При необходимости поправь changelog.

## Контакты

Telegram: [@keyraft](https://t.me/keyraft)
