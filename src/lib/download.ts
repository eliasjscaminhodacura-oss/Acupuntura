// Baixa um arquivo gerado no navegador (ex.: PDF).
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Envia pelo menu "Compartilhar" do aparelho (no celular: WhatsApp etc.).
// Onde não houver esse menu (a maioria dos computadores), baixa o arquivo.
// Devolve 'shared', 'downloaded' ou 'cancelled'.
export async function shareOrDownload(blob: Blob, filename: string, text: string) {
  const file = new File([blob], filename, { type: blob.type });
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename, text });
      return 'shared' as const;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled' as const;
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded' as const;
}

export const fileSlug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
