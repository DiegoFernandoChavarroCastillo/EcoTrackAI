# EcoTrack AI

Calculadora de huella de carbono para negocios pequeños. El usuario describe su
día en lenguaje natural —"Hoy usamos 5 camionetas de reparto y gastamos 200kWh
de luz"— y recibe el total en kg CO₂e con el desglose por actividad.

## Cómo funciona

```
Texto libre
   │
   ├─▶ POST /api/analyze
   │      │
   │      ├─▶ Groq (openai/gpt-oss-120b, salida JSON estricta)
   │      │     └─▶ [{ tipo, cantidad, unidad }]
   │      │
   │      └─▶ tabla de factores de emisión (lib/emissionFactors.ts)
   │            └─▶ kg CO₂e por actividad + total
   │
   └─▶ Tarjeta con el total, el desglose y el supuesto de cada factor
```

Una sola llamada al modelo por solicitud. El modelo solo extrae datos; el
cálculo es determinista y ocurre en el servidor, así que ninguna cifra sale de
una alucinación.

## Stack

- **Next.js 14** (App Router) + TypeScript en modo estricto
- **CSS Modules** con tokens en `app/globals.css` — sin framework de UI
- **next/font** para autoalojar las tipografías (Instrument Sans + IBM Plex Mono)
- **Groq** vía `fetch` — sin SDK, sin dependencias de runtime más allá de React

## Variables de entorno

Copia `.env.example` a `.env.local` y llénalo. `.env.local` está en
`.gitignore`: nunca subas claves al repositorio.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `GROQ_API_KEY` | Sí | Clave de la API de Groq, de [console.groq.com/keys](https://console.groq.com/keys). Solo se lee en el servidor; no la prefijes con `NEXT_PUBLIC_`. |
| `GROQ_MODEL` | No | Modelo a usar. Por defecto `openai/gpt-oss-120b`, que soporta `response_format: json_object`. Groq retira modelos sin aviso: si todo empieza a fallar con `502`, consulta [los modelos vigentes](https://console.groq.com/docs/models) y pon uno aquí. |
| `GROQ_BASE_URL` | No | Apunta las llamadas a otro host compatible con la API de OpenAI. Solo para pruebas locales o un proxy. Por defecto `https://api.groq.com/openai/v1`. |

## Instalación local

Requiere Node 18 o superior.

```bash
git clone <url-del-repo>
cd EcoTrackAI
npm install

cp .env.example .env.local   # y pon tu GROQ_API_KEY
npm run dev
```

Abre <http://localhost:3000>.

> **Máquinas con poca RAM.** Si `npm run build` o `npm run dev` mueren con
> `Fatal process out of memory`, súbele el heap a Node:
> `NODE_OPTIONS="--max-old-space-size=4096" npm run build`.
> En Vercel no hace falta: el build allá tiene 8 GB.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build de producción |
| `npm run lint` | ESLint con la configuración de Next |
| `npm run typecheck` | `tsc --noEmit` |

### Probar el endpoint sin el frontend

```bash
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"Hoy usamos 5 camionetas de reparto y gastamos 200kWh de luz"}'
```

En PowerShell, `curl` es alias de `Invoke-WebRequest` y esa sintaxis no sirve:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/analyze -Method Post `
  -ContentType 'application/json' `
  -Body '{"text":"Hoy usamos 5 camionetas y gastamos 200kWh"}' | ConvertTo-Json -Depth 5
```

## Despliegue en Vercel

1. Sube el repositorio a GitHub, GitLab o Bitbucket.
2. En [vercel.com/new](https://vercel.com/new), importa el repositorio. Vercel
   detecta Next.js solo: no toques Framework Preset, Build Command ni Output
   Directory.
3. Antes de desplegar, abre **Environment Variables** y agrega
   `GROQ_API_KEY` con tu clave. Márcala para los tres entornos
   (Production, Preview, Development).
4. **Deploy**. El primer despliegue toma un par de minutos.
5. Verifica en producción:

   ```bash
   curl -s -X POST https://<tu-proyecto>.vercel.app/api/analyze \
     -H "Content-Type: application/json" \
     -d '{"text":"Hoy usamos 5 camionetas y gastamos 200kWh"}'
   ```

Los despliegues siguientes salen solos con cada push a la rama principal; cada
pull request recibe su propia URL de preview.

### Si algo falla en producción

| Síntoma | Causa probable |
|---|---|
| `500` y "El servicio no está configurado" | Falta `GROQ_API_KEY` en Vercel, o se agregó después del build. Vuelve a desplegar tras guardarla. |
| `502` en todas las solicitudes | El modelo de `GROQ_MODEL` ya no existe. Revisa los logs de la función: traen el mensaje exacto de Groq. |
| `504` intermitente | Groq tarda más de 20 s. El endpoint corta ahí a propósito. |

Los logs están en el panel de Vercel, en **Deployments → Functions**. Los
mensajes técnicos solo viven ahí; al usuario nunca le llega un error crudo.

## Estructura

```
app/
  layout.tsx            tipografías, metadata y header
  page.tsx              hero y composición
  analyzer.tsx          único componente con estado ("use client")
  api/analyze/route.ts  el endpoint completo
components/             UI pura: recibe props, no hace fetch ni cálculos
lib/
  groq.ts               llamada a Groq, system prompt, validación de salida
  emissionFactors.ts    tabla de factores (5 categorías)
  emissions.ts          cruce actividades × factores, total y resumen
  rateLimit.ts          ventana deslizante en memoria
  api.ts                cliente del endpoint para el navegador
  types.ts              contrato compartido
```

La regla de dependencias apunta hacia adentro: `app/` puede importar de
`components/` y `lib/`; `components/` solo importa **tipos** de `lib/`, nunca
funciones; `lib/` no importa nada de Next.

## Limitaciones conocidas

- **Los factores de emisión son promedios de referencia.** Sirven para
  priorizar ("el reparto pesa más que la luz"), no para un reporte regulatorio.
  Cámbialos por los del país y el año que corresponda antes de usarlos en serio.
  El más frágil es `camioneta-día`, que supone una ruta de 80 km/día.
- **El rate limit vive en memoria.** Son 10 solicitudes por minuto por IP y por
  instancia. En Vercel cada instancia serverless tiene su propio contador y se
  pierde en cada arranque en frío, así que frena un bucle accidental pero no un
  abuso real. Para eso hace falta un contador compartido (Vercel KV, Upstash).
- **La línea 14.x de Next ya no recibe parches de seguridad.** `npm audit`
  marca advisories cuyo único arreglo es Next 16. Varias aplican solo a
  self-hosting, pero no todas.
