# Appendix B — Mathematical Verification Register (Artifact C)

Document PAVEMENT-PINN-AUDIT-001 · Version 1.0 · Commit `4a9b4fc`. Equation provenance codes: **BP** = specified in the master blueprint, **SRC** = found in source code, **AUD** = independently derived or implemented during this audit, **NUM** = numerically verified, **UNV** = validity unverified.

## B.1 Equation inventory

Table B.1 — Equation inventory and verification status

| Eq. | Relationship | Provenance | Location | Units | Verification method | Result |
|---|---|---|---|---|---|---|
| EQ-1 | PINN total loss (four weighted terms) | BP | Blueprint BAB 5.1 | dimensionless | Search for loss, optimiser, autodiff | [NOT IMPLEMENTED] |
| EQ-2 | Equilibrium $\nabla\cdot\boldsymbol{\sigma}+\mathbf{b}=0$ | BP; AUD | Blueprint BAB 5.1; satisfied by construction in `evidence/mlet.mjs` | MPa/m | Code search (engine); reference solver checks | Engine: [NOT IMPLEMENTED]; reference: [VERIFIED] |
| EQ-3 | Constitutive $\boldsymbol{\sigma}=\mathsf{C}:\boldsymbol{\varepsilon}$ (isotropic) | BP; AUD | Blueprint BAB 5.1; `mlet.mjs` strain recovery | MPa | Reference kernel consistency (B.4) | Engine: [NOT IMPLEMENTED]; reference: [VERIFIED] |
| EQ-4 | Engine tensile strain $\varepsilon_t$ | SRC | `pinnEngine.ts:58-62` | µε (integer); P in t, h in cm, E in MPa | Re-derivation; existing test; reference comparison | Arithmetic [VERIFIED]; physics [FAILED] |
| EQ-5 | Engine compressive strain $\varepsilon_v$ | SRC | `pinnEngine.ts:65-69` | µε | as EQ-4 | Arithmetic [VERIFIED]; physics [FAILED] |
| EQ-6 | Engine surface deflection $w_0$ and basin | SRC | `pinnEngine.ts:72-88` | µm | Similarity test; basin shape | Arithmetic [VERIFIED]; physics [FAILED] |
| EQ-7 | Moisture decay and $E_s=10\,\mathrm{CBR}$ | SRC | `pinnEngine.ts:37-43` | –, %, MPa | Source search | [UNVERIFIED] assumption |
| EQ-8 | Asphalt temperature softening | SRC | `pinnEngine.ts:46-50` | °C, MPa | Source search | [UNVERIFIED] assumption |
| EQ-9 | Load factor $(P/10)^4$ vs LEF $(P/8.16)^4$ | SRC | `pinnEngine.ts:54`; `esal.ts:12,30-35` | – | Arithmetic; cross-module comparison | Arithmetic [VERIFIED]; consistency [FAILED] |
| EQ-10 | PCI drop, predicted PCI, remaining life, pothole horizon | SRC | `pinnEngine.ts:92-112` | index, years, days | Edge cases; structural sensitivity | [FAILED] (decoupled, non-finite at P=0) |
| EQ-11 | Overlay thickness | SRC | `pinnEngine.ts:115-118` | cm | Structural sensitivity | [UNVERIFIED] heuristic |
| EQ-12 | Love strain function relations (axisymmetric) | AUD | `evidence/mlet.mjs` | – | Boussinesq limit, kernel consistency | [VERIFIED] (NUM) |
| EQ-13 | Boussinesq on-axis closed form | AUD (textbook) | `evidence/mlet.mjs` `boussinesq()` | MPa, m | Agreement with solver ≤ 1e-12 relative | [VERIFIED] (NUM) |
| EQ-14 | Elastic similarity $\varepsilon(kE)=\varepsilon(E)/k$ | AUD | B.4 | – | Reference: exact; engine: exponents | Reference [VERIFIED]; engine [FAILED] |
| EQ-15 | Engine similarity exponents | AUD | derived from EQ-4..6 | – | Analytical | [VERIFIED] (−0.4, −0.75, −0.6) |
| EQ-16 | Transfer-function form $N_f = k_1\varepsilon_t^{-k_2}E^{-k_3}$ | AUD (form only) | not in code | repetitions | Search for traffic-dependent criterion | [NOT IMPLEMENTED] |

## B.2 Equations specified in the blueprint (BLUEPRINT REFERENCE)

```math EQ-1 | Blueprint BAB 5.1 total loss. Not present in source code.
\mathcal{L}_{\mathrm{total}} = \lambda_d \mathcal{L}_{\mathrm{data}} + \lambda_p \mathcal{L}_{\mathrm{physics}} + \lambda_{bc} \mathcal{L}_{bc} + \lambda_{ic} \mathcal{L}_{ic}
```

```math EQ-2 | Mechanical equilibrium (quasi-static). Not evaluated by the engine.
\nabla \cdot \boldsymbol{\sigma} + \mathbf{b} = 0
```

```math EQ-3 | Linear elastic constitutive law. Not evaluated by the engine.
\boldsymbol{\sigma} = \mathsf{C} : \boldsymbol{\varepsilon}, \quad \boldsymbol{\varepsilon} = \frac{1}{2}\left(\nabla \mathbf{u} + \nabla \mathbf{u}^{T}\right)
```

The blueprint also names an initial-condition loss for "transient rain infiltration". The engine is quasi-static and time-independent, so no initial condition exists to enforce; a transient moisture model would need its own governing equation (e.g. Richards' equation or a consolidation model), which the blueprint does not specify.

## B.3 Equations found in source code (AS-IMPLEMENTED)

Inputs: axle load $P$ (t), asphalt thickness $h$ (cm), asphalt modulus $E_1$ (MPa), subgrade CBR (%), rain intensity $R$ (mm/h), flood duration $t_f$ (h), surface temperature $T$ (°C), current PCI of the segment.

```math EQ-7 | Moisture decay of CBR and subgrade modulus (pinnEngine.ts:37-43).
f_w = \max\left(0.4, 1 - 0.004 R - 0.015 t_f\right), \quad E_s = 10 \cdot \mathrm{CBR} \cdot f_w
```

```math EQ-8 | Temperature softening of asphalt modulus (pinnEngine.ts:46-50).
E_1' = E_1 \cdot \max\left(0.5, 1 - 0.012 (T - 25)\right)
```

```math EQ-4 | Tensile strain at the bottom of the asphalt, microstrain, rounded (pinnEngine.ts:58-62).
\varepsilon_t = \mathrm{round}\left(\frac{120 P}{h^{1.75} (E_1'/2000)^{0.4}}\right)
```

```math EQ-5 | Vertical compressive strain at the top of the subgrade, microstrain (pinnEngine.ts:65-69).
\varepsilon_v = \mathrm{round}\left(\frac{210 P}{(h + 15)^{1.4} (E_s/40)^{0.75}}\right)
```

```math EQ-6 | Surface deflection (µm) and fixed exponential basin, r in mm (pinnEngine.ts:72-88).
w_0 = \mathrm{round}\left(\frac{45 P}{(E_s/40)^{0.6} (h/10)^{0.5}}\right), \quad w(r) = w_0 e^{-0.0018 r}
```

```math EQ-9 | Engine load factor vs ESAL load equivalency factor (pinnEngine.ts:54; esal.ts:30-35).
LF = \left(\frac{P}{10}\right)^{4}, \quad LEF = \left(\frac{P}{8.16}\right)^{4} \\ \frac{LEF}{LF} = \left(\frac{10}{8.16}\right)^{4} = 2.255
```

```math EQ-10 | Deterioration rules (pinnEngine.ts:92-112).
\Delta_{PCI} = \min\left(35, \frac{2.5 LF}{f_w}\right), \quad PCI' = \max(10, PCI_0 - 0.8\Delta_{PCI}) \\ RUL = \max\left(0.3, \frac{PCI'}{1.2\Delta_{PCI}}\right), \quad H_{pothole} = \max\left(3, \frac{1800 f_w}{LF}\right)
```

```math EQ-11 | Overlay recommendation (pinnEngine.ts:115-118), applied when PCI' < 70.
h_{ov} = \max\left(4, 0.22 (75 - PCI')\right)
```

No equation in EQ-10 or EQ-11 contains $\varepsilon_t$, $\varepsilon_v$, $h$, $E_1$ or CBR: the structural response does not influence life, horizon or overlay (verified numerically, B.6).

## B.4 Independent reference solution (AUD, NUM)

**Formulation.** Axisymmetric multilayer linear elasticity with fully bonded interfaces, uniform circular pressure $q$ of radius $a$, half-space bottom layer, solved in the Hankel domain with Love's strain function $\phi(r,z)=J_0(mr)f(z)$, $f=(A+Bz)e^{mz}+(C+Dz)e^{-mz}$ in local per-layer coordinates. The relations used (Timoshenko & Goodier, Love strain function) are:

```math EQ-12 | Love strain-function relations used by the reference solver (tension positive, z downward).
2G u_z = 2(1-\nu)\nabla^2\phi - \frac{\partial^2 \phi}{\partial z^2} \\ \sigma_z = \frac{\partial}{\partial z}\left[(2-\nu)\nabla^2\phi - \frac{\partial^2 \phi}{\partial z^2}\right] \\ \tau_{rz} = \frac{\partial}{\partial r}\left[(1-\nu)\nabla^2\phi - \frac{\partial^2 \phi}{\partial z^2}\right]
```

Boundary conditions: $\sigma_z(r,0)=-q$ for $r\le a$ (Hankel amplitude $-qaJ_1(ma)$), $\tau_{rz}(r,0)=0$; continuity of $u_z, u_r, \sigma_z, \tau_{rz}$ at each interface; decay at depth. Strains are recovered from stresses by Hooke's law (EQ-3) and, independently, from the displacement kernel; both must agree.

```math EQ-13 | Boussinesq on-axis closed form (flexible circular load) used as the analytical limit.
\sigma_z = -q\left[1 - \frac{z^3}{(a^2+z^2)^{3/2}}\right], \quad w_0 = \frac{2(1-\nu^2) q a}{E}
```

```math EQ-14 | Elastic similarity: a necessary property of every linear-elastic layered solution.
\varepsilon(k E_1, k E_2, \ldots) = \frac{1}{k}\varepsilon(E_1, E_2, \ldots)
```

```math EQ-15 | Engine exponents under the same scaling (derived from EQ-4 to EQ-6).
\varepsilon_t \propto k^{-0.4}, \quad \varepsilon_v \propto k^{-0.75}, \quad w_0 \propto k^{-0.6}
```

Table B.2 — Verification of the reference solver

| Check | Expected | Result | Status |
|---|---|---|---|
| Bessel $J_0, J_1$ at tabulated points (x = 1, 10, first zero of $J_0$) | abs. error ≤ 1e-8 | met | [VERIFIED] |
| Homogeneous 3-layer system vs Boussinesq: $\sigma_z, \sigma_r, \varepsilon_z, \varepsilon_r, w$ at 6 depths on both sides of each interface | rel. error ≤ 2e-3 | max ≈ 2e-12 | [VERIFIED] |
| Surface deflection vs $2(1-\nu^2)qa/E$ | rel. error ≤ 5e-3 | 1.0e-5 | [VERIFIED] |
| Similarity: all moduli × 3 | strain ratio 3 | 3.0000000 | [VERIFIED] |
| Layered system (3000/250/50 MPa): strain from displacement kernel = strain from stress kernel | rel. ≤ 1e-6 | ≤ 2e-14 | [VERIFIED] |
| Continuity of $\sigma_z$, $w$, $\varepsilon_r$ across interfaces | equal | equal to 1e-9 | [VERIFIED] |
| Burmister two-layer interface stress $\sigma_z/q$, $h_1/a=1$, $\nu=0.5$: chart values ≈ 0.646 / 0.29 / 0.08 for $E_1/E_2$ = 1 / 10 / 100 | chart reading | 0.646 / 0.291 / 0.081 | [VERIFIED] (chart-reading accuracy) |
| Comparison with a certified program (KENLAYER, WESLEA, PyMastic, BISAR) | — | not available on the audit machine | [BLOCKED] |

Table B.3 — Engine vs reference over the in-range grid (144 points; P 10-25 t, h 5-25 cm, E₁ 1200-3500 MPa, CBR 3-10; dry, 25 °C; dual-tyre single axle as four isolated tyres at 0.55 MPa; ν = 0.35 asphalt and base, 0.45 subgrade; $E_s = 10\,$CBR as in the engine)

| Ratio engine / reference | min | p25 | median | p75 | max |
|---|---|---|---|---|---|
| εt, two-layer (asphalt on subgrade) | 0.020 | 0.036 | 0.047 | 0.073 | 0.323 |
| εt, three-layer (+15 cm base, 200 MPa) | 0.029 | 0.047 | 0.067 | 0.137 | 0.786 |
| εv, two-layer | 0.007 | 0.013 | 0.019 | 0.026 | 0.062 |
| εv, three-layer | 0.013 | 0.020 | 0.025 | 0.033 | 0.063 |

Table B.4 — Blueprint default segment (BAB 8.2: AC-WC 10 cm, E 2500 MPa, CBR 6), dry, 25 °C

| Axle | Loading assumption | Engine εt / εv (µε) | Reference 2-layer εt / εv | Reference 3-layer εt / εv |
|---|---|---|---|---|
| 8.16 t | 4 tyres, 0.55 MPa (a = 10.8 cm) | 16 / 14 | 387 / 1029 | 274 / 663 |
| 10 t | 4 tyres, 0.55 MPa (a = 11.9 cm) | 20 / 17 | 435 / 1174 | 303 / 793 |
| 10 t | 2 tyres, 0.70 MPa (a = 14.9 cm) | 20 / 17 | 703 / 1968 | 472 / 1475 |
| 22.5 t | 4 tyres, 0.55 MPa (a = 17.9 cm) | 44 / 38 | 652 / 1889 | 424 / 1536 |
| 22.5 t | 4 tyres, 0.70 MPa (a = 15.8 cm) | 44 / 38 | 744 / 2106 | 494 / 1622 |

Table B.5 — Local log-sensitivities $\partial\ln\varepsilon/\partial\ln x$ at the blueprint point (reference two-layer vs engine formula)

| Variable | εt reference | εt engine | εv reference | εv engine |
|---|---|---|---|---|
| Axle load P (constant contact pressure) | 0.56 | 1.00 | 0.64 | 1.00 |
| Asphalt thickness h | −1.12 | −1.75 | −1.27 | −0.56 |
| Asphalt modulus E₁ | −0.68 | −0.40 | −0.63 | 0.00 |
| Subgrade CBR | −0.32 | 0.00 | −0.37 | −0.75 |

![Figure B.1 — Engine vs reference strains for the blueprint default segment (log scale). AS-IMPLEMENTED evidence; reference assumptions as in Table B.4.](figures/fig-b1-blueprint-point.svg)

**Interpretation.** The engine/reference gap is far larger than any plausible variation of the reference assumptions. Halving the reference wheel load changes its strains by a factor of about $2^{0.6}\approx1.5$; the gap is typically a factor of about 14 to 77 (the inter-quartile ranges of Table B.3, inverted) and up to about 140; it narrows only for εt in thin (5 cm), low-modulus (1200 MPa) asphalt on the three-layer structure, where the 200 MPa base limits the reference tensile strain (maximum ratio 0.79 at 25 t; εv ratio at the same point 0.02). Dual-wheel interaction would increase the reference εv further (superposition), widening the gap. The conclusion "engine strains are one to two orders of magnitude below linear-elastic layered theory" is therefore robust to the loading and Poisson-ratio assumptions. It does **not** establish what the true field strains are; that requires measured or certified-model data (B.8).

## B.5 Strain threshold and failure-criterion register

Table B.6 — Threshold register (no value changed during the audit)

| Parameter | Source location | Value | Physical meaning claimed | Source/standard cited | Verification status | Risk |
|---|---|---|---|---|---|---|
| εt "WASPADA" | `pinnEngine.ts:130` | 180 µε | approaching fatigue threshold | none | [UNVERIFIED] | Medium |
| εt "permitted limit" | `pinnEngine.ts:129` (text), `FieldEngineerTools.tsx:198`, `FieldEngineerDashboard.tsx`, `SimulationPanel.tsx:563-571`, `pdfGenerator.ts:111` | 200 µε | fatigue limit, labelled "AASHTO" (variable, legend) and "Bina Marga" (legend, engine text) | none (two different bodies named) | [UNVERIFIED] | High |
| εt "KRITIS" trigger | `pinnEngine.ts:128` | 250 µε | exceeds permitted limit (text says 200) | none | [FAILED] internal consistency | High |
| εv "permitted limit" | `FieldEngineerTools.tsx:203`, `FieldEngineerDashboard.tsx` | 350 µε | rutting limit | none | [UNVERIFIED]; unreachable by engine (max 98 µε on grid) | High |
| Placeholder εt / εv | `FieldEngineerTools.tsx:207-208` | 245 / 380 µε | shown when no result | n/a | [FAILED] (fabricated display values) | Medium |
| "+22.5 %" exceedance | `FieldEngineerTools.tsx:397` | constant | fatigue status | n/a | [FAILED] (hard-coded) | High |
| Alert RED/YELLOW | `pinnEngine.ts:136-140` | P > 18 / 14 t, R > 50 / 25 mm/h, PCI' < 40 / 60 | operational alert | none | [UNVERIFIED] | Medium |
| Dynamic tonnage limit | `pinnEngine.ts:143-148` | 18 − 0.08 R − 0.2 t_f tonnes, floor 10 t | weather-adjusted legal load | none | [UNVERIFIED] | High (enforcement wording) |
| Screening confidence | `stateMachine.ts` (`SCREENING_CONFIDENCE_THRESHOLD`) | constant | CV auto-pass | design choice | n/a until a REAL model exists | Low |

Distinctions the code does not make: (1) elastic strain under one load versus accumulated permanent deformation; (2) fatigue life versus rutting life — no repetitions-to-failure is computed; (3) structural failure versus visible pothole formation — "pothole horizon" is a load/rain rule (EQ-10), not a failure criterion. Required to close: the governing document and clause for each limit (the team should state whether Bina Marga MDP 2017 or AASHTO is adopted), the design traffic (ESAL) to which a fixed limit corresponds, or replacement by transfer functions of the EQ-16 form calibrated or adopted from that document.

```math EQ-16 | General form of mechanistic-empirical transfer functions (form only; coefficients must come from the adopted standard).
N_f = k_1 \varepsilon_t^{-k_2} E_1^{-k_3}, \quad N_d = k_4 \varepsilon_v^{-k_5}
```

## B.6 Boundary and edge-case results (engine function, dry 25 °C baseline: 10 t, 10 cm, 2500 MPa, CBR 6, PCI 80)

Table B.7 — Edge cases (`evidence/edge.mjs`; non-finite values appear as `null` after JSON serialisation)

| Case | εt / εv / w₀ | PCI' / RUL (yr) / horizon (d) | Other | Classification |
|---|---|---|---|---|
| Baseline 10 t | 20 / 17 / 353 | 78 / 26 / 1800 | GREEN | reference |
| Zero load | 0 / 0 / 0 | 80 / ∞ / ∞ | Zero-ODOL impact −∞ | [FAILED] non-finite |
| Negative load (−5 t) | −10 / −9 / −176 | 80 / 333.3 / 28 800 | Zero-ODOL −1500 % | [FAILED] accepted |
| 8 t (below reference) | 16 / 14 / 282 | 79 / 65.8 / 4395 | Zero-ODOL −144 % | [FAILED] negative percentage |
| 100 t | 195 / 171 / 3528 | 52 / 1.2 / 3 | RED | outside documented range; accepted |
| Thickness 0 | ∞ / 35 / ∞ | unchanged | — | [FAILED] |
| CBR 0 or negative | 20 / ∞ / ∞ | unchanged | — | [FAILED] |
| Modulus 0 | ∞ / 17 / 353 | unchanged | — | [FAILED] |
| Rain 1000 mm/h | 20 / 34 / 611 | 75 / 9.9 / 720 | RED | floor 0.4 masks input error |
| Temperature −40 °C / 200 °C | 15 / 17 / 353 · 26 / 17 / 353 | unchanged | — | linear softening unbounded below 25 °C |
| `NaN` load | NaN throughout | NaN | GREEN alert | [FAILED] silent |
| Missing thickness | NaN | unchanged | — | [FAILED] silent |
| String "12" | coerced to 12 | — | — | [FAILED] type coercion |
| 18 t with h 5 vs 25 cm, CBR 3 vs 10, E 1200 vs 3500, T 60 °C | — | 59 / 1.9 / 171 in every case | overlay 8.1 cm for h 5 and 25 (PCI 40 segment) | [FAILED] structure has no effect |
| Same input twice | identical strains | identical | latency 34.1 vs 34.2 ms; physics loss 0.00185 vs 0.00227 | [FAILED] non-deterministic telemetry |

## B.7 Dimensional and unit traceability

Table B.8 — Units through input, calculation, storage, API and display

| Quantity | Input | Calculation | Storage (migration) | API | Display | Finding |
|---|---|---|---|---|---|---|
| Axle load | t (slider 10-25) | used as t in fitted power laws | `input_snapshot` jsonb | t | "Ton" | Force unit implicit; not converted to kN; no wheel load |
| Contact stress | — | $0.65P/10$ MPa | jsonb | MPa | MPa | Proportional to load (non-physical for tyre contact) |
| Elastic modulus | MPa | ratio $E/2000$ | `modulus_min/max_mpa` | MPa | MPa | consistent unit; exponent non-physical |
| Thickness | cm | $h^{1.75}$, $(h+15)^{1.4}$ (cm) | `surface_thickness_cm` | cm | cm | hidden 15 cm term (base?) undocumented |
| Strain | — | µε, rounded to integer | `outputs` jsonb | µε | µε | rounding loses resolution below 1 µε (immaterial at present scale) |
| Deflection | — | µm | jsonb | µm | µm / basin mm | basin shape fixed |
| Rainfall | mm/h | linear decay factor | weather observation | mm/h | mm/jam | intensity used as moisture state |
| CBR | % | $E_s=10\,$CBR MPa | `subgrade_cbr_min/max` | % | % | correlation source not cited; validity typically limited to low CBR |
| Pore-water pressure | — | absent | absent | absent | particle animation in blueprint only | [NOT IMPLEMENTED] |
| Time | — | years, days | jsonb | years/days | "Hari", "Thn" | three inconsistent time-to-failure definitions |
| PCI | index 0-100 | heuristic projection | `outputs` jsonb | index | index | PCI definition (distress survey) not respected |
| Latency | — | constant + random | — | ms | ms | not a measurement |

## B.8 Limitations of the mathematical verification

1. The reference solver is an audit implementation verified against closed forms and chart readings, not a certified program. A cross-check against KENLAYER, WESLEA, BISAR or PyMastic is recommended before it is used as a design tool (R-P3-01).
2. Loading assumptions (tyre count, 0.55-0.70 MPa, isolated tyres) and Poisson ratios are stated assumptions; the conclusion is robust to them (B.4) but the reference values are not field predictions.
3. $E_s = 10\,$CBR was retained only to compare like with like; it is itself an unverified correlation (EQ-7).
4. No empirical validation (FWD basins, strain gauges, longitudinal PCI) was possible: no such data exists in the repository. Empirical accuracy of both engine and reference remains [NOT VERIFIED].
