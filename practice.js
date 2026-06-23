/* practice.js
   Populates the #practice-player-select dropdown using Firebase Realtime Database.

   Usage:
   - Provide a Firebase config by setting window.FIREBASE_CONFIG = { apiKey: ..., authDomain: ..., databaseURL: ... }
     before this script runs, or initialize Firebase elsewhere.
   - The script will try several common DB root paths to find ladder/player info.
*/
(function () {
  'use strict';

  const STATUS = document.getElementById('practice-player-status');
  const SELECT = document.getElementById('practice-player-select');
  // Refresh/create-test buttons removed from markup; keep wiring defensive where used

  function setStatus(msg, muted = false) {
    if (!STATUS) return;
    STATUS.textContent = msg;
    STATUS.className = muted ? 'small muted' : 'small';
  }

  function ensureFirebaseInitialized() {
    // Using compat API loaded in the HTML: firebase-app-compat and firebase-database-compat
    if (typeof firebase === 'undefined') {
      setStatus('Firebase client not loaded', false);
      return false;
    }

    try {
      // If an app already exists, use it and set dbGlobal
      const appsExist = (firebase.getApps && firebase.getApps().length) || (firebase.apps && firebase.apps.length);
      if (appsExist) {
        try {
          dbGlobal = dbGlobal || (window.firebase && window.firebase.database ? window.firebase.database() : null);
        } catch (e) {
          console.warn('ensureFirebaseInitialized: reading existing db failed', e);
        }
        return !!dbGlobal;
      }

      // Otherwise try to initialize with window.FIREBASE_CONFIG
      const cfg = window.FIREBASE_CONFIG || window.firebaseConfig || null;
      if (!cfg) {
        setStatus('No Firebase config found. Set window.FIREBASE_CONFIG to initialize.', false);
        return false;
      }

      try {
        firebase.initializeApp(cfg);
      } catch (e) {
        // If the app already exists (race), try to use the existing one
        const msg = (e && e.message) ? String(e.message) : '';
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          try { dbGlobal = window.firebase.database(); return true; } catch (ee) { console.warn('ensureFirebaseInitialized: reuse existing app failed', ee); return false; }
        }
        throw e;
      }

      // set dbGlobal from the initialized app
      try { dbGlobal = window.firebase.database(); } catch (e) { console.warn('ensureFirebaseInitialized: database not available', e); return false; }
      return true;
    } catch (err) {
      console.error('Firebase init error', err);
      setStatus('Firebase initialization error (see console)', false);
      return false;
    }
  }

  // Try several likely database roots that might contain ladder player info
  const CANDIDATE_PATHS = [
    '/ladder',
    '/ladders',
    '/players',
    '/users',
    '/profiles',
    '/playersByLadder',
    '/ladderPlayers'
  ];

  function extractPlayersFromSnapshot(snapshot) {
    const val = snapshot.val();
    if (!val) return [];

    const players = [];

    // If the value is an array-like (object with numeric keys) or object of objects
    if (typeof val === 'object') {
      Object.keys(val).forEach((key) => {
        const item = val[key];
        if (!item) return;
        // Try several common name fields
          const name = (item.displayName || item.name || item.username || item.display_name || item.fullName || item.full_name) || null;
          const nick = (item.nick || item.nickname || item.nickName) || null;
          if (name && typeof name === 'string') {
            players.push({ id: key, name: name, nick: nick });
        } else if (typeof item === 'string') {
          // simple map of key -> string name
            players.push({ id: key, name: item, nick: null });
        } else if (item && typeof item === 'object') {
          // fallback: use key as name
            players.push({ id: key, name: key, nick: null });
        }
      });
    } else if (Array.isArray(val)) {
      val.forEach((it, i) => {
        if (!it) return;
        if (typeof it === 'string') players.push({ id: String(i), name: it, nick: null });
        else if (it && typeof it === 'object') {
          const name = it.displayName || it.name || it.username || null;
          const nick = it.nick || it.nickname || it.nickName || null;
          players.push({ id: it.id || String(i), name: name || String(i), nick: nick });
        }
      });
    }

    // dedupe by id
    const seen = new Set();
    return players.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }

  function populateSelect(players) {
    if (!SELECT) return;
    // Clear existing
    while (SELECT.firstChild) SELECT.removeChild(SELECT.firstChild);

    if (!players || players.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'No players found';
      opt.value = '';
      SELECT.appendChild(opt);
      return;
    }

    // placeholder
    const placeholder = document.createElement('option');
    placeholder.textContent = 'Select player…';
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    SELECT.appendChild(placeholder);

    players.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id;
      const display = p.nick ? `${p.name} — "${p.nick}"` : p.name;
      o.textContent = display;
      SELECT.appendChild(o);
    });
  }

  async function tryLoadPlayers() {
    setStatus('Looking for ladder players…', true);
    if (!ensureFirebaseInitialized()) return;

    const db = firebase.database();

    for (const path of CANDIDATE_PATHS) {
      try {
        const snap = await db.ref(path).once('value');
        if (snap && snap.exists()) {
          const players = extractPlayersFromSnapshot(snap);
          if (players.length > 0) {
            populateSelect(players);
            setStatus(`Loaded ${players.length} players from ${path}`, true);
            return;
          }
        }
      } catch (err) {
        console.warn('Error reading', path, err);
        // continue to try other paths
      }
    }

    // If we get here, nothing found
    setStatus('No ladder players found in common DB paths. Try Refresh or add a config. (See console for attempted paths.)', false);
    console.info('Tried paths:', CANDIDATE_PATHS);
    populateSelect([]);
  }

  async function createTestPlayers() {
    if (!ensureFirebaseInitialized()) return;
    const db = firebase.database();
    const testRef = db.ref('/practice_test_players');
    setStatus('Creating test players…', true);
    try {
      const sample = {
        p1: { name: 'Alice' },
        p2: { name: 'Bob' },
        p3: { name: 'Carla' }
      };
      await testRef.set(sample);
      setStatus('Test players created under /practice_test_players', true);
      // load again but prefer that path
      CANDIDATE_PATHS.unshift('/practice_test_players');
      await tryLoadPlayers();
    } catch (err) {
      console.error('Create test players failed', err);
      setStatus('Failed to create test players (check DB rules/console)', false);
    }
  }

  // Wire up UI buttons
  function wireUI() {
    const refBtn = document.getElementById('practice-refresh-players');
    if (refBtn) refBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.populatePlayerSelect === 'function') {
        try { window.populatePlayerSelect(); setStatus('Refreshed players (via page)'); } catch (err) { console.warn(err); tryLoadPlayers(); }
      } else {
        tryLoadPlayers();
      }
    });
    const createBtn = document.getElementById('practice-create-test');
    if (createBtn) createBtn.addEventListener('click', (e) => { e.preventDefault(); createTestPlayers(); });
  }

  // Auto-run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      wireUI();
      try {
        console.debug('practice.js: loading players via internal loader');
        await tryLoadPlayers();
        setStatus('Loaded players');
      } catch (err) {
        console.warn('practice.js: internal loader failed, falling back', err);
        tryLoadPlayers();
      }
    });
  } else {
    wireUI();
    (async () => {
      try { await tryLoadPlayers(); setStatus('Loaded players'); } catch (err) { console.warn(err); tryLoadPlayers(); }
    })();
  }

})();
// NOTE: the compat DB script is loaded via script tags in `practice.html`; use the global `firebase`/`db` if present

// Minimal shim to access the global db from scoretest.html if available
// Don't call window.firebase.database() at top-level — do this lazily inside init
var dbGlobal = null;

// If this page wasn't loaded via the main app, try initializing firebase with the same config
// (uses same config as scoretest.html so practice.html can read the shared ladder/history nodes)
function maybeInitFirebase() {
  try {
    if (dbGlobal) return;
    if (!window.firebase) return; // compat library not present
    // defensive: only initialize if no apps exist
    if (window.firebase.apps && window.firebase.apps.length) {
      try { dbGlobal = window.firebase.database(); return; } catch(e){}
    }
    const firebaseConfig = {
      apiKey: "AIzaSyAvgoAxAaLmJH14tYxJTKOHUNsy3bEwC6A",
      authDomain: "fox-darts-ladder.firebaseapp.com",
      databaseURL: "https://fox-darts-ladder-default-rtdb.europe-west1.firebasedatabase.app",
      projectId: "fox-darts-ladder",
      storageBucket: "fox-darts-ladder.firebasestorage.app",
      messagingSenderId: "1028079521201",
      appId: "1:1028079521201:web:6ed5afd7348f86ae2cc190"
    };
    try { window.firebase.initializeApp(firebaseConfig); dbGlobal = window.firebase.database(); } catch(e) { console.warn('firebase init failed', e); }
  } catch (e) { console.error('maybeInitFirebase error', e); }
}

// Practice session state
let session = null;
let keypadState = '';
let possibleThreeDartTotals = null;

function buildPossibleThreeDartTotals() {
  if (possibleThreeDartTotals) return;
  const vals = new Set();
  const singles = [], doubles = [], trebles = [];
  for (let i=1;i<=20;i++){singles.push(i);doubles.push(2*i);trebles.push(3*i);} singles.push(25); doubles.push(50);
  const throws = [].concat(singles,doubles,trebles);
  // 1..3 dart combos
  throws.forEach(a=>{if(a<=180) vals.add(a)});
  for (let i=0;i<throws.length;i++) for (let j=0;j<throws.length;j++){const s=throws[i]+throws[j]; if(s<=180) vals.add(s)}
  for (let i=0;i<throws.length;i++) for (let j=0;j<throws.length;j++) for (let k=0;k<throws.length;k++){const s=throws[i]+throws[j]+throws[k]; if(s<=180) vals.add(s)}
  possibleThreeDartTotals = vals;
}

function createKeypad() {
  const keypad = document.getElementById('keypad'); keypad.innerHTML='';
  const keys = [1,2,3,4,5,6,7,8,9,'←',0,'C'];
  keys.forEach(k=>{const btn=document.createElement('button');btn.textContent=k;btn.addEventListener('click',()=>onKey(k));keypad.appendChild(btn)});
  const enter=document.createElement('button');enter.textContent='Enter';enter.className='enter';enter.addEventListener('click',()=>onKey('ENTER'));keypad.appendChild(enter);
}

function onKey(k){
  const curEl=document.getElementById('practice-current-entry');
  if (typeof k === 'number') {
    if (keypadState.length<3) {
      const cand = keypadState + String(k);
      const num = parseInt(cand,10);
      if (isNaN(num) || num>180) return;
      if (possibleThreeDartTotals && !Array.from(possibleThreeDartTotals).some(v=>String(v).startsWith(String(cand)))) return;
      keypadState = cand;
    }
  } else if (k === '←') { keypadState = keypadState.slice(0,-1); }
  else if (k === 'C') { keypadState = ''; }
  else if (k === 'ENTER') { submitVisit(); }
  const typedEl = document.getElementById('practice-typed');
  if (typedEl) typedEl.textContent = (keypadState || '0');
}

function startPracticeSession(){
  try {
    setStatus('Initializing practice UI...');
    // populate player select from ladder (Firebase) or fallback to localStorage
    populatePlayerSelect().then(() => {
      const sel = document.getElementById('practice-player-select');
      const saved = localStorage.getItem('fox_practice_name');
      if (saved) {
        try { sel.value = saved; } catch(e) {}
      }
      updatePlayerDisplay();
      setStatus('Ready');
    }).catch(err => { console.error('populatePlayerSelect error', err); setStatus('Failed to load players'); });
    createKeypad(); buildPossibleThreeDartTotals();
  const startSel = document.getElementById('practice-start-select');
  const custom = document.getElementById('practice-custom-start');
  startSel.addEventListener('change',()=>{ if(startSel.value==='custom') custom.style.display='inline-block'; else custom.style.display='none'; });
  document.getElementById('practice-start-btn').addEventListener('click',()=>{
    const start = startSel.value==='custom' ? parseInt(custom.value||501,10) : parseInt(startSel.value,10);
    const sel = document.getElementById('practice-player-select');
    const playerId = sel && sel.value ? sel.value : (localStorage.getItem('fox_practice_name') || 'Player');
    localStorage.setItem('fox_practice_name', playerId);
    initSession({ playerId: playerId, startingScore: start, doubleOut: !!document.getElementById('practice-double').checked });
  });
  const submitBtn = document.getElementById('practice-submit');
  if (submitBtn) submitBtn.addEventListener('click', submitVisit);
  document.getElementById('practice-undo').addEventListener('click', undoVisit);
  document.getElementById('practice-end').addEventListener('click', endSession);
  document.getElementById('practice-close').addEventListener('click', ()=>{document.getElementById('practice-modal').style.display='none'});
  document.getElementById('practice-save').addEventListener('click', savePracticeSessionToFirebase);
  } catch (err) {
    console.error('startPracticeSession failed', err);
    setStatus('Initialization error');
  }
}

// Helper to set visible status and log
function setStatus(msg){
  try{ const el = document.getElementById('practice-player-status'); if(el) el.textContent = msg; }catch(e){}
  try{ console.debug('practice status:', msg); }catch(e){}
}

// Update displayed player name/avatar
function updatePlayerDisplay(){
  const sel = document.getElementById('practice-player-select');
  const name = sel && sel.value ? sel.value : (localStorage.getItem('fox_practice_name') || 'Player');
  const pn = document.getElementById('player-name');
  if (pn) pn.textContent = name;
  const pa = document.getElementById('player-avatar');
  if (pa) pa.textContent = (name && name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase()) || 'P';
}

// Populate the player select from Firebase ladder or fallback to localStorage/stored players
async function populatePlayerSelect(){
  const sel = document.getElementById('practice-player-select');
  if(!sel) return;
  sel.innerHTML = '';
  sel.disabled = true;
  // show a loading placeholder
  const loadingOption = document.createElement('option'); loadingOption.textContent = 'Loading players...'; sel.appendChild(loadingOption);
  const statusEl = document.getElementById('practice-player-status');
  if (statusEl) statusEl.textContent = 'Looking for ladder players…';
  try{
    let players = [];
    // attempt to ensure firebase is initialised and dbGlobal ready
    maybeInitFirebase();
    if (dbGlobal) {
      // try reading ladder from Firebase
      const snap = await dbGlobal.ref('ladder').once('value');
      const arr = snap.val() || [];
      // ladder may be an array or an object keyed by uid
      if (Array.isArray(arr) && arr.length) players = arr.map(p => ({ name: p.name || p, nick: p.nick || null }));
      else if (arr && typeof arr === 'object') players = Object.values(arr).map(p => ({ name: p.name || p, nick: p.nick || null }));
    }
    // fallback: try localStorage ladder snapshot
    if (!players.length) {
      try{ const raw = localStorage.getItem('fox_ladder'); if(raw){ const parsed = JSON.parse(raw); if(Array.isArray(parsed)) players = parsed.map(p=>({ name: p.name||p, nick: p.nick||null })); } }catch(e){}
    }
    // ensure at least one placeholder
    if (!players.length) players = ['Player'];

    sel.innerHTML = '';
    players.forEach(item => {
      const name = typeof item === 'string' ? item : (item.name || 'Player');
      const nick = typeof item === 'object' ? item.nick : null;
      const o = document.createElement('option'); o.value = name; o.textContent = nick ? `${name} — "${nick}"` : name; sel.appendChild(o);
    });
    sel.addEventListener('change', updatePlayerDisplay);
    sel.disabled = false;
    if (statusEl) statusEl.textContent = `Loaded ${players.length} players`;
    console.debug('populatePlayerSelect: loaded players', players.length);
  }catch(e){
    console.error('populatePlayerSelect failed', e);
    sel.innerHTML = '<option>Player</option>';
    sel.disabled = false;
    if (statusEl) statusEl.textContent = 'Failed to load players';
  }
}

function initSession(opts){
  session = {
    playerId: opts.playerId,
    startTime: Date.now(),
    startingScore: opts.startingScore||501,
    doubleOut: !!opts.doubleOut,
    remaining: opts.startingScore||501,
    throws: [],
    darts:0,
    highest:0,
    first9list: [],
    checkoutAttempts:0,
    checkoutSuccess:0,
    activeVisit: [] // per-throw breakdown optional
  };
  keypadState='';
  updateUI();
}

function updateUI(){
  if(!session) return;
  document.getElementById('practice-remaining').textContent = session.remaining;
  document.getElementById('practice-darts').textContent = session.darts;
  document.getElementById('practice-highest').textContent = session.highest||'—';
  const avg = session.darts? Math.round((session.throws.reduce((s,t)=>s+t.score,0)/ (session.darts/3)) *10)/10 : '—';
  document.getElementById('practice-avg').textContent = avg;
  const f9 = session.first9list.length? Math.round((session.first9list.reduce((a,b)=>a+b,0)/session.first9list.length)*10)/10 : '—';
  document.getElementById('practice-f9').textContent = f9;
  document.getElementById('practice-history').textContent = `Visits: ${session.throws.length}`;
  // suggested checkout
  try {
    const checkoutEl = document.getElementById('practice-checkout');
    if (checkoutEl) checkoutEl.textContent = 'Suggested checkout: ' + (computeSuggestedCheckout(session.remaining, session.doubleOut) || '—');
  } catch (e) { console.warn('updateUI checkout update failed', e); }
}

function renderHistory() {
  const container = document.getElementById('practice-history');
  if (!container) return;
  container.innerHTML = '';
  if (!session || !session.throws.length) { container.textContent = 'No throws yet'; return; }
  session.throws.slice().reverse().forEach((t, idx) => {
    const row = document.createElement('div'); row.className = 'visit-row';
    const left = document.createElement('div');
    const right = document.createElement('div');
    left.textContent = `${t.score} pts`;
    right.textContent = t.bust ? 'BUST' : `Remaining ${t.remaining}`;
    if (t.bust) { right.className = 'visit-bust'; }
    row.appendChild(left); row.appendChild(right); container.appendChild(row);
  });
}

function flashLatestBust() {
  const container = document.getElementById('practice-history');
  if (!container) return;
  const firstRow = container.querySelector('.visit-row');
  if (!firstRow) return;
  firstRow.classList.remove('bust-flash');
  // trigger reflow
  void firstRow.offsetWidth;
  firstRow.classList.add('bust-flash');
  setTimeout(()=> firstRow.classList.remove('bust-flash'), 1200);
}

// Compute a simple suggested checkout string for remaining score
function computeSuggestedCheckout(remaining, doubleOut) {
  if (typeof remaining !== 'number' || remaining <= 1) return null;
  // common targets: triples 20..1, singles, doubles, bull(25)/DB(50)
  const singles = []; const doubles = []; const trebles = [];
  for (let i=1;i<=20;i++){ singles.push({label:String(i), val:i}); doubles.push({label:'D'+i, val:2*i}); trebles.push({label:'T'+i, val:3*i}); }
  singles.push({label:'25', val:25}); doubles.push({label:'DB', val:50});

  // prefer 1-dart (must be double if doubleOut)
  if (doubleOut) {
    const d = doubles.find(d=>d.val===remaining);
    if (d) return d.label;
  } else {
    // single bull/DB or single/treble exact
    const s1 = singles.concat(trebles).find(x=>x.val===remaining);
    if (s1) return s1.label;
  }

  // prefer 2-dart combos: single/treble + double finish
  // Try patterns: (treble/single) + double
  for (const first of trebles.concat(singles)){
    for (const d of doubles){
      if (first.val + d.val === remaining) return `${first.label}, ${d.label}`;
    }
  }

  // try double + single (rare) and single+single (not checkout but helper)
  for (const a of doubles.concat(singles)){
    for (const b of singles.concat(trebles)){
      if (a.val + b.val === remaining) return `${a.label}, ${b.label}`;
    }
  }

  // 3-dart combos: try T20,T20,... common finishes: T20,T19,D12 etc. We'll try a simple brute-force over reasonable throws
  const throws = [].concat(trebles, doubles, singles);
  // limit search to first 2000 combinations roughly by using smaller sets
  for (let i=0;i<throws.length;i++){
    for (let j=0;j<throws.length;j++){
      for (let k=0;k<throws.length;k++){
        if (throws[i].val + throws[j].val + throws[k].val === remaining) return `${throws[i].label}, ${throws[j].label}, ${throws[k].label}`;
      }
    }
  }

  return null;
}

function submitVisit(){
  if(!session) return alert('Start a session first');
  const raw = keypadState||'0';
  const visitTotal = parseInt(raw,10)||0;
  // validate achievable totals
  if (visitTotal !==0 && possibleThreeDartTotals && !possibleThreeDartTotals.has(visitTotal)) { alert('Not achievable'); keypadState=''; document.getElementById('practice-typed').textContent='0'; return; }

  const remBefore = session.remaining;
  const after = remBefore - visitTotal;

  // helper: can this visit total finish on a double (1-3 darts, last a double)?
  function canFinishOnDouble(total) {
    if (typeof total !== 'number' || total <= 0) return false;
    const singles = []; const doubles = []; const trebles = [];
    for (let i=1;i<=20;i++){ singles.push(i); doubles.push(2*i); trebles.push(3*i); }
    singles.push(25); doubles.push(50);
    // 1 dart
    if (doubles.includes(total)) return true;
    // 2 darts: first any (single/treble), second double
    const firstSet = trebles.concat(singles);
    for (let i=0;i<firstSet.length;i++){
      for (let j=0;j<doubles.length;j++){
        if (firstSet[i] + doubles[j] === total) return true;
      }
    }
    // 3 darts: two any, last double
    const any = trebles.concat(doubles).concat(singles);
    for (let i=0;i<any.length;i++){
      for (let j=0;j<any.length;j++){
        for (let k=0;k<doubles.length;k++){
          if (any[i] + any[j] + doubles[k] === total) return true;
        }
      }
    }
    return false;
  }

  // bust rules: negative or 1 remaining is a bust
  if (after < 0 || after === 1) {
    session.throws.push({ score: visitTotal, bust:true, remaining: remBefore });
    session.darts +=3; session.activeVisit=[]; keypadState=''; document.getElementById('practice-typed').textContent='0'; updateUI(); renderHistory(); flashLatestBust(); return;
  }

  // finishing attempt
  if (after === 0) {
    session.checkoutAttempts++;
    if (session.doubleOut) {
      // require the visit to be representable ending on a double
      if (!canFinishOnDouble(visitTotal)) {
        // bust
        session.throws.push({ score: visitTotal, bust:true, remaining: remBefore });
        session.darts +=3; session.activeVisit=[]; keypadState=''; document.getElementById('practice-typed').textContent='0'; updateUI(); renderHistory(); flashLatestBust(); return;
      }
    }
    // success
    session.checkoutSuccess++;
    session.throws.push({ score: visitTotal, remaining: 0, doubleConfirmed: session.doubleOut });
    session.darts +=3; session.highest = Math.max(session.highest, visitTotal);
    // compute first9 if applicable
    const nonBustVisits = session.throws.filter(t=>!t.bust).slice(0,3).map(t=>t.score);
    if(nonBustVisits.length) session.first9list.push(nonBustVisits.reduce((a,b)=>a+b,0));
    session.remaining = 0;
    updateUI();
    renderHistory();
    setTimeout(()=> showSummary('checkout'), 300);
    return;
  }

  // normal visit
  session.remaining = after;
  session.throws.push({ score: visitTotal, remaining: session.remaining });
  session.darts +=3; session.highest = Math.max(session.highest, visitTotal);
  // first 9 capture
  const nb = session.throws.filter(t=>!t.bust).slice(0,3).map(t=>t.score);
  if(nb.length) session.first9list[session.throws.length-1] = nb.reduce((a,b)=>a+b,0);
  keypadState=''; document.getElementById('practice-typed').textContent='0'; updateUI();
  renderHistory();
}

function undoVisit(){
  if(!session || !session.throws.length) return;
  const last = session.throws.pop();
  session.darts = Math.max(0, session.darts-3);
  session.highest = Math.max(0, ...session.throws.map(t=>t.score));
  session.remaining = session.throws.length? session.throws[session.throws.length-1].remaining : session.startingScore;
  updateUI();
  renderHistory();
}

function endSession(){
  if(!session) return;
  showSummary('abandoned');
}

function showSummary(result){
  document.getElementById('practice-modal').style.display='flex';
  const duration = Date.now()-session.startTime;
  document.getElementById('practice-duration').textContent = new Date(duration).toISOString().substr(11,8);
  document.getElementById('m-darts').textContent = session.darts;
  const avg = session.darts? Math.round((session.throws.reduce((s,t)=>s+t.score,0)/(session.darts/3))*10)/10 : '—';
  document.getElementById('m-avg').textContent = avg;
  const f9 = session.first9list.length? Math.round((session.first9list.reduce((a,b)=>a+b,0)/session.first9list.length)*10)/10 : '—';
  document.getElementById('m-f9').textContent = f9;
  document.getElementById('m-highest').textContent = session.highest||'—';
  document.getElementById('m-check-attempts').textContent = session.checkoutAttempts||0;
  const succPct = session.checkoutAttempts? Math.round((session.checkoutSuccess/session.checkoutAttempts)*100):0;
  document.getElementById('m-check-success').textContent = succPct+'%';
  document.getElementById('m-start').textContent = session.startingScore;
}

async function savePracticeSessionToFirebase(){
  if(!dbGlobal) return alert('No database available');
  const sid = 's_'+Date.now();
  const payload = {
    playerId: session.playerId,
    startTime: session.startTime,
    endTime: Date.now(),
    startingScore: session.startingScore,
    doubleOut: session.doubleOut,
    throws: session.throws,
    result: session.remaining===0? 'checkout':'abandoned',
    stats: {
      average: document.getElementById('m-avg').textContent,
      first9: document.getElementById('m-f9').textContent,
      highestVisit: session.highest,
      checkoutAttempts: session.checkoutAttempts,
      checkoutSuccess: session.checkoutSuccess
    }
  };
  try{
    await dbGlobal.ref('practiceSessions/'+sid).set(payload);
    alert('Saved');
    document.getElementById('practice-modal').style.display='none';
  }catch(e){console.error(e);alert('Save failed')}
}

// init
window.addEventListener('load', ()=>{
  // ensure status shows script loaded
  setStatus('Script loaded');
  startPracticeSession();
  // small placeholder for typed value
  const txt = document.createElement('div'); txt.id='practice-typed'; txt.style.marginTop='8px'; document.getElementById('keypad-area').insertBefore(txt, document.getElementById('keypad'));

  // wire refresh players button so it's available even if init fails
  const refreshBtn = document.getElementById('practice-refresh-players');
  if (refreshBtn) refreshBtn.addEventListener('click', async () => {
    try {
      setStatus('Refreshing players…');
      await populatePlayerSelect();
      setStatus('Refreshed players');
    } catch (e) {
      console.error('refresh players failed', e);
      setStatus('Refresh failed');
    }
  });
  // refresh/create buttons removed from markup; the populatePlayerSelect function can be
  // triggered programmatically if needed.
  // Wire Practice Stats button
  const statsBtn = document.getElementById('practice-stats-btn');
  if (statsBtn) statsBtn.addEventListener('click', async () => {
    try {
      document.getElementById('practice-stats-modal').style.display = 'flex';
      await loadAndRenderPracticePlayers();
    } catch (e) { console.error('open stats failed', e); }
  });
  const backBtn = document.getElementById('practice-back-btn');
  if (backBtn) backBtn.addEventListener('click', () => { window.location.href = 'scoretest.html'; });
  const statsClose = document.getElementById('practice-stats-close');
  if (statsClose) statsClose.addEventListener('click', ()=>{ document.getElementById('practice-stats-modal').style.display='none'; });
});

// -- Practice Stats functions -------------------------------------------------
async function loadAllPracticeSessions() {
  // returns an array of sessions from DB or []
  try {
    maybeInitFirebase();
    if (!dbGlobal) { console.warn('No DB for practice stats'); return []; }
    const snap = await dbGlobal.ref('practiceSessions').once('value');
    const val = snap.val(); if (!val) return [];
    // val likely an object keyed by id
    return Object.keys(val).map(k => Object.assign({ id: k }, val[k]));
  } catch (e) { console.error('loadAllPracticeSessions failed', e); return []; }
}

function computePlayerStats(sessions) {
  // sessions: array of session objects (as saved by savePracticeSessionToFirebase)
  const byPlayer = {};
  sessions.forEach(s => {
    const pid = s.playerId || 'unknown';
    if (!byPlayer[pid]) byPlayer[pid] = [];
    byPlayer[pid].push(s);
  });
  const result = {};
  Object.keys(byPlayer).forEach(pid => {
    const list = byPlayer[pid].slice().sort((a,b)=> (a.endTime||0)-(b.endTime||0));
    const totals = list.map(s => {
      const avg = (s.stats && s.stats.average) ? parseFloat(s.stats.average) : null;
      return { avg: avg, endTime: s.endTime || s.startTime || 0, highest: s.stats && s.stats.highestVisit ? s.stats.highestVisit : 0, result: s.result };
    }).filter(x=>x.avg!==null && !isNaN(x.avg));
    const lifetimeAvg = totals.length ? Math.round((totals.reduce((a,b)=>a+ b.avg,0)/totals.length)*10)/10 : '—';
    const bestSession = totals.length ? totals.reduce((a,b)=> b.avg > a.avg ? b : a, totals[0]) : null;
    const totalSessions = list.length;
    const highestVisit = list.reduce((m,s)=> Math.max(m, (s.stats && s.stats.highestVisit) || 0), 0);
    const checkoutAttempts = list.reduce((a,b)=> a + ((b.stats && b.stats.checkoutAttempts)||0), 0);
    const checkoutSuccess = list.reduce((a,b)=> a + ((b.stats && b.stats.checkoutSuccess)||0), 0);
    const checkoutPct = checkoutAttempts ? Math.round((checkoutSuccess/checkoutAttempts)*100) : 0;
    result[pid] = {
      playerId: pid,
      lifetimeAvg,
      bestSession: bestSession ? bestSession.avg : '—',
      totalSessions,
      highestVisit,
      checkoutPct,
      series: totals.map(t=>({ x: t.endTime, y: t.avg }))
    };
  });
  return result;
}

function renderPlayerList(statsMap) {
  const listEl = document.getElementById('stats-player-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  const ids = Object.keys(statsMap).sort();
  if (!ids.length) { listEl.textContent = 'No practice sessions found'; return; }
  ids.forEach(pid => {
    const item = document.createElement('div');
    item.style.padding = '6px 8px'; item.style.borderBottom = '1px dashed rgba(255,255,255,0.03)'; item.style.cursor = 'pointer';
    // display friendly name and nickname if available (nameMap provided via closure in caller)
    const profile = (renderPlayerList.nameMap && renderPlayerList.nameMap[pid]) ? renderPlayerList.nameMap[pid] : null;
    const displayName = profile && profile.name ? profile.name : pid;
    const nick = profile && profile.nick ? profile.nick : null;
    item.textContent = nick ? `${displayName} — "${nick}"` : displayName;
    // keep the sessions count subtle (as title)
    item.title = `${statsMap[pid].totalSessions} sessions`;
    item.addEventListener('click', ()=> showPlayerStats(pid, statsMap[pid]));
    listEl.appendChild(item);
  });
}

function showPlayerStats(pid, stats) {
  // populate header and summary cards
  const nameMap = renderPlayerList.nameMap || {};
  const profile = nameMap[pid] || {};
  const displayName = profile.name || pid;
  const nick = profile.nick ? ` — "${profile.nick}"` : '';
  const headerName = document.getElementById('stats-player-name'); if (headerName) headerName.textContent = displayName + nick;
  const headerTotal = document.getElementById('stats-player-total'); if (headerTotal) headerTotal.textContent = `${stats.totalSessions} sessions`;
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('stats-lifetimeAvg', stats.lifetimeAvg);
  setText('stats-best', stats.bestSession);
  setText('stats-highest', stats.highestVisit);
  setText('stats-checkpct', stats.checkoutPct + '%');

  // recent sessions list
  const recentEl = document.getElementById('stats-recent-list'); if (recentEl) recentEl.innerHTML = '';
  const all = loadAndRenderPracticePlayers._allSessions || [];
  const playerSessions = all.filter(s=> (s.playerId||'') === pid).slice().sort((a,b)=> (b.endTime||b.startTime||0)-(a.endTime||a.startTime||0));
  if (recentEl) {
    if (!playerSessions.length) { recentEl.textContent = 'No sessions'; }
    playerSessions.slice(0,12).forEach(s=>{
      const r = document.createElement('div'); r.style.padding='6px'; r.style.borderBottom='1px dashed rgba(255,255,255,0.03)';
      const t = new Date(s.endTime||s.startTime||0).toLocaleString();
      const avg = s.stats && s.stats.average ? s.stats.average : '—';
      const hi = s.stats && s.stats.highestVisit ? s.stats.highestVisit : '—';
      r.textContent = `${t} — ${s.result || '—'} — avg ${avg} — hi ${hi}`;
      recentEl.appendChild(r);
    });
  }

  // draw chart
  drawAveragesChart(stats.series || []);
}

function drawAveragesChart(series) {
  const canvas = document.getElementById('stats-averages-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (!series.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.font='14px Inter, sans-serif'; ctx.fillText('No data', 10, 20); return;
  }
  // normalize series to canvas width
  const sorted = series.slice().sort((a,b)=>a.x-b.x);
  const xs = sorted.map(s=>s.x);
  const ys = sorted.map(s=>s.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 20;
  const w = canvas.width - pad*2, h = canvas.height - pad*2;
  const xFor = (x)=> pad + ((x - minX) / (maxX - minX || 1)) * w;
  const yFor = (y)=> pad + h - ((y - minY) / (maxY - minY || 1)) * h;
  ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 2; ctx.beginPath();
  sorted.forEach((pt,i)=>{ const x=xFor(pt.x), y=yFor(pt.y); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
  // draw points and store their positions for interactivity
  ctx.fillStyle = '#60a5fa';
  const points = [];
  sorted.forEach(pt=>{ const x=xFor(pt.x), y=yFor(pt.y); ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill(); points.push({x,y,data:pt}); });
  // attach points to canvas for click handling
  canvas._points = points;
  // setup tooltip handling
  const tooltip = document.getElementById('stats-tooltip');
  if (canvas._tooltipBound !== true) {
    canvas.addEventListener('click', function (ev) {
      const rect = canvas.getBoundingClientRect(); const cx = ev.clientX - rect.left; const cy = ev.clientY - rect.top;
      const hit = (canvas._points || []).find(p=> Math.hypot(p.x - cx, p.y - cy) <= 6 );
      if (hit && tooltip) {
        const d = new Date(hit.data.x); const label = `${d.toLocaleString()} — avg ${hit.data.y}`;
        tooltip.textContent = label;
        tooltip.style.left = Math.max(6, hit.x + 6) + 'px';
        tooltip.style.top = Math.max(6, hit.y - 34) + 'px';
        tooltip.style.display = 'block';
        setTimeout(()=>{ if(tooltip) tooltip.style.display='none'; }, 3000);
      }
    });
    // hide tooltip on outside click
    document.addEventListener('click', function(ev){ if (!canvas.contains(ev.target)) { const t=document.getElementById('stats-tooltip'); if (t) t.style.display='none'; } });
    canvas._tooltipBound = true;
  }
}

async function loadAndRenderPracticePlayers() {
  const sess = await loadAllPracticeSessions();
  // cache sessions for later lookup in the UI
  loadAndRenderPracticePlayers._allSessions = sess;
  const stats = computePlayerStats(sess);
  // load player names map and attach to renderPlayerList for display
  const nameMap = await loadPlayerNameMap();
  renderPlayerList.nameMap = nameMap || {};
  renderPlayerList(stats);
}

async function loadPlayerNameMap() {
  try {
    maybeInitFirebase();
    if (!dbGlobal) return {};
    const PROFILE_PATHS = ['ladder','players','users','profiles','playersByLadder','ladderPlayers'];
    const map = {};
    for (const path of PROFILE_PATHS) {
      try {
        const snap = await dbGlobal.ref(path).once('value');
        const val = snap.val();
          if (!val) continue;
            if (typeof val === 'object') {
              Object.keys(val).forEach(k=>{
                const it = val[k];
                if (!it) return;
                if (typeof it === 'string') map[k] = { name: it };
                else if (typeof it === 'object') {
                  const name = it.displayName || it.name || it.username || it.fullName || it.full_name || null;
                  const nick = it.nick || it.nickname || null;
                  if (name || nick) map[k] = { name: name || k, nick: nick };
                }
              });
            }
      } catch (e) { console.warn('loadPlayerNameMap: read failed', path, e); }
    }
    return map;
  } catch (e) { console.error('loadPlayerNameMap failed', e); return {}; }
}


// Exports removed to allow running as a classic browser script (non-module)
