# Avertizare API — deploy notes

Snapshot of `/opt/avertizare` from the production VPS for redeploy on another server.

## What is included

- Full Laravel app (routes, controllers, public frontend, migrations, sqlite DB)
- `.env` with structure from production; **secrets are placeholders** (`CHANGE_ME`)
- Apache vhost examples in `deploy/` (certificate paths are placeholders — no cert files)
- Built frontend assets in `public/build`

## Not included

- `vendor/` — run `composer install --no-dev`
- `node_modules/` — only needed if you rebuild assets (`npm ci && npm run build`)
- SSL certificates / private keys

## Quick deploy

1. Copy files to the server (e.g. `/opt/avertizare`)
2. Edit `.env`: set `APP_KEY`, `ADMIN_PASSWORD`, `APP_URL`, and related values
3. `composer install --no-dev --optimize-autoloader`
4. `php artisan key:generate` if you leave `APP_KEY=CHANGE_ME` (or paste a real key)
5. `chown -R apache:apache storage bootstrap/cache` (or `www-data`)
6. Point the web server document root to `public/`
7. Issue new TLS certs for your domain and update `deploy/avertizare-ssl.conf`

Generate a new app key:

```bash
php artisan key:generate --force
```

Admin password is stored hashed in the DB / seeder — after changing `ADMIN_PASSWORD` in `.env`, re-seed or update the admin user as needed.
