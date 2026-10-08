// Ferramentas de contorno 2D: rasteriza triângulos numa grade, fecha
// frestas, tira os contornos (com buracos) e suaviza. Usadas por
// scripts/orgaos-2d.mjs e scripts/corpo-ilustrado.mjs.

export function rasterize(tris, bounds, CELL) {
  const [minX, minY, maxX, maxY] = bounds;
  const W = Math.ceil((maxX - minX) / CELL) + 4;
  const H = Math.ceil((maxY - minY) / CELL) + 4;
  const ox = minX - 2 * CELL;
  const oy = minY - 2 * CELL;
  const grid = new Uint8Array(W * H);
  for (const [a, b, c] of tris) {
    const xs = [a[0], b[0], c[0]].map((v) => (v - ox) / CELL);
    const ys = [a[1], b[1], c[1]].map((v) => (v - oy) / CELL);
    const x0 = Math.max(0, Math.floor(Math.min(...xs)));
    const x1 = Math.min(W - 1, Math.ceil(Math.max(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)));
    const d = (xs[1] - xs[0]) * (ys[2] - ys[0]) - (xs[2] - xs[0]) * (ys[1] - ys[0]);
    if (Math.abs(d) < 1e-9) continue;
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const px = gx + 0.5;
        const py = gy + 0.5;
        const w0 = ((xs[1] - px) * (ys[2] - py) - (xs[2] - px) * (ys[1] - py)) / d;
        const w1 = ((xs[2] - px) * (ys[0] - py) - (xs[0] - px) * (ys[2] - py)) / d;
        const w2 = 1 - w0 - w1;
        if (w0 >= -0.02 && w1 >= -0.02 && w2 >= -0.02) grid[gy * W + gx] = 1;
      }
    }
  }
  return { grid, W, H, ox, oy };
}

// fechamento morfológico (fecha frestas de 1 célula entre alças do intestino)
export function close(g, W, H) {
  const morph = (src, keep) => {
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let any = false;
        let all = true;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            const v = xx >= 0 && yy >= 0 && xx < W && yy < H ? src[yy * W + xx] : 0;
            if (v) any = true;
            else all = false;
          }
        }
        out[y * W + x] = keep === 'dilate' ? (any ? 1 : 0) : all ? 1 : 0;
      }
    }
    return out;
  };
  return morph(morph(g, 'dilate'), 'erode');
}

// Bordas entre células cheias e vazias, ligadas em laços (cheio à esquerda).
export function contours(g, W, H) {
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? g[y * W + x] : 0);
  const edges = new Map(); // "x,y" -> lista de destinos
  const add = (a, b) => {
    const k = a.join(',');
    if (!edges.has(k)) edges.set(k, []);
    edges.get(k).push(b);
  };
  for (let y = -1; y < H; y++) {
    for (let x = -1; x < W; x++) {
      const c = at(x, y);
      if (c !== at(x + 1, y)) {
        // borda vertical em x+1
        if (c) add([x + 1, y], [x + 1, y + 1]);
        else add([x + 1, y + 1], [x + 1, y]);
      }
      if (c !== at(x, y + 1)) {
        // borda horizontal em y+1
        if (c) add([x + 1, y + 1], [x, y + 1]);
        else add([x, y + 1], [x + 1, y + 1]);
      }
    }
  }
  const loops = [];
  for (const [start] of edges) {
    while (edges.get(start)?.length) {
      const loop = [];
      let cur = start.split(',').map(Number);
      for (let guard = 0; guard < 1e6; guard++) {
        const k = cur.join(',');
        const list = edges.get(k);
        if (!list?.length) break;
        const next = list.shift();
        loop.push(cur);
        cur = next;
        if (cur.join(',') === start) break;
      }
      if (loop.length > 3) loops.push(loop);
    }
  }
  return loops;
}

export function area(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const dist = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
  };
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = dist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
}

export function simplifyClosed(loop, eps) {
  // divide o laço no ponto mais distante do primeiro para simplificar as duas metades
  let far = 0;
  let farD = -1;
  for (let i = 1; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]);
    if (d > farD) { farD = d; far = i; }
  }
  const a = simplify(loop.slice(0, far + 1), eps);
  const b = simplify([...loop.slice(far), loop[0]], eps);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

export function chaikin(poly, iterations = 2) {
  let p = poly;
  for (let k = 0; k < iterations; k++) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    p = out;
  }
  return p;
}

