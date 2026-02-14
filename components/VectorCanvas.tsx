
import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Vector2D, Matrix2x2 } from '../types';

interface VectorCanvasProps {
  matrix: Matrix2x2;
  vectors: Vector2D[];
  setVectors: React.Dispatch<React.SetStateAction<Vector2D[]>>;
  scalar: number;
  showGrid: boolean;
  showOriginalGrid: boolean;
  showEigenvectors: boolean;
  gridColor: string;
  originalGridColor: string;
  gridThickness: number;
  originalGridThickness: number;
}

const VectorCanvas: React.FC<VectorCanvasProps> = ({ 
  matrix, vectors, setVectors, scalar, showGrid, showOriginalGrid, showEigenvectors,
  gridColor, originalGridColor, gridThickness, originalGridThickness 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const inverseMatrix = useMemo(() => {
    const [[a, b], [c, d]] = matrix;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-6) return null;
    return [[d / det, -b / det], [-c / det, a / det]] as Matrix2x2;
  }, [matrix]);

  // Calculate real eigenvectors and eigenvalues
  const eigenData = useMemo(() => {
    const [[a, b], [c, d]] = matrix;
    const trace = a + d;
    const det = a * d - b * c;
    const disc = trace * trace - 4 * det;

    if (disc < 0) return null; // No real eigenvalues

    const lambda1 = (trace + Math.sqrt(disc)) / 2;
    const lambda2 = (trace - Math.sqrt(disc)) / 2;

    const findEigenvector = (lambda: number) => {
      // Solve (A - lambda*I)v = 0
      // [a-lambda  b] [x] = [0]
      // [c       d-lambda] [y] = [0]
      if (Math.abs(b) > 1e-6) return { x: lambda - d, y: b };
      if (Math.abs(c) > 1e-6) return { x: c, y: lambda - a };
      if (Math.abs(a - lambda) < 1e-6 && Math.abs(d - lambda) < 1e-6) return { x: 1, y: 0 };
      return { x: 0, y: 1 };
    };

    const v1 = findEigenvector(lambda1);
    const v2 = findEigenvector(lambda2);

    return [
      { lambda: lambda1, v: v1, color: '#fbbf24' }, // Amber
      { lambda: lambda2, v: v2, color: '#fb7185' }  // Rose
    ];
  }, [matrix]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const margin = 40;
    const extent = 10; // Slightly larger view for eigenvectors

    const xScale = d3.scaleLinear().domain([-extent, extent]).range([margin, width - margin]);
    const yScale = d3.scaleLinear().domain([-extent, extent]).range([height - margin, margin]);

    svg.selectAll('*').remove();
    const g = svg.append('g');

    // 1. Basis Grid
    if (showOriginalGrid) {
      const originalGridG = g.append('g').attr('class', 'original-grid');
      d3.range(-extent, extent + 1).forEach(i => {
        originalGridG.append('line')
          .attr('x1', xScale(i)).attr('y1', yScale(-extent))
          .attr('x2', xScale(i)).attr('y2', yScale(extent))
          .attr('stroke', originalGridColor).attr('stroke-width', originalGridThickness).attr('opacity', 0.2);
        originalGridG.append('line')
          .attr('x1', xScale(-extent)).attr('y1', yScale(i))
          .attr('x2', xScale(extent)).attr('y2', yScale(i))
          .attr('stroke', originalGridColor).attr('stroke-width', originalGridThickness).attr('opacity', 0.2);
      });
    }

    // 2. Transformed Grid
    if (showGrid) {
      d3.range(-extent, extent + 1, 1).forEach(x => {
        const tS = { x: (x * matrix[0][0] + (-extent) * matrix[0][1]) * scalar, y: (x * matrix[1][0] + (-extent) * matrix[1][1]) * scalar };
        const tE = { x: (x * matrix[0][0] + extent * matrix[0][1]) * scalar, y: (x * matrix[1][0] + extent * matrix[1][1]) * scalar };
        g.append('line').attr('x1', xScale(tS.x)).attr('y1', yScale(tS.y)).attr('x2', xScale(tE.x)).attr('y2', yScale(tE.y)).attr('stroke', gridColor).attr('stroke-width', gridThickness).attr('opacity', 0.5);
      });
      d3.range(-extent, extent + 1, 1).forEach(y => {
        const tS = { x: ((-extent) * matrix[0][0] + y * matrix[0][1]) * scalar, y: ((-extent) * matrix[1][0] + y * matrix[1][1]) * scalar };
        const tE = { x: (extent * matrix[0][0] + y * matrix[0][1]) * scalar, y: (extent * matrix[1][0] + y * matrix[1][1]) * scalar };
        g.append('line').attr('x1', xScale(tS.x)).attr('y1', yScale(tS.y)).attr('x2', xScale(tE.x)).attr('y2', yScale(tE.y)).attr('stroke', gridColor).attr('stroke-width', gridThickness).attr('opacity', 0.5);
      });
    }

    // 3. Main Axes
    g.append('line').attr('x1', xScale(-extent)).attr('y1', yScale(0)).attr('x2', xScale(extent)).attr('y2', yScale(0)).attr('stroke', '#475569').attr('stroke-width', 1).attr('opacity', 0.5);
    g.append('line').attr('x1', xScale(0)).attr('y1', yScale(-extent)).attr('x2', xScale(0)).attr('y2', yScale(extent)).attr('stroke', '#475569').attr('stroke-width', 1).attr('opacity', 0.5);

    // 4. Eigenvectors
    if (showEigenvectors && eigenData) {
      eigenData.forEach(data => {
        const { v, color } = data;
        const mag = Math.sqrt(v.x * v.x + v.y * v.y);
        if (mag < 1e-6) return;

        // Draw line representing the span
        const normV = { x: v.x / mag, y: v.y / mag };
        g.append('line')
          .attr('x1', xScale(normV.x * -extent))
          .attr('y1', yScale(normV.y * -extent))
          .attr('x2', xScale(normV.x * extent))
          .attr('y2', yScale(normV.y * extent))
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '5,5')
          .attr('opacity', 0.6);
        
        // Label the span
        g.append('text')
          .attr('x', xScale(normV.x * (extent-1)))
          .attr('y', yScale(normV.y * (extent-1)) - 5)
          .text(`λ=${data.lambda.toFixed(2)}`)
          .attr('fill', color)
          .attr('font-size', '10px')
          .attr('font-weight', 'black')
          .attr('text-anchor', 'middle');
      });
    }

    const defs = svg.append('defs');
    defs.append('marker').attr('id', 'arrow').attr('viewBox', '0 -5 10 10').attr('refX', 8).attr('refY', 0).attr('orient', 'auto').attr('markerWidth', 6).attr('markerHeight', 6).append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#fff');

    // 5. Vectors
    vectors.forEach((v, i) => {
      const tx = (v.x * matrix[0][0] + v.y * matrix[0][1]) * scalar;
      const ty = (v.x * matrix[1][0] + v.y * matrix[1][1]) * scalar;
      const vg = g.append('g').style('cursor', 'crosshair');
      
      vg.append('line')
        .attr('x1', xScale(0)).attr('y1', yScale(0))
        .attr('x2', xScale(tx)).attr('y2', yScale(ty))
        .attr('stroke', v.color).attr('stroke-width', 3).attr('marker-end', 'url(#arrow)');

      vg.append('circle').attr('cx', xScale(tx)).attr('cy', yScale(ty)).attr('r', 15).attr('fill', 'transparent');

      vg.append('text').attr('x', xScale(tx) + 10).attr('y', yScale(ty)).text(v.label).attr('fill', v.color).attr('font-size', '12px').attr('font-weight', 'bold');

      vg.call(d3.drag<SVGGElement, any>().on('drag', (event) => {
        if (!svgRef.current) return;
        const [ptrX, ptrY] = d3.pointer(event, svgRef.current);
        const mx = xScale.invert(ptrX);
        const my = yScale.invert(ptrY);
        const effectiveScalar = Math.abs(scalar) < 1e-6 ? 1e-6 : scalar;
        
        let rx = mx, ry = my;
        if (inverseMatrix) {
          rx = (mx * inverseMatrix[0][0] + my * inverseMatrix[0][1]) / effectiveScalar;
          ry = (mx * inverseMatrix[1][0] + my * inverseMatrix[1][1]) / effectiveScalar;
        } else {
          rx = mx / effectiveScalar;
          ry = my / effectiveScalar;
        }
        
        const updated = [...vectors];
        updated[i] = { ...updated[i], x: Number(rx.toFixed(2)), y: Number(ry.toFixed(2)) };
        setVectors(updated);
      }) as any);
    });

  }, [matrix, vectors, scalar, showGrid, showOriginalGrid, showEigenvectors, gridColor, originalGridColor, gridThickness, originalGridThickness, inverseMatrix, eigenData, setVectors]);

  return (
    <div className="w-full h-full bg-slate-900/30 rounded-xl border border-slate-800 overflow-hidden relative shadow-inner">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default VectorCanvas;
