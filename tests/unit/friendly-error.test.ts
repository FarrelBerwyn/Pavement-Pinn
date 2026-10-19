/** Workflow errors reach users in Indonesian, with the server wording kept for support. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { friendlyError } from '../../src/features/workflow/friendlyError';

test('server workflow errors are shown in Indonesian', () => {
  assert.match(friendlyError('VERSION_CONFLICT', 'The report changed since it was loaded'), /diubah oleh pengguna lain/);
  assert.match(friendlyError('FORBIDDEN', 'FIELD_ENGINEER may not RESOLVE.'), /tidak berwenang.*may not RESOLVE/);
  assert.match(friendlyError('VALIDATION', 'Evidence photo: Photo content is not a JPEG, PNG or WebP image.'), /^Foto ditolak server/);
  assert.match(friendlyError('VALIDATION', 'reason is required.'), /^Isian belum lengkap/);
  assert.equal(friendlyError('SOMETHING_ELSE', 'raw'), 'raw');
});
