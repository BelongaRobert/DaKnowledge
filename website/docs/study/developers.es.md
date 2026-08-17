---
title: Acceso para máquinas (x402)
topic: study
tags:
  - estudio
  - desarrolladores
  - x402
---

# Acceso para máquinas (x402)

Este sitio es gratuito. Busca en el encabezado, sigue un [camino de estudio](tracks/) y lee cada página doctrinal sin pagar. Las personas, el SEO y la búsqueda del sitio no quedan detrás de un pago.

Lo que sigue es solo para **agentes y scripts**. x402 aquí es **HTTP 402**, no un pull request de GitHub.

## Gratis frente a de pago

| Quién | Qué |
|-------|-----|
| Personas en GitHub Pages | HTML gratis, búsqueda gratis |
| Agentes en `/v1/search`, `/v1/ask`, consultas | pago x402 |

El bien escaso es el índice católico curado (Catecismo, Escritura, concilios, grafo de citas, itinerarios) — no un chatbot genérico de teología.

## Rutas de pago (testnet por defecto)

Base Sepolia (`eip155:84532`), facilitador `https://x402.org/facilitator`.

| Ruta | Precio | Devuelve |
|------|--------|----------|
| `GET /v1/search?q=` | $0.001 | Resultados ordenados |
| `GET /v1/topic/:topic` | $0.001 | Documentos de un tema |
| `GET /v1/scripture?ref=` | $0.001 | Páginas que citan un versículo |
| `GET /v1/ccc?n=` | $0.001 | Páginas que citan un número del Catecismo |
| `GET /v1/document?path=` | $0.002 | Un documento |
| `GET /v1/ask?q=` | $0.005 | Respuesta breve **con citas** |

`GET /`, `GET /health` y `GET /v1/stats` siguen gratis. Las llamadas de agente sin pago responden `PAYMENT-REQUIRED`.

Prefiere `/v1/ask`, `/v1/scripture` y `/v1/ccc` antes de volcar todo el markdown.

## Cómo encuentra un agente la API

1. `GET /` — catálogo gratuito de rutas y precios.
2. Cada 402 de pago incluye metadatos de **Bazaar** (parámetros e ejemplos de salida) para que un facilitador pueda listar DaKnowledge tras un pago liquidado.
3. Luego busca en la API de descubrimiento de ese facilitador (por ejemplo el Bazaar de CDP `/discovery/resources`).
4. Detalles: `api/README.md`.

Sin metadatos de Bazaar la API se puede pagar, pero no se descubre.

## Cómo ejecutarla

GitHub Pages no corre este servidor.

```bash
cp api/.env.example api/.env
# define PAY_TO_EVM_ADDRESS — no lo subas al repositorio
npm run api
```

Mainnet más adelante: `X402_NETWORK=eip155:8453` y un facilitador de **producción**, no x402.org.
