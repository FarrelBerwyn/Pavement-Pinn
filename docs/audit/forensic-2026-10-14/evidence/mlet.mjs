// Independent multilayer linear-elastic (Burmister-type) reference solver, written for the
// PAVEMENT-PINN audit. Axisymmetric, fully bonded interfaces, uniform circular load,
// half-space bottom layer. Love strain function + Hankel transform; per-layer local
// exponentials for numerical stability. Tension positive, z positive downward.
// Units: any consistent set (here MPa, m). Not a certified program; verified only
// against closed-form limits (Boussinesq) in verify-mlet.mjs.

// ---------------------------------------------------------------- Bessel J0/J1
function besselTrap(n, x) {
  const N = 160; // periodic trapezoid: spectrally accurate for |x| <= 30
  let s = 0;
  for (let k = 0; k < N; k++) {
    const t = (2 * Math.PI * k) / N;
    s += Math.cos(n * t - x * Math.sin(t));
  }
  return s / N;
}
function besselAsym(n, x) {
  const mu = 4 * n * n;
  const x8 = 8 * x;
  const P = 1 - ((mu - 1) * (mu - 9)) / (2 * x8 * x8) + ((mu - 1) * (mu - 9) * (mu - 25) * (mu - 49)) / (24 * x8 ** 4);
  const Q = (mu - 1) / x8 - ((mu - 1) * (mu - 9) * (mu - 25)) / (6 * x8 ** 3);
  const chi = x - (n * Math.PI) / 2 - Math.PI / 4;
  return Math.sqrt(2 / (Math.PI * x)) * (P * Math.cos(chi) - Q * Math.sin(chi));
}
export function J(n, x) {
  if (x < 0) return n === 0 ? J(0, -x) : -J(1, -x);
  return x <= 30 ? besselTrap(n, x) : besselAsym(n, x);
}

// ---------------------------------------------------------------- linear solve
function solve(Ain, bin) {
  const n = bin.length;
  const A = Ain.map((r) => r.slice());
  const b = bin.slice();
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    const piv = A[c][c];
    if (piv === 0) throw new Error('singular');
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / piv;
      if (f === 0) continue;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = s / A[r][r];
  }
  return x;
}

// ---------------------------------------------------------------- layer kernels
// Rows over the local coefficients [A, B, C, D] of f(z) = (A + B s) e^{m s} + (C + D q) e^{-m q},
// s = z - bottom, q = z - top. The last (half-space) layer has no A, B terms.
function derivRows(m, z, top, bottom) {
  const finite = Number.isFinite(bottom);
  const s = finite ? z - bottom : 0;
  const e1 = finite ? Math.exp(m * s) : 0;
  const q = z - top;
  const e2 = Math.exp(-m * q);
  const f1 = [m * e1, (m * s + 1) * e1, -m * e2, (1 - m * q) * e2];
  const f2 = [m * m * e1, (m * m * s + 2 * m) * e1, m * m * e2, (m * m * q - 2 * m) * e2];
  const f3 = [m ** 3 * e1, (m ** 3 * s + 3 * m * m) * e1, -(m ** 3) * e2, (-(m ** 3) * q + 3 * m * m) * e2];
  const g = [0, 2 * m * e1, 0, -2 * m * e2];
  const g1 = [0, 2 * m * m * e1, 0, 2 * m * m * e2];
  return { f1, f2, f3, g, g1 };
}
const lin = (a, ca, b, cb) => a.map((v, i) => ca * v + cb * b[i]);
function stateRows(m, z, layer) {
  const { E, nu, top, bottom } = layer;
  const k = (1 + nu) / E;
  const d = derivRows(m, z, top, bottom);
  return {
    Uz: lin(d.g, k * 2 * (1 - nu), d.f2, -k),
    Ur: d.f1.map((v) => k * m * v),
    Sz: lin(d.g1, 2 - nu, d.f3, -1),
    Trz: lin(d.g, -m * (1 - nu), d.f2, m),
    // on-axis horizontal stress kernel: sigma_r = sigma_t = nu g' + (m^2/2) f'
    SrAxis: lin(d.g1, nu, d.f1, (m * m) / 2),
    EzDirect: lin(d.g1, k * 2 * (1 - nu), d.f3, -k),
    d
  };
}

/** layers: [{E, nu, h}] top to bottom; last layer h ignored (half-space). */
export function buildLayers(spec) {
  let t = 0;
  return spec.map((L, i) => {
    const top = t;
    const bottom = i === spec.length - 1 ? Infinity : t + L.h;
    t = bottom;
    return { E: L.E, nu: L.nu, top, bottom };
  });
}

function coefficients(m, layers, loadAmp) {
  const n = layers.length;
  const N = 4 * n - 2;
  const col = (i) => 4 * i; // last layer uses columns 4(n-1)+{0,1} for C, D
  const place = (row, i, vec) => {
    const r = new Array(N).fill(0);
    if (i < n - 1) for (let k = 0; k < 4; k++) r[col(i) + k] += row * vec[k];
    else { r[col(i)] += row * vec[2]; r[col(i) + 1] += row * vec[3]; }
    return r;
  };
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const M = [];
  const rhs = [];
  const s0 = stateRows(m, 0, layers[0]);
  M.push(place(1, 0, s0.Sz)); rhs.push(loadAmp);
  M.push(place(1, 0, s0.Trz)); rhs.push(0);
  for (let i = 0; i < n - 1; i++) {
    const z = layers[i].bottom;
    const a = stateRows(m, z, layers[i]);
    const b = stateRows(m, z, layers[i + 1]);
    for (const key of ['Uz', 'Ur', 'Sz', 'Trz']) {
      M.push(add(place(1, i, a[key]), place(-1, i + 1, b[key])));
      rhs.push(0);
    }
  }
  const x = solve(M, rhs);
  return layers.map((_, i) => (i < n - 1 ? x.slice(col(i), col(i) + 4) : [0, 0, x[col(i)], x[col(i) + 1]]));
}

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const GL = [[-0.8611363115940526, 0.3478548451374538], [-0.3399810435848563, 0.6521451548625461], [0.3399810435848563, 0.6521451548625461], [0.8611363115940526, 0.3478548451374538]];

/**
 * On-axis response under one circular load (pressure p, radius a) at depth z, evaluated
 * with the properties of layer `li` (choose li to pick the side of an interface).
 */
export function onAxis(layerSpec, p, a, z, li, opts = {}) {
  const layers = buildLayers(layerSpec);
  // Nondimensionalise lengths by a.
  const L = layers.map((x) => ({ ...x, top: x.top / a, bottom: x.bottom / a }));
  const zz = z / a;
  const mMax = opts.mMax ?? (zz > 0.05 ? Math.min(600, 45 / zz + 40) : 600);
  const dm = opts.dm ?? 0.05;
  let sz = 0, sr = 0, w = 0, ezd = 0;
  for (let m0 = 0; m0 < mMax; m0 += dm) {
    for (const [xg, wg] of GL) {
      const m = m0 + (dm / 2) * (xg + 1);
      const amp = -p * J(1, m); // Hankel amplitude of the surface pressure (a = 1)
      const coef = coefficients(m, L, amp);
      const st = stateRows(m, zz, L[li]);
      const c = coef[li];
      const wt = (dm / 2) * wg;
      sz += wt * dot(st.Sz, c);
      sr += wt * dot(st.SrAxis, c);
      w += wt * dot(st.Uz, c);
      ezd += wt * dot(st.EzDirect, c);
    }
  }
  const { E, nu } = L[li];
  // Displacement kernel carries 1/E with lengths in units of a: rescale to physical units.
  const wPhys = w * a;
  const ez = (sz - 2 * nu * sr) / E;
  const er = ((1 - nu) * sr - nu * sz) / E;
  return { sigmaZ: sz, sigmaR: sr, w: wPhys, epsZ: ez, epsR: er, epsZdirect: ezd };
}

/** Boussinesq on-axis closed form (flexible uniform circular load). Tension positive. */
export function boussinesq(E, nu, p, a, z) {
  const R = Math.sqrt(a * a + z * z);
  const sz = -p * (1 - z ** 3 / R ** 3);
  const sr = -(p / 2) * (1 + 2 * nu - (2 * (1 + nu) * z) / R + z ** 3 / R ** 3);
  const w = ((1 + nu) * p * a) / E * (a / R + ((1 - 2 * nu) / a) * (R - z));
  return { sigmaZ: sz, sigmaR: sr, w, epsZ: (sz - 2 * nu * sr) / E, epsR: ((1 - nu) * sr - nu * sz) / E };
}
