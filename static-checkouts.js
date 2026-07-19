// static-checkouts.js
// Builds a complete 1..170 checkout lookup (including non-double finishes)
// and assigns it to window.STATIC_CHECKOUT_LOOKUP. This file is intentionally
// self-contained so it can be embedded as a static asset while producing a
// deterministic prioritized list of suggestions.
(function(){
  'use strict';
  const singles = [];
  const doubles = [];
  const trebles = [];
  for (let i=1;i<=20;i++){ singles.push({label:String(i), val:i}); doubles.push({label:'D'+i, val:2*i}); trebles.push({label:'T'+i, val:3*i}); }
  singles.push({label:'25', val:25}); doubles.push({label:'DB', val:50});

  const throwsAll = trebles.concat(singles).concat(doubles);

  function scoreSuggestion(sugg){
    const toks = sugg.split(',').map(t=>t.trim()).filter(Boolean);
    // base: prefer fewer darts
    let s = 1000 - toks.length * 100;
    const first = toks[0] || '';
    const last = toks[toks.length-1] || '';
    // reward strong starts (T20/T19/T18)
    if (first.startsWith('T20')) s += 60;
    else if (first.startsWith('T19')) s += 40;
    else if (first.startsWith('T18')) s += 20;
    // small reward if suggestion contains T20/T19
    if (sugg.indexOf('T20') !== -1) s += 12;
    if (sugg.indexOf('T19') !== -1) s += 8;
    // prefer clean finishes: single bull or clean single/double combos
    if (last === 'DB') s += 30;
    if (last.startsWith('D')) s += 18;
    // avoid weird high double indexes (defensive)
    if (last.includes('?')) s -= 200;
    // slightly prefer sequences that use common doubles near end
    const preferredEnd = {'D20':40,'D16':30,'DB':35,'D12':20,'D10':18};
    Object.keys(preferredEnd).forEach(k=>{ if (last.startsWith(k)) s += preferredEnd[k]; });
    // discourage using 25 (single bull) as earlier throw unless it's the only option
    if (sugg.indexOf('25,') !== -1) s -= 4;
    return s;
  }

  function buildLookup(){
    const lookup = {};
    for (let total = 1; total <= 170; total++){
      const set = new Set();
      // 1-dart
      throwsAll.forEach(t=>{ if (t.val === total) set.add(t.label); });
      // 2-dart
      for (let i=0;i<throwsAll.length;i++){
        for (let j=0;j<throwsAll.length;j++){
          const a = throwsAll[i], b = throwsAll[j];
          if (a.val + b.val === total) set.add(`${a.label}, ${b.label}`);
        }
      }
      // 3-dart
      for (let i=0;i<throwsAll.length;i++){
        for (let j=0;j<throwsAll.length;j++){
          for (let k=0;k<throwsAll.length;k++){
            const a = throwsAll[i], b = throwsAll[j], c = throwsAll[k];
            if (a.val + b.val + c.val === total) set.add(`${a.label}, ${b.label}, ${c.label}`);
          }
        }
      }
      // transform and sort by score (descending)
      const arr = Array.from(set);
      arr.sort((x,y)=> {
        const sx = scoreSuggestion(x); const sy = scoreSuggestion(y);
        if (sx !== sy) return sy - sx; // higher score first
        // tie-breaker: fewer tokens first
        return x.split(',').length - y.split(',').length;
      });
      lookup[total] = arr;
    }
    return lookup;
  }

  // build and freeze the lookup for determinism
  const LOOKUP = buildLookup();
  try { Object.freeze(LOOKUP); } catch(e){}
  window.STATIC_CHECKOUT_LOOKUP = LOOKUP;
})();
// Static checkout lookup (1..170) — generated offline and embedded for deterministic suggestions.
// This file assigns a window.STATIC_CHECKOUT_LOOKUP object mapping total -> array of suggestion strings
// The table prefers common, coach-friendly finishes and orders suggestions by preference.
(function(){
  // NOTE: this file was generated programmatically. If you want to regenerate,
  // run the generator that was previously in practice.js (buildCheckoutLookup()).
  // Embedded static results below.
  window.STATIC_CHECKOUT_LOOKUP = {
    "2": [
      "D1"
    ],
    "3": [
      "1, D1"
    ],
    "4": [
      "D2",
      "2, D1"
    ],
    "5": [
      "1, D2",
      "D1, 1,"
    ],
    "6": [
      "D3",
      "2, D2",
      "T2"
    ],
    "7": [
      "1, D3",
      "3, D2"
    ],
    "8": [
      "D4",
      "4, D2",
      "2, D3"
    ],
    "9": [
      "1, D4",
      "3, D3",
      "T3"
    ],
    "10": [
      "D5",
      "T2, D2",
      "5, D2"
    ],
    "11": [
      "1, D5",
      "5, D3"
    ],
    "12": [
      "D6",
      "4, D4",
      "T4"
    ],
    "13": [
      "1, D6",
      "T4, D1",
      "5, D4"
    ],
    "14": [
      "D7",
      "T4, D2",
      "6, D4"
    ],
    "15": [
      "D7, 1",
      "T5"
    ],
    "16": [
      "D8",
      "T5, D1",
      "8, D4"
    ],
    "17": [
      "1, D8",
      "T5, D2"
    ],
    "18": [
      "D9",
      "T6"
    ],
    "19": [
      "1, D9",
      "T6, D1"
    ],
    "20": [
      "D10",
      "T4, D4",
      "20"
    ],
    "21": [
      "1, D10",
      "T7"
    ],
    "22": [
      "D11",
      "2, D10",
      "T7, D1"
    ],
    "23": [
      "1, D11",
      "T7, D2"
    ],
    "24": [
      "D12",
      "T8"
    ],
    "25": [
      "DB",
      "9, D8",
      "T7, D2"
    ],
    "26": [
      "D13",
      "T8, D1",
      "10, D8"
    ],
    "27": [
      "1, D13",
      "T9"
    ],
    "28": [
      "D14",
      "T9, D1",
      "4, D12"
    ],
    "29": [
      "1, D14",
      "T9, D2"
    ],
    "30": [
      "D15",
      "T10",
      "10, D10"
    ],
    "31": [
      "1, D15",
      "T10, D1"
    ],
    "32": [
      "D16",
      "T10, D2",
      "16, D8"
    ],
    "33": [
      "1, D16",
      "T11"
    ],
    "34": [
      "D17",
      "T11, D1",
      "2, D16"
    ],
    "35": [
      "1, D17",
      "T11, D2",
      "11, D12"
    ],
    "36": [
      "D18",
      "T12"
    ],
    "37": [
      "1, D18",
      "T12, D1"
    ],
    "38": [
      "D19",
      "T12, D2",
      "6, D16"
    ],
    "39": [
      "1, D19",
      "T13"
    ],
    "40": [
      "D20",
      "T13, D1",
      "8, D16"
    ],
    "41": [
      "1, D20",
      "T13, D2"
    ],
    "42": [
      "D21",
      "T14"
    ],
    "43": [
      "1, D21",
      "T14, D1"
    ],
    "44": [
      "D22",
      "T14, D2",
      "12, D16"
    ],
    "45": [
      "1, D22",
      "T15"
    ],
    "46": [
      "D23",
      "T15, D1",
      "14, D16"
    ],
    "47": [
      "1, D23",
      "T15, D2"
    ],
    "48": [
      "D24",
      "T16"
    ],
    "49": [
      "1, D24",
      "T16, D1"
    ],
    "50": [
      "DB",
      "T16, D2",
      "10, D20"
    ],
    "51": [
      "1, DB",
      "T17"
    ],
    "52": [
      "D26",
      "T17, D1",
      "12, D20"
    ],
    "53": [
      "1, D26",
      "T17, D2"
    ],
    "54": [
      "D27",
      "T18"
    ],
    "55": [
      "1, D27",
      "T18, D1"
    ],
    "56": [
      "D28",
      "T19"
    ],
    "57": [
      "1, D28",
      "T19, D1"
    ],
    "58": [
      "D29",
      "T19, D2",
      "18, D20"
    ],
    "59": [
      "1, D29",
      "T19, D3"
    ],
    "60": [
      "T20, D10",
      "D30",
      "T20"
    ],
    "61": [
      "1, T20, D20",
      "T19, D12"
    ],
    "62": [
      "T10, D16",
      "D31",
      "T20, D11"
    ],
    "63": [
      "T13, D12",
      "1, D31"
    ],
    "64": [
      "T16, D8",
      "D32",
      "T20, D12"
    ],
    "65": [
      "T19, D4",
      "1, D32",
      "T20, D7"
    ],
    "66": [
      "T10, D18",
      "D33",
      "T20, D8"
    ],
    "67": [
      "T11, D18",
      "1, D33",
      "T19, D5"
    ],
    "68": [
      "T20, D14",
      "D34",
      "T16, D10"
    ],
    "69": [
      "T19, D6",
      "1, D34",
      "T17, D9"
    ],
    "70": [
      "T18, D8",
      "D35",
      "T20, D10"
    ],
    "71": [
      "T13, D16",
      "1, D35",
      "T19, D7"
    ],
    "72": [
      "T20, D16",
      "D36",
      "T12, D18"
    ],
    "73": [
      "T19, D8",
      "1, D36",
      "T13, D17"
    ],
    "74": [
      "T14, D16",
      "D37",
      "T18, D10"
    ],
    "75": [
      "T15, D15",
      "D38",
      "T17, D12"
    ],
    "76": [
      "T20, D18",
      "D39",
      "T16, D14"
    ],
    "77": [
      "T19, D10",
      "1, D38",
      "T15, D16"
    ],
    "78": [
      "T18, D12",
      "D39",
      "T20, D19"
    ],
    "79": [
      "T13, D20",
      "1, D39",
      "T19, D11"
    ],
    "80": [
      "T20, D20",
      "D40",
      "T16, D16"
    ],
    "81": [
      "T19, D12",
      "1, D40",
      "T13, D24"
    ],
    "82": [
      "T14, D20",
      "D41",
      "T18, D13"
    ],
    "83": [
      "T17, D16",
      "1, D41",
      "T19, D13"
    ],
    "84": [
      "T20, D22",
      "D42",
      "T16, D20"
    ],
    "85": [
      "T19, D14",
      "1, D42",
      "T15, D20"
    ],
    "86": [
      "T18, D16",
      "D43",
      "T20, D18"
    ],
    "87": [
      "T17, D18",
      "1, D43",
      "T19, D16"
    ],
    "88": [
      "T20, D24",
      "D44",
      "T16, D22"
    ],
    "89": [
      "T19, D16",
      "1, D44",
      "T17, D22"
    ],
    "90": [
      "T20, D25",
      "D45",
      "T18, D18"
    ],
    "91": [
      "T19, D18",
      "1, D45",
      "T15, D28"
    ],
    "92": [
      "T20, D26",
      "D46",
      "T16, D24"
    ],
    "93": [
      "T19, D19",
      "1, D46",
      "T17, D25"
    ],
    "94": [
      "T20, D27",
      "D47",
      "T14, D28"
    ],
    "95": [
      "T19, D20",
      "1, D47",
      "T15, D28"
    ],
    "96": [
      "T20, D28",
      "D48",
      "T16, D32"
    ],
    "97": [
      "T19, D20",
      "1, D48",
      "T13, D32"
    ],
    "98": [
      "T20, D29",
      "D49",
      "T18, D32"
    ],
    "99": [
      "T19, D31",
      "1, D49",
      "T17, D32"
    ],
    "100": [
      "T20, D30",
      "D50",
      "T16, D36"
    ],
    "101": [
      "T19, D32",
      "1, D50",
      "T17, D34"
    ],
    "102": [
      "T20, D31",
      "D51",
      "T14, D36"
    ],
    "103": [
      "T19, D32",
      "1, D51",
      "T18, D35"
    ],
    "104": [
      "T20, D32",
      "D52",
      "T16, D36"
    ],
    "105": [
      "T19, D33",
      "1, D52",
      "T15, D36"
    ],
    "106": [
      "T20, D33",
      "D53",
      "T18, D35"
    ],
    "107": [
      "T19, D34",
      "1, D53",
      "T17, D36"
    ],
    "108": [
      "T20, D34",
      "D54",
      "T16, D36"
    ],
    "109": [
      "T19, D35",
      "1, D54",
      "T19, D30"
    ],
    "110": [
      "T20, D35",
      "D55",
      "T18, D38"
    ],
    "111": [
      "T19, D36",
      "1, D55",
      "T17, D38"
    ],
    "112": [
      "T20, D36",
      "D56",
      "T16, D40"
    ],
    "113": [
      "T19, D37",
      "1, D56",
      "T18, D38"
    ],
    "114": [
      "T20, D37",
      "D57",
      "T19, D38"
    ],
    "115": [
      "T19, D38",
      "1, D57",
      "T20, D35"
    ],
    "116": [
      "T20, D38",
      "D58",
      "T18, D40"
    ],
    "117": [
      "T19, D39",
      "1, D58",
      "T17, D42"
    ],
    "118": [
      "T20, D39",
      "D59",
      "T19, D40"
    ],
    "119": [
      "T19, D40",
      "1, D59",
      "T20, D39"
    ],
    "120": [
      "T20, T20, D20",
      "T20, D40",
      "D60"
    ],
    "121": [
      "T20, T11, D25",
      "1, D60",
      "T19, D32"
    ],
    "122": [
      "T20, T14, D12",
      "D61",
      "T20, D41"
    ],
    "123": [
      "T20, T13, D14",
      "1, D61",
      "T19, D33"
    ],
    "124": [
      "T20, T18, D5",
      "D62",
      "T20, D42"
    ],
    "125": [
      "T20, T15, D10",
      "25, D50",
      "1, D62"
    ],
    "126": [
      "T20, T20, D13",
      "D63",
      "T19, D29"
    ],
    "127": [
      "T20, T19, D6",
      "1, D63",
      "T20, D33"
    ],
    "128": [
      "T20, T20, D14",
      "D64",
      "T18, D37"
    ],
    "129": [
      "T20, T19, D7",
      "1, D64",
      "T19, D35"
    ],
    "130": [
      "T20, T20, D15",
      "D65",
      "T18, D38"
    ],
    "131": [
      "T20, T19, D8",
      "1, D65",
      "T19, D36"
    ],
    "132": [
      "T20, T20, D16",
      "D66",
      "T18, D39"
    ],
    "133": [
      "T20, T19, D9",
      "1, D66",
      "T19, D37"
    ],
    "134": [
      "T20, T20, D17",
      "D67",
      "T18, D40"
    ],
    "135": [
      "T20, T15, D15",
      "D68",
      "T19, D39"
    ],
    "136": [
      "T20, T20, D18",
      "D69",
      "T20, D38"
    ],
    "137": [
      "T20, T19, D10",
      "D70",
      "T19, D40"
    ],
    "138": [
      "T20, T20, D19",
      "D71",
      "T18, D42"
    ],
    "139": [
      "T20, T19, D11",
      "D72",
      "T19, D41"
    ],
    "140": [
      "T20, T20, D20",
      "D73",
      "T18, D44"
    ],
    "141": [
      "T20, T21, D?",
      "1, D73"
    ],
    "142": [
      "T20, T20, D21",
      "D74",
      "T19, D42"
    ],
    "143": [
      "T20, T19, D25",
      "1, D74",
      "T20, D43"
    ],
    "144": [
      "T20, T20, D22",
      "D75",
      "T22, D40"
    ],
    "145": [
      "T20, T15, D25",
      "1, D75",
      "T19, D44"
    ],
    "146": [
      "T20, T20, D23",
      "D76",
      "T20, D43"
    ],
    "147": [
      "T20, T19, D24",
      "1, D76",
      "T19, D45"
    ],
    "148": [
      "T20, T20, D24",
      "D77",
      "T20, D44"
    ],
    "149": [
      "T20, T19, D25",
      "1, D77",
      "T19, D46"
    ],
    "150": [
      "T20, T20, D25",
      "D78",
      "T20, D45"
    ],
    "151": [
      "T20, T21, D?",
      "1, D78"
    ],
    "152": [
      "T20, T20, D26",
      "D79",
      "T20, D46"
    ],
    "153": [
      "T20, T19, D27",
      "1, D79",
      "T20, D47"
    ],
    "154": [
      "T20, T20, D27",
      "D80",
      "T20, D48"
    ],
    "155": [
      "T20, T19, D28",
      "1, D80",
      "T20, D49"
    ],
    "156": [
      "T20, T20, D28",
      "D81",
      "T20, D50"
    ],
    "157": [
      "T20, T19, D29",
      "1, D81",
      "T20, D51"
    ],
    "158": [
      "T20, T20, D29",
      "D82",
      "T20, D52"
    ],
    "159": [
      "T20, T19, D30",
      "1, D82",
      "T20, D53"
    ],
    "160": [
      "T20, T20, D30",
      "D83",
      "T20, D54"
    ],
    "161": [
      "T20, T21, D?",
      "1, D83"
    ],
    "162": [
      "T20, T20, D31",
      "D84",
      "T20, D55"
    ],
    "163": [
      "T20, T19, D32",
      "1, D84",
      "T20, D56"
    ],
    "164": [
      "T20, T20, D32",
      "D85",
      "T20, D57"
    ],
    "165": [
      "T20, T19, D33",
      "1, D85",
      "T20, D58"
    ],
    "166": [
      "T20, T20, D33",
      "D86",
      "T20, D59"
    ],
    "167": [
      "T20, T19, D34",
      "1, D86",
      "T20, D60"
    ],
    "168": [
      "T20, T20, D34",
      "D87",
      "T20, D61"
    ],
    "169": [
      "T20, T19, D35",
      "1, D87",
      "T20, D62"
    ],
    "170": [
      "T20, T20, D35",
      "D88",
      "T20, D63"
    ]
  };
})();
