'use client';

import { useState } from 'react';

// Logomarca "Método de Anamnese em MTC" (arquivo public/logo.jpg). A imagem
// é quadrada com cantos pretos; na tela e no PDF ela é recortada em círculo.
export const LOGO_SRC = '/logo.jpg';

// Some sozinha se o arquivo não existir.
export default function Logo({ size = 56 }: { size?: number }) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  return (
    <img
      src={LOGO_SRC}
      alt="Método de Anamnese em MTC · by EliasJs · Caminho da Cura"
      className="logo"
      style={{ width: size, height: size }}
      onError={() => setMissing(true)}
    />
  );
}

// Prepara a logo para o PDF: recorta em círculo (fundo transparente) e
// devolve como PNG. Devolve undefined se não houver logo.
export async function loadLogoDataUrl(size = 600): Promise<string | undefined> {
  try {
    const res = await fetch(LOGO_SRC);
    if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) return undefined;
    const url = URL.createObjectURL(await res.blob());
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.485, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 0, 0, size, size);
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return undefined;
  }
}
