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

Las entradas inválidas lanzan `ErrorCalculo` con un mensaje en español:
cantidades negativas, fuente fuera del catálogo, unidad que no corresponde a la
fuente, tarifa o potencia ≤ 0, equipo o versión desconocidos, modo equipo con
una fuente distinta de electricidad y más de 24 h/día.

## Decisiones de diseño

Dos decisiones van más allá de la especificación:

- **Campo `incluyeEstimados` en cada fila del desglose.** La spec pide el
  `origen` (declarado | estimado) en la entrada, pero no dice qué hacer con él.
  El motor no lo necesita para calcular, y si se descarta, C4.1 no puede
  advertir que una cifra se basa en una estimación ni C4.2 priorizar que el
  usuario confirme ese dato. Como el desglose suma varias actividades por
  fuente, el campo vale `true` si **alguna** de ellas fue estimada: basta una
  para que la cifra de la fila no sea del todo declarada.
- **El modo `equipo` solo acepta `fuente: "electricidad"`.** La regla 3 define
  el equipo como kW × horas/día × días, cuyo resultado son kWh. Aplicar esos
  kWh al factor del GLP o del diésel daría un número sin sentido físico, y una
  estufa a gas se mide en m³ o kg, no en kW eléctricos. Se restringe en el tipo
  (`ActividadEquipo`) y también en tiempo de ejecución, porque las actividades
  pueden llegar como JSON. Si más adelante hacen falta equipos a gas, conviene
  modelarlos con su propio consumo (m³/h) en el catálogo, no con kW.

## ⚠️ Valores de ejemplo

Los factores, tarifas y potencias de `catalogo.ts` son **de ejemplo y están
por verificar**. No vienen de una fuente oficial. Reemplázalos en C3.2 por
los valores vigentes con su fuente citada.

## Pruebas

```bash
npm test            # una pasada (la que corre en CI)
npm run test:watch  # modo observación
```

En CI, `.github/workflows/test.yml` corre `npm ci`, `typecheck`, `lint` y
`npm test` en cada push y pull request.

### Trazabilidad

Nombres tal como los reporta Vitest (`describe > it`).

| Requisito | Archivo | Prueba |
|---|---|---|
| CA-C31-01 | `motor.test.ts` | `Criterios de aceptación > CA-C31-01: factor 0,2 y 1.000 kWh dan 200,0 kg CO2e` |
| CA-C31-02 | `motor.test.ts` | `Criterios de aceptación > CA-C31-02: tarifa $800/kWh y $480.000 dan 600 kWh` |
| CA-C31-03 | `servicio.test.ts` | `Versionado de factores > CA-C31-03: una medición hecha con v1 no cambia cuando el catálogo pasa a v2` |
| RNF Rendimiento (≤ 300 ms, 20 actividades) | `motor.test.ts` | `Rendimiento > calcula 20 actividades en ≤ 300 ms` |
| RNF Exactitud (10 casos a mano en CI) | `motor.test.ts` | Los 10 de `Casos calculados a mano > 1.` … `10.`, ejecutados por `.github/workflows/test.yml` |
| RNF Seguridad (factores solo en servidor) | `seguridad.test.ts` | `Seguridad > catalogo.ts importa server-only`, `Seguridad > servicio.ts importa server-only`, `Seguridad > motor.ts y tipos.ts no importan el catálogo` |

La prueba de seguridad verifica la guarda; quien la hace cumplir es `next build`.
Comprobado a mano: una página con `"use client"` que importa `catalogo.ts` hace
fallar el build con *"You're importing a component that needs server-only"*.

Las pruebas usan su propio catálogo (`__tests__/fixtures.ts`), así que
actualizar los factores reales no las rompe. En Vitest, `server-only` se
reemplaza por un módulo vacío (ver `vitest.config.mts`).
