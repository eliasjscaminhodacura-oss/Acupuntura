import type { Metadata } from 'next';
import './globals.css';
import ScrollButtons from '@/components/ScrollButtons';

export const metadata: Metadata = {
  title: 'Método de Anamnese em MTC by Elias JS · Caminho da Cura',
  description: 'Ficha de Anamnese pela Medicina Tradicional Chinesa',
  icons: { icon: '/logo.jpg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <ScrollButtons />
      </body>
    </html>
  );
}
