---
title: Acceso para máquinas (x402)
topic: study
tags:
  - study
  - developers
  - x402
---

# Acceso para máquinas (x402)

Este sitio web es gratuito. La búsqueda, los itinerarios de estudio y cada página doctrinal permanecen abiertos.

Los **agentes** que necesitan recuperación legible por máquina con citas usan la **API HTTP x402** — pago por solicitud en USDC en Base, no un inicio de sesión de GitHub ni un muro de pago en estas páginas.

| Quién | Qué |
|-------|-----|
| Humanos en GitHub Pages | Gratis |
| Agentes en `/v1/*` | De pago (x402, $0.05 por llamada) |

## API en producción

**URL base:** [https://daknowledge-x402.onrender.com](https://daknowledge-x402.onrender.com)

| Endpoint | Costo | Propósito |
|----------|-------|-----------|
| `GET /` | gratis | Catálogo JSON |
| `GET /.well-known/x402.json` | gratis | **Catálogo de descubrimiento para agentes** |
| `GET /openapi.json` | gratis | Especificación OpenAPI 3.1 |
| `GET /health` | gratis | Comprobación de salud |
| `GET /v1/stats` | gratis | Estadísticas del índice |
| `GET /v1/ask?q=` | $0.05 | **Empezar aquí** — respuesta con citas |
| `GET /v1/search?q=` | $0.05 | Búsqueda de texto completo |
| `GET /v1/document?path=` | $0.05 | Obtener un documento |
| `GET /v1/topic/:topic` | $0.05 | Documentos por tema |
| `GET /v1/scripture?ref=` | $0.05 | Páginas que citan un versículo |
| `GET /v1/ccc?n=` | $0.05 | Páginas que citan un párrafo del Catecismo |

Las llamadas sin pago devuelven **HTTP 402** con el encabezado `PAYMENT-REQUIRED` (x402 v2).

## Cómo descubren los agentes DaKnowledge

1. **Catálogo well-known:** `GET /.well-known/x402.json` (gratis)
2. **llms.txt:** [belongarobert.github.io/DaKnowledge/llms.txt](https://belongarobert.github.io/DaKnowledge/llms.txt)
3. **Bazaar CDP:** búsqueda en `https://api.cdp.coinbase.com/platform/v2/x402/discovery/search?query=DaKnowledge` o MCP en `…/discovery/mcp`

## Flujo recomendado

1. `GET /v1/ask?q=…` — respuesta breve con citas
2. `GET /v1/search?q=…` — explorar documentos
3. `GET /v1/document?path=…` — texto completo

Detalles: `api/README.md` en el repositorio.
