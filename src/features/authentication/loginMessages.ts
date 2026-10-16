/**
 * User-facing login messages, keyed by the error code a gateway raises. Pure so the
 * mapping can be tested; the wording is generic on purpose: a failed login never says
 * whether the username or the password was wrong.
 */
export interface LoginFieldErrors {
  username?: string;
  password?: string;
}

export function validateLoginFields(username: string, password: string): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  if (username.trim() === '') errors.username = 'Masukkan email atau nama pengguna.';
  if (password === '') errors.password = 'Masukkan kata sandi.';
  return errors;
}

export function loginErrorMessage(code: string | undefined, status?: number): string {
  if (status === 429 || code === 'RATE_LIMITED') return 'Terlalu banyak percobaan masuk. Tunggu sekitar satu menit, lalu coba lagi.';
  switch (code) {
    case 'UNAUTHENTICATED':
      return 'Nama pengguna atau kata sandi salah.';
    case 'VALIDATION':
      return 'Email atau nama pengguna dan kata sandi wajib diisi.';
    case 'DISABLED':
      return 'Login belum tersedia di lingkungan ini: login demo tidak diaktifkan dan penyedia identitas belum dikonfigurasi.';
    case 'NETWORK':
      return 'Server tidak dapat dihubungi. Periksa koneksi, lalu coba lagi.';
    default:
      return 'Login gagal karena kesalahan sistem. Coba lagi beberapa saat lagi.';
  }
}
