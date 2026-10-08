# Corpo ilustrado (estilo atlas) — mapa 2D e PDF

As imagens `public/corpo/ilustrado-{masculino,feminino}-{front,back}.webp`
(tela, fundo transparente) e `.jpg` (PDF, fundo claro), a área delas
(`src/data/corpo-ilustrado-img.json`) e os dados de cada vista — contorno do
corpo, silhuetas dos órgãos e os 71 pontos no plano da imagem
(`src/data/corpo-ilustrado.json`) — saem de dois passos.

## 1. Encaixe (Node)

```
npm run corpo:ilustrado
```

Encaixa músculos, ossos, artérias e veias do BodyParts3D nos corpos
MakeHuman (tronco como os órgãos; braços e pernas pelas juntas; pé girado
no tornozelo, porque o atlas foi escaneado deitado). Grava
`scripts/.ilustrado/{masculino,feminino}.glb` (fora do git) e
`src/data/corpo-ilustrado.json`. Na 1ª vez baixa o atlas (~143 MB).

## 2. Fotos (navegador, com `npm run dev` ligado)

1. Copiar `scripts/.ilustrado/masculino.glb` e `feminino.glb` para
   `public/corpo/tmp-ilustrado-masculino.glb` e `tmp-ilustrado-feminino.glb`.
2. Copiar `page.tsx.txt` para `src/app/auth/zz-ilustrar/page.tsx` e
   `route.ts.txt` para `src/app/api/public/zz-save/route.ts`.
3. Abrir `http://localhost:3000/auth/zz-ilustrar` e esperar o título
   "PRONTO" (grava as fotos e o JSON pela rota, só em desenvolvimento).
4. Apagar as pastas temporárias (`zz-ilustrar`, `api/`) e os
   `tmp-ilustrado-*.glb`.

Fontes: BodyParts3D, © The Database Center for Life Science (CC BY 4.0);
MakeHuman (CC0); útero/ovários "Pelvic Organs from MRI" (CC BY 4.0). O
crédito aparece no aplicativo, embaixo do mapa.
