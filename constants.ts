
import { Matrix2x2, Matrix3x3, Vector2D, Vector3D } from './types';

export const INITIAL_MATRIX_2D: Matrix2x2 = [[1, 0], [0, 1]];
export const INITIAL_VECTORS_2D: Vector2D[] = [
  { x: 1, y: 0, label: 'î', color: '#60a5fa' },
  { x: 0, y: 1, label: 'ĵ', color: '#f87171' },
  { x: 1, y: 1, label: 'v', color: '#34d399' }
];

export const INITIAL_MATRIX_3D: Matrix3x3 = [[1,0,0], [0,1,0], [0,0,1]];
export const INITIAL_VECTORS_3D: Vector3D[] = [
  { x: 1, y: 0, z: 0, label: 'î', color: '#60a5fa' },
  { x: 0, y: 1, z: 0, label: 'ĵ', color: '#f87171' },
  { x: 0, y: 0, z: 1, label: 'k̂', color: '#fb923c' }
];

export const PRESET_TRANSFORMATIONS_2D: Record<string, Matrix2x2> = {
  Identity: [[1, 0], [0, 1]],
  '90° Rotation': [[0, -1], [1, 0]],
  'Horizontal Shear': [[1, 1], [0, 1]],
  'Reflection (Y)': [[-1, 0], [0, 1]],
  '1D Blur Kernel': [[0.5, 0.5], [0.5, 0.5]],
  'Signal Shift': [[0, 1], [1, 0]],
  'Zeroing Y': [[1, 0], [0, 0]]
};

export const PRESET_TRANSFORMATIONS_3D: Record<string, Matrix3x3> = {
  Identity: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  'Rotate X (45°)': [[1, 0, 0], [0, 0.7, -0.7], [0, 0.7, 0.7]],
  '3D Blur (Avg)': [[0.33, 0.33, 0.33], [0.33, 0.33, 0.33], [0.33, 0.33, 0.33]],
  'Projection XY': [[1, 0, 0], [0, 1, 0], [0, 0, 0]]
};
