# cemaden-cors-proxy

CORS proxy for the CEMADEN public alerts API, running on Wasmer Edge (WinterJS).

> This folder is versioned inside the ClimaNow repo for safekeeping, but it is a
> **separate Wasmer app** with its own deploy cycle. The Vite build ignores it:
> only `dist/` is published, so nothing here ships with the site. The frontend
> just points at <https://cemaden-proxy.wasmer.app>.

## Why

`https://painelalertas.cemaden.gov.br/wsAlertas2` answers `200` with valid JSON but
sends **no `Access-Control-Allow-Origin` header**, so browsers refuse to read the
response. Any purely static frontend therefore cannot reach CEMADEN directly and
needs a server-side proxy. This worker is that proxy.

## Endpoints

| Path | Description |
| --- | --- |
| `/` or `/health` | Service metadata |
| `/wsAlertas` | Passthrough to `painelalertas.cemaden.gov.br/wsAlertas` |
| `/wsAlertas2` | Passthrough to `painelalertas.cemaden.gov.br/wsAlertas2` |

Responses are passed through untouched and get `Access-Control-Allow-Origin: *`
plus a 5-minute `Cache-Control`.

## Files

- `src/_worker.js` — the worker. WinterJS in Cloudflare mode only loads a file
  named `_worker.js`, so the name is required. It must also never build a
  `Response` with a `null` body: `new Response(null, ...)` throws at runtime
  ("JavaScript failed"), which is why the `OPTIONS` preflight returns a small
  JSON body instead of a bodiless `204`.
- `wasmer.toml` — package manifest. `runner = "wasi"` and
  `main-args = ["--mode", "cloudflare", "/src"]` are what start WinterJS.
- `app.yaml` — Wasmer Edge app definition. `package: .` is required so the deploy
  resolves the local `wasmer.toml`; a fully-qualified package ref is rejected as
  deprecated deploy behaviour.

Deploy-time health checks request `/`, so keep that route answering `200` — a
`404` there makes `wasmer deploy` report failure even when the app works.

## Deploy

```bash
wasmer deploy --dir . --owner carlosklaro --app-name cemaden-proxy --publish-package
```

Bump `version` in `wasmer.toml` before each deploy.

Live at <https://cemaden-proxy.wasmer.app>.