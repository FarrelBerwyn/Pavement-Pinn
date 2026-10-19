# PAVEMENT-PINN Audit — QA Summary

Document PAVEMENT-PINN-AUDIT-001 · Version 1.0 · 2026-10-14. This file records how the report was produced and checked, including what was not checked.

## Deliverables in this folder

| File | Role |
|---|---|
| `PAVEMENT_PINN_Forensic_Technical_Audit_Report.pdf` | Principal deliverable. 74 pages A4 (64 portrait, 10 landscape), 9 figures, 40 tables, 16 numbered equations, 61 TOC entries. SHA-256 prefix `15ff9f7a88cc3d9d` |
| `PAVEMENT_PINN_Forensic_Technical_Audit_Report.md` | Generated master source (body + Appendices A–H). Do not edit; edit the sources below |
| `PAVEMENT_PINN_Audit_Findings_Register.md` | Artifact B / Appendix A (31 findings + 8 strengths) |
| `PAVEMENT_PINN_Mathematical_Verification_Register.md` | Artifact C / Appendix B |
| `PAVEMENT_PINN_Test_and_Benchmark_Evidence.md` | Artifact E / Appendix C |
| `PAVEMENT_PINN_Blueprint_Traceability_Matrix.md` | Artifact D / Appendix D (67 requirements) |
| `PAVEMENT_PINN_Audit_QA_Summary.md` | This file |
| `evidence/` | Reference solver, verification and comparison scripts, `evidence-run.log`, `compare-grid.json` |
| `figures/` | Vector figures (generated) |
| `_build/` | `report-body.md` (chapters), `md.mjs` (Markdown + LaTeX-subset → HTML/MathML), `figures.mjs`, `build.mjs`, `overflow-check.mjs`, `inspect-pages.mjs`, `qa-result.json`, `build-output.txt` |

Regenerate everything with `node docs/audit/forensic-2026-10-14/_build/build.mjs` from the repository root (needs Google Chrome and `pdftotext`; no npm dependency was added). Re-run the evidence with `node evidence/verify-mlet.mjs`, `node evidence/verify-layered.mjs`, and `node_modules/.bin/tsx evidence/compare.mjs` / `edge.mjs` from the `evidence` folder.

## Production pipeline

1. Audit evidence collected (code inspection, `npm test`, `npm run lint`, audit scripts). Report content written only after the findings were established.
2. Sources assembled into one Markdown master; figures generated from `evidence/compare-grid.json` and the findings register (charts) or from the statuses established in the text (diagrams).
3. HTML rendered with an in-repo minimal converter; equations converted from LaTeX to MathML Core and rendered by Chrome 155 with Cambria Math.
4. Pass 1 printed with headless Chrome; page of every heading, figure, table and equation located by `pdftotext -enc UTF-8`; pass 2 printed with real page numbers in the TOC and lists.
5. Automated QA (below); visual inspection of representative pages; defects fixed in the sources or stylesheet and the PDF regenerated.

## Automated checks (final build: 45 pass, 0 fail — `_build/build-output.txt`)

- Page count stable between passes (74 = 74); every TOC entry resolved; every TOC page number re-verified against the final PDF text (0 mismatches).
- All 14 chapters, Appendices A–H, Executive Summary and Document Control present in the PDF text.
- No unconverted LaTeX command, no leftover "··" placeholder, no "undefined", no TODO/TBD/lorem text.
- Findings counts in the register summary equal 5 / 15 / 8 / 3 (P0–P3), matching the report text and Figure 12.1.
- Key numbers quoted in the report match `evidence/evidence-run.log` (medians 0.047/0.067/0.019/0.025; blueprint-point strains; threshold-exceedance counts; solver PASS lines).
- No secret-like strings (Google/GitHub/OpenAI key patterns) in the Markdown or HTML.
- Only A4 portrait (595×842 pt) and A4 landscape (842×595 pt) pages.
- No blank pages (fewer than 40 characters beyond running header/footer).
- No horizontal overflow under print emulation at the printable widths (176 mm portrait, 267 mm landscape): guarantees no clipped equation and no document-wide shrink-to-fit.

## Defects found by QA and corrected before issue

| Defect | Detected by | Correction |
|---|---|---|
| Blank page after the landscape roadmap tables | blank-page check | empty page-break element no longer rendered |
| Severity parser counted detail rows twice (P2 = 16, P3 = 6), also corrupting Figure 12.1 | count check | parser restricted to the summary table |
| Traceability totals initially written by estimate (71 rows) | manual recount | totals replaced by counted values (67 rows) |
| Statement that the engine/reference ratio is highest for thick, stiff asphalt | data check of `compare-grid.json` | corrected: highest for thin (5 cm), 1200 MPa asphalt on the three-layer structure |
| Long equation EQ-10 clipped (first build) and, once unclipped, forcing Chrome to shrink the whole document (74 → 61 pages) | page-count change, then overflow check | explicit line breaks for EQ-9, EQ-10, EQ-12; overflow check added to the build |
| Inline formula in Table B.6 overflowing its cell | overflow check | rewritten as wrapping text |
| Scrollbar artefacts beside display equations | visual inspection (page 19) | `overflow: visible` on equation bodies |
| Identifiers wrapping in narrow first columns (R-P0-01 → "R-P0-/01") | visual inspection (page 35) | identifier cells set to no-wrap |
| Figure overlaps: B.1 axis title over tick labels and limit labels over bars; 3.1 conclusion line crowding the last row; 4.1 median label clipped at the right edge; 13.1 footnote over boxes | visual inspection of the SVGs | layout corrected in `figures.mjs` |
| Line references cited from memory (`assessment.ts`, several ranges) | re-check with `grep -n` | corrected to the actual lines |

## Visual inspection performed

Inspected in the built-in browser's PDF viewer:

- **Earlier build:** the cover, the first table-of-contents page, page 13 (Figure 1.1), page 19 (Chapter 4: equations and a status table) and page 35 (landscape Table 13.1). The left portion of the landscape page was confirmed; the right portion was confirmed by text extraction.
- **Final build:** page 25 (Chapter 7, EQ-10), page 55 (Appendix B, EQ-6 to EQ-13) and page 65 (landscape traceability matrix). Excerpts were printed with the same engine through DevTools `printToPDF` page ranges; their extracted text was identical to the corresponding final pages.
- **Figures:** all nine figures were inspected as SVG in their final form.

Not visually inspected page by page:

- the executive summary, Chapters 2, 3, 5, 6 and 8–14 (apart from the pages above), and most appendix pages.
- These were checked by text extraction and the automated checks only.
- The final cover and TOC were not re-viewed after the last layout fixes. Their content is generated identically, and the TOC numbers are machine-verified.

## Known limitations of the document

1. The blueprint PDF could only be read through its text layer (no page rasteriser on the machine; the viewer would not render the file from outside the project folder). Its typography and page design could therefore not be compared visually. The report follows its structure (BAB numbering, tables, terminology) and a restrained navy/cyan engineering style chosen by the audit.
2. Page numbers are physical page numbers (cover = page 1, no number printed on the cover).
3. Fonts are Windows system fonts (Cambria, Cambria Math, Segoe UI, Consolas) embedded by Chrome; rebuilding on another OS will change pagination.
4. The PDF has no bookmarks/outline (Chrome headless does not emit them from the CLI); navigation is by the TOC.
5. The reference solver is an audit implementation (verified against closed forms only); see Appendix B.8.
6. The audit is a snapshot of a working tree that another session was actively changing (demo authentication). Findings about those files are limited to observation.
