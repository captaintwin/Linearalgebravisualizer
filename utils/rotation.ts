import type { Matrix2x2, Matrix3x3 } from '../types';

const DEG2RAD = Math.PI / 180;

/** Pure 2D rotation matrix (no scale/shear) */
export function rotation2D(deg: number): Matrix2x2 {
  const rad = deg * DEG2RAD;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [[c, -s], [s, c]];
}

/** Pure 3D rotation matrix around X, Y, or Z (no scale/shear) */
export function rotation3D(axis: 'X' | 'Y' | 'Z', deg: number): Matrix3x3 {
  const rad = deg * DEG2RAD;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  if (axis === 'X') return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (axis === 'Y') return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

/** Extract rotation angle (degrees) from 2D rotation matrix [[cos,-sin],[sin,cos]] */
export function angleFromRotation2D(m: Matrix2x2): number {
  return Math.atan2(m[1][0], m[0][0]) * (180 / Math.PI);
}

/** Extract axis and angle from 3D rotation matrix. Returns null if not a canonical axis rotation. */
export function angleFromRotation3D(m: Matrix3x3): { axis: 'X' | 'Y' | 'Z'; angle: number } | null {
  const eps = 0.01;
  if (Math.abs(m[0][1]) < eps && Math.abs(m[0][2]) < eps && Math.abs(m[1][0]) < eps && Math.abs(m[2][0]) < eps) {
    return { axis: 'X', angle: Math.atan2(m[2][1], m[1][1]) * (180 / Math.PI) };
  }
  if (Math.abs(m[0][1]) < eps && Math.abs(m[1][2]) < eps && Math.abs(m[1][0]) < eps && Math.abs(m[2][1]) < eps) {
    return { axis: 'Y', angle: Math.atan2(-m[2][0], m[0][0]) * (180 / Math.PI) };
  }
  if (Math.abs(m[0][2]) < eps && Math.abs(m[1][2]) < eps && Math.abs(m[2][0]) < eps && Math.abs(m[2][1]) < eps) {
    return { axis: 'Z', angle: Math.atan2(m[1][0], m[0][0]) * (180 / Math.PI) };
  }
  return null;
}
