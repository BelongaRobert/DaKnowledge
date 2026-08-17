---
title: Para desarrolladores
topic: study
tags:
  - estudio
  - desarrolladores
  - x402
---

# Para desarrolladores

Este sitio es gratuito. Busca en el encabezado, sigue un [camino de estudio](tracks/) y lee cada página doctrinal sin pagar.

Lo que sigue es solo para **agentes y scripts**. Quien navega GitHub Pages no queda detrás de un pago.

## API de pago en vivo

Los bots que extraen el índice por programa pagan **USDC en Base mainnet** (`eip155:8453`) con [x402](https://www.x402.org/) (HTTP 402). Esto no es un pull request de GitHub, ni un muro de inicio de sesión en estas páginas.

| Ruta | Precio |
|------|--------|
| `GET /v1/search?q=` | $0.001 |
| `GET /v1/document?path=` | $0.002 |
| `GET /v1/topic?id=` | $0.001 |

Una llamada sin pago responde `PAYMENT-REQUIRED`. Un cliente que puede pagar reintenta con `PAYMENT-SIGNATURE`. La liquidación usa el facilitador de producción de Coinbase CDP, no el facilitador de testnet de x402.org.

La búsqueda del sitio publicado, el SEO y el HTML de las páginas siguen siendo gratuitos.

## Cómo hospedarla

GitHub Pages no ejecuta este servidor. Desde el repositorio:

```bash
cp api/.env.example api/.env
# PAY_TO_EVM_ADDRESS = tu billetera de Base mainnet
# CDP_API_KEY_ID / CDP_API_KEY_SECRET de portal.cdp.coinbase.com
npm run api
```

Despliega `api/server.js` (ver `render.yaml` y `api/README.md`). Define `PUBLIC_BASE_URL` con el nombre HTTPS. Tras el primer pago liquidado, los agentes pueden descubrir las rutas en el Bazaar de x402.
