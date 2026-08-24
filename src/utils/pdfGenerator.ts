import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SimulationResult, UserRole } from '../types';

export function generateOfficialReportPdf(
  simulation: SimulationResult,
  role: UserRole
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const { roadSegment, params, tensors, roleOutputs, telemetry, predictedPci } =
    simulation;

  // Colors
  const navy = '#1e3a8a';
  const darkGray = '#334155';

  // Header Logo & Title
  doc.setFillColor(30, 58, 138); // Navy
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PAVEMENT-PINN | LAPORAN RESMI KEPUTUSAN STRUKTURAL', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    'Sistem Pendukung Keputusan Multi-Stakeholder Berbasis Intel OpenVINO Edge AI',
    14,
    20
  );
  doc.text(
    `Tanggal: ${new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })} | Ref ID: ${simulation.id}`,
    130,
    20
  );

  let currentY = 36;

  // Metadata Box
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. INFORMASI RUAS JALAN & PERAN PENGGUNA', 14, currentY);

  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [['Parameter', 'Nilai Detail']],
    body: [
      ['Ruas Jalan', roadSegment.name],
      ['Koridor & Provinsi', `${roadSegment.corridor} (${roadSegment.province})`],
      ['Post Kilometer', roadSegment.kmPost],
      ['Peran Pengguna (RBAC)', role === 'FIELD_ENGINEER' ? 'Field Civil Engineer (BBPJN/Dinas PUPR)' : role === 'OPERATIONS_MANAGER' ? 'Operations Manager (Kemenhub/BPTD)' : 'Executive Policy Maker (Kepala Dinas/Kementerian)'],
      ['Indeks Kondisi Saat Ini (PCI)', `${roadSegment.currentPci} / 100 (${roadSegment.conditionCategory})`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] },
    styles: { fontSize: 9 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Simulation Input & Physics Loss Parameters
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. PARAMETER INPUT SIMULASI & INTEL OPENVINO TELEMETRY', 14, currentY);

  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [['Parameter Input', 'Nilai', 'Batas Fisis / Perangkat']],
    body: [
      ['Beban Sumbu Kendaraan (ODOL)', `${params.axleLoadTon} Ton`, 'Batas Standar: 10.0 Ton'],
      ['Intensitas Hujan & Durasi Genangan', `${params.rainIntensityMmHr} mm/jam (${params.floodDurationHours} jam)`, 'Penurunan Modulus Subgrade'],
      ['Nilai CBR Tanah Dasar', `${params.subgradeCbrPercent} %`, `Daya Dukung Es: ${params.subgradeCbrPercent * 10} MPa`],
      ['Tebal Lapisan Aspal (AC-WC/BC)', `${params.asphaltThicknessCm} cm`, `Modulus Aspal: ${params.asphaltModulusMpa} MPa`],
      ['Target Hardware & Presisi Edge', `${telemetry.deviceUsed} (${telemetry.precisionUsed})`, `Latensi Inferensi: ${telemetry.inferenceLatencyMs} ms`]
    ],
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    styles: { fontSize: 8.5 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Tensor & Structural Engineering Results
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('3. HASIL KALKULASI TEGANGAN-REGANGAN & PCI PREDIKSI', 14, currentY);

  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    head: [['Metrik Output PINN', 'Hasil Prediksi', 'Keterangan Rekayasa']],
    body: [
      ['Prediksi PCI Pasca Beban', `${predictedPci} / 100`, `Penurunan PCI: -${simulation.pciDropPoints} poin`],
      ['Regangan Tarik Dasar Aspal (εt)', `${tensors.tensileStrainEt} µε`, tensors.tensileStrainEt > 200 ? 'MELEBIHI AMBANG LELEH (>200 µε)' : 'Dalam Batas Aman'],
      ['Regangan Tekan Tanah Dasar (εv)', `${tensors.compressiveStrainEv} µε`, 'Regangan Tekan Subgrade'],
      ['Defleksi Maksimum Permukaan', `${tensors.surfaceDeflectionMaxMicron} µm`, 'Lendutan Pusat Beban'],
      ['Pothole Horizon (Estimasi Lubang)', `${roleOutputs.fieldEngineer.potholeHorizonDays} Hari`, 'Proyeksi Kerusakan Struktural']
    ],
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] },
    styles: { fontSize: 8.5 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Role-Specific Actionable Recommendations
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`4. REKOMENDASI TINDAKAN (${(role || 'FIELD_ENGINEER').replace('_', ' ')})`, 14, currentY);

  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  if (role === 'FIELD_ENGINEER') {
    doc.text(`• Rekomendasi Tebal Overlay: ${roleOutputs.fieldEngineer.recommendedOverlayThicknessCm} cm`, 14, currentY);
    currentY += 5;
    doc.text(`• Jenis Spesifikasi Material: ${roleOutputs.fieldEngineer.recommendedOverlayType}`, 14, currentY);
    currentY += 5;
    doc.text(`• Catatan Rekayasa: ${roleOutputs.fieldEngineer.engineeringNotes}`, 14, currentY, { maxWidth: 180 });
  } else if (role === 'OPERATIONS_MANAGER') {
    doc.text(`• Status Alert Operasional WIM: STATUS ${roleOutputs.operationsManager.alertStatus}`, 14, currentY);
    currentY += 5;
    doc.text(`• Batas Tonase Dinamis Musiman: ${roleOutputs.operationsManager.maxAllowedDynamicTonnageTon} Ton`, 14, currentY);
    currentY += 5;
    doc.text(`• Tindakan Penindakan Langsung: ${roleOutputs.operationsManager.wimActionRequired}`, 14, currentY);
    currentY += 5;
    doc.text(`• Ringkasan Operasional: ${roleOutputs.operationsManager.operationalAlertSummary}`, 14, currentY, { maxWidth: 180 });
  } else {
    doc.text(`• Proyeksi Penghematan Anggaran Preservasi: Rp ${roleOutputs.policyMaker.preventiveCostSavingsRupiahBillions} Miliar`, 14, currentY);
    currentY += 5;
    doc.text(`• Estimasi Potensi Kerugian Ekonomi ODOL: Rp ${roleOutputs.policyMaker.estimatedEconomicLossRupiahBillions} Miliar`, 14, currentY);
    currentY += 5;
    doc.text(`• Dampak Target Zero ODOL 2027: ${roleOutputs.policyMaker.zeroOdolTargetImpactPercent}% Pengurangan Laju Kerusakan`, 14, currentY);
    currentY += 5;
    doc.text(`• Ringkasan Eksekutif: ${roleOutputs.policyMaker.executiveBrief}`, 14, currentY, { maxWidth: 180 });
  }

  // Footer
  doc.setFillColor(241, 245, 249);
  doc.rect(0, 280, 210, 17, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'PAVEMENT-PINN | Dihasilkan secara otomatis oleh sistem kecerdasan buatan terpadu PUPR, Kemenhub, & Intel OpenVINO.',
    14,
    288
  );

  // Save PDF
  doc.save(`PAVEMENT-PINN_${role}_${roadSegment.id}_${Date.now()}.pdf`);
}
