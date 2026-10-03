import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Método EliasJS · Caminho da Cura',
  description: 'Ficha de Anamnese pela Medicina Tradicional Chinesa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
