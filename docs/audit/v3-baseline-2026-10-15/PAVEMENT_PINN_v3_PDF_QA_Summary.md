# PDF QA Summary — PAVEMENT-PINN-V3-BASELINE-001 v1.0

Date 2026-10-15. Build command (from the repository root): `node docs/audit/v3-baseline-2026-10-15/_build/build.mjs`. Renderer: Google Chrome headless (`--headless=new`, temporary profile), two passes so that the table of contents carries real page numbers; text extraction with `pdftotext`. Machine-readable result: `_build/qa-result.json`.

## Output

| Item | Value |
|---|---|
| File | `PAVEMENT_PINN_v3_Consolidated_Audit_Baseline.pdf` (≈ 3.1 MB) |
| Editable source | `_build/report-body.md` + the seven registers (Appendices A–G); assembled master `PAVEMENT_PINN_v3_Consolidated_Audit_Baseline.md` (generated — edit the sources) |
| Pages | 67 (45 A4 portrait, 22 A4 landscape for wide registers) |
| Content | Cover, table of contents, list of figures and equations, list of tables, Document Control, Chapters 0–12, Appendices A–J |
| Figures / tables / equations | 5 / 43 / 8 |

## Automated checks (all PASS on the final build)

| Check | Result |
|---|---|
| Page count identical in both passes (67 = 67) | PASS |
| Every TOC heading, figure and table resolved to a page; TOC numbers match the headings in the final PDF | PASS |
| Chapters 0–12 and Appendices A–J present | PASS |
| No raw LaTeX, no placeholder page numbers, no "undefined", no TODO/TBD/lorem | PASS |
| New findings F-32…F-51: 20 unique rows, 1 P0 / 6 P1 / 10 P2 / 3 P3 — matches Chapter 8 | PASS |
| Crosswalk: 31 findings, 22 open / 7 superseded / 1 partial / 1 blocked — matches Chapter 2 | PASS |
| Roadmap: 52 unique tasks; every task ID referenced anywhere is defined | PASS |
| Every finding ID referenced exists (F-01…F-51) | PASS |
| Report numbers equal the evidence log: 303.12/792.67 µε, 273.74/662.99 µε, sign-check 4/54 and 13/54, knapsack 1 000/607 | PASS |
| Only quoted prohibited or explicitly unverified latency figures appear ("<10 ms", "8.4 ms", "~13 ms"); no measured latency is presented | PASS |
| No secret-like strings | PASS |
| Page sizes only A4 portrait/landscape; no blank pages | PASS |
| No horizontal overflow at print width (no clipping, no shrink-to-fit) | PASS |

## Visual review

Checked in the built-in browser on the exact HTML that was printed, and the PDF cover/TOC in the PDF viewer: cover, table of contents, Figures 5.1, 5.2, 6.1, 6.2, 10.1, equation EQ-8 and the landscape findings table. Three defects were found and fixed before the final build: arrow labels overlapping boxes (Figures 5.1/5.2), a clipped bar label (Figure 6.1) and over-long phase titles (Figure 10.1). $N_d$/$N_f$ were converted to rendered math. Individual PDF pages could not be rasterised for side-by-side review (no `pdftoppm` on this machine); pagination is covered by the automated checks above.

## Consistency review of conclusions

- The executive summary, Chapter 2, Chapter 8 and Appendices C and E use the same counts (verified by the build checks).
- No statement in the report claims that the project is v3-compliant, that a surrogate or PINN exists, that the reference ZIP passed tests in this repository, or any measured performance figure.
- Every v3 figure that was not reproduced is labelled [BLOCKED], [TARGET] or "contoh dokumen".

## Repository impact

New folder `docs/audit/v3-baseline-2026-10-15/` only. `npm run lint` (`tsc --noEmit`, which includes this folder's `.mjs` files because `tsconfig.json` has `allowJs` without `include`) exits 0 after the folder was added. No tracked file, existing report, test or configuration was modified.
