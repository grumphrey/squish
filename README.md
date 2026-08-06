# squish

A URL shortener written in Go + React

## Table of Contents

- [Demo](#demo)
- [Key features](#key-features)
- [Technical stack](#technical-stack)
- [Running the application](#running-the-application)
- [Setup and Configuration](#setup-and-configuration)

## Demo

https://github.com/user-attachments/assets/049ea872-c616-4f4b-b049-532bed944668

🔗 Live site: [squish.humphrey.app](https://squish.humphrey.app)

## Key features

- Metrics and statistics for shortened URLs
- Admin page to manage links (create and delete links, search/filter, view link metrics)
- Set custom URLs
- Generate QR codes
- OpenID Connect (OIDC) login

## Technical stack

- Backend building blocks
  - [golang-jwt/jwt](https://github.com/golang-jwt/jwt)
  - [coreos/go-oidc](https://github.com/coreos/go-oidc)
  - [google/uuid](https://github.com/google/uuid)
  - [go-redis/redis_rate](https://github.com/go-redis/redis_rate)
  - [jackc/pgx](https://github.com/jackc/pgx)
  - [mileusna/useragent](https://github.com/mileusna/useragent)
  - [oschwald/geoip2-golang](https://github.com/oschwald/geoip2-golang)
  - [yeqown/go-qrcode](https://github.com/yeqown/go-qrcode)
  - [modelcontextprotocol/go-sdk](https://github.com/modelcontextprotocol/go-sdk)

- Frontend web client
  - React + TypeScript
  - Tailwind, React Query, Tanstack Router
  - [shadcn-ui](https://github.com/shadcn-ui/ui), [radix-ui](https://github.com/radix-ui/primitives)
  - [recharts](https://github.com/recharts/recharts)

- Infrastructure
  - Postgres, Redis, nginx
  - docker and docker-compose

## Running the application

### Docker

Make sure docker is installed, then you can start the app from the root directory:

```sh
docker compose up
```

This setup uses PostgreSQL for the database, Redis for the caching layer.

## Setup and Configuration

The app can be configured via environment variables. See [`.example.env`](./.example.env) for the full list of configurations.

### Optional configurations

If you would like to collect location metrics on your links (e.g. clicks by country), you will need a copy of the
MaxMind GeoLite2 City database file.

Create an account and [download it here](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data/).
Then place the file (`GeoLite2-City.mmdb`) in the `/data/geoip` folder.

To enable OpenID Connect login, you will need to set up OAuth with the following identity
provider(s) ([Google](https://support.google.com/cloud/answer/15549257?sjid=5358172947961237587-NC),
[GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)).

After obtaining OAuth credentials, set the following env vars: (`CLIENT_ID`, `CLIENT_SECRET`, `OAUTH_REDIRECT_URL`) in your `.env` file.

To serve the app over https, use `nginx.https.conf` instead, with a valid TLS certificate.
You can get one for free with [LetsEncrypt](https://letsencrypt.org/).
