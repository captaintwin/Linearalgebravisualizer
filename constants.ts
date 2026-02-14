
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
  'Identity (E)': [[1, 0], [0, 1]],
  'Scale (2x)': [[2, 0], [0, 2]],
  'Scale (0.5x)': [[0.5, 0], [0, 0.5]],
  'Stretch X': [[2, 0], [0, 1]],
  'Stretch Y': [[1, 0], [0, 2]],
  'Rotate 30°': [[0.87, -0.5], [0.5, 0.87]],
  'Rotate 45°': [[0.71, -0.71], [0.71, 0.71]],
  'Rotate 90°': [[0, -1], [1, 0]],
  'Rotate 180°': [[-1, 0], [0, -1]],
  'X-Shear (1)': [[1, 1], [0, 1]],
  'Y-Shear (1)': [[1, 0], [1, 1]],
  'Reflect X-axis': [[1, 0], [0, -1]],
  'Reflect Y-axis': [[-1, 0], [0, 1]],
  'Reflect y=x': [[0, 1], [1, 0]],
  'Reflect y=-x': [[0, -1], [-1, 0]],
  'Project onto X': [[1, 0], [0, 0]],
  'Project onto Y': [[0, 0], [0, 1]],
  'Project onto y=x': [[0.5, 0.5], [0.5, 0.5]],
  'Permutation': [[0, 1], [1, 0]],
  'Zero Matrix': [[0, 0], [0, 0]],
  'Singular (Rank 1)': [[1, 1], [1, 1]]
};

export const PRESET_TRANSFORMATIONS_3D: Record<string, Matrix3x3> = {
  'Identity (E)': [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  'Scale (2x)': [[2, 0, 0], [0, 2, 0], [0, 0, 2]],
  'Scale (0.5x)': [[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5]],
  'Rotate X (90°)': [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
  'Rotate Y (90°)': [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
  'Rotate Z (90°)': [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
  'Rotate X (45°)': [[1, 0, 0], [0, 0.71, -0.71], [0, 0.71, 0.71]],
  'Rotate Y (45°)': [[0.71, 0, 0.71], [0, 1, 0], [-0.71, 0, 0.71]],
  'Rotate Z (45°)': [[0.71, -0.71, 0], [0.71, 0.71, 0], [0, 0, 1]],
  'Project XY Plane': [[1, 0, 0], [0, 1, 0], [0, 0, 0]],
  'Project YZ Plane': [[0, 0, 0], [0, 1, 0], [0, 0, 1]],
  'Project XZ Plane': [[1, 0, 0], [0, 0, 0], [0, 0, 1]],
  'Reflect XY Plane': [[1, 0, 0], [0, 1, 0], [0, 0, -1]],
  'Reflect YZ Plane': [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
  'Reflect XZ Plane': [[1, 0, 0], [0, -1, 0], [0, 0, 1]],
  'Flatten to X-axis': [[1, 0, 0], [0, 0, 0], [0, 0, 0]],
  'Flatten to Y-axis': [[0, 0, 0], [0, 1, 0], [0, 0, 0]],
  'Flatten to Z-axis': [[0, 0, 0], [0, 0, 0], [0, 0, 1]],
  'X-Y Swap': [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
  'Permute (XYZ->ZXY)': [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
  '3D Shear (XY)': [[1, 0, 1], [0, 1, 0], [0, 0, 1]],
  'Zero Space': [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
};
