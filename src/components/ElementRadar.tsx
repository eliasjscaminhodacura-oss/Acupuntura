'use client';

import { ELEMENTS_ORDER, ELEMENT_COLOR } from '@/lib/ficha-logic';

type Props = {
  scores: Record<string, number>;
  size?: number;
};

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (Math.PI / 180) * (deg - 90);
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

export default function ElementRadar({ scores, size = 260 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const rMax = size * 0.38;
  const max = Math.max(1, ...ELEMENTS_ORDER.map((e) => scores[e] || 0));
  const n = ELEMENTS_ORDER.length;
  const step = 360 / n;

  const points = ELEMENTS_ORDER.map((el, i) => {
    const value = scores[el] || 0;
    const r = (value / max) * rMax;
    const [x, y] = polar(cx, cy, r, i * step);
    return { el, x, y, value };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');

  const rings = [0.25, 0.5, 0.75, 1].map((f) => {
    const ringPts = ELEMENTS_ORDER.map((_, i) => polar(cx, cy, rMax * f, i * step));
    return ringPts.map((p) => p.join(',')).join(' ');
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((ring, i) => (
        <polygon key={i} points={ring} fill="none" stroke="#C9C4B5" strokeWidth={1} />
      ))}
      {ELEMENTS_ORDER.map((el, i) => {
        const [x, y] = polar(cx, cy, rMax, i * step);
        return (
          <line key={el} x1={cx} y1={cy} x2={x} y2={y} stroke="#C9C4B5" strokeWidth={1} />
        );
      })}
      <polygon
        points={polygon}
        fill="rgba(166,61,47,0.25)"
        stroke="#A63D2F"
        strokeWidth={2}
      />
      {points.map((p) => (
        <circle key={p.el} cx={p.x} cy={p.y} r={4} fill={ELEMENT_COLOR[p.el]} />
      ))}
      {ELEMENTS_ORDER.map((el, i) => {
        const [x, y] = polar(cx, cy, rMax + 22, i * step);
        return (
          <text
            key={el}
            x={x}
            y={y}
            fontSize={12}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={ELEMENT_COLOR[el]}
            fontWeight={600}
          >
            {el} ({scores[el] || 0})
          </text>
        );
      })}
    </svg>
  );
}
