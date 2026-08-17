---
title: Acceso para máquinas (x402)
topic: study
tags:
  - estudio
  - desarrolladores
  - x402
---

# Acceso para máquinas (x402)

Este sitio es gratuito. La búsqueda, los caminos de estudio y cada página doctrinal siguen sin pago.

Los agentes y scripts que quieren una API usan **x402** (HTTP 402), no un inicio de sesión de GitHub ni un muro de pago en estas páginas.

| Quién | Qué |
|-------|-----|
| Personas en GitHub Pages | Gratis |
| Agentes en `/v1/*` | De pago (x402) |

## Rutas de pago (testnet por defecto)

| Ruta | Precio |
|------|--------|
| `GET /v1/search?q=` | $0.001 |
| `GET /v1/topic/:topic` | $0.001 |
| `GET /v1/scripture?ref=` | $0.001 |
| `GET /v1/ccc?n=` | $0.001 |
| `GET /v1/document?path=` | $0.002 |
| `GET /v1/ask?q=` | $0.005 (respuesta + citas) |

Gratis: `GET /`, `/health`, `/v1/stats`. Prefiere `/v1/ask`, `/v1/scripture` y `/v1/ccc`.

## Descubrimiento

`GET /` lista las rutas. Los 402 de pago incluyen metadatos Bazaar. Detalles: `api/README.md`.

## Cómo ejecutarla

GitHub Pages no hospeda esto. Despliega un **Web Service** en Render, o en local:

```bash
cp api/.env.example api/.env
# define PAY_TO_EVM_ADDRESS
npm run api
```
