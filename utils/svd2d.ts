import type { Matrix2x2, SvdStages } from '../types';

export interface Svd2DResult {
  U: Matrix2x2;
  Sigma: Matrix2x2; // diagonal [[σ1, 0], [0, σ2]], σ1 ≥ σ2 ≥ 0
  V: Matrix2x2;
}

/** Multiply two 2x2 matrices */
function mul2(a: Matrix2x2, b: Matrix2x2): Matrix2x2 {
  return [
    [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
    [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],
  ];
}

/** Transpose 2x2 */
function transpose2(m: Matrix2x2): Matrix2x2 {
  return [[m[0][0], m[1][0]], [m[0][1], m[1][1]]];
}

/** Compute SVD of 2x2 matrix A = U Σ Vᵀ. Returns U, Σ (diagonal), V. */
export function svd2d(A: Matrix2x2): Svd2DResult {
  const [[a, b], [c, d]] = A;
  const at = transpose2(A);
  const ata = mul2(at, A);
  const [[p, q], [q_, r]] = ata;
  const trace = p + r;
  const det = p * r - q * q;
  const disc = trace * trace - 4 * det;
  const sqrtDisc = disc >= 0 ? Math.sqrt(disc) : 0;
  const sigma1Sq = (trace + sqrtDisc) / 2;
  const sigma2Sq = (trace - sqrtDisc) / 2;
  const sigma1 = Math.sqrt(Math.max(0, sigma1Sq));
  const sigma2 = Math.sqrt(Math.max(0, sigma2Sq));

  // Eigenvector of AᵀA for λ = σ1²: (AᵀA - σ1² I) v = 0
  const getV1 = (): [number, number] => {
    if (Math.abs(q) > 1e-10) return [q, sigma1Sq - p];
    if (Math.abs(p - sigma1Sq) < 1e-10) return [1, 0];
    return [0, 1];
  };
  const getV2 = (): [number, number] => {
    if (Math.abs(q) > 1e-10) return [q, sigma2Sq - p];
    if (Math.abs(p - sigma2Sq) < 1e-10) return [0, 1];
    return [1, 0];
  };

  let v1 = getV1();
  let v2 = getV2();
  const n1 = Math.hypot(v1[0], v1[1]) || 1;
  const n2 = Math.hypot(v2[0], v2[1]) || 1;
  v1 = [v1[0] / n1, v1[1] / n1];
  v2 = [v2[0] / n2, v2[1] / n2];
  // Ensure right-handed: det(V) = +1 (rotation)
  if (v1[0] * v2[1] - v1[1] * v2[0] < 0) v2 = [-v2[0], -v2[1]];
  const V: Matrix2x2 = [[v1[0], v2[0]], [v1[1], v2[1]]];

  const Sigma: Matrix2x2 = [[sigma1, 0], [0, sigma2]];

  // U = A V Σ⁻¹ (for σ > 0)
  const invSigma: Matrix2x2 = [
    [sigma1 > 1e-10 ? 1 / sigma1 : 0, 0],
    [0, sigma2 > 1e-10 ? 1 / sigma2 : 1],
  ];
  let U = mul2(A, mul2(V, invSigma));
  if (sigma1 <= 1e-10) {
    U[0][0] = 1; U[0][1] = 0;
    U[1][0] = 0; U[1][1] = 1;
  }
  const detU = U[0][0] * U[1][1] - U[0][1] * U[1][0];
  if (detU < 0) {
    U = [[-U[0][0], -U[0][1]], [U[1][0], U[1][1]]];
  }
  return { U, Sigma, V };
}

/** Effective matrix for current SVD stages: I → Vᵀ → ΣVᵀ → UΣVᵀ = A */
export function svdEffectiveMatrix(result: Svd2DResult, stages: SvdStages): Matrix2x2 {
  const { U, Sigma, V } = result;
  const VT = transpose2(V);
  if (!stages.vT) return [[1, 0], [0, 1]];
  let M = VT;
  if (stages.sigma) M = mul2(Sigma, M);
  if (stages.u) M = mul2(U, M);
  return M;
}
