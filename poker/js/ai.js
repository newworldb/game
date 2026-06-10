'use strict';
// Bot decisions: Monte-Carlo equity vs. sampled opponents, pot odds,
// per-bot personality (tightness / aggression), occasional bluffs.
const AI = {
  // win probability of `hole` vs nOpp random hands, board completed randomly
  equity(hole, board, nOpp, iters){
    const known = new Set(hole.concat(board));
    const rest = [];
    for (let c = 0; c < 52; c++) if (!known.has(c)) rest.push(c);
    const need = nOpp * 2 + (5 - board.length);
    let win = 0, tie = 0;
    const my7 = hole.concat(board);
    for (let it = 0; it < iters; it++){
      for (let k = 0; k < need; k++){
        const j = k + ((Math.random() * (rest.length - k)) | 0);
        const t = rest[k]; rest[k] = rest[j]; rest[j] = t;
      }
      let ptr = nOpp * 2;
      const full = board.concat(rest.slice(ptr, ptr + (5 - board.length)));
      const mine = Cards.eval7(hole.concat(full));
      let best = 0;
      for (let o = 0; o < nOpp; o++){
        const s = Cards.eval7([rest[o * 2], rest[o * 2 + 1]].concat(full));
        if (s > best) best = s;
      }
      if (mine > best) win++;
      else if (mine === best) tie++;
    }
    return (win + tie * 0.5) / iters;
  },

  // ctx: {board, toCall, pot, minTo, maxTo, bb, nOpp, canRaise}
  decide(p, ctx){
    const nOpp = Math.max(1, Math.min(3, ctx.nOpp));
    const eq = AI.equity(p.cards, ctx.board, nOpp, ctx.board.length ? 150 : 110);
    const r = Math.random();
    const mayRaise = ctx.canRaise && p.raises < 2;
    const raiseTo = () => {
      const target = ctx.toCall + Math.max(ctx.bb * 2, ctx.pot * (0.45 + 0.5 * Math.random()) * p.aggr);
      return Math.round(Math.min(ctx.maxTo, Math.max(ctx.minTo, p.bet + ctx.toCall + target)));
    };

    if (ctx.toCall <= 0){
      if (mayRaise && (eq > 0.62 || (eq > 0.45 && r < 0.22 * p.aggr) || r < 0.035 * p.aggr))
        return { type: 'raise', to: raiseTo() };
      return { type: 'check' };
    }
    const odds = ctx.toCall / (ctx.pot + ctx.toCall);
    if (mayRaise && eq > 0.68 && r < 0.65 * p.aggr) return { type: 'raise', to: raiseTo() };
    if (mayRaise && r < 0.03 * p.aggr) return { type: 'raise', to: raiseTo() }; // bluff
    if (eq >= odds * p.tight) return { type: 'call' };
    // loose-call tiny bets with any live hand
    if (ctx.toCall <= ctx.bb && eq > 0.22) return { type: 'call' };
    return { type: 'fold' };
  },
};
