
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
  gridColor: string;
  originalGridColor: string;
  gridThickness: number;
  originalGridThickness: number;
}

const VectorCanvas: React.FC<VectorCanvasProps> = ({ 
  matrix, vectors, setVectors, scalar, showGrid, showOriginalGrid, 
  gridColor, originalGridColor, gridThickness, originalGridThickness 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const inverseMatrix = useMemo(() => {
    const [[a, b], [c, d]] = matrix;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-6) return null;
    return [[d / det, -b / det], [-c / det, a / det]] as Matrix2x2;
  }, [matrix]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const margin = 40;
    const extent = 6;

    const xScale = d3.scaleLinear().domain([-extent, extent]).range([margin, width - margin]);
    const yScale = d3.scaleLinear().domain([-extent, extent]).range([height - margin, margin]);

    svg.selectAll('*').remove();
    const g = svg.append('g');

    // 1. Отрисовка оригинальной (статичной) сетки
    if (showOriginalGrid) {
      const originalGridG = g.append('g').attr('class', 'original-grid');
      d3.range(-extent, extent + 1).forEach(i => {
        // Вертикальные линии
        originalGridG.append('line')
          .attr('x1', xScale(i)).attr('y1', yScale(-extent))
          .attr('x2', xScale(i)).attr('y2', yScale(extent))
          .attr('stroke', originalGridColor)
          .attr('stroke-width', originalGridThickness)
          .attr('stroke-dasharray', '2,2')
          .attr('opacity', 0.6);
        // Горизонтальные линии
        originalGridG.append('line')
          .attr('x1', xScale(-extent)).attr('y1', yScale(i))
          .attr('x2', xScale(extent)).attr('y2', yScale(i))
          .attr('stroke', originalGridColor)
          .attr('stroke-width', originalGridThickness)
          .attr('stroke-dasharray', '2,2')
          .attr('opacity', 0.6);
      });
    }

    // 2. Визуализация определителя (площадь трансформации)
    // We scale the unit area basis vectors by the scalar as well
    const i_t = { x: 1 * matrix[0][0] * scalar, y: 1 * matrix[1][0] * scalar };
    const j_t = { x: 1 * matrix[0][1] * scalar, y: 1 * matrix[1][1] * scalar };
    const k_t = { x: i_t.x + j_t.x, y: i_t.y + j_t.y };

    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'areaGradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#6366f1').attr('stop-opacity', 0.5);
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#a855f7').attr('stop-opacity', 0.1);

    g.append('path')
      .attr('d', `M ${xScale(0)} ${yScale(0)} L ${xScale(i_t.x)} ${yScale(i_t.y)} L ${xScale(k_t.x)} ${yScale(k_t.y)} L ${xScale(j_t.x)} ${yScale(j_t.y)} Z`)
      .attr('fill', 'url(#areaGradient)')
      .attr('stroke', '#6366f1')
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.3);

    // 3. Трансформированная сетка (scaled by scalar)
    if (showGrid) {
      d3.range(-extent, extent + 1).forEach(x => {
        const tS = { 
          x: (x * matrix[0][0] + (-extent) * matrix[0][1]) * scalar, 
          y: (x * matrix[1][0] + (-extent) * matrix[1][1]) * scalar 
        };
        const tE = { 
          x: (x * matrix[0][0] + extent * matrix[0][1]) * scalar, 
          y: (x * matrix[1][0] + extent * matrix[1][1]) * scalar 
        };
        g.append('line').attr('x1', xScale(tS.x)).attr('y1', yScale(tS.y)).attr('x2', xScale(tE.x)).attr('y2', yScale(tE.y)).attr('stroke', gridColor).attr('stroke-width', gridThickness).attr('opacity', 0.7);
      });
      d3.range(-extent, extent + 1).forEach(y => {
        const tS = { 
          x: ((-extent) * matrix[0][0] + y * matrix[0][1]) * scalar, 
          y: ((-extent) * matrix[1][0] + y * matrix[1][1]) * scalar 
        };
        const tE = { 
          x: (extent * matrix[0][0] + y * matrix[0][1]) * scalar, 
          y: (extent * matrix[1][0] + y * matrix[1][1]) * scalar 
        };
        g.append('line').attr('x1', xScale(tS.x)).attr('y1', yScale(tS.y)).attr('x2', xScale(tE.x)).attr('y2', yScale(tE.y)).attr('stroke', gridColor).attr('stroke-width', gridThickness).attr('opacity', 0.7);
      });
    }

    // Главные оси
    g.append('line').attr('x1', xScale(-extent)).attr('y1', yScale(0)).attr('x2', xScale(extent)).attr('y2', yScale(0)).attr('stroke', '#475569').attr('stroke-width', 1.5);
    g.append('line').attr('x1', xScale(0)).attr('y1', yScale(-extent)).attr('x2', xScale(0)).attr('y2', yScale(extent)).attr('stroke', '#475569').attr('stroke-width', 1.5);

    defs.append('marker').attr('id', 'arrow').attr('viewBox', '0 -5 10 10').attr('refX', 8).attr('refY', 0).attr('orient', 'auto').attr('markerWidth', 6).attr('markerHeight', 6).append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#fff');

    vectors.forEach((v, i) => {
      const tx = (v.x * matrix[0][0] + v.y * matrix[0][1]) * scalar;
      const ty = (v.x * matrix[1][0] + v.y * matrix[1][1]) * scalar;
      const vg = g.append('g').style('cursor', 'crosshair');
      
      vg.append('line')
        .attr('x1', xScale(0))
        .attr('y1', yScale(0))
        .attr('x2', xScale(tx))
        .attr('y2', yScale(ty))
        .attr('stroke', v.color)
        .attr('stroke-width', 3)
        .attr('marker-end', 'url(#arrow)');

      vg.append('circle')
        .attr('cx', xScale(tx))
        .attr('cy', yScale(ty))
        .attr('r', 15)
        .attr('fill', 'transparent');

      vg.append('text')
        .attr('x', xScale(tx) + 10)
        .attr('y', yScale(ty))
        .text(v.label)
        .attr('fill', v.color)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .style('pointer-events', 'none');

      vg.call(d3.drag<SVGGElement, any>().on('drag', (event) => {
        if (!svgRef.current) return;
        const [ptrX, ptrY] = d3.pointer(event, svgRef.current);
        const mx = xScale.invert(ptrX);
        const my = yScale.invert(ptrY);
        
        // When dragging, we invert both the matrix AND the scalar
        let rx = mx, ry = my;
        const effectiveScalar = Math.abs(scalar) < 1e-6 ? 1e-6 : scalar;
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

  }, [matrix, vectors, scalar, showGrid, showOriginalGrid, gridColor, originalGridColor, gridThickness, originalGridThickness, inverseMatrix, setVectors]);

  return (
    <div className="w-full h-full bg-slate-900/30 rounded-xl border border-slate-800 overflow-hidden relative shadow-inner">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 pointer-events-none flex flex-col gap-1">
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter bg-slate-950/50 px-2 py-1 rounded w-fit">Interactive 2D Space</span>
        {showOriginalGrid && <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest px-2">Basis grid active</span>}
      </div>
    </div>
  );
};

export default VectorCanvas;
