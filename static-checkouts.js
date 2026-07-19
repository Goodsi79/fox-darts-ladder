// static-checkouts.js
// Programmatic static checkout lookup (1..170). This file builds a lookup at
// load time using only valid labels (1..20, T1..T20, D1..D20, 25, DB) and
// assigns it to window.STATIC_CHECKOUT_LOOKUP. Keeping this generator here
// prevents accidental invalid hard-coded entries and makes the file safe to
// include as a static asset.
(function(){
  'use strict';
  const singles = [];
  const doubles = [];
  const trebles = [];
  for (let i = 1; i <= 20; i++){
    singles.push({ label: String(i), val: i });
    doubles.push({ label: 'D' + i, val: 2 * i });
    trebles.push({ label: 'T' + i, val: 3 * i });
  }
  singles.push({ label: '25', val: 25 });
  doubles.push({ label: 'DB', val: 50 });

  const throwsAll = trebles.concat(singles).concat(doubles);

  function scoreSuggestion(sugg){
    const toks = sugg.split(',').map(t => t.trim()).filter(Boolean);
    let s = 1000 - toks.length * 100;
    const first = toks[0] || '';
    const last = toks[toks.length - 1] || '';
    if (first.startsWith('T20')) s += 60;
    else if (first.startsWith('T19')) s += 40;
    else if (first.startsWith('T18')) s += 20;
    if (sugg.indexOf('T20') !== -1) s += 12;
    if (sugg.indexOf('T19') !== -1) s += 8;
    if (last === 'DB') s += 30;
    if (last.startsWith('D')) s += 18;
    const preferredEnd = { D20: 40, D16: 30, DB: 35, D12: 20, D10: 18 };
    Object.keys(preferredEnd).forEach(k => { if (last.startsWith(k)) s += preferredEnd[k]; });
    if (sugg.indexOf('25,') !== -1) s -= 4;
    return s;
  }

  function buildLookup(){
    const lookup = {};
    for (let total = 1; total <= 170; total++){
      const set = new Set();
      // 1-dart
      throwsAll.forEach(t => { if (t.val === total) set.add(t.label); });
      // 2-dart
      for (let i = 0; i < throwsAll.length; i++){
        for (let j = 0; j < throwsAll.length; j++){
          const a = throwsAll[i], b = throwsAll[j];
          if (a.val + b.val === total) set.add(`${a.label}, ${b.label}`);
        }
      }
      // 3-dart
      for (let i = 0; i < throwsAll.length; i++){
        for (let j = 0; j < throwsAll.length; j++){
          for (let k = 0; k < throwsAll.length; k++){
            const a = throwsAll[i], b = throwsAll[j], c = throwsAll[k];
            if (a.val + b.val + c.val === total) set.add(`${a.label}, ${b.label}, ${c.label}`);
          }
        }
      }
      const arr = Array.from(set);
      arr.sort((x, y) => {
        const sx = scoreSuggestion(x); const sy = scoreSuggestion(y);
        if (sx !== sy) return sy - sx;
        return x.split(',').length - y.split(',').length;
      });
      lookup[total] = arr;
    }
    return lookup;
  }

  const LOOKUP = buildLookup();
  try { Object.freeze(LOOKUP); } catch (e) { /* no-op */ }
  window.STATIC_CHECKOUT_LOOKUP = LOOKUP;
})();
