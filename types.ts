
export interface Vector2D {
  x: number;
  y: number;
  label: string;
  color: string;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
  label: string;
  color: string;
}

export type Matrix2x2 = [[number, number], [number, number]];
export type Matrix3x3 = [[number, number, number], [number, number, number], [number, number, number]];

export type DimensionMode = '2D' | '3D';
export type ControlTab = 'transform' | 'operations' | 'settings';

/**
 * Interface for the AI-generated geometric insights.
 * Used for structured JSON responses from Gemini.
 */
export interface GeminiInsight {
  title: string;
  explanation: string;
  mathDetails: string[];
}
