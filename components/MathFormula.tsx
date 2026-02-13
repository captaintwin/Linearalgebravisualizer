
import React, { useEffect, useRef } from 'react';

interface MathFormulaProps {
  formula: string;
  displayMode?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const MathFormula: React.FC<MathFormulaProps> = ({ formula, displayMode = false, className = "", style }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current && (window as any).MathJax) {
      const mathjax = (window as any).MathJax;
      
      // Оборачиваем формулу в делимитеры для MathJax
      const tex = displayMode ? `\\[ ${formula} \\]` : `$ ${formula} $`;
      containerRef.current.innerHTML = tex;

      // Запускаем перерисовку конкретного элемента
      if (mathjax.typesetPromise) {
        mathjax.typesetPromise([containerRef.current]).catch((err: any) => {
          console.warn('MathJax typeset failed:', err);
        });
      }
    } else if (containerRef.current) {
      containerRef.current.textContent = formula;
    }
  }, [formula, displayMode]);

  return (
    <span 
      ref={containerRef} 
      className={`inline-block min-h-[1.2em] transition-opacity duration-300 ${className}`}
      style={style}
    />
  );
};

export default MathFormula;
