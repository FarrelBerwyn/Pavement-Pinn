import React, { useState } from 'react';
import {
  BookOpen,
  FileText,
  Calculator,
  Layers,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  Thermometer,
  ShieldCheck,
  Scale
} from 'lucide-react';

export const TechnicalReferenceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'STANDARDS' | 'SOP_REPAIR' | 'CALCULATOR' | 'PAVEMENT_LAYERS'>('STANDARDS');
  const [selectedStandardId, setSelectedStandardId] = useState<string>('bm-2018');

  // Quick Calculator State
  const [calcLength, setCalcLength] = useState<number>(50); // meters
  const [calcWidth, setCalcWidth] = useState<number>(3.5); // meters
  const [calcThicknessCm, setCalcThicknessCm] = useState<number>(4.0); // cm
  const [calcDensity, setCalcDensity] = useState<number>(2.32); // ton/m3 (Hotmix AC-WC)
  const [tackCoatRate, setTackCoatRate] = useState<number>(0.35); // L/m2

  // Computed Calculator Results
  const areaM2 = calcLength * calcWidth;
  const volumeM3 = areaM2 * (calcThicknessCm / 100);
  const tonnageTon = volumeM3 * calcDensity;
  const tackCoatLiters = areaM2 * tackCoatRate;

  const standardsData = [
    {
      id: 'bm-2018',
      code: 'Spesifikasi Umum 2018 Rev. 2',
      issuer: 'Ditjen Bina Marga Kementerian PUPR',
      title: 'Divisi 6: Perkerasan Aspal (AC-WC, AC-BC, AC-Base, Tack Coat, Prime Coat)',
      summary: 'Pedoman material, gradasi agregat, kadar aspal optimum (KAO), toleransi tebal, suhu pencampuran & pemadatan aspal minimum 110°C.',
      keyPoints: [
        'Lapis Aus (AC-WC): Tebal nominal 4.0 cm, stabilitas Marshall min. 800 kg, rongga dalam campuran (VIM) 3.5 - 5.0%.',
        'Lapis Antara (AC-BC): Tebal nominal 6.0 cm, stabilitas Marshall min. 800 kg, VIM 3.0 - 5.0%.',
        'Lapis Pondasi (AC-Base): Tebal nominal 7.5 cm, stabilitas Marshall min. 800 kg.',
        'Suhu Pencampuran di AMP: 145°C - 165°C | Suhu Pemadatan Awal (Breakdown Rolling): 125°C - 145°C | Suhu Akhir: Min. 90°C.'
      ]
    },
    {
      id: 'mdpj-2024',
      code: 'MDPJ 2024 (Manual No. 01/M/BM/2024)',
      issuer: 'Kementerian Pekerjaan Umum dan Perumahan Rakyat',
      title: 'Manual Desain Perkerasan Jalan Revisi 2024 & Analisis Beban Gandar ODOL',
      summary: 'Perhitungan umur rencana, kumulatif ESAL (Equivalent Single Axle Load), faktor ekivalen beban (VDF) eksponensial ke-4, dan penyesuaian daya dukung tanah dasar (CBR subgrade).',
      keyPoints: [
        'Beban Standar Gandar Tunggal Roda Ganda (STRG): 8.16 Ton (80 kN / 18.000 lbs).',
        'Faktor Daya Rusak ODOL: Kenaikan beban 20% meningkatkan laju kerusakan sebesar (1.2)^4 = 2.07x (Dua kali lipat lebih cepat aus).',
        'Daya Dukung Tanah Dasar Efektif: CBR desain minimum 6% untuk perkerasan lentur lalu lintas berat.',
        'Umur Rencana Rekonstruksi: 20 Tahun | Rehabilitasi / Overlay: 10 Tahun.'
      ]
    },
    {
      id: 'fwd-2002',
      code: 'Pd T-01-2002-B (Pedoman FWD)',
      issuer: 'Badan Litbang PUPR',
      title: 'Pedoman Pemeriksaan Daya Dukung Perkerasan Lentur dengan Alat Falling Weight Deflectometer (FWD)',
      summary: 'Metode pengujian lendutan non-destruktif untuk menentukan modulus elastisitas lapis perkerasan ($E_1, E_2, E_3$) dan estimasi sisa umur lelah perkerasan (RUL).',
      keyPoints: [
        'Beban Uji Standar: 40 kN (ekuivalen gandar 8.16 Ton) dengan pelat pembebanan diameter 300 mm.',
        'Jarak Sensor Geophone: $D_0$ (pusat beban), $D_{200}, D_{300}, D_{450}, D_{600}, D_{900}, D_{1200}, D_{1500}$ mm.',
        'Koreksi Suhu Standar: Lendutan dikoreksi ke temperatur referensi perkerasan 35°C (Kondisi Tropis Indonesia).',
        'Analisis Balik (Backcalculation): Menghitung Modulus Resilien Lapis Aspal ($E_1$), Modulus Pondasi ($E_2$), dan Modulus Subgrade ($E_3$).'
      ]
    },
    {
      id: 'astm-d6433',
      code: 'ASTM D6433 / PUPR 13/PRT/M/2011',
      issuer: 'ASTM International & PUPR',
      title: 'Standard Practice for Roads and Parking Lots Pavement Condition Index (PCI) Surveys',
      summary: 'Prosedur survei visual penilaian 19 jenis kerusakan perkerasan beraspal, deduct value, dan klasifikasi indeks dari 0 (Gagal) sampai 100 (Sempurna).',
      keyPoints: [
        '19 Jenis Kerusakan: Retak Buaya, Bleeding, Retak Blok, Amblas/Depresi, Keriting, Retak Tepi, Alur Roda (Rutting), Lubang (Potholes), dll.',
        'Tingkat Keparahan (Severity Level): Low (L), Medium (M), High (H).',
        'Skala PCI: 85-100 (Sangat Baik / Mantap), 70-85 (Baik), 55-70 (Sedang), 40-55 (Rusak Ringan), 25-40 (Rusak Sedang), 10-25 (Rusak Berat), 0-10 (Gagal Total).'
      ]
    }
  ];

  const repairSop = [
    {
      title: 'SOP Penambalan Lubang (Pothole Patching)',
      category: 'Pemeliharaan Rutin',
      urgency: 'Tinggi (< 24 Jam)',
      tools: 'Cutter Beton/Aspal, Air Compressor, Asphalt Emulsion Sprayer, Plate Compactor / Baby Roller',
      steps: [
        'Beri tanda batas pemotongan dengan kapur / cat berbentuk persegi panjang tegak lurus (Square Cut).',
        'Potong perkerasan dengan Asphalt Cutter minimal 5 cm di luar area kerusakan hingga dasar lapisan yang kokoh.',
        'Bersihkan debu, kotoran, dan air sisa menggunakan semprotan kompresor udara bertekanan tinggi.',
        'Semprotkan lapis perekat (Tack Coat) emulsi kationik merata di bagian dasar dan dinding vertikal potongan (0.35 L/m²).',
        'Hamparkan campuran aspal panas (Hotmix AC-WC) dengan kemiringan melintang mengikuti eksisting (over-fill 20% untuk faktor pemadatan).',
        'Padatkan bertahap dari tepi luar ke tengah dengan Baby Roller / Plate Compactor hingga padat sempurna (kepadatan min. 98%).',
        'Lakukan penyegelan tepi sambungan (Joint Sealing) untuk mencegah perembesan air.'
      ]
    },
    {
      title: 'SOP Penanganan Alur Roda (Rutting Correction)',
      category: 'Rehabilitasi / Berkala',
      urgency: 'Sedang',
      tools: 'Cold Milling Machine, Sweeper Truk, Asphalt Finisher, Tandem Roller, Pneumatic Tire Roller (PTR)',
      steps: [
        'Lakukan pengukuran kedalaman alur menggunakan mistar lurus (Straight Edge 3 meter) dan alat FWD.',
        'Lakukan pengupasan permukaan aspal terdeformasi dengan Cold Milling sedalam 4 - 6 cm.',
        'Bersihkan permukaan hasil milling dengan Power Sweeper dan semprotan udara.',
        'Aplikasi Tack Coat emulsi termodifikasi polimer merata (0.30 - 0.40 L/m²).',
        'Hamparkan lapis aspal bermodulus tinggi (Stone Matrix Asphalt / AC-WC Modifikasi Polimer PG-76).',
        'Pemadatan awal (Breakdown) Tandem Roller 2 passing, pemadatan utama PTR 8-12 passing pada suhu > 125°C.'
      ]
    },
    {
      title: 'SOP Perbaikan Retak Buaya (Alligator Cracking Repair)',
      category: 'Rekonstruksi Struktural',
      urgency: 'Tinggi',
      tools: 'Excavator, Cold Milling, Compactor 10 Ton, Geogrid / Geotekstil',
      steps: [
        'Uji FWD untuk memastikan apakah kerusakan terjadi pada lapis pondasi atas (Base) atau tanah dasar (Subgrade).',
        'Jika Subgrade lunak (CBR < 3%), bongkar hingga tanah dasar, pasang geotekstil separator dan timbunan pilihan stabilisasi semen.',
        'Ganti lapis pondasi agregat Kelas A tebal 15-20 cm dan padatkan.',
        'Aplikasi Prime Coat (0.8 - 1.2 L/m²) dan hamparkan AC-Base tebal 7.5 cm dilanjutkan AC-WC 4 cm.'
      ]
    }
  ];

  return (
    <div className="min-h-full w-full bg-[#07090e] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <div className="p-2 rounded-xl bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Referensi Teknis & Pedoman Rekayasa Jalan
            </h1>
            <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
              Standar PUPR & ASTM
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Katalog spesifikasi umum Bina Marga 2018 Rev 2, MDPJ 2024, manual uji FWD, SOP penanganan perkerasan, dan kalkulator lapangan.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-1.5 bg-[#0e1320] p-1.5 rounded-2xl border border-white/10 overflow-x-auto custom-scrollbar">
          {[
            { id: 'STANDARDS', label: 'Standar & Regulasi', icon: ShieldCheck },
            { id: 'SOP_REPAIR', label: 'SOP Perbaikan', icon: Wrench },
            { id: 'CALCULATOR', label: 'Kalkulator Cepat', icon: Calculator },
            { id: 'PAVEMENT_LAYERS', label: 'Struktur Lapis', icon: Layers }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: STANDARDS & GUIDELINES */}
      {activeTab === 'STANDARDS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left list of standards */}
          <div className="space-y-3">
            {standardsData.map((std) => (
              <div
                key={std.id}
                onClick={() => setSelectedStandardId(std.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedStandardId === std.id
                    ? 'bg-[#141a29] border-amber-400/60 shadow-lg shadow-amber-400/10'
                    : 'bg-[#0e1320] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-black text-amber-400">{std.code}</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${selectedStandardId === std.id ? 'rotate-90 text-amber-400' : ''}`} />
                </div>
                <h3 className="text-xs font-bold text-white leading-snug mb-1">{std.title}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2">{std.issuer}</p>
              </div>
            ))}
          </div>

          {/* Right Detailed Panel */}
          {(() => {
            const curStd = standardsData.find((s) => s.id === selectedStandardId) || standardsData[0];
            return (
              <div className="lg:col-span-2 bg-[#0e1320] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="border-b border-white/10 pb-3">
                  <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-500/30 inline-block mb-2">
                    {curStd.issuer}
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white">{curStd.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{curStd.summary}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Ketentuan Teknis Kunci & Parameter Evaluasi:
                  </h4>
                  <div className="space-y-2">
                    {curStd.keyPoints.map((point, i) => (
                      <div key={i} className="flex items-start space-x-2.5 bg-[#141a29] p-3 rounded-xl border border-white/5 text-xs text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                  <span>Daftar rujukan ini diterapkan langsung pada modul simulasi PINN dan rekomendasi SPK.</span>
                  <span className="font-mono font-bold text-[10px]">VER: 2025.2</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 2: SOP REPAIR PROCEDURES */}
      {activeTab === 'SOP_REPAIR' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {repairSop.map((sop, idx) => (
            <div key={idx} className="bg-[#0e1320] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                    {sop.category}
                  </span>
                  <span className="text-[10px] font-mono text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                    {sop.urgency}
                  </span>
                </div>

                <h3 className="text-sm font-black text-white">{sop.title}</h3>

                <div className="bg-[#141a29] p-2.5 rounded-xl border border-white/5 text-xs">
                  <span className="text-slate-400 text-[10px] block font-mono">Peralatan Utama:</span>
                  <span className="text-slate-200 font-medium text-[11px] mt-0.5 block">{sop.tools}</span>
                </div>

                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-amber-400 block font-mono">Langkah Penanganan (SOP PUPR):</span>
                  <ol className="space-y-1.5 text-xs text-slate-300">
                    {sop.steps.map((step, sIdx) => (
                      <li key={sIdx} className="flex items-start space-x-2">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-amber-400 text-[10px] font-mono font-black flex items-center justify-center shrink-0 mt-0.5">
                          {sIdx + 1}
                        </span>
                        <span className="leading-snug">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: QUICK FIELD CALCULATOR */}
      {activeTab === 'CALCULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="bg-[#0e1320] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>Input Dimensi Penanganan Lapangan</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Panjang Penanganan (Meter)</label>
                <input
                  type="number"
                  value={calcLength}
                  onChange={(e) => setCalcLength(Number(e.target.value))}
                  className="w-full bg-[#141a29] border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Lebar Penanganan (Meter)</label>
                <input
                  type="number"
                  value={calcWidth}
                  onChange={(e) => setCalcWidth(Number(e.target.value))}
                  className="w-full bg-[#141a29] border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Tebal Hamparan Rencana (cm)</label>
                <input
                  type="number"
                  value={calcThicknessCm}
                  step="0.5"
                  onChange={(e) => setCalcThicknessCm(Number(e.target.value))}
                  className="w-full bg-[#141a29] border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Berat Jenis Campuran Aspal (ton/m³)</label>
                <input
                  type="number"
                  value={calcDensity}
                  step="0.01"
                  onChange={(e) => setCalcDensity(Number(e.target.value))}
                  className="w-full bg-[#141a29] border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Standar AC-WC: 2.32 ton/m³ | AC-BC: 2.30 ton/m³</span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Kebutuhan Lapis Perekat Tack Coat (L/m²)</label>
                <input
                  type="number"
                  value={tackCoatRate}
                  step="0.05"
                  onChange={(e) => setTackCoatRate(Number(e.target.value))}
                  className="w-full bg-[#141a29] border border-white/10 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="lg:col-span-2 bg-[#0e1320] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>Estimasi Volume Material & Kebutuhan Logistik</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#141a29] p-3.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono">Luas Area Penanganan</span>
                <span className="text-xl font-black text-white mt-1 block">{areaM2.toFixed(1)} <span className="text-xs text-slate-400">m²</span></span>
              </div>

              <div className="bg-[#141a29] p-3.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block font-mono">Volume Hamparan</span>
                <span className="text-xl font-black text-white mt-1 block">{volumeM3.toFixed(2)} <span className="text-xs text-slate-400">m³</span></span>
              </div>

              <div className="bg-[#141a29] p-3.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-amber-300 block font-mono">Kebutuhan Hotmix</span>
                <span className="text-xl font-black text-amber-400 mt-1 block">{tonnageTon.toFixed(2)} <span className="text-xs text-slate-400">Ton</span></span>
              </div>

              <div className="bg-[#141a29] p-3.5 rounded-xl border border-white/5">
                <span className="text-[10px] text-cyan-300 block font-mono">Kebutuhan Tack Coat</span>
                <span className="text-xl font-black text-cyan-400 mt-1 block">{tackCoatLiters.toFixed(1)} <span className="text-xs text-slate-400">Liter</span></span>
              </div>
            </div>

            <div className="bg-[#141a29] p-4 rounded-xl border border-white/5 space-y-2 text-xs">
              <h4 className="font-bold text-white font-mono">Rekomendasi Dump Truck & Waktu AMP:</h4>
              <ul className="space-y-1 text-slate-300">
                <li>&bull; Estimasi jumlah Dump Truck 15-Ton: <strong className="text-white">{Math.ceil(tonnageTon / 15)} Unit Truk</strong></li>
                <li>&bull; Toleransi Faktor Kehilangan & Pemadatan (Loss Factor 5%): <strong className="text-amber-400">{(tonnageTon * 1.05).toFixed(2)} Ton</strong></li>
                <li>&bull; Batas Suhu Pemadatan Awal Minimum: <strong className="text-cyan-300">125°C - 145°C</strong></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TYPICAL PAVEMENT CROSS-SECTION */}
      {activeTab === 'PAVEMENT_LAYERS' && (
        <div className="bg-[#0e1320] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>Susunan Standar Lapis Perkerasan Lentur (Flexible Pavement)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Berdasarkan Manual Desain Perkerasan Jalan MDPJ 2024 untuk Beban Lalu Lintas Berat (Traffic Class Heavy).
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <div className="bg-slate-900 border-2 border-amber-400/80 p-4 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-mono font-bold text-amber-400">1. Lapis Aus (Wearing Course - AC-WC)</span>
                <p className="text-slate-300 text-[11px]">Tebal 4.0 cm &bull; Modulus Elastisitas E₁ ≈ 2500 - 3200 MPa &bull; Menahan gesekan roda dan kedap air</p>
              </div>
              <span className="text-xs font-mono font-black text-white bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-500/30">4.0 cm</span>
            </div>

            <div className="bg-slate-900 border border-indigo-400/60 p-4 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-mono font-bold text-indigo-300">2. Lapis Antara (Binder Course - AC-BC)</span>
                <p className="text-slate-300 text-[11px]">Tebal 6.0 cm &bull; Menyalurkan tegangan geser maksimum akibat beban roda</p>
              </div>
              <span className="text-xs font-mono font-black text-white bg-indigo-500/20 px-3 py-1 rounded-lg border border-indigo-500/30">6.0 cm</span>
            </div>

            <div className="bg-slate-900 border border-cyan-400/60 p-4 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-mono font-bold text-cyan-300">3. Lapis Pondasi Atas Aspal (AC-Base)</span>
                <p className="text-slate-300 text-[11px]">Tebal 7.5 cm &bull; Lapis struktural penahan regangan tarik bawah (Fatigue Bottom-Up)</p>
              </div>
              <span className="text-xs font-mono font-black text-white bg-cyan-500/20 px-3 py-1 rounded-lg border border-cyan-500/30">7.5 cm</span>
            </div>

            <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-mono font-bold text-slate-300">4. Lapis Pondasi Agregat Kelas A (Base Course)</span>
                <p className="text-slate-400 text-[11px]">Tebal 15.0 - 20.0 cm &bull; Agregat pecah 100% dengan nilai CBR minimum 90%</p>
              </div>
              <span className="text-xs font-mono font-black text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">15.0 cm</span>
            </div>

            <div className="bg-[#121724] border border-emerald-500/40 p-4 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-mono font-bold text-emerald-400">5. Tanah Dasar Pilihan / Subgrade (CBR &ge; 6%)</span>
                <p className="text-slate-400 text-[11px]">Tanah dasar dipadatkan 100% MDD Standar AASHTO T-99 &bull; Modulus E₃ ≈ 60 - 120 MPa</p>
              </div>
              <span className="text-xs font-mono font-black text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-lg border border-emerald-500/30">Subgrade</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
