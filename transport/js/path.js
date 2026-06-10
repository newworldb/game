'use strict';
const Path = {
  bit(net){ return net === 'rail' ? 2 : 1; },

  // A* between two stations/tiles on the road or rail network.
  // Returns an array of [x,y] tiles including start and goal, or null.
  find(net, sx, sy, tx, ty){
    const b = Path.bit(net);
    const grid = G.state.net;
    return Path.astar(sx, sy, tx, ty, i => (grid[i] & b) !== 0, null);
  },

  // Generic 4-directional grid A*. costFn (optional) gives per-tile entry
  // cost; when provided the heuristic is scaled by the minimum cost (0.4)
  // to stay admissible for terrain-weighted searches.
  astar(sx, sy, tx, ty, passFn, costFn){
    const W = G.W, H = G.H, N = W * H;
    const si = sy * W + sx, gi = ty * W + tx;
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return null;
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return null;
    if (!passFn(si) || !passFn(gi)) return null;
    const g = new Float64Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const hScale = costFn ? 0.4 : 1;
    const h = (x, y) => (Math.abs(x - tx) + Math.abs(y - ty)) * hScale;

    const heap = [];
    const push = (f, i) => {
      heap.push([f, i]);
      let c = heap.length - 1;
      while (c > 0){
        const p = (c - 1) >> 1;
        if (heap[p][0] <= heap[c][0]) break;
        const t = heap[p]; heap[p] = heap[c]; heap[c] = t;
        c = p;
      }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length){
        heap[0] = last;
        let p = 0;
        for (;;){
          const l = 2 * p + 1, r = l + 1;
          let m = p;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === p) break;
          const t = heap[m]; heap[m] = heap[p]; heap[p] = t;
          p = m;
        }
      }
      return top;
    };

    g[si] = 0;
    push(h(sx, sy), si);
    while (heap.length){
      const [, i] = pop();
      if (closed[i]) continue;
      closed[i] = 1;
      if (i === gi){
        const out = [];
        let c = gi;
        while (c !== -1){ out.push([c % W, (c / W) | 0]); c = came[c]; }
        out.reverse();
        return out;
      }
      const x = i % W, y = (i / W) | 0;
      for (let d = 0; d < 4; d++){
        const nx = x + (d === 0 ? 1 : d === 1 ? -1 : 0);
        const ny = y + (d === 2 ? 1 : d === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (closed[ni] || !passFn(ni)) continue;
        const ng = g[i] + (costFn ? costFn(ni) : 1);
        if (ng < g[ni]){
          g[ni] = ng;
          came[ni] = i;
          push(ng + h(nx, ny), ni);
        }
      }
    }
    return null;
  },
};
