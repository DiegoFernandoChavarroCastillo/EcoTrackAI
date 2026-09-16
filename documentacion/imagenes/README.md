# Imágenes de la bitácora

Pega aquí las capturas con **exactamente** estos nombres. `BITACORA.md` ya las
referencia, así que en cuanto el archivo exista con el nombre correcto la imagen
aparece sola en el documento.

Formato recomendado: PNG. Ancho útil: 1200–1600 px para capturas de escritorio,
400–500 px para móvil.

## Bitácora de iteraciones

| Archivo | Qué capturar |
|---|---|
| `01-esqueleto.png` | La respuesta al prompt 1 (estructura de carpetas creada) |
| `02-interfaz.png` | La respuesta al prompt 2 (componentes y estados) |
| `03-backend.png` | La respuesta al prompt 3 (endpoint y factores) |
| `04-qa-seguridad.png` | La respuesta al prompt 4 (tabla de casos límite y pruebas) |
| `05-pulido.png` | La respuesta al prompt 5 (checklist de restricciones) |
| `06-documentacion.png` | La respuesta al prompt 6 (este documento) |

## Interfaz principal

| Archivo | Qué capturar |
|---|---|
| `interfaz-escritorio.png` | La pantalla completa en escritorio, estado inicial |
| `interfaz-movil.png` | La misma pantalla a 390 px de ancho |
| `estado-idle.png` | Formulario vacío, sin tarjeta de resultado |
| `estado-loading.png` | Botón en "Calculando…" y esqueleto de la tarjeta |
| `estado-success.png` | Tarjeta con total y desglose |
| `estado-error.png` | Tarjeta de error con su mensaje y el botón "Volver a intentar" |

## Consulta de ejemplo

| Archivo | Qué capturar |
|---|---|
| `consulta-entrada.png` | El textarea con el texto escrito, antes de enviar |
| `consulta-resultado.png` | La tarjeta de resultado ya calculada |
| `consulta-json.png` | La respuesta cruda del endpoint (terminal con curl, o la pestaña Network) |

## Cómo tomar las capturas

```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

- **Móvil**: en Chrome, F12 → icono de dispositivo (Ctrl+Shift+M) → ancho 390.
- **Los cuatro estados**: el panel "Vista de estados · solo desarrollo" al pie de
  la página alterna entre `idle`, `loading`, `success` y `error` sin necesidad de
  llamar a la API. Solo aparece en desarrollo.
