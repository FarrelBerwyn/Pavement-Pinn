# PINN Validation Gap Report

**Purpose.** State exactly what the current pavement engine is, what has been verified
about it, what has not, and the minimum evidence needed before any accuracy claim or
any OpenVINO work. Nothing here changes an equation, coefficient or threshold.

**Verdict in one paragraph.** The engine is a deterministic, closed-form calculation.
It is internally consistent (the code computes exactly the documented formulas, with
finite outputs across the documented ranges) and reproducible (76 golden scenarios).
It is **not** consistent with layered-elastic (Burmister) theory, it is **not**
independently validated, and it is **not** a trained neural network. There is no model
to accelerate with OpenVINO yet.

Date: 2026-10-14. Engine: `src/engines/pinn/core/pinnEngine.ts` (byte-identical to the
version on the remote `main` branch).

## 1. Model identity

| Question | Finding | Evidence |
|---|---|---|
| Neural network architecture | none | `src/engines/pinn/` holds one file, 296 lines, one function |
| Trainable parameters, weights | none | no arrays of weights; every coefficient is a literal in the source |
| Training or optimisation loop | none | the file has no loop over data, no gradient, no optimiser |
| Physics residual or PDE loss | none | no differential operator is evaluated anywhere |
| Empirical data loss | none | no dataset is read |
| Checkpoint loading, inference runtime | none | the only import is the type module; `package.json` has no ML or inference dependency; the repository tracks no model artifact |
| What it is | deterministic formulas plus threshold rules | section 2 |

Classification: **deterministic**. Not hybrid, not trained.

Numbers in the result that are SIMULATED (constants plus random jitter): inference
latency, power, CPU and NPU utilisation, throughput, `physicsLossValue`, `dataLossValue`.
The "PINN training" shown by the Bina Marga WIM pipeline modal is also SIMULATED.

## 2. Equations and assumptions actually implemented

The formulas are listed in `PINN_REGRESSION_REPORT.md`, section 3, and are verified
against the code by test (section 7). Assumptions that the code makes implicitly:

- The pavement is described by one asphalt thickness, one asphalt modulus and a
  subgrade CBR. There is no base or sub-base input; the compressive-strain formula adds
  a fixed 15 cm to the asphalt thickness, which is not explained in the source.
- No Poisson ratio, tyre pressure, contact radius or wheel configuration appears. Load
  enters only as axle tonnes.
- Each response uses one layer only: tensile strain ignores the subgrade; compressive
  strain and deflection ignore asphalt stiffness and temperature.
- Subgrade modulus is `10 x CBR` MPa (a widely quoted approximation for low CBR; its
  source and range should be confirmed by the model owner).
- Asphalt softens linearly by 1.2 percent per degree above 25 C, floor 0.5.
- Subgrade stiffness falls linearly with rain intensity and flood duration, floor 0.4.
- Damage scales with `(axle / 10 t)^4`. The reference axle is the 10 t legal limit.
  Whether the reference should instead be the standard axle used for ESAL in the
  adopted design method is a domain decision.
- The deflection basin is `w0 x exp(-0.0018 r)` for every pavement.
- PCI falls by `0.8 x min(35, 2.5 x load factor / water decay)`. The time horizon of
  "predicted PCI" is not defined in the code.

## 3. Units and definitions

| Quantity | Unit | Definition in the code | Note |
|---|---|---|---|
| `tensileStrainEt` | microstrain, integer | horizontal strain at the bottom of the asphalt | power-law fit |
| `compressiveStrainEv` | microstrain, integer | vertical strain at the top of the subgrade | power-law fit |
| `surfaceDeflectionMaxMicron` | micron, integer | surface deflection under the load centre | power-law fit |
| `deflectionBasin` | micron at 0 to 1500 mm | exponential decay from the maximum | fixed shape |
| `stressTopMpa`, `stressBottomMpa` | MPa | `0.65` and `0.12` times `axle / 10` | constants scaled by load, not a layer analysis |
| `predictedPci`, `pciDropPoints` | index 0 to 100 | current PCI minus a load-and-water term | PCI is by definition a distress-survey index; this is a projection rule, not a survey result |
| `pavementLifeRemainingYears` | years | `PCI / (1.2 x annual drop)`, floor 0.3 | |
| `potholeHorizonDays` | days | `1800 x water decay / load factor`, floor 3 | |
| Inputs | tonne, mm/h, hour, C, percent, cm, MPa | see the regression report | ranges are comments; nothing is validated |

Dimensional check: the response formulas combine tonnes, centimetres and megapascals
through fitted exponents and are not dimensionally homogeneous, so unit correctness
cannot be established by analysis. It rests entirely on calibration, and no
calibration record exists in the repository.

## 4. Strain limits: where they are and whether they compare

| Value | Quantity | Where | Meaning given in the code | Reachable in the documented ranges |
|---|---|---|---|---|
| 180 | tensile strain | engine note "WASPADA" | approaching the fatigue threshold | 819 of 124,992 grid points; asphalt of 6 cm or thinner only |
| 200 | tensile strain | simulation panel, PDF, two engineer charts | "permitted limit" | 364 of 124,992; 5 cm asphalt only; never from the panel |
| 250 | tensile strain | engine note "KRITIS" (its text cites a limit of 200) | exceeds the permitted limit | 15 of 124,992; 5 cm asphalt only |
| 350 | compressive strain | two engineer charts | "permitted limit" | **never**: the maximum over 63,000 grid points is 195 |

Are they comparable? Only in the narrow sense that all are microstrain compared with a
microstrain output. Beyond that:

- The same quantity has three different limits (180, 200, 250) with overlapping wording.
- The charts label the limit both "AASHTO" (variable name) and "Bina Marga" (legend).
  No document, clause or table is cited anywhere in the repository for any of the four values.
- A fatigue or rutting criterion in mechanistic-empirical design ties the allowable
  strain to a number of load repetitions. The code has no traffic count and no transfer
  function, so a single fixed number presupposes a design traffic that is not stated.
- When no simulation result exists, the two charts display placeholder values of 245
  and 380 microstrain, both above their limits. Within the documented ranges the engine
  never produces a compressive strain above 195.

Conclusion: the limits are neither traceable nor consistent, and the engine's outputs
almost never reach them. Which side is wrong (response scale or limits) cannot be
decided from the repository. No limit was changed.

## 5. What can be checked without field data

| Check | Kind | Result |
|---|---|---|
| Code equals the documented formulas | analytical, automated | PASS (400 random in-range inputs, exact) |
| Worked example at the normalisation point | hand calculation | PASS |
| Fourth Power Law arithmetic | analytical | PASS (10 t gives factor 1, 20 t gives 16) |
| Response linear in load | property of linear elasticity | PASS |
| Monotonic in thickness, stiffness, temperature, moisture | property of the formulas | PASS |
| Elastic similarity: multiply every layer modulus by k, responses must scale by 1/k | necessary condition for any layered-elastic solution | **FAIL**: the engine gives `k^-0.4` (tensile), `k^-0.75` (compressive), `k^-0.6` (deflection) |
| Layer coupling | expected of a multilayer model | **FAIL**: each response reads one layer |
| Basin shape depends on stiffness ratio and thickness | expected of a multilayer model | **FAIL**: one fixed exponential |
| Structural response influences deterioration | internal coherence | **FAIL**: PCI, remaining life and pothole horizon ignore thickness, modulus, temperature and CBR |
| Saturation | internal behaviour | annual PCI drop is capped from about 19.3 t in dry conditions; 54 percent of a 63,000-point grid sits on the cap |
| Comparison with an independent multilayer linear-elastic program | reference implementation | NOT TESTED: no such solver is in the repository, and the engine lacks the inputs one needs (base layer, Poisson ratios, contact radius and pressure) |
| Half-space limit against the Boussinesq closed form | analytical reference | NOT TESTED: requires a layered formulation to take the limit of |

The three FAIL rows that concern elasticity mean the label "Burmister multilayer
elasticity" describes an intention. The implementation is a set of independent
power-law fits.

## 6. Claims that need data, and the minimum data

| Claim | Evidence required | Minimum data |
|---|---|---|
| Strains are correct for a given structure | agreement with a multilayer elastic reference | per section: thickness and modulus of every layer including base and sub-base, Poisson ratios, wheel load, contact pressure or radius |
| Deflection and basin match the road | measured FWD basins | per test point: drop load, plate radius, deflections at each sensor offset, pavement temperature, date, chainage; plus the layer structure from cores or as-built records |
| Temperature and moisture adjustments | material behaviour | modulus against temperature for the asphalt mix; subgrade stiffness against moisture or season |
| PCI prediction | observed deterioration | at least two dated PCI surveys per segment with the traffic and weather between them (the dataset holds a single survey date per segment) |
| Fourth-power damage and economic figures | traffic and cost records | axle-load spectra from WIM, traffic counts, maintenance cost history |
| Strain limits | a cited criterion | the governing document and clause, and the design traffic it assumes |
| Road dataset values | provenance | the source of each segment's PCI, CBR, thickness and traffic (they are hand-authored in the repository) |
| "Trained PINN" | a model | network definition, training code, data split, loss curves, error metrics on held-out sections |

No dataset, reference result or accuracy figure was invented for this report. Coverage
should span the range the product claims to handle; the reference segments run from
8 to 18 cm of asphalt and CBR 3 to 6.2.

## 7. What each test suite establishes

| Suite | Tests | Establishes | Does not establish |
|---|---|---|---|
| `pinn-regression.test.ts` | 14 | the engine's numbers did not change during the restructure (76 scenarios, tolerance 0) | that the numbers are right |
| `pinn-mathematical-audit.test.ts` | 14 | code equals documentation; linearity; monotonicity; the deviations listed in section 5; baseline integrity | agreement with theory or measurement |
| `pinn-threshold-characterization.test.ts` | 5 | how rarely the strain limits are reached | that the limits are appropriate |
| API contract tests | 17 | the server returns the same engine output | anything about physics |

Regression consistency: established. Physical validity: not established by any test.

## 8. Requirements before OpenVINO work

OpenVINO accelerates a trained network exported to its intermediate format. The
repository has nothing of that kind, so acceleration, INT8 quantisation, device
selection and latency benchmarking would have no real subject today. The existing
OpenVINO figures in the UI are SIMULATED and must stay labelled so.

Ordered milestones:

1. **Decide the model form.** Keep the closed-form engine as a documented screening
   tool, or build a real surrogate. This is a product and domain decision.
2. **Reference solution.** Adopt a multilayer linear-elastic reference and define the
   full layer inputs. Compare the current formulas with it over the dataset's range.
3. **Calibration and validation data.** Obtain the minimum data in section 6 with a
   documented split between calibration and held-out sections.
4. **One strain criterion.** Choose and cite a single criterion; use it in the engine,
   the panel, the PDF and the charts.
5. **If a network is wanted:** define architecture, physics residual, data loss and
   training procedure; report error metrics on held-out sections and behaviour outside
   the training range.
6. **Only then:** export the trained model, and measure, on real hardware, the latency
   and accuracy of each precision and device. Replace the simulated telemetry with
   measured values.

Until milestone 3 is met, any statement that the system "predicts" pavement behaviour
should be worded as an illustrative calculation.
