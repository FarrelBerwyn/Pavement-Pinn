# PINN Engine Regression Report

Scope: prove that relocating `src/utils/pinnEngine.ts` to
`src/engines/pinn/core/pinnEngine.ts` changed nothing numerically, and record what the
engine is and is not.

**Result: PASS.** All 76 baseline scenarios reproduce exactly (tolerance 0).

**What this does not prove:** that the model is scientifically accurate. There is no
ground-truth dataset in the repository, so agreement with field measurements is
unverified. Software regression tests only show that behaviour did not change.

## 1. What the engine is

One exported function, unchanged in name and signature:

```text
runPinnSimulation(params: SimulationParams, roadSegment: RoadSegment): SimulationResult
```

It is a deterministic, closed-form calculation with fixed empirical coefficients. It
is **not** a trained neural network: the repository contains no weights, no network
definition, no training loop and no PDE-residual computation. The "physics loss" and
"data loss" numbers it returns are a constant plus a random term. The file was moved
with a single line changed (the import path of the type definitions).

## 2. Input contract (`SimulationParams`)

| Field | Unit | Range documented in the type | Used for |
|---|---|---|---|
| `segmentId` | text | | echoed only |
| `axleLoadTon` | tonne | 10 to 25 | every response formula, load factor, alerts |
| `rainIntensityMmHr` | mm per hour | 0 to 100 | water decay, alerts, tonnage limit |
| `floodDurationHours` | hour | 0 to 48 | water decay, tonnage limit |
| `surfaceTemperatureC` | degree Celsius | 25 to 60 | asphalt softening |
| `subgradeCbrPercent` | percent | 3 to 10 | subgrade modulus |
| `asphaltThicknessCm` | cm | 5 to 25 | strains and deflection |
| `asphaltModulusMpa` | MPa | 1200 to 3500 | tensile strain |
| `targetDevice`, `precisionMode` | enum | | simulated telemetry only |
| `numStreams`, `performanceHint` | optional | | not read by the engine |

From `roadSegment` the engine reads `currentPci`, `lengthKm`, `province` and `name`.
The ranges are comments, not checks: **the engine validates nothing.**

## 3. Equations and constants (as implemented)

P = axle load, h = asphalt thickness, T = surface temperature.

| Quantity | Formula |
|---|---|
| Water decay factor | max(0.4, 1 - 0.004 x rain - 0.015 x flood) |
| Effective CBR | CBR x water decay |
| Subgrade modulus Es | 10 x effective CBR (MPa) |
| Temperature softening | max(0.5, 1 - 0.012 x (T - 25)) |
| Effective asphalt modulus E1 | modulus x softening (MPa) |
| ODOL load factor | (P / 10)^4 (Fourth Power Law, 10 t legal axle) |
| Tensile strain, asphalt bottom | round(120 x P / (h^1.75 x (E1 / 2000)^0.4)) microstrain |
| Compressive strain, subgrade top | round(210 x P / ((h + 15)^1.4 x (Es / 40)^0.75)) microstrain |
| Maximum surface deflection w0 | round(45 x P / ((Es / 40)^0.6 x (h / 10)^0.5)) micron |
| Surface stress, top and bottom | 0.65 x P / 10 and 0.12 x P / 10 (MPa, two decimals) |
| Deflection basin w(r) | round(w0 x exp(-0.0018 x r)) at r = 0, 200, 400, 600, 900, 1200, 1500 mm |
| Annual PCI drop | min(35, 2.5 x load factor / water decay), one decimal |
| Predicted PCI | max(10, round(current PCI - 0.8 x annual drop)) |
| Remaining life | max(0.3, predicted PCI / (1.2 x annual drop)) years, one decimal |
| Pothole horizon | max(3, round(1800 x water decay / load factor)) days |
| Overlay thickness | 0 when predicted PCI is 70 or more, else max(4.0, 0.22 x (75 - PCI)) cm |
| Dynamic tonnage limit | max(10.0, 18.0 - 0.08 x rain - 0.2 x flood) tonne |
| Economic loss | 0.85 x load factor x length / 10 (billion IDR); savings are 72 percent of it |
| Zero-ODOL impact | min(95, round((1 - 1 / load factor) x 100)) percent |
| Five-year projection | years 2026 to 2031; no action: max(10, PCI - i x drop); preventive: min(95, PCI + 2.5 x i, minus 5 in year 0) |

Rule engine (same function):

| Output | Rule |
|---|---|
| Alert RED | axle above 18 t, or rain above 50 mm/h, or predicted PCI below 40 |
| Alert YELLOW | otherwise axle above 14 t, or rain above 25 mm/h, or predicted PCI below 60 |
| WIM action | RED: transfer cargo and penalise when axle above 20 t, else mandatory reroute. YELLOW: inspect and weigh. GREEN: allow |
| Speed restriction | 30, 50 or 70 km/h for RED, YELLOW, GREEN |
| Structural priority | 1 when PCI below 40, 2 when below 60, else 3 |
| Overlay type | binder plus wearing course above 8.0 cm, wearing course above 0, otherwise surface seal |
| Engineering note | critical above 250 microstrain, watch above 180, else stable |

## 4. Where each output comes from

| Output group | Origin |
|---|---|
| Strains, deflection, stress, basin, PCI, life, overlay, alerts, projections, economics | deterministic calculation from the inputs |
| `telemetry.deviceUsed`, `precisionUsed` | echo of the request |
| `telemetry.inferenceLatencyMs` | SIMULATED: device constant (NPU 6.5, AUTO 7.2, MULTI 8.1, iGPU 12.8, CPU 24.5 ms) x precision factor (INT8 0.8, FP16 1.0, FP32 1.4) plus uniform jitter of 0.4 ms either way |
| power, CPU and NPU utilisation | SIMULATED: constants per device |
| `physicsLossValue`, `dataLossValue` | SIMULATED: 0.0018 + up to 0.0006, and 0.0011 + up to 0.0004 |
| `aiNarrative` | text templates filled with the computed values |
| `id`, `timestamp` | wall clock |

No output is derived from a measurement. Road-segment inputs come from the hand-authored
dataset in `src/data/reference/indonesianRoads.ts`.

## 5. Method

1. **Before any file was moved**, `scripts/capture-pinn-baseline.ts` ran the original
   engine over a fixed scenario set and wrote
   `tests/physics-validation/fixtures/pinn-golden.json`
   (SHA-256 `96584b693b4d956c762fdb0ff5c2fd633facbdd56a18d35e0821d1efade7f6b7`).
2. The two sources of non-determinism were neutralised: `Math.random` is replaced by a
   seeded generator (mulberry32, seed 1000 + scenario index) for the duration of each
   run, and the wall-clock fields `id` and `timestamp` are excluded from the snapshot.
3. Non-finite numbers are stored as tagged strings so that `NaN` and infinities are
   pinned instead of collapsing to `null` in JSON.
4. After the move, `tests/physics-validation/pinn-regression.test.ts` runs the relocated
   engine over the same scenarios and compares with deep strict equality.

Scenario set (76):

| Group | Count | Content |
|---|---|---|
| segment defaults | 15 | every road segment with the application's default parameters |
| sweeps | 31 | one parameter at a time across its documented range, including the rule thresholds |
| runtime matrix | 15 | 5 devices x 3 precision modes |
| invalid and extreme | 15 | zero, negative, huge, `NaN` and infinite inputs |

**Tolerance: 0 (exact equality).** Justification: the change is a file move. The same
JavaScript source executes on the same engine with the same inputs, so any difference
at all, even in the last bit, would indicate an unintended code change.

## 6. Results

Command: `npm test` (runs `tsx --test "tests/**/*.test.ts"`). 14 of 14 tests in the
physics suite pass.

| Test | Result |
|---|---|
| Scenario set matches the golden file one to one | PASS |
| All 76 scenarios identical to the pre-restructure output | PASS |
| Result echoes `params` and `roadSegment` by reference; id and timestamp present | PASS |
| Inputs are not mutated (deep-frozen inputs) | PASS |
| All outputs finite across the 61 in-range scenarios | PASS |
| Invalid inputs never throw | PASS |
| Fourth Power Law (10 t gives 0 percent impact, 20 t gives 94, 25 t capped at 95) | PASS |
| Stress linear in axle load | PASS |
| Deflection basin: seven offsets, maximum at the centre, monotonic decay | PASS |
| Monotonicity: heavier axle raises strains and deflection; thicker asphalt lowers tensile strain | PASS |
| Rule thresholds (strict boundaries at 14 t, 25 and 50 mm/h) | PASS |
| Dynamic tonnage limit clamps at 10 t | PASS |
| PCI bounded 10 to 100; six-point projection from 2026 | PASS |
| Telemetry echoes the device and stays within its jitter band | PASS |

The same engine is exercised through the server: `POST /api/simulate` returns the
baseline values for the reference request (predicted PCI 10, PCI drop 28, tensile
strain 24, compressive strain 46, deflection 883), asserted in `tests/integration/api.test.ts`.

## 7. Behaviour with invalid input (pinned, not endorsed)

The engine never throws and never rejects. Observed on the first road segment:

| Input | Observed output |
|---|---|
| axle 0 | strains and deflection 0; remaining life and pothole horizon infinite; Zero-ODOL impact negative infinity; alert still RED because PCI is below 40 |
| axle `NaN` | every computed number is `NaN`; overlay 0; alert YELLOW (decided by rain alone, since comparisons with `NaN` are false) |
| thickness -15 cm | tensile strain and deflection `NaN`, compressive strain infinite |
| CBR 0 | compressive strain and deflection infinite |
| axle 1000 t | finite but meaningless values (deflection 44,611 micron); PCI clamps at 10 |

Through the HTTP API these non-finite values are serialised as `null`. This is the
existing contract and was preserved; input validation would be a behaviour change and
is listed as a recommendation, not done here.

## 8. Observations for the model owners (no code was changed)

These are questions about scientific plausibility noticed during the audit. They are
outside the scope of a refactor and are recorded so they are not lost.

1. **Strain magnitudes versus the alert thresholds.** Across the 15 default scenarios
   the tensile strain ranges from 10 to 59 microstrain, and the largest value in all 61
   in-range scenarios is 145 (asphalt thinned to 5 cm). The engineering notes trigger
   at 180 and 250, so the "watch" and "critical" notes are never produced inside the
   documented input ranges. A seed audit entry in the UI mentions 245 microstrain,
   which the engine does not produce for any in-range scenario tested.
2. **Formulas are not dimensionally homogeneous.** They combine tonnes, centimetres
   and megapascals through fitted exponents, so unit consistency cannot be checked by
   dimensional analysis; correctness depends entirely on calibration that is not in
   the repository.
3. **PCI saturates.** 7 of the 15 default scenarios return the floor value of 10, so
   for almost half of the reference segments the prediction carries no information
   beyond "very poor".
4. **Units of stress.** 0.65 MPa per 10 t is a tyre-contact-pressure-like constant
   rather than a computed layer stress.
5. The label "Burmister multilayer elasticity" in the UI describes the intent; the
   implementation is a set of power-law fits, not a layered elastic solution.

The figures in items 1 and 3 were computed from the golden file.

## 9. Maintaining the baseline

- The golden file must change only when a numerical change to the engine is intended
  and reviewed. Regenerate it with `npx tsx scripts/capture-pinn-baseline.ts` and
  review the diff.
- A failing "identical to the pre-restructure output" test means the engine's numbers
  moved. Treat it as a defect unless the change was deliberate.
