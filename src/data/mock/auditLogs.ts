import { AuditLogItem } from '../../types';

/**
 * DEMONSTRATION DATA — seed entries shown in the audit-trail modal on first load.
 * The audit trail is in-memory only: entries appended at runtime are lost on refresh.
 */
export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'LOG-101',
    timestamp: '16:45:12',
    userRole: 'FIELD_ENGINEER',
    userAgency: 'BBPJN DKI-Jabar',
    action: 'SIMULASI PINN',
    segmentName: 'Pantura KM 62+500',
    details: 'Prediksi PCI: 48/100, Regangan Tarik 245 µε, Rekomendasi Overlay 8.5 cm AC-WC.'
  },
  {
    id: 'LOG-102',
    timestamp: '16:40:08',
    userRole: 'OPERATIONS_MANAGER',
    userAgency: 'BPTD Wilayah VIII',
    action: 'TRANSFER MUATAN WIM',
    segmentName: 'Betung KM 114 (Trans-Sumatra)',
    details: 'Peringatan ODOL Red (24.6 Ton). Instruksi transfer muatan & pembatasan 30 km/jam.'
  },
  {
    id: 'LOG-103',
    timestamp: '16:30:00',
    userRole: 'POLICY_MAKER',
    userAgency: 'Kementerian PU',
    action: 'Ringkasan Eksekutif PDF',
    segmentName: 'Jaringan Jalan Nasional 2026',
    details: 'Proyeksi penghematan APBN Rp 38.5 Miliar dengan Zero ODOL 2027.'
  }
];
