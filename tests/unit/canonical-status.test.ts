import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalStatusOf,
  canonicalStatusOfReport,
  CANONICAL_STATUS_LIST,
  CANONICAL_STATUS_META
} from '../../src/domain/workflow/canonicalStatus';
import type { ReportCase } from '../../src/domain/workflow/model';
import type { DamageReport } from '../../src/types';

test('canonical status list has exactly 8 ordered stages matching the specification', () => {
  assert.equal(CANONICAL_STATUS_LIST.length, 8);
  assert.deepEqual(CANONICAL_STATUS_LIST, [
    'MENUNGGU_PENINJAUAN',
    'PERLU_VERIFIKASI',
    'BELUM_DITUGASKAN',
    'MENUNGGU_FE',
    'SEDANG_DIKERJAKAN',
    'MENUNGGU_VERIFIKASI',
    'PERLU_REVISI',
    'SELESAI'
  ]);

  // Check order properties 1..8
  CANONICAL_STATUS_LIST.forEach((key, idx) => {
    assert.equal(CANONICAL_STATUS_META[key].order, idx + 1);
  });
});

test('canonical status labels and next responsible actors', () => {
  assert.equal(CANONICAL_STATUS_META.MENUNGGU_PENINJAUAN.label, 'Menunggu Peninjauan');
  assert.equal(CANONICAL_STATUS_META.PERLU_VERIFIKASI.label, 'Perlu Verifikasi');
  assert.equal(CANONICAL_STATUS_META.BELUM_DITUGASKAN.label, 'Belum Ditugaskan');
  assert.equal(CANONICAL_STATUS_META.MENUNGGU_FE.label, 'Menunggu F.E');
  assert.equal(CANONICAL_STATUS_META.SEDANG_DIKERJAKAN.label, 'Sedang Dikerjakan');
  assert.equal(CANONICAL_STATUS_META.MENUNGGU_VERIFIKASI.label, 'Menunggu Verifikasi');
  assert.equal(CANONICAL_STATUS_META.PERLU_REVISI.label, 'Perlu Revisi');
  assert.equal(CANONICAL_STATUS_META.SELESAI.label, 'Selesai');
});

test('canonical status mapping for report cases across workflow states', () => {
  const dummyCase = (over: Partial<ReportCase>): ReportCase =>
    ({
      id: 'REP-TEST',
      version: 1,
      createdAt: '2026-10-18T00:00:00Z',
      updatedAt: '2026-10-18T00:00:00Z',
      segmentId: 'SEG-1',
      state: 'SUBMITTED',
      dataStatus: 'USER_GENERATED',
      report: {
        id: 'REP-TEST',
        photoUrl: 'data:image/jpeg;base64,123',
        coordinates: [-6.2, 106.8],
        damageType: 'POTHOLE',
        damageTypeLabel: 'Lubang',
        severity: 'SEVERE'
      } as any,
      history: [],
      ...over
    } as ReportCase);

  // 1. Initial submitted -> Menunggu Peninjauan
  assert.equal(canonicalStatusOf(dummyCase({ state: 'SUBMITTED' })), 'MENUNGGU_PENINJAUAN');
  assert.equal(canonicalStatusOf(dummyCase({ state: 'AI_SCREENING' })), 'MENUNGGU_PENINJAUAN');
  assert.equal(canonicalStatusOf(dummyCase({ state: 'NEEDS_REVIEW' })), 'MENUNGGU_PENINJAUAN');

  // 2. Verified / Ready for SPK -> Belum Ditugaskan
  assert.equal(canonicalStatusOf(dummyCase({ state: 'VERIFIED' })), 'BELUM_DITUGASKAN');

  // 3. SPK Issued -> Menunggu F.E
  assert.equal(canonicalStatusOf(dummyCase({ state: 'FIELD_INSPECTION_REQUESTED' })), 'MENUNGGU_FE');

  // 4. In progress execution -> Sedang Dikerjakan
  assert.equal(canonicalStatusOf(dummyCase({ state: 'IN_PROGRESS' })), 'SEDANG_DIKERJAKAN');
  assert.equal(canonicalStatusOf(dummyCase({ state: 'ACTION_APPROVED' })), 'SEDANG_DIKERJAKAN');

  // 5. Evidence submitted -> Menunggu Verifikasi
  assert.equal(
    canonicalStatusOf(
      dummyCase({
        state: 'IN_PROGRESS',
        workOrder: { status: 'COMPLETED', completionPhotoUrl: 'photo' } as any
      })
    ),
    'MENUNGGU_VERIFIKASI'
  );

  // 6. Rework requested -> Perlu Revisi
  assert.equal(
    canonicalStatusOf(
      dummyCase({
        state: 'IN_PROGRESS',
        workOrder: {
          status: 'ASSIGNED',
          submissions: [{ at: '1', photoUrl: 'p', note: 'n', decision: 'REWORK_REQUESTED', reason: 'kurang rata' }]
        } as any
      })
    ),
    'PERLU_REVISI'
  );

  // 7. Verified & Closed -> Selesai
  assert.equal(canonicalStatusOf(dummyCase({ state: 'RESOLVED' })), 'SELESAI');
  assert.equal(canonicalStatusOf(dummyCase({ state: 'CLOSED' })), 'SELESAI');
});

test('canonical status mapping for citizen damage report', () => {
  const dummyReport = (over: Partial<DamageReport>): DamageReport =>
    ({
      id: 'REP-1',
      status: 'PENDING',
      ...over
    } as DamageReport);

  assert.equal(canonicalStatusOfReport(dummyReport({ status: 'PENDING' })), 'MENUNGGU_PENINJAUAN');
  assert.equal(canonicalStatusOfReport(dummyReport({ status: 'VERIFIED_BY_ENGINEER' })), 'BELUM_DITUGASKAN');
  assert.equal(canonicalStatusOfReport(dummyReport({ status: 'SCHEDULED_FOR_REPAIR' })), 'SEDANG_DIKERJAKAN');
  assert.equal(
    canonicalStatusOfReport(dummyReport({ status: 'SCHEDULED_FOR_REPAIR', repairDetails: { afterPhotoUrl: 'photo', verified: false } })),
    'MENUNGGU_VERIFIKASI'
  );
  assert.equal(canonicalStatusOfReport(dummyReport({ status: 'REPAIRED' })), 'SELESAI');
  assert.equal(canonicalStatusOfReport(dummyReport({ status: 'CLOSED' })), 'SELESAI');
});
