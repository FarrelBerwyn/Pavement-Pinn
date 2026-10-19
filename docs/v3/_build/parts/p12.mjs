import { T, P, UL, note, H1, H2, H3, esc, md } from './h.mjs';

const Q = (n, q, who, a, src) => `<div class="qa"><div class="q">Q${n}. ${esc(q)} <span class="who">(${who})</span></div><div class="a">${md(a)}</div>${src ? `<div class="src">${md(src)}</div>` : ''}</div>`;

export const sec12 = `
${H1('s12', '12 Bank Tanya Jawab (bahasa Inggris, siap diucapkan)')}
${P('Jawaban 20–40 detik. Isi [ ] dengan angka terukur; bila belum ada, pakai kalimat pengaman di Bagian 13. Prinsip Interview Tips Deck: dengarkan sampai selesai, jawab jelas dan ringkas, biarkan juri menggali, bagi jawaban antar anggota. Kode: siapa yang menjawab utama. Kolom kecil di bawah jawaban: bukti yang harus siap dibuka.')}
${H2('s12-1', '12.1 Masalah dan dampak')}
${Q(1, 'Why is this an AI problem and not just a better complaint app?', 'A', 'A complaint app collects photos; it cannot tell whether a photo is usable, what the damage is, how structurally urgent it is under wet conditions and real truck loads, or which repairs to fund first. We use AI for three things rules cannot do: understanding uncontrolled citizen photos, running thousands of physics simulations for uncertainty on a field laptop, and communicating results to different roles. The physics itself is a verified solver, not AI.', 'Slide 6')}
${Q(2, 'How do you know your system reduces deaths?', 'A', 'We do not claim that from a pilot. We measure leading indicators: time from report to triage, share of high-hazard points handled within SLA, and agreement with engineers\' priorities. Fewer casualties is the long-term goal under SDG 3.6 and would need multi-year crash data with a partner agency.', 'KPI 7.2')}
${Q(3, 'Who exactly will use it, and have you talked to them?', 'A/C', 'Citizens and rider communities report; maintenance operators triage; field engineers assess and recommend; planners allocate budgets. We interviewed [N] engineers/officers for our baseline and [N] citizens in usability tests. Partnership status: [in discussion / letter].', 'evidence/10_users')}
${Q(4, 'Is this only relevant to Indonesia?', 'A', 'No. 92% of road deaths occur in low- and middle-income countries, and even the UK reports a record local road repair backlog. Our detector starts from a six-country dataset, the physics uses internationally standard layered-elastic theory with selectable national criteria, and corridors and languages are configuration, not code.', 'Lampiran A [1][5][9]')}
${Q(5, 'What does it cost, and who pays?', 'A', 'Citizens use their own phones. For one district with 500 km, our estimate is about Rp58 million per year, roughly Rp116 thousand per km, with assumptions listed; we are replacing them with real quotes. The paying user is the road agency; an open-source core keeps cost from blocking adoption.', '7.6')}
${Q(6, 'Why Jalan Raya Narogong?', 'C', 'It is an industrial arterial with heavy trucks and flooding drainage, and it combines the two drivers of rapid failure: overloading and water. We added a second corridor in Karawang to show the system scales by configuration only.', 'config/corridors')}
${Q(7, 'Why now?', 'A', 'The global target to halve road deaths ends in 2030. Indonesia\'s Zero ODOL policy is scheduled to take effect on 1 January 2027 after trials this year, and agencies need evidence on which segments overloading damages most. And every rainy season turns hidden potholes into crashes.', '2.4, [13]')}
${H2('s12-2', '12.2 AI, fisika, dan model')}
${Q(8, 'Is it really a PINN?', 'B', 'It is a physics-informed neural surrogate, not a PINN that solves the PDE from collocation residuals. Physics enters in two ways: dimensionless inputs and outputs make elastic similarity and load scaling hold exactly, and an autograd penalty enforces physically required monotonic trends at unlabelled collocation points. The reference is a layered-elastic solver, and we fall back to it outside the training domain.', 'D-02, 4.4')}
${Q(9, 'Layered-elastic solvers are already fast. Why a neural network?', 'B', 'For one scenario, yes. But honest decisions need uncertainty: thickness, modulus and subgrade strength are uncertain. 2,000 Monte Carlo samples times conditions times repair options times hundreds of segments is millions of runs. The surrogate makes that interactive on a laptop: [measured: X seconds per segment versus Y with the solver], and we measured where it stops being trustworthy.', 'evidence/04, 08')}
${Q(10, 'How accurate is the surrogate?', 'B', 'On a held-out random split: εt MAPE [X]%, εv [Y]%, 95th-percentile error [Z]%. Out of distribution it degrades to [..]%, which is why we cross-check against the solver and refuse inputs outside the domain. A plain MLP is similar in range but violates elastic similarity and can output negative strains; ours cannot by construction.', 'models/pi_surrogate_metrics.json')}
${Q(11, 'How did you verify the physics solver?', 'B', 'We use PyMastic, an open-source Apache-2.0 solver whose authors compare it with KENPAVE and WESLEA. For the default segment at a 10-tonne axle it gives [measured: 303 and 793] microstrain, matching an independent solver from our audit. We also test elastic similarity: multiplying all moduli by three divides strains by exactly three.', 'evidence/03')}
${Q(12, 'Your life prediction depends on the failure criterion. Which one and why?', 'B', 'We use [Asphalt Institute / Austroads as referenced in Indonesia\'s MDP 2017], cited in the app. Criteria can differ by two orders of magnitude for the same strain, so we show the criterion, present a P10–P90 band, and use the index mainly to compare segments and options, not to predict a failure date.', '4.4 D3')}
${Q(13, 'How does rain enter the model?', 'B', 'Through subgrade strength: we evaluate dry and wet states using a soaked-to-unsoaked CBR factor that engineers can edit or replace with lab results. We do not model pore-water pressure; that needs a poroelastic model and is on our roadmap.', '4.4')}
${Q(14, 'How do you estimate truck loads without weigh-in-motion?', 'C', 'From classified traffic counts on the corridor multiplied by vehicle damage factors from the national pavement design manual, for normal and actual loads. The actual-to-normal ratio shows the overloading effect. We dropped an earlier idea of inferring loads from traffic speed because it cannot be validated.', 'evidence/09_field')}
${Q(15, 'Why YOLO and how good is it?', 'B', 'It detects small objects well, exports natively to OpenVINO and runs on a laptop CPU. Trained on RDD2022 plus [N] local photos: mAP@0.5 [X] overall, potholes [Y]. Night and deep puddles are weaker, so low-confidence cases go to human review.', 'evidence/05_yolo')}
${Q(16, 'Can severity be judged from one photo?', 'B', 'Only approximately. We use transparent rules on relative size with on-screen guidance for camera distance, calibrated against two annotators [κ = X]. The engineer confirms severity, and corrections become training labels.', '4.3')}
${Q(17, 'How do you stop fake or spam reports?', 'C', 'Layered checks: live camera capture, blur and brightness, geofence and GPS accuracy, perceptual-hash duplicates and rate limits. Measured false-accept [X]% and false-reject [Y]%. Uncertain cases go to a human; nothing is silently discarded.', 'evidence/06')}
${Q(18, 'How is the risk score built? Why not learn the weights?', 'A', 'It combines hazard to road users, structural urgency, strength of evidence and an equity correction, with weights set by policy and shown per row. There is no ground truth for "correct priority", and public decisions must be explainable. We validate it against engineers\' blind rankings: Spearman ρ = [X].', '4.6')}
${Q(19, 'How does the SLM avoid hallucinating numbers?', 'B', 'It never sees free text and never computes. It writes sentences with placeholders, code inserts the numbers, and a checker rejects any extra number or banned word such as "safe". If it fails twice we use a fixed template. Pass rate on 50 test cases: [X]%.', 'evidence/07_slm')}
${H2('s12-3', '12.3 Data')}
${Q(20, 'Where does your data come from?', 'C', 'Images: RDD2022 and [N] local photos taken with consent, split by location to avoid leakage. Physics: synthetic solver outputs, labelled synthetic. Traffic: our own classified counts. Segment structure: [as-built records / default values clearly labelled]. No field deflection data yet; that is our first validation goal.', 'Data card')}
${Q(21, 'Do you use face data? How do you delete sensitive data?', 'C', 'We do not use faces for anything; we detect them only to blur them. EXIF is removed, faces and plates are blurred before storage, raw images are deleted within seven days by a logged job, and citizens can request deletion with their tracking code. This follows Indonesia\'s Personal Data Protection Law No. 27/2022.', '6.2')}
${Q(22, 'Isn\'t validating a surrogate on its own generator circular?', 'B', 'Yes, it only proves the surrogate imitates the solver. So we separate claims: numerical verification against two solvers, physical sanity tests, and agreement with engineers\' rankings. True field validation needs FWD data from a road agency, which we are requesting.', '—')}
${Q(23, 'What about bias?', 'C', 'Two kinds: busy areas report more, and models see some conditions less — and RDD2022 is not Indonesian. We add an equity correction and recommend active surveys where reports are sparse, and we report detection accuracy per condition with at least 30% hard-condition local data.', '6.1')}
${H2('s12-4', '12.4 Teknologi Intel')}
${Q(24, 'Why Intel and OpenVINO rather than TensorRT or plain ONNX Runtime?', 'B', 'Government and campus laptops rarely have discrete NVIDIA GPUs. OpenVINO runs the same model on CPU, integrated GPU and NPU, NNCF quantizes with accuracy control, and OpenVINO GenAI runs the language model locally on the NPU. We only claim speed-ups we measured: PyTorch CPU [X] ms versus OpenVINO INT8 [Y] ms on this laptop.', 'evidence/08')}
${Q(25, 'Is the NPU actually necessary?', 'B', 'For the language model in the field, yes: it runs offline at [X] tokens per second while leaving CPU and GPU free for detection and simulation. We also provide a CPU-only mode for laptops without an NPU, measured at [Y].', 'evidence/07, 08')}
${Q(26, 'Where in the lifecycle did you use Intel?', 'B', 'Data generation on Intel CPUs, analysis with Intel Extension for Scikit-learn, training with [PyTorch on Intel GPU / Intel cloud / disclose if not], quantization with NNCF and Optimum Intel, evaluation with benchmark_app, deployment with OpenVINO Runtime and OpenVINO GenAI on Core Ultra and a Xeon server.', '5.1')}
${Q(27, 'Did INT8 hurt accuracy?', 'B', 'YOLO: mAP went from [X] to [Y]. Surrogate: maximum deviation [Z]%; [if large: we keep FP16 because strain errors are amplified by steep fatigue laws].', 'evidence/05, 04')}
${Q(28, 'Your earlier materials showed 8.4 ms latency. Where did it come from?', 'A', 'That was a design target from our early blueprint, and a prototype displayed it as if measured. Our internal audit caught it. We removed every unmeasured number; the numbers we show today come from benchmark files on this laptop.', 'evidence/02_audit')}
${Q(29, 'What would you do with Intel Gaudi or a bigger server?', 'B', 'Larger-scale training: a bigger detector on more countries\' data and a research track on a true PDE-residual PINN. Field inference stays on Core Ultra because the point is offline, low-cost deployment.', '—')}
${Q(30, 'Are you part of an Intel program?', 'A', 'The AI Global Impact Festival is listed by Intel as one of its Digital Readiness programs, and we built this project for it. We also completed [Intel learning modules/notebooks] and applied [specific lesson]. [Only state what is true.]', 'evidence/15_idr')}
${H2('s12-5', '12.5 Responsible AI dan GenAI')}
${Q(31, 'Which GenAI tools did you use to build this?', 'A, lalu B', '[Read the disclosure honestly.] For example: Claude for repository auditing and documentation, [Kiro/Cursor/other] for interface scaffolding. We wrote the scientific core ourselves: the solver wrapper, surrogate training, life model, evaluation and benchmarks; the commit history shows it. [Adjust to the truth.]', 'evidence/13')}
${Q(32, 'Who is accountable if the system is wrong?', 'A', 'The engineer and the approving officer, as today. The system ranks and recommends with uncertainty; it cannot change a case status or issue an order. Every action is logged with person, time, reason and model version.', '3.5')}
${Q(33, 'Could this be used to blame contractors?', 'C', 'We designed against that. The early-damage flag only suggests investigating drainage, as-built thickness, mix and loading, needs three independent reports and engineer confirmation, and never names anyone.', 'D-15')}
${Q(34, 'What about people without smartphones?', 'C', 'Community representatives can report with one phone, and the planner\'s equity map sends officers to areas with few reports. Absence of reports is treated as unknown, not as good condition.', '6.1')}
${Q(35, 'Environmental impact?', 'B', 'Inference is local and quantized, there are no cloud LLM calls, and results are cached per segment. [Energy measured with X / not measured; we will not guess.]', '—')}
${Q(36, 'Is citizen reporting safe?', 'C', 'The app warns users to stop in a safe place and never photograph while riding, and there are no gamified rewards that encourage risky behaviour.', '6.1')}
${Q(37, 'Ultralytics is AGPL. How do you handle licensing?', 'B', '[Per D-20:] We release the inference service as open source under a compatible licence, which also fits our plan for other cities; dataset and model attributions are in our model cards.', '6.5')}
${H2('s12-6', '12.6 Produk, kesiapan, dan masa depan')}
${Q(38, 'Is it deployed?', 'A', 'The citizen app has been live at a public URL since [date] with [N] real reports from [M] devices on the pilot corridor. Internal roles run in a controlled test with civil-engineering participants. Agency deployment is our next step.', 'evidence/11_pilot')}
${Q(39, 'What happens when the internet is down?', 'B', 'Citizens\' reports queue on the phone. The engineer\'s laptop runs detection, physics, uncertainty and the language model locally and syncs later with version checks to avoid conflicts.', 'Demo')}
${Q(40, 'What is your biggest limitation?', 'A', 'No field deflection data yet, so our structural numbers are verified numerically but not validated against real roads. We present them as indicative, with uncertainty, for ranking. Getting FWD data from a road agency is our top priority.', '—')}
${Q(41, 'What would you build next with more time?', 'A', 'Field validation with FWD; rutting detection from phone motion sensors; a moisture model beyond soaked CBR; local-language voice reporting; and an open-source release for other cities.', 'Slide 12')}
${Q(42, 'What did you learn?', 'semua, 10 dtk/orang', 'A: trust matters more than features. B: verify the physics before training the AI. C: talk to users before deciding priorities.', '—')}
${H2('s12-7', '12.7 Pertanyaan baru di v3.1 (tentang audit dan status)')}
${Q(43, 'What part of what you showed is measured today, and what is a target?', 'A', 'Everything on the Evidence page is measured on this laptop on [date]. [List]. Our targets — such as SUS ≥ 70 and ρ ≥ 0.6 — are labelled as targets in the app and on our slides.', 'Halaman Bukti')}
{{Q44}}
${Q(45, 'Did you train the models on Intel hardware?', 'B', '[Truthfully:] YOLO was trained on [Arc iGPU via PyTorch XPU / Intel Tiber AI Cloud / another GPU, disclosed]. The surrogate training data was generated on an Intel CPU, and all optimisation and inference run on Intel.', 'Log pelatihan')}
${Q(46, 'Your local dataset is small. Why should we trust the detector?', 'B', 'We do not ask you to trust one number. We report per-class and per-condition results on a location-split local test set, show the improvement after local fine-tuning, and route low-confidence cases to human review. Engineer corrections become new labels.', 'evidence/05')}
${Q(47, 'How much of the code did AI write?', 'A/B', '[Read the disclosure: proportion and parts.] The scientific core was written and is understood by the team; [name] can walk you through [module] line by line.', 'evidence/13; riwayat commit')}
${Q(48, 'If the physics engine was wrong before, why trust it now?', 'B', 'Because it is no longer our own formula. It is an open, independently validated solver, cross-checked by a second implementation and a similarity test in our CI. Anyone can rerun the reference case from our repository.', 'evidence/03; CI')}
`.replace('{{Q44}}', Q(44, 'Your own audit scored the project low. What changed since then?', 'A', 'The audit was our own, against the official rubric, on 16 October. It found no real AI inference and no Intel usage yet. Since then we [list milestones passed with dates]. We keep the audit because it shows how we work: measure, fix, and only then claim.', 'docs/audit; evidence/02'));

export const sec13 = `
${H1('s13', '13 Checklist Hari Wawancara')}
<div class="cols2">
<div>${H3('Logistik (Interview Tips Deck 2026)')}${UL([
  '☐ Format: 5 menit presentasi/demo + 15 menit Q&A (+10 menit bila memakai penerjemah).',
  '☐ Masuk 5 menit lebih awal; terlambat > 5 menit dapat dipertimbangkan diskualifikasi.',
  '☐ Pakai laptop/desktop, bukan ponsel; anggota boleh dari satu tautan atau masing-masing.',
  '☐ Semua anggota hadir dan berbicara; tidak boleh mengganti/menambah anggota.',
  '☐ Penjadwalan ulang hanya sekali, via email ≤ 24 jam setelah jadwal diterima.',
  '☐ Rencana cadangan: kontak moderator bila ada masalah teknis.',
])}${H3('Lingkungan dan sikap')}${UL([
  '☐ Ruang tenang, terang, latar bersih; beri tahu orang sekitar.',
  '☐ Tatap kamera, duduk tegak, hindari gerakan gelisah.',
  '☐ Dengarkan sampai selesai; jawab ringkas; biarkan juri menggali.',
  '☐ Bila memakai penerjemah, beri jeda dan bicara jelas.',
  '☐ Jelaskan untuk juri teknis dan non-teknis.',
])}</div>
<div>${H3('Teknis')}${UL([
  '☐ Internet stabil + hotspot cadangan; uji audio/video.',
  '☐ Laptop Core Ultra yang sama dengan benchmark, terisi penuh + charger.',
  '☐ Layanan inferensi hangat (model ter-compile) 10 menit sebelum.',
  '☐ Cermin ponsel (scrcpy) + QR PWA siap.',
  '☐ Rekaman demo cadangan lokal; deck PDF lokal.',
  '☐ Folder `evidence/` terbuka; tab sumber penting siap.',
  '☐ Halaman Bukti menampilkan tanggal pengukuran hari ini atau sebelumnya yang jelas.',
])}${H3('Kalimat pengaman')}${UL([
  '"That is a target, not a result yet. Our current measurement is …"',
  '"We don\'t know yet; here is how we would measure it."',
  '"Let me hand over to [name], who built that part."',
  '"Our internal audit found that, and here is what we changed."',
])}</div>
</div>
`;
