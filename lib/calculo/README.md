# C3.1 · Motor de cálculo de huella de carbono

Calcula, de forma determinista, los kg CO₂e totales y por fuente a partir de
las actividades que el usuario ya confirmó. Lógica pura, sin UI.

## Archivos

| Archivo | Qué hace | ¿Cliente? |
|---|---|---|
| `tipos.ts` | Contrato de entrada/salida (`Actividad`, `ResultadoHuella`, `CatalogoFactores`…). | Sí, solo tipos |
| `motor.ts` | `calcularHuella(actividades, catalogo)`: conversión, factor, total, porcentajes, equivalencia. Puro. | Sí, no trae datos |
| `catalogo.ts` | Versiones del catálogo (stand-in de C3.2) y `crearRepositorioCatalogo`. | **No** (`server-only`) |
| `servicio.ts` | `calcularMedicion` y `recalcularMedicion`: cargan el catálogo y llaman al motor. | **No** (`server-only`) |

## Uso (route handler o server action)

```ts
import { calcularMedicion, recalcularMedicion } from "@/lib/calculo/servicio";

const medicion = calcularMedicion([
  { fuente: "electricidad", unidad: "COP", cantidad: 480_000, origen: "declarado" },
  { fuente: "electricidad", unidad: "equipo", equipo: "nevera", cantidad: 1, horasPorDia: 24, dias: 30, origen: "estimado" },
  { fuente: "glp", unidad: "kg", cantidad: 12, origen: "declarado" },
]);
// medicion.resultado → { total, desglose[], versionFactores, equivalencia }

// Más adelante, aunque la versión vigente haya cambiado:
recalcularMedicion(medicion); // usa medicion.versionFactores
```

## Reglas

1. `kgCO2e = consumo × factor` de la fuente.
2. `unidad: "COP"` → `consumo = pesos ÷ tarifa`.
3. `unidad: "equipo"` → `kWh = kW × horas/día × días × número de equipos` (kW del catálogo o `potenciaKw`).
4. El resultado guarda `versionFactores`; `recalcularMedicion` siempre usa esa versión.
   Una versión publicada no se edita: los cambios van en una versión nueva.
5. Porcentajes con un decimal que suman exactamente 100,0 (método del resto mayor).

Las entradas inválidas (cantidades negativas, unidad que no corresponde a la
fuente, equipo o versión desconocidos, más de 24 h/día) lanzan `ErrorCalculo`.

## ⚠️ Valores de ejemplo

Los factores, tarifas y potencias de `catalogo.ts` son **de ejemplo y están
por verificar**. No vienen de una fuente oficial. Reemplázalos en C3.2 por
los valores vigentes con su fuente citada.

## Pruebas

```bash
npm test            # una pasada (la que corre en CI)
npm run test:watch  # modo observación
```

- `__tests__/motor.test.ts`: CA-C31-01, CA-C31-02, 10 casos calculados a mano
  (la cuenta está en el nombre de cada prueba), errores y rendimiento (20 actividades ≤ 300 ms).
- `__tests__/servicio.test.ts`: CA-C31-03 (v1 → v2 no cambia una medición pasada).

Las pruebas usan su propio catálogo (`__tests__/fixtures.ts`), así que
actualizar los factores reales no las rompe. En Vitest, `server-only` se
reemplaza por un módulo vacío (ver `vitest.config.mts`).
