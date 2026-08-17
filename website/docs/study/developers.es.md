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

Lo que sigue es solo para **agentes y scripts** que quieran una API. Quien navega GitHub Pages no queda detrás de un pago.

## Qué se paga

Un servidor [x402](https://www.x402.org/) opcional puede exponer tres rutas:

| Ruta | Precio (predeterminado en testnet) |
|------|-------------------------------------|
| `GET /v1/search?q=` | $0.001 |
| `GET /v1/document?path=` | $0.002 |
| `GET /v1/topic?id=` | $0.001 |

x402 usa **HTTP 402**. Una llamada sin pago responde `PAYMENT-REQUIRED`. Un cliente que puede pagar reintenta con `PAYMENT-SIGNATURE`. Esto no es un pull request de GitHub, ni un muro de inicio de sesión en la documentación.

La búsqueda del sitio publicado, el SEO y el HTML de las páginas siguen siendo gratuitos.

## Cómo ejecutar la API (opcional)

Desde el repositorio, no desde GitHub Pages:

```bash
cp api/.env.example api/.env
# define PAY_TO_EVM_ADDRESS
npm run api
```

Valores predeterminados: Base Sepolia (`eip155:84532`), precios `$0.001`–`$0.002`, facilitador `https://x402.org/facilitator`. Ver `api/README.md`.

El flujo de publicación en Pages no arranca este servidor. Si más adelante lo quieres en internet, despliégalo tú (Railway, Render, Fly). Para Base mainnet, cambia a `eip155:8453` y a un facilitador de **producción** — no el facilitador de testnet de x402.org.
