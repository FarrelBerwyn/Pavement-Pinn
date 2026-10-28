const CLASS_LABEL: Record<string, string> = {
  pothole: 'Lubang',
  crack_longitudinal: 'Retak memanjang',
  crack_transverse: 'Retak melintang',
  crack_alligator: 'Retak buaya',
  unclassified: 'Belum diklasifikasi',
  not_damage: 'Bukan kerusakan'
};

export const classLabel = (c: string): string => CLASS_LABEL[c] ?? c;

/**
 * Class hierarchy shown in the UI: main group → class → what the class means. The subtype text
 * is the definition of the class (assigned by a person or a dataset label), not a model output;
 * unknown/ambiguous cases stay "unclassified" for human review.
 */
export const CLASS_HIERARCHY: Record<string, { group: string; en: string; subtype: string; params: string }> = {
  pothole: { group: 'Lubang', en: 'Pothole', subtype: 'kehilangan material lokal, tepi tidak beraturan', params: 'panjang, lebar, kedalaman, volume' },
  crack_longitudinal: { group: 'Retak', en: 'Longitudinal crack', subtype: 'retak searah sumbu jalan', params: 'panjang, lebar, kontinuitas, orientasi' },
  crack_transverse: { group: 'Retak', en: 'Transverse crack', subtype: 'retak melintang arah jalan', params: 'panjang, lebar, orientasi, jarak antarretak' },
  crack_alligator: { group: 'Retak', en: 'Alligator / fatigue cracking', subtype: 'jaringan retak poligonal saling terhubung', params: 'luas, kerapatan jaringan' },
  unclassified: { group: 'Belum diklasifikasi', en: 'Unclassified', subtype: 'perlu tinjauan manusia', params: '—' },
  not_damage: { group: 'Bukan kerusakan', en: 'Not damage', subtype: 'ditandai salah deteksi', params: '—' }
};

export const classPath = (c: string): string => {
  const h = CLASS_HIERARCHY[c];
  return h ? `${h.group} › ${classLabel(c)} (${h.en})` : c;
};
