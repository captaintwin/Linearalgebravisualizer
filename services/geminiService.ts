
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiInsight, Matrix2x2, Matrix3x3, Vector2D, Vector3D } from "../types";

/**
 * Formats vector data into a readable string for the LLM prompt.
 */
const formatVectorsForPrompt = (vectors: (Vector2D | Vector3D)[]) => {
  return vectors.map((v) => {
    const v3 = v as Vector3D;
    return `${v.label}(${v.x}, ${v.y}${v3.z !== undefined ? `, ${v3.z}` : ''})`;
  }).join(', ');
};

export const getMatrixInsights = async (matrix: Matrix2x2 | Matrix3x3, vectors: (Vector2D | Vector3D)[]): Promise<GeminiInsight | null> => {
  // Always create a new GoogleGenAI instance right before the call to ensure the latest API key is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const matrixStr = JSON.stringify(matrix);
  const vectorsStr = formatVectorsForPrompt(vectors);

  const prompt = `Analyze the linear transformation represented by the matrix ${matrixStr}. 
  The current vectors in the space are: ${vectorsStr}. 
  Explain what this transformation does geometrically (rotation, scaling, shear, projection, etc.). 
  Calculate the determinant and explain its meaning regarding volume/area change.
  If it's 3D, mention the orientation.
  
  IMPORTANT: Use LaTeX notation for ALL mathematical formulas and variables. 
  Wrap formulas in single dollar signs, for example: $A \\vec{v} = \\vec{w}$ or $\\det(M) = 1$.
  Format the response as a clear educational summary for a student.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { 
              type: Type.STRING,
              description: 'A catchy title for the analysis'
            },
            explanation: { 
              type: Type.STRING, 
              description: 'General geometric explanation of the transformation'
            },
            mathDetails: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Detailed points about determinant, trace, and other properties'
            }
          },
          required: ["title", "explanation", "mathDetails"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim()) as GeminiInsight;
    }
    return null;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return null;
  }
};
