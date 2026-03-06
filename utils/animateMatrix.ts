import type { Matrix2x2, Matrix3x3 } from '../types';

/** Ease-in-out sine — smooth ping-pong with zero velocity at turnaround */
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function lerpMatrix2D(a: Matrix2x2, b: Matrix2x2, t: number): Matrix2x2 {
  const s = easeInOutSine(Math.max(0, Math.min(1, t)));
  return [
    [a[0][0] + (b[0][0] - a[0][0]) * s, a[0][1] + (b[0][1] - a[0][1]) * s],
    [a[1][0] + (b[1][0] - a[1][0]) * s, a[1][1] + (b[1][1] - a[1][1]) * s]
  ];
}

export function lerpMatrix3D(a: Matrix3x3, b: Matrix3x3, t: number): Matrix3x3 {
  const s = easeInOutSine(Math.max(0, Math.min(1, t)));
  return a.map((row, i) =>
    row.map((v, j) => v + (b[i][j] - v) * s)
  ) as Matrix3x3;
}
