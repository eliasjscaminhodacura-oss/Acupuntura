'use client';

import { useMemo, useRef, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import Ear2D from './Ear2D';
import { buscar, MODELO, PONTOS, REGIAO, REGIOES, type Lado, type RegiaoId } from '@/lib/auriculo';
import type { Visual } from '@/lib/ear3d';

// O 3D (three.js + modelo da orelha) é pesado: só é baixado nesta tela.
const Ear3D = dynamic(() => import('./Ear3D'), {
  ssr: false,
  loading: () => <div className="body3d-loading">Carregando a orelha em 3D…</div>,
});

// Atlas de auriculoterapia: orelha 3D (holograma ou pele) ou mapa 2D,
// busca por nome/indicação, filtro por região e a ficha de cada ponto.
export default function EarAtlas() {
  const [lado, setLado] = useState<Lado>('esquerda');
  const [visual, setVisual] = useState<Visual>('holograma');
  const [mode, setMode] = useState<'3d' | '2d'>('3d');
  const [no3d, setNo3d] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [regioes, setRegioes] = useState<Set<RegiaoId>>(new Set());
  const viewerRef = useRef<HTMLDivElement>(null);

  const found = useMemo(() => buscar(query, regioes), [query, regioes]);
  const filtering = query.trim() !== '' || regioes.size > 0;
  const highlighted = useMemo(() => (filtering ? new Set(found.map((p) => p.codigo)) : null), [filtering, found]);
  const ponto = selected ? PONTOS.find((p) => p.codigo === selected) ?? null : null;
  const show3d = mode === '3d' && !no3d;

  const toggleRegiao = (id: RegiaoId) =>
    setRegioes((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Escolher na lista: mostra o ponto na orelha.
  const pick = (code: string) => {
    setSelected(code);
    viewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <div className="panel" ref={viewerRef}>
        <div className="ear-controls">
          <div className="body3d-row">
            <span className="body3d-row-title">Orelha</span>
            {(['esquerda', 'direita'] as Lado[]).map((l) => (
              <button key={l} type="button" className={'body3d-chip' + (lado === l ? ' on' : '')} aria-pressed={lado === l} onClick={() => setLado(l)}>
                {l === 'esquerda' ? 'Esquerda' : 'Direita'}
              </button>
            ))}
          </div>
          {show3d && (
            <div className="body3d-row">
              <span className="body3d-row-title">Visual</span>
              <button type="button" className={'body3d-chip' + (visual === 'holograma' ? ' on' : '')} style={{ '--chip': '#5CE1E6' } as CSSProperties}
                aria-pressed={visual === 'holograma'} onClick={() => setVisual('holograma')}>
                <span className="dot" />Holograma
              </button>
              <button type="button" className={'body3d-chip' + (visual === 'pele' ? ' on' : '')} style={{ '--chip': '#d9a58c' } as CSSProperties}
                aria-pressed={visual === 'pele'} onClick={() => setVisual('pele')}>
                <span className="dot" />Pele real
              </button>
            </div>
          )}
          {!no3d && (
            <button type="button" className="secondary small" onClick={() => setMode((m) => (m === '3d' ? '2d' : '3d'))}>
              {mode === '3d' ? 'Ver mapa 2D (frente e dorso)' : 'Ver em 3D'}
            </button>
          )}
        </div>

        {show3d ? (
          <Ear3D lado={lado} visual={visual} selected={selected} highlighted={highlighted} onSelect={setSelected} onFail={() => setNo3d(true)} />
        ) : (
          <div className="ear2d">
            <Ear2D face="frente" lado={lado} selected={selected} highlighted={highlighted} onSelect={setSelected} />
            <Ear2D face="dorso" lado={lado} selected={selected} highlighted={highlighted} onSelect={setSelected} />
          </div>
        )}

        {ponto ? (
          <div className="ear-card" style={{ '--reg': REGIAO[ponto.regiao].cor } as CSSProperties}>
            <div className="ear-card-head">
              <span className="ear-code">{ponto.codigo}</span>
              <div>
                <h3>{ponto.nome}</h3>
                <div className="ear-sub">{ponto.chines} · {REGIAO[ponto.regiao].nome}</div>
              </div>
              <button type="button" className="secondary small" onClick={() => setSelected(null)} aria-label="Fechar">✕</button>
            </div>
            <h4>Localização</h4>
            <p>{ponto.localizacao}</p>
            <h4>Indicações principais</h4>
            <p>{ponto.indicacoes}</p>
            {!show3d && !(ponto.regiao === 'P' || ponto.regiao === 'R' ? ponto.dorso.visivel : ponto.frente.visivel) && (
              <p className="ear-note">Este ponto fica numa dobra escondida nesta vista (marcado tracejado). No 3D dá para girar e vê-lo.</p>
            )}
          </div>
        ) : (
          <p className="ear-help">Toque num ponto da orelha ou escolha na lista abaixo para ver a localização e as indicações.</p>
        )}
      </div>

      <div className="panel">
        <input type="search" placeholder="Buscar ponto ou indicação (ex.: Shen Men, insônia, Rim, cefaleia)…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="body3d-row" style={{ marginBottom: 12 }}>
          <span className="body3d-row-title">Regiões</span>
          {REGIOES.map((r) => (
            <button key={r.id} type="button" className={'body3d-chip' + (regioes.has(r.id) ? ' on' : '')} style={{ '--chip': r.cor } as CSSProperties}
              aria-pressed={regioes.has(r.id)} title={r.descricao} onClick={() => toggleRegiao(r.id)}>
              <span className="dot" />{r.nome}
            </button>
          ))}
          {filtering && (
            <button type="button" className="body3d-chip" onClick={() => { setQuery(''); setRegioes(new Set()); }}>Limpar</button>
          )}
        </div>

        <p className="ear-help">{found.length} {found.length === 1 ? 'ponto' : 'pontos'}{filtering ? ' encontrados' : ''}</p>
        {REGIOES.filter((r) => found.some((p) => p.regiao === r.id)).map((r) => (
          <div key={r.id} className="ear-group">
            <h4 style={{ borderColor: r.cor }}>{r.nome} <small>{r.descricao}</small></h4>
            <ul className="point-list">
              {found.filter((p) => p.regiao === r.id).map((p) => (
                <li key={p.codigo} className={selected === p.codigo ? 'active' : undefined} onClick={() => pick(p.codigo)}>
                  <strong>{p.codigo}</strong> — {p.nome}
                  <div className="point-syn">{p.indicacoes}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="ear-credit">
        {MODELO.fonte} Localização aproximada: confirme sempre pela anatomia da orelha de cada paciente.
        <br />
        {MODELO.credito}
      </p>
    </>
  );
}
