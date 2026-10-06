'use client';

import { useEffect, useState } from 'react';

const MARGIN = 600; // distância (px) do topo/fim a partir da qual o botão aparece

// Botões flutuantes "voltar ao início" (↑) e "ir para o final" (↓). Cada um
// só aparece quando faz sentido: ↑ depois de descer um pouco, ↓ enquanto
// ainda não se chegou perto do fim da página.
export default function ScrollButtons() {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      const remaining = document.documentElement.scrollHeight - (y + window.innerHeight);
      setShowTop(y > MARGIN);
      setShowBottom(remaining > MARGIN);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    // a página cresce depois de carregar (ex.: resultado, gráficos)
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, []);

  if (!showTop && !showBottom) return null;
  return (
    <div className="scroll-buttons">
      {showTop && (
        <button
          className="scroll-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Voltar ao início da página"
          title="Voltar ao início"
        >
          ↑
        </button>
      )}
      {showBottom && (
        <button
          className="scroll-btn"
          onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
          aria-label="Ir para o final da página"
          title="Ir para o final"
        >
          ↓
        </button>
      )}
    </div>
  );
}
