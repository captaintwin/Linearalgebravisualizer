
import React, { useEffect, useRef } from 'react';

// Пытаемся импортировать katex, но также предусматриваем глобальный доступ через CDN
import * as katexModule from 'katex';

interface MathFormulaProps {
  formula: string;
  displayMode?: boolean;
  className?: string;
}

const MathFormula: React.FC<MathFormulaProps> = ({ formula, displayMode = false, className = "" }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        // Используем импортированный модуль или глобальную переменную (если импорт из importmap не сработал вовремя)
        const renderer = (window as any).katex || (katexModule as any).default || katexModule;
        
        if (renderer && typeof renderer.render === 'function') {
          renderer.render(formula, containerRef.current, {
            displayMode,
            throwOnError: false,
            trust: true
          });
        } else {
          // Фолбэк: если katex еще не загрузился, показываем сырой текст
          containerRef.current.textContent = formula;
        }
      } catch (e) {
        console.warn("KaTeX render failed, using fallback text", e);
        if (containerRef.current) containerRef.current.textContent = formula;
      }
    }
  }, [formula, displayMode]);

  return (
    <span 
      ref={containerRef} 
      className={`inline-block min-h-[1.2em] font-serif ${className}`}
      style={{ verticalAlign: 'middle' }}
    />
  );
};

export default MathFormula;
