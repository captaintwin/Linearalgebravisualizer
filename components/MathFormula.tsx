
import React, { useMemo } from 'react';
import katex from 'katex';

interface MathFormulaProps {
  formula: string;
  displayMode?: boolean;
  className?: string;
}

const MathFormula: React.FC<MathFormulaProps> = ({ formula, displayMode = false, className = "" }) => {
  const html = useMemo(() => {
    try {
      // Пытаемся получить объект katex (поддерживаем разные варианты экспорта esm.sh)
      const k = (katex as any).default || katex;
      return k.renderToString(formula, {
        displayMode,
        throwOnError: false,
        trust: true,
        strict: false
      });
    } catch (e) {
      console.error("KaTeX rendering error:", e);
      return `<span>${formula}</span>`;
    }
  }, [formula, displayMode]);

  return (
    <span 
      className={`math-formula inline-block transition-all duration-300 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MathFormula;
