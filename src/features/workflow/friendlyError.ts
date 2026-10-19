/**
 * Workflow API errors for people: Indonesian text per error code, with the server wording kept
 * in brackets so support can still trace it. Pure (no browser APIs), shared by the task boards.
 */
export function friendlyError(code: string, message: string): string {
  if (code === 'VERSION_CONFLICT') return 'Laporan ini baru saja diubah oleh pengguna lain. Data terbaru sudah dimuat; periksa lalu kirim lagi.';
  if (code === 'FORBIDDEN' || code === 'UNAUTHENTICATED') return `Anda tidak berwenang melakukan tindakan ini. (${message})`;
  if (code === 'INVALID_TRANSITION') return `Tindakan ini tidak berlaku untuk status laporan sekarang; muat ulang untuk melihat status terbaru. (${message})`;
  if (code === 'VALIDATION' && /photo/i.test(message)) return `Foto ditolak server: isi file harus gambar JPEG, PNG atau WebP (maks. 5 MB), dan foto sesudah tidak boleh sama dengan foto laporan. (${message})`;
  if (code === 'VALIDATION') return `Isian belum lengkap atau tidak valid. (${message})`;
  if (code === 'STORAGE' || code === 'NETWORK') return `Perubahan belum tersimpan; coba lagi. (${message})`;
  return message;
}

