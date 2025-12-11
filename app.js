/* =========================
   Config
========================= */
const ENABLE_PAYWALL  = false;    // show soft paywall if true
const TRIAL_DAYS      = 3;
const TRIAL_KEY       = 'trialStartedAt_v1';
const PRO_KEY         = 'proEntitlement_v1';
const LAST_DEVICE_KEY = 'lastVideoDeviceId_v1';
const THEME_KEY       = 'derivedTheme_v2';
const SAT_KEY         = 'satCutoff6010';       // slider persistence (0..40 stored)
// --- bar smoothing / hysteresis ---
const BAR_SOFT = 1;          // %: if |diff| >= 1% for long enough, update
const BAR_HARD = 3;          // %: if |diff| >= 3%, update immediately
const BAR_WAIT_MS = 3000;    // ms: wait this long when in the soft band
let barNodes = [];           // DOM refs for 3 bars
let lastLegendTs = 0;
const barSticky = Array.from({length:3}, ()=>({ value:0, since:0, init:false }));
const INCL_NEUTRALS_KEY = 'inclNeutrals6010';
var currentGuide = 'off';

/* =========================
   Aspect Ratio System
========================= */
const ASPECT_RATIOS = {
  'native': { ratio: null, label: 'Native' },
  '16:9': { ratio: 16 / 9, label: '16:9' },
  '9:16': { ratio: 9 / 16, label: '9:16' },
  '4:3': { ratio: 4 / 3, label: '4:3' },
  '1:1': { ratio: 1, label: '1:1' },
  '4:5': { ratio: 4 / 5, label: '4:5' },
  '2.35:1': { ratio: 2.35, label: '2.35:1' },
  '3:2': { ratio: 3 / 2, label: '3:2' }
};
let currentAspectRatio = 'native';
let cropBounds = null; // { x, y, width, height } - for color sampling

/* =========================
   Tiny helpers
========================= */
function markProOnly(selectors){
  selectors.forEach(s => {
    const el = document.querySelector(s);
    if (el) el.closest('.group')?.classList.add('pro-only');
  });
}

function setupUIMode(){
  const uiSel = document.getElementById('uiMode');
  const toggleWrap = document.querySelector('#modeGroup .mode-toggle');
  const toggleBtns = toggleWrap ? Array.from(toggleWrap.querySelectorAll('button[data-mode]')) : [];
  const applyMode = (mode)=>{
    const v = mode === 'pro' ? 'pro' : 'simple';
    document.body.classList.toggle('simple', v === 'simple');
    document.body.classList.toggle('pro',    v === 'pro');
    if (uiSel) uiSel.value = v;
    try{ localStorage.setItem('uiMode', v); }catch(_){}
    toggleBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === v));
  };

  const saved = localStorage.getItem('uiMode') || 'simple';
  applyMode(saved);

  if (uiSel) {
    uiSel.addEventListener('change', (e)=> applyMode(e.target.value));
  }
  toggleBtns.forEach(btn=>{
    btn.addEventListener('click', ()=> applyMode(btn.dataset.mode));
  });

  // Auto-tag “advanced” controls so their parent .group hides in Simple mode.
  markProOnly([
    '#alpha','#scale','#offx','#offy','#flip','#grid',
    '#overlayMode','#wipeWrap',
    '#refUpload','#grabRef',
    '#phiSpiral','#phiFit','#phiQ'
  ]);
}


function ensureBarNodes(){
  if (barNodes.length) return;
  for (let i=0;i<3;i++){
    const div  = document.createElement('div'); div.className='bar';
    const fill = document.createElement('div'); fill.className='fill';
    // in case CSS didn’t load, enforce transition here too:
    fill.style.transition = 'width .35s ease';
    const label = document.createElement('span');
    const tick  = document.createElement('i'); tick.className='target';
    tick.style.left = `${TARGET[i]}%`;
    div.appendChild(fill); div.appendChild(label); div.appendChild(tick);
    bars.appendChild(div);
    barNodes.push({wrap:div, fill, label, tick});
  }
}

function stickyUpdate(i, measuredPct, now){
  const s = barSticky[i];
  if (!s.init || !isFinite(s.value)){ s.value = measuredPct; s.init = true; s.since = 0; return s.value; }
  const diff = measuredPct - s.value;
  const ad   = Math.abs(diff);
  if (ad >= BAR_HARD){
    s.value = measuredPct; s.since = 0;
  } else if (ad >= BAR_SOFT){
    if (!s.since) s.since = now;
    if (now - s.since >= BAR_WAIT_MS){ s.value = measuredPct; s.since = 0; }
  } else {
    s.since = 0; // back inside deadband
  }
  return s.value;
}

function renderBars(sorted, totPct, now){
  ensureBarNodes();
  for (let i=0;i<3;i++){
    const seg = sorted[i];
    const measured = seg ? (seg.pct * 100 / totPct) : 0;
    const display  = stickyUpdate(i, measured, now);
    const rgb = seg ? seg.rgb : [60,60,60];
    const hex = '#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();

    const n = barNodes[i];
    n.fill.style.width = `${display.toFixed(1)}%`;
    n.fill.style.background = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    n.label.textContent = `${display.toFixed(1)}%  ${hex}`;
  }
}

function updatePaletteChips(sorted){
  if (!paletteChips) return;
  paletteChips.innerHTML = '';
  paletteSnapshot = [];
  sorted.forEach(seg=>{
    if (!seg) return;
    const hex = rgbHex(seg.rgb);
    const rgbText = formatRgb(seg.rgb);
    const oklch = rgbToOklch(seg.rgb);
    paletteSnapshot.push({ hex, rgb: seg.rgb, oklch });
    const chip = document.createElement('div'); chip.className='palette-chip';
    const swatch = document.createElement('span'); swatch.className='palette-chip__swatch';
    swatch.style.background = hex;
    const meta = document.createElement('div'); meta.className='palette-chip__meta';
    meta.innerHTML = `<strong>${hex}</strong><span>${rgbText}</span><span>${formatOklch(oklch)}</span>`;
    chip.appendChild(swatch);
    chip.appendChild(meta);
    paletteChips.appendChild(chip);
  });
}

function buildPaletteExportText(palette){
  if (!palette?.length) return '';
  return palette.map((entry,i)=>`Color ${i+1}: ${entry.hex} | ${formatRgb(entry.rgb)} | ${formatOklch(entry.oklch)}`).join('\n');
}

function copyPaletteText(text){
  if (!text) return false;
  if (navigator.clipboard?.writeText){
    return navigator.clipboard.writeText(text).then(()=>true).catch(()=>false);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly','');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  const success = document.execCommand('copy');
  ta.remove();
  return success;
}

function syncPalettePanelState(){
  if (!palettePanelElem) return;
  palettePanelElem.classList.toggle('palette-panel--collapsed', paletteCollapsed);
  if (paletteToggleBtn){
    paletteToggleBtn.textContent = paletteCollapsed ? 'Show' : 'Hide';
    paletteToggleBtn.setAttribute('aria-expanded', (!paletteCollapsed).toString());
  }
  localStorage.setItem(PALETTE_COLLAPSE_KEY, paletteCollapsed ? '1' : '0');
}


const $ = (sel) => document.querySelector(sel);

function updRange(el){
  const min = +el.min || 0, max = +el.max || 100, val = +el.value || 0;
  const pct = ((val - min) / (max - min)) * 100;
  el.style.setProperty('--pct', pct + '%');
}

function rgb2hsv(r,g,b){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h=0, s, v=max, d=max-min;
  s = max===0 ? 0 : d/max;
  if (max!==min){
    switch (max){
      case r: h=(g-b)/d + (g<b ? 6 : 0); break;
      case g: h=(b-r)/d + 2;            break;
      case b: h=(r-g)/d + 4;            break;
    }
    h/=6;
  }
  return [h,s,v];
}
function rgbHex([r,g,b]){
  return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();
}

function srgbToLinear(value){
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function rgbToOklab(rgb){
  const r = srgbToLinear(rgb[0]);
  const g = srgbToLinear(rgb[1]);
  const b = srgbToLinear(rgb[2]);
  const L = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const M = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const S = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l = Math.cbrt(L);
  const m = Math.cbrt(M);
  const s = Math.cbrt(S);
  const okL = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return { l: okL, a: okA, b: okB };
}
function rgbToOklch(rgb){
  const { l, a, b } = rgbToOklab(rgb);
  const c = Math.hypot(a, b);
  let h = Math.atan2(b, a) * 180 / Math.PI;
  if (h < 0) h += 360;
  return { l, c, h };
}
function formatOklch({ l, c, h }){
  return `OKLCH(${l.toFixed(2)} ${c.toFixed(2)} ${h.toFixed(1)})`;
}
function formatRgb(rgb){
  return `RGB(${rgb.map(v=>Math.round(v)).join(', ')})`;
}

/* =========================
   Audio cue (score==100)
========================= */
let audioCtx;
function ensureAudio(){
  try{
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }catch(_){}
}
function playChime(){
  try{
    ensureAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, now); // A5
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.connect(g).connect(audioCtx.destination);
    o.start(now); o.stop(now + 0.2);
  }catch(_){}
}

/* =========================
   Theme: load / derive from hero
========================= */
function applyThemeVars(theme){
  const root = document.documentElement;
  root.style.setProperty('--ui-primary',   theme.primary);
  root.style.setProperty('--ui-secondary', theme.secondary);
  root.style.setProperty('--ui-accent',    theme.accent);
  root.style.setProperty('--ui-text',      theme.text || '#EDEFF2');
  root.style.setProperty('--ui-text-muted',theme.textMuted || '#B8C2D6');
  root.style.setProperty('--ui-border',    theme.border || 'rgba(255,255,255,0.10)');
  root.style.setProperty('--ui-surface',   theme.surface || 'rgba(255,255,255,0.06)');

  try{
    const hex = theme.accent.replace('#','');
    const r = parseInt(hex.slice(0,2),16);
    const g = parseInt(hex.slice(2,4),16);
    const b = parseInt(hex.slice(4,6),16);
    root.style.setProperty('--ui-ring', `rgba(${r},${g},${b},0.55)`);
  }catch(_){ root.style.setProperty('--ui-ring','rgba(245,158,11,0.55)'); }
}
function restoreSavedThemeIfAny(){
  try{
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return false;
    const theme = JSON.parse(raw);
    if (theme?.primary && theme?.secondary && theme?.accent){
      applyThemeVars(theme); return true;
    }
  }catch(_){}
  return false;
}
function saveTheme(theme){ try{ localStorage.setItem(THEME_KEY, JSON.stringify(theme)); }catch(_){ } }

function getHeroImageURL(){
  const bg   = document.querySelector('#landing .bg');
  const card = document.querySelector('#landing .card');
  if (!bg) return null;
  const varVal =
    getComputedStyle(bg).getPropertyValue('--hero').trim() ||
    (card ? getComputedStyle(card).getPropertyValue('--hero').trim() : '');
  const mVar = varVal && varVal.match(/url\((.*)\)/i);
  if (mVar) return new URL(mVar[1].replace(/^["']|["']$/g,''), location.href).href;

  const bi = getComputedStyle(bg).backgroundImage;
  const m = bi && bi.match(/url\((.*)\)/i);
  if (m) return new URL(m[1].replace(/^["']|["']$/g,''), location.href).href;
  return null;
}

// shared kmeans (used here and in analysis)
function kmeans(pixels, k=3, maxIter=8){
  const n = pixels.length / 3;
  const centers = new Array(k).fill(0).map(()=>[0,0,0]);
  const first = Math.floor(Math.random()*n);
  centers[0] = [pixels[first*3], pixels[first*3+1], pixels[first*3+2]];
  for (let ci=1; ci<k; ci++){
    let farIdx=0, farDist=-1;
    for (let i=0; i<n; i++){
      const r=pixels[i*3], g=pixels[i*3+1], b=pixels[i*3+2];
      let dmin=Infinity;
      for (let j=0; j<ci; j++){
        const dr=r-centers[j][0], dg=g-centers[j][1], db=b-centers[j][2];
        const d=dr*dr+dg*dg+db*db; if (d<dmin) dmin=d;
      }
      if (dmin>farDist){ farDist=dmin; farIdx=i; }
    }
    centers[ci] = [pixels[farIdx*3], pixels[farIdx*3+1], pixels[farIdx*3+2]];
  }
  const assign=new Int16Array(n);
  for (let it=0; it<maxIter; it++){
    for (let i=0; i<n; i++){
      const r=pixels[i*3], g=pixels[i*3+1], b=pixels[i*3+2];
      let best=-1, bd=Infinity;
      for (let j=0; j<k; j++){
        const dr=r-centers[j][0], dg=g-centers[j][1], db=b-centers[j][2];
        const d=dr*dr+dg*dg+db*db; if (d<bd){ bd=d; best=j; }
      }
      assign[i]=best;
    }
    const sum=centers.map(()=>[0,0,0,0]);
    for (let i=0; i<n; i++){
      const a=assign[i], off=i*3;
      sum[a][0]+=pixels[off]; sum[a][1]+=pixels[off+1]; sum[a][2]+=pixels[off+2]; sum[a][3]++;
    }
    for (let j=0; j<k; j++){
      if (sum[j][3]>0){
        centers[j][0]=sum[j][0]/sum[j][3];
        centers[j][1]=sum[j][1]/sum[j][3];
        centers[j][2]=sum[j][2]/sum[j][3];
      }
    }
  }
  const counts=new Array(k).fill(0);
  for (let i=0; i<n; i++) counts[assign[i]]++;
  return { centers, counts };
}

async function deriveThemeFromImageUrl(url){
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((res, rej)=>{ img.onload=res; img.onerror=()=>rej(new Error('Image load failed')); img.src=url; });

  const W = 128, H = Math.max(64, Math.round((img.naturalHeight||img.height) * (W/(img.naturalWidth||img.width))));
  const c = document.createElement('canvas'); c.width=W; c.height=H;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);

  let data;
  try{ data = ctx.getImageData(0,0,W,H).data; }
  catch(e){ console.warn('Canvas tainted; cannot sample colors.'); return; }

  const buf=[];
  for (let i=0; i<data.length; i+=16){
    const a=data[i+3]; if (a<200) continue;
    buf.push(data[i], data[i+1], data[i+2]);
  }
  if (!buf.length) return;

  const { centers, counts } = kmeans(new Float32Array(buf), 4, 8);
  const sw = counts.map((c,i)=>{
    const rgb = centers[i].map(x=>Math.max(0,Math.min(255,Math.round(x))));
    const [h,s,v] = rgb2hsv(rgb[0],rgb[1],rgb[2]);
    const lum = 0.2126*rgb[0] + 0.7152*rgb[1] + 0.0722*rgb[2];
    return { rgb, count:c, sat:s, val:v, lum };
  }).sort((a,b)=>b.count-a.count);

  const primary   = sw.slice().sort((a,b)=>a.lum-b.lum)[0] || sw[0];
  const accent    = sw.slice().sort((a,b)=>(b.sat*b.val)-(a.sat*a.val))[0] || sw[0];
  const secondary = sw.find(s=>Math.abs(s.lum-primary.lum)>20) || sw[1] || sw[0];

  const theme = {
    primary:   rgbHex(primary.rgb),
    secondary: rgbHex(secondary.rgb),
    accent:    rgbHex(accent.rgb),
    text:      '#EDEFF2',
    textMuted: '#B8C2D6',
    border:    'rgba(255,255,255,0.10)',
    surface:   'rgba(255,255,255,0.06)',
  };
  applyThemeVars(theme);
  saveTheme(theme);
}
async function deriveThemeFromHeroNow(){
  const url = getHeroImageURL();
  if (!url) return;
  try{ await deriveThemeFromImageUrl(url); }catch(e){ console.warn('Theme derive failed:', e); }
}

/* =========================
   Paywall (soft)
========================= */
function getMsLeft(){
  const started = +localStorage.getItem(TRIAL_KEY);
  if (!started) return -1;
  return (started + TRIAL_DAYS*86400000) - Date.now();
}
function fmtCountdown(ms){
  if (ms<=0) return 'trial ended';
  const d=Math.floor(ms/86400000), h=Math.floor(ms%86400000/3600000), m=Math.floor(ms%3600000/60000);
  return `${d}d ${h}h ${m}m left`;
}
function hasPro(){ return !!localStorage.getItem(PRO_KEY); }
function showPaywall(msg){
  const pw=$('#paywall'), msgEl=$('#pw-msg'), cdEl=$('#pw-countdown');
  if (!pw || !msgEl || !cdEl){
    console.warn('Paywall elements not found; skipping paywall render.');
    return;
  }
  msgEl.textContent = (msg || 'You’re on a free 3-day trial. ');
  const upd=()=>{ const ms=getMsLeft(); cdEl.textContent = ms>0 ? fmtCountdown(ms) : 'trial ended'; };
  upd(); clearInterval(showPaywall._t); showPaywall._t=setInterval(upd,15000);
  pw.hidden=false;
}
function hidePaywall(){ const pw=$('#paywall'); pw.hidden=true; if(showPaywall._t) clearInterval(showPaywall._t); }
async function ensureEntitled(){
  if (!ENABLE_PAYWALL) return true;
  if (hasPro()) return true;
  const ms=getMsLeft();
  if (ms===-1){ showPaywall('Start your free 3-day trial. '); return false; }
  if (ms>0){ hidePaywall(); return true; }
  showPaywall('Your trial ended. '); return false;
}
$('#btn-start-trial')?.addEventListener('click', ()=>{
  if(!localStorage.getItem(TRIAL_KEY)) localStorage.setItem(TRIAL_KEY, Date.now().toString());
  hidePaywall();
});
$('#btn-month')?.addEventListener('click', ()=>window.open('https://example.com/monthly','_blank'));
$('#btn-year') ?.addEventListener('click', ()=>window.open('https://example.com/yearly','_blank'));
$('#btn-life') ?.addEventListener('click', ()=>window.open('https://example.com/lifetime','_blank'));
$('#btn-restore')?.addEventListener('click', ()=>{
  const key=prompt('Paste your license / token:'); if(key){ localStorage.setItem(PRO_KEY,key); hidePaywall(); }
});

/* =========================
   Camera & devices
========================= */
const TARGET=[60,30,10], K=3, DOWNSCALE_W=320, EMA=0.35;
$('#kval') && ($('#kval').textContent=K);

const v=$('#v'), cv=$('#c'), bars=$('#bars');
const legend=$('#legend'), actualEl=$('#actual'), scoreEl=$('#score');
const devSel=$('#device'), inclNeutrals=$('#inclNeutrals'), errEl=$('#err');
let paletteChips = null;
let paletteExportBtn = null;
let paletteToggleBtn = null;
let palettePanelElem = null;

let emaPct=null, stream=null;
let paletteSnapshot = [];
let paletteCopyTimeout;
let paletteExportBtnLabel = 'Copy palette';
const PALETTE_COLLAPSE_KEY = 'paletteCollapsed6010';
let paletteCollapsed = true;

function uiError(msg){ errEl.textContent = msg||''; if(msg) console.warn(msg); }

async function ensurePermissionPriming(){
  const labelsKnown = (await navigator.mediaDevices.enumerateDevices())
    .some(d=>d.kind==='videoinput' && d.label);
  if (labelsKnown) return;
  try{
    const s = await navigator.mediaDevices.getUserMedia({video:true, audio:false});
    s.getTracks().forEach(t=>t.stop());
  }catch(_){}
}
async function listDevices(){
  const devs=await navigator.mediaDevices.enumerateDevices();
  const vids=devs.filter(d=>d.kind==='videoinput');
  devSel.innerHTML = vids.map(d=>`<option value="${d.deviceId}">${d.label||'Camera'}</option>`).join('');
  if(!vids.length) uiError('No cameras found. Start DroidCam/OBS or plug capture in.');
}
async function start(videoConstraints){
  try{
    if (stream){ stream.getTracks().forEach(t=>t.stop()); }
    const constraints = (videoConstraints===true)
      ? { video:true, audio:false }
      : { video: videoConstraints, audio:false };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    v.srcObject = stream; uiError('');

    try{
      const settings = stream.getVideoTracks()[0]?.getSettings?.();
      if (settings?.deviceId){
        localStorage.setItem(LAST_DEVICE_KEY, settings.deviceId);
        devSel.value = settings.deviceId;
      }
    }catch(_){}
  }catch(e){
    uiError('Failed to start camera: '+e.message);
    throw e;
  }
}
async function init(){
  try{
    await ensurePermissionPriming();
    await listDevices();

    const lastId = localStorage.getItem(LAST_DEVICE_KEY);
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    let chosenId = devSel.value;

    if (lastId && [...devSel.options].some(o=>o.value===lastId)){
      chosenId = lastId; devSel.value = lastId;
    } else if (mobile){
      const backOpt = [...devSel.options].find(o=>/back|rear|environment/i.test(o.textContent));
      if (backOpt){ chosenId = backOpt.value; devSel.value = backOpt.value; }
    }

    if (chosenId){
      await start({ deviceId: { exact: chosenId } });
    } else if (mobile){
      await start({ facingMode: { exact:'environment' } })
        .catch(()=>start({ facingMode:'environment' })
        .catch(()=>start(true)));
    } else {
      await start(true);
    }
  }catch(e){
    uiError('Permission/availability error: '+(e.message||e));
  }
}
devSel?.addEventListener('change', async ()=>{
  const id = devSel.value; if (!id) return;
  localStorage.setItem(LAST_DEVICE_KEY, id);
  await start({ deviceId: { exact: id } }).catch(async (e)=>{
    console.warn('Exact device failed, fallback', e);
    await start(true);
  });
});

/* =========================
   Capture & Save
========================= */
async function captureFrameToBlob(includeOverlay = true){
  const gcv = $('#ghost');
  const W = gcv.width || v.clientWidth || v.videoWidth || 1280;
  const H = gcv.height || v.clientHeight || v.videoHeight || 720;

  const oc = document.createElement('canvas');
  oc.width=W; oc.height=H;
  const octx = oc.getContext('2d');

  octx.fillStyle = '#000';
  octx.fillRect(0,0,W,H);

  const rect = getFrameRect();
  try{ octx.drawImage(v, rect.x, rect.y, rect.w, rect.h); }catch(_){}
  if (includeOverlay && gcv) octx.drawImage(gcv, 0, 0, W, H);

  const blob = await new Promise(res => oc.toBlob(res, 'image/jpeg', 0.92));
  return blob;
}
async function saveCapture(){
  try{
    await new Promise(r => requestAnimationFrame(r));
    const blob = await captureFrameToBlob(true);
    if (!blob) return;

    const filename = `6010-capture-${new Date().toISOString().replace(/[:.]/g,'-')}.jpg`;
    const file = new File([blob], filename, { type: 'image/jpeg' });

    if (navigator.canShare?.({ files:[file] })) {
      await navigator.share({ files:[file], title:'60/30/10 capture', text:'Captured with 60/30/10 Studio' });
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.style.display='none'; a.href=url; a.download=filename;
    document.body.appendChild(a); a.click();

    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isiOS) setTimeout(()=>window.open(url,'_blank'), 350);
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 2000);
  }catch(e){
    console.warn('Capture/share failed:', e);
    alert('Could not save the photo. Try again.');
  }
}

/* =========================
   Reference overlay (ghost/wipe)
========================= */
const gcv=$('#ghost'); const gctx=gcv.getContext('2d',{willReadFrequently:true});
const refUpload=$('#refUpload'); const grabRefBtn=$('#grabRef'); const overlayMode=$('#overlayMode');
const alpha=$('#alpha'); const scale=$('#scale'); const offx=$('#offx'); const offy=$('#offy');
const flip=$('#flip'); const grid=$('#grid'); const wipe=$('#wipe'); const wipeWrap=$('#wipeWrap');
let refImg=null;

function onUploadRef(e){
  const f=e.target.files?.[0]; if(!f) return;
  const url=URL.createObjectURL(f); const img=new Image();
  img.onload=()=>{ refImg=img; URL.revokeObjectURL(url); }; img.src=url;
}
function grabRefFromVideo(){
  if (v.videoWidth===0) return;
  const oc=document.createElement('canvas'); oc.width=v.videoWidth; oc.height=v.videoHeight;
  oc.getContext('2d').drawImage(v,0,0);
  const img=new Image(); img.onload=()=>{ refImg=img; }; img.src=oc.toDataURL('image/png');
}
function drawGrid(ctx,W,H){
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(W/3,0); ctx.lineTo(W/3,H);
  ctx.moveTo(2*W/3,0); ctx.lineTo(2*W/3,H);
  ctx.moveTo(0,H/3); ctx.lineTo(W,H/3);
  ctx.moveTo(0,2*H/3); ctx.lineTo(W,2*H/3);
  ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke();
  ctx.restore();
}
function drawGhost(){
  const W = gcv.width  = v.clientWidth || v.videoWidth;
  const H = gcv.height = v.clientHeight || (v.videoHeight * (W/(v.videoWidth||W))|0);
  const ctx=gctx; ctx.clearRect(0,0,W,H);

  if (refImg && W>0 && H>0){
    const s=(+scale.value||100)/100, a=(+alpha.value||0)/100, dx=+offx.value||0, dy=+offy.value||0, doFlip=!!flip.checked;
    const rW=refImg.naturalWidth||refImg.width, rH=refImg.naturalHeight||refImg.height;
    const base=Math.min(W/rW,H/rH), drawW=rW*base*s, drawH=rH*base*s, x=((W-drawW)/2)+dx, y=((H-drawH)/2)+dy;
    ctx.save();
    if (overlayMode.value==='overlay'){
      ctx.globalAlpha=a;
      if (doFlip){ ctx.translate(W,0); ctx.scale(-1,1); ctx.drawImage(refImg,(W-x-drawW),y,drawW,drawH); }
      else ctx.drawImage(refImg,x,y,drawW,drawH);
      ctx.globalAlpha=1;
    } else {
      const pct=(+wipe.value||50)/100, wipeX=W*pct;
      ctx.save(); ctx.beginPath(); ctx.rect(0,0,wipeX,H); ctx.clip();
      if (doFlip){ ctx.translate(W,0); ctx.scale(-1,1); ctx.drawImage(refImg,(W-x-drawW),y,drawW,drawH); }
      else ctx.drawImage(refImg,x,y,drawW,drawH);
      ctx.restore();
      ctx.fillStyle='rgba(255,255,255,0.65)'; ctx.fillRect(wipeX-1,0,2,H);
    }
    ctx.restore();
  }
  if (grid.checked) drawGrid(ctx,gcv.width,gcv.height);
}

window.addEventListener('keydown', (e)=>{
  const step = e.shiftKey ? 10 : 2;
  if (e.key==='ArrowLeft')  { offx.value=(+offx.value||0)-step; e.preventDefault(); }
  if (e.key==='ArrowRight') { offx.value=(+offx.value||0)+step; e.preventDefault(); }
  if (e.key==='ArrowUp')    { offy.value=(+offy.value||0)-step; e.preventDefault(); }
  if (e.key==='ArrowDown')  { offy.value=(+offy.value||0)+step; e.preventDefault(); }
  if (e.key==='[')          { alpha.value=Math.max(0,(+alpha.value||0)-2); }
  if (e.key===']')          { alpha.value=Math.min(100,(+alpha.value||0)+2); }
});

/* =========================
   Golden HUD
========================= */
const phiOn=$('#phiOn'); const phiSpiralSel=$('#phiSpiral'); const phiScoreEl=$('#phiScore');

function getFrameRect(){
  const W=gcv.width,H=gcv.height, vAR=(v.videoWidth||0)/(v.videoHeight||1);
  if(!isFinite(vAR)||vAR<=0) return {x:0,y:0,w:W,h:H};
  const boxAR=W/H;
  if(boxAR>vAR){ const w=H*vAR, x=(W-w)/2; return {x, y:0, w, h:H}; }
  else         { const h=W/vAR, y=(H-h)/2; return {x:0, y, w:W, h}; }
}
function drawPhiGrid(ctx,rect){
  const {x,y,w,h}=rect, phi=1.61803398875;
  const x1=x+w/phi, x2=x+w-w/phi, y1=y+h/phi, y2=y+h-h/phi;
  ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.45)'; ctx.setLineDash([8,6]); ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x1,y+h); ctx.moveTo(x2,y); ctx.lineTo(x2,y+h);
  ctx.moveTo(x,y1); ctx.lineTo(x+w,y1); ctx.moveTo(x,y2); ctx.lineTo(x+w,y2); ctx.stroke();
  ctx.setLineDash([]); [[x1,y1],[x1,y2],[x2,y1],[x2,y2]].forEach(([px,py])=>{ ctx.beginPath(); ctx.arc(px,py,4,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fill(); });
  ctx.restore();
}
function drawPhiSpiral(ctx,rect,corner='auto',fit='inscribe'){
  if (corner==='off') return;
  const {x:bx,y:by,w:BW,h:BH}=rect, phi=1.61803398875, frameAR=BW/BH;
  let rw,rh,rx,ry;
  if(fit==='cover'){ if(frameAR>=phi){ rw=BW; rh=BW/phi; rx=bx; ry=by+(BH-rh)/2; } else { rh=BH; rw=BH*phi; rx=bx+(BW-rw)/2; ry=by; } }
  else{ if(frameAR>=phi){ rh=BH; rw=BH*phi; rx=bx+(BW-rw)/2; ry=by; } else { rw=BW; rh=BW/phi; rx=bx; ry=by+(BH-rh)/2; } }
  const use = corner==='auto' ? 'tr' : corner;
  ctx.save(); ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=2; ctx.setLineDash([6,6]);
  let x=rx,y=ry,w=rw,h=rh,dir=use;
  for(let i=0;i<6;i++){
    ctx.strokeRect(x,y,w,h); ctx.beginPath();
    if(dir==='tl'){ ctx.arc(x+w,y+h,Math.min(w,h),Math.PI,1.5*Math.PI); dir='bl'; }
    else if(dir==='tr'){ ctx.arc(x,y+h,Math.min(w,h),1.5*Math.PI,0); dir='tl'; }
    else if(dir==='br'){ ctx.arc(x,y,Math.min(w,h),0,0.5*Math.PI); dir='tr'; }
    else if(dir==='bl'){ ctx.arc(x+w,y,Math.min(w,h),0.5*Math.PI,Math.PI); dir='br'; }
    ctx.stroke();
    if(w>=h){ const nw=w/phi; if(use==='tr'||use==='br') x+=(w-nw); w=nw; } else { const nh=h/phi; if(use==='bl'||use==='br') y+=(h-nh); h=nh; }
  }
  ctx.restore();
}
function saliencyFromImageData(imgData,w,h){
  const d=imgData.data, Y=new Float32Array(w*h), S=new Float32Array(w*h);
  const beta=(+($('#satW')?.value)||0)/100, gamma=(+($('#satG')?.value)||100)/100;
  for(let i=0,p=0;i<d.length;i+=4,p++){
    const r=d[i],g=d[i+1],b=d[i+2], y=0.2126*r+0.7152*g+0.0722*b;
    const maxc=Math.max(r,g,b), minc=Math.min(r,g,b), sat=maxc?(maxc-minc)/maxc:0;
    Y[p]=y; const satCurve=Math.pow(sat,gamma); S[p]=(1-beta)+beta*satCurve;
  }
  const blur=new Float32Array(w*h);
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){ let acc=0; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) acc+=Y[(y+dy)*w+(x+dx)]; blur[y*w+x]=acc/9; }
  const G=new Float32Array(w*h);
  for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
    const p=y*w+x;
    const gx=-Y[p-w-1]-2*Y[p-1]-Y[p+w-1]+Y[p-w+1]+2*Y[p+1]+Y[p+w+1];
    const gy=-Y[p-w-1]-2*Y[p-w]-Y[p-w+1]+Y[p+w-1]+2*Y[p+w]+Y[p+w+1];
    G[p]=Math.hypot(gx,gy);
  }
  let maxG=1e-6,maxC=1e-6;
  for(let i=0;i<w*h;i++){ const lc=Math.abs(Y[i]-blur[i]); if(G[i]>maxG)maxG=G[i]; if(lc>maxC)maxC=lc; }
  for(let i=0;i<w*h;i++){
    const lc=Math.abs(Y[i]-blur[i])/maxC, eg=G[i]/maxG;
    S[i]=S[i]*(0.5+0.5*lc)*(0.5+0.5*eg);
  }
  const q=+( $('#phiQ').value )||5, flat=Array.from(S).sort((a,b)=>b-a);
  const thresh=flat[Math.max(0,Math.floor((q/100)*flat.length)-1)]||0;
  let sum=0,sx=0,sy=0; for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const p=y*w+x, wgt=S[p]>=thresh?S[p]:0; if(wgt>0){ sum+=wgt; sx+=x*wgt; sy+=y*wgt; }
  }
  if(sum===0) return { cx:w/2, cy:h/2, score:0, bestCorner:null };
  const cx=sx/sum, cy=sy/sum, phi=1.61803398875;
  const pts=[[w/phi,h/phi],[w/phi,h-h/phi],[w-w/phi,h/phi],[w-w/phi,h-h/phi]];
  let bestD=1e9,bestIdx=0; for(let i=0;i<4;i++){
    const [px,py]=pts[i], d2=(cx-px)*(cx-px)+(cy-py)*(cy-py); if(d2<bestD){bestD=d2; bestIdx=i;}
  }
  const dmin=Math.sqrt(bestD), diag=Math.hypot(w,h);
  const score=Math.max(0,Math.min(100,Math.round(100*(1-dmin/(0.15*diag)))));
  return { cx, cy, score, bestCorner:['tl','bl','tr','br'][bestIdx] };
}
function drawPhiMarker(ctx,cx,cy){
  ctx.save(); ctx.fillStyle='rgba(0,255,180,0.9)'; ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(cx,cy,6,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.restore();
}

/* =========================
   Score update throttle
========================= */
let scoreUpdateMode   = localStorage.getItem('scoreUpdateMode') || 'second'; // 'frame'|'second'
let lastScoreUpdateTs = 0;
let lastVizUpdateTs   = 0;
let prevScoreInt      = null;

function initScoreUpdateMode(){
  const scoreUpdateSel = document.getElementById('scoreUpdate');
  if (!scoreUpdateSel) return;
  scoreUpdateSel.value = scoreUpdateMode;
  scoreUpdateSel.addEventListener('change', (e)=>{
    scoreUpdateMode   = e.target.value;
    localStorage.setItem('scoreUpdateMode', scoreUpdateMode);
    lastScoreUpdateTs = 0; // force immediate refresh
  });
}

/* =========================
   Saturation cutoff UI
========================= */
const satCutoffEl  = $('#satCutoff');    // <input type="range" min="0" max="40">
const satCutoffVal = $('#satCutoffVal'); // live text (“0.12”)

// Include neutrals default/persist
const savedIncl = localStorage.getItem(INCL_NEUTRALS_KEY);
// default OFF if no saved value
inclNeutrals.checked = savedIncl ? (savedIncl === '1') : false;


function setSatUIFromValue(val01){
  if (!satCutoffEl) return;
  const v = Math.round(val01 * 100);     // 0..40 domain if you cap in HTML
  satCutoffEl.value = String(v);
  updRange(satCutoffEl);
  if (satCutoffVal) satCutoffVal.textContent = (v/100).toFixed(2);
}
function currentSatCutoff(){
  if (inclNeutrals?.checked) return 0;   // override: include neutrals
  const v = +satCutoffEl?.value || 12;   // default 0.12
  return Math.max(0, Math.min(0.99, v/100));
}
function refreshSatDisabledState(){
  if (!satCutoffEl) return;
  satCutoffEl.disabled = !!inclNeutrals?.checked;
}

/* =========================
   Analysis loop (60/30/10 + HUD)
========================= */
let lastMean=null;
function sceneCut(mean, th=12){ if(!lastMean){lastMean=mean;return false;} const d=Math.hypot(mean[0]-lastMean[0],mean[1]-lastMean[1],mean[2]-lastMean[2]); lastMean=mean; return d>th; }
function kmeansFrame(pixels, k=3, maxIter=8){ return kmeans(pixels,k,maxIter); }

/* =========================
   Aspect Ratio Functions
========================= */
function applyAspectRatio(ratioKey) {
  currentAspectRatio = ratioKey;
  const config = ASPECT_RATIOS[ratioKey];

  // Update chip label
  const aspectChipLabel = document.querySelector('#aspectChip .aspect-chip__label');
  if (aspectChipLabel) aspectChipLabel.textContent = config.label;

  // Calculate and draw mask
  drawAspectMask();
}

function drawAspectMask() {
  const canvas = $('#aspectMask');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const video = v;

  // Use displayed size (what the user actually sees), not native resolution
  const rect = video.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (currentAspectRatio === 'native') {
    // No mask for native - store cropBounds in video resolution coordinates
    cropBounds = {
      x: 0,
      y: 0,
      width: video.videoWidth || canvas.width,
      height: video.videoHeight || canvas.height
    };
    return;
  }

  const targetRatio = ASPECT_RATIOS[currentAspectRatio].ratio;
  const displayRatio = canvas.width / canvas.height;

  // Calculate crop in DISPLAY coordinates (for rendering the mask)
  let cropWidth, cropHeight, cropX, cropY;

  if (targetRatio > displayRatio) {
    // Crop top/bottom
    cropWidth = canvas.width;
    cropHeight = canvas.width / targetRatio;
    cropX = 0;
    cropY = (canvas.height - cropHeight) / 2;
  } else {
    // Crop left/right
    cropHeight = canvas.height;
    cropWidth = canvas.height * targetRatio;
    cropX = (canvas.width - cropWidth) / 2;
    cropY = 0;
  }

  // Convert crop bounds from display coordinates to video resolution coordinates
  // This is for color sampling, which happens on the native video resolution
  const scaleToVideoX = (video.videoWidth || canvas.width) / canvas.width;
  const scaleToVideoY = (video.videoHeight || canvas.height) / canvas.height;

  cropBounds = {
    x: Math.round(cropX * scaleToVideoX),
    y: Math.round(cropY * scaleToVideoY),
    width: Math.round(cropWidth * scaleToVideoX),
    height: Math.round(cropHeight * scaleToVideoY)
  };

  // Draw semi-transparent mask over areas outside crop (in display coordinates)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';

  // Top bar
  if (cropY > 0) {
    ctx.fillRect(0, 0, canvas.width, cropY);
  }

  // Bottom bar
  if (cropY + cropHeight < canvas.height) {
    ctx.fillRect(0, cropY + cropHeight, canvas.width, canvas.height - (cropY + cropHeight));
  }

  // Left bar
  if (cropX > 0) {
    ctx.fillRect(0, cropY, cropX, cropHeight);
  }

  // Right bar
  if (cropX + cropWidth < canvas.width) {
    ctx.fillRect(cropX + cropWidth, cropY, canvas.width - (cropX + cropWidth), cropHeight);
  }

  // Draw border around crop area (in display coordinates)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);
}

function initAspectRatioSystem() {
  const aspectPicker = $('#aspectPicker');
  const aspectChip = $('#aspectChip');

  if (!aspectPicker || !aspectChip) return;

  // Check if user has seen picker before
  const savedRatio = localStorage.getItem('aspectRatio') || 'native';
  const hasSeenPicker = localStorage.getItem('hasSeenAspectPicker');

  currentAspectRatio = savedRatio;

  // Show picker on first use
  if (!hasSeenPicker) {
    aspectPicker.hidden = false;
    localStorage.setItem('hasSeenAspectPicker', 'true');
  } else {
    // Just apply saved ratio
    applyAspectRatio(savedRatio);
    aspectChip.hidden = false;
  }

  // Handle option clicks in picker
  aspectPicker.addEventListener('click', (e) => {
    const option = e.target.closest('.aspect-option');
    if (!option) return;

    const ratio = option.dataset.ratio;

    // Update active state
    aspectPicker.querySelectorAll('.aspect-option').forEach(opt => {
      opt.classList.remove('active');
    });
    option.classList.add('active');

    // Apply ratio
    applyAspectRatio(ratio);

    // Save preference
    localStorage.setItem('aspectRatio', ratio);

    // Close picker, show chip
    aspectPicker.hidden = true;
    aspectChip.hidden = false;
  });

  // Handle chip click - reopen picker
  aspectChip.addEventListener('click', () => {
    aspectPicker.hidden = false;

    // Highlight current selection
    aspectPicker.querySelectorAll('.aspect-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.ratio === currentAspectRatio);
    });
  });
}

function grade6010(pcts){
  const a=[...pcts].sort((x,y)=>y-x).slice(0,3);
  const diffs=a.map((v,i)=>Math.abs(v-[60,30,10][i]));
  const weights=[0.5,0.35,0.15];
  const penalty=diffs.reduce((acc,d,i)=>acc+weights[i]*Math.min(1,d/30),0);
  const score=Math.max(0,100*(1-penalty));
  let tag='warn'; if(score>=85) tag='pass'; else if(score<60) tag='fail';
  return {score:Math.round(score), tag, actual:a.map(v=>Math.round(v))};
}

function loop(){
  if (v.videoWidth === 0){ requestAnimationFrame(loop); return; }

  drawGhost();
  drawAspectMask(); // Draw aspect ratio mask

 // DEBUG: Log when drawing
  if (typeof currentGuide !== 'undefined' && currentGuide !== 'off') {
    console.log('Drawing guide:', currentGuide, 'on rect:', getFrameRect());
  }

 // Draw composition guide on the ghost canvas
  if (typeof CompositionGuides !== 'undefined' && typeof currentGuide !== 'undefined' && currentGuide !== 'off') {
    var guideRect = getFrameRect();
    CompositionGuides.draw(gctx, guideRect, currentGuide);
  }

  const scaleX = DOWNSCALE_W / v.videoWidth;
  const w = DOWNSCALE_W, h = Math.round(v.videoHeight * scaleX);
  cv.width = w; 
  cv.height = h;

  // draw the small frame with tiny blur (denoise)
  const ctx = cv.getContext('2d', { willReadFrequently:true });
  ctx.filter = 'blur(1px)';
  ctx.drawImage(v, 0, 0, w, h);
  ctx.filter = 'none';

  // Aspect ratio crop bounds (scaled to downscaled canvas)
  let sampleBounds = { x: 0, y: 0, width: w, height: h };
  if (cropBounds && cropBounds.width && cropBounds.height) {
    // Scale crop bounds from video resolution to downscaled canvas
    const scaleFactorX = w / v.videoWidth;
    const scaleFactorY = h / v.videoHeight;
    sampleBounds = {
      x: Math.round(cropBounds.x * scaleFactorX),
      y: Math.round(cropBounds.y * scaleFactorY),
      width: Math.round(cropBounds.width * scaleFactorX),
      height: Math.round(cropBounds.height * scaleFactorY)
    };
  }

  const imgData = ctx.getImageData(sampleBounds.x, sampleBounds.y, sampleBounds.width, sampleBounds.height);
  const data    = imgData.data;

  // sparse mean for scene-change detection
  let r=0,g=0,b=0,cnt=0;
  for (let i=0;i<data.length;i+=32){ r+=data[i]; g+=data[i+1]; b+=data[i+2]; cnt++; }
  const mean=[r/cnt,g/cnt,b/cnt];
  if (sceneCut(mean)) emaPct=null;

  // sample pixels with saturation/brightness thresholds
  const step = 12;
  const buf  = [];
  const minSat = currentSatCutoff();  // 0..0.40 from slider (0 if "include neutrals")
  const minV   = 0.08;                // ignore very dark pixels

  for (let i = 0; i < data.length; i += step){
    const R = data[i], G = data[i+1], B = data[i+2];
    const [, s, v] = rgb2hsv(R, G, B);
    if ((inclNeutrals.checked || s >= minSat) && v >= minV){
      buf.push(R, G, B);
    }
  }
  if (!buf.length){ requestAnimationFrame(loop); return; }

  // k-means, sorted by share
  const arr = new Float32Array(buf);
  const { centers, counts } = kmeansFrame(arr, K, 7);
  const total = counts.reduce((a,b)=>a+b,0) || 1;
  const sw = counts.map((c,i)=>{
    const [R,G,B]=centers[i].map(x=>Math.max(0,Math.min(255,Math.round(x))));
    return { rgb:[R,G,B], pct:100*c/total };
  }).sort((a,b)=>b.pct-a.pct).slice(0,3);

  // EMA smoothing
  const vec = sw.map(s=>s.pct);
  if(!emaPct) emaPct = vec; else emaPct = emaPct.map((p,i)=>p*(1-EMA)+vec[i]*EMA);

  const sorted = sw.map((s,i)=> ({...s, pct: emaPct[i]}));
  const totPct = sorted.reduce((a,b)=>a+b.pct,0) || 1;

  // ---- ONE timestamp per frame ----
  const now = performance.now();

  const shouldUpdateViz = (scoreUpdateMode === 'frame') || (now - lastVizUpdateTs >= 1000);

  if (shouldUpdateViz) {
    // smooth, sticky bar rendering (reuses DOM)
    renderBars(sorted, totPct, now);

    // Throttled legend refresh
    if (legend) {
      legend.innerHTML = '';
      sorted.forEach(seg => {
        const swEl = document.createElement('span');
        swEl.className = 'swatch';
        swEl.style.background = `rgb(${seg.rgb[0]},${seg.rgb[1]},${seg.rgb[2]})`;
        legend.appendChild(swEl);
      });
    }

    updatePaletteChips(sorted);
  }

  // score (throttled if needed)
  const pcts = sorted.map(s=> s.pct * 100 / totPct);
  const {score, tag, actual} = grade6010(pcts);

  const shouldUpdateScore = (scoreUpdateMode === 'frame') || (now - lastScoreUpdateTs >= 1000);
  if (shouldUpdateScore) {
    actualEl.textContent = `${actual[0]} / ${actual[1]} / ${actual[2]}`;
    scoreEl.textContent  = String(score);
    scoreEl.className    = `tag ${tag}`;
    if (prevScoreInt !== 100 && score === 100) playChime();
    prevScoreInt = score;
    lastScoreUpdateTs = now;
  }

  if (shouldUpdateViz) {
    lastVizUpdateTs = now;
    lastLegendTs = now;
  }

  // Golden HUD
  if (phiOn.checked){
    const rect = getFrameRect();
    drawPhiGrid(gctx, rect);
    const { cx, cy, score:phiScore, bestCorner } = saliencyFromImageData(imgData, w, h);
    const sx = rect.x + (cx / w) * rect.w;
    const sy = rect.y + (cy / h) * rect.h;
    drawPhiMarker(gctx, sx, sy);
    const mode = phiSpiralSel.value;
    const fit  = $('#phiFit').value;
    const spiralCorner = mode==='auto' ? (bestCorner || 'tr') : mode;
    if (mode!=='off') drawPhiSpiral(gctx, rect, spiralCorner, fit);
    phiScoreEl.textContent = phiScore;
    phiScoreEl.className = 'tag ' + (phiScore>=85?'pass': phiScore<60?'fail':'warn');
  } else {
    phiScoreEl.textContent = '--';
    phiScoreEl.className = 'tag';
  }

  ('requestVideoFrameCallback' in HTMLVideoElement.prototype)
    ? v.requestVideoFrameCallback(()=>loop())
    : requestAnimationFrame(loop);
}

v.addEventListener('loadeddata', () => {
  initAspectRatioSystem();
  loop();
});





/* =========================
   Landing → Studio wiring
========================= */
document.addEventListener('DOMContentLoaded', () => {
  // lock scroll on landing
  document.body.classList.add('lock');

  // defaults for a calmer first-run
  if (typeof inclNeutrals !== 'undefined' && inclNeutrals) inclNeutrals.checked = false;

  // rails
  document.querySelectorAll('input[type="range"]').forEach(el=>{
    updRange(el);
    el.addEventListener('input', ()=>updRange(el));
  });

  // defaults
  $('#grid').checked = false;
  $('#phiOn').checked = false;
  $('#phiSpiral').value = 'off';

  setupUIMode();
  
  // saturation UI init
  const savedSat = localStorage.getItem(SAT_KEY);
  setSatUIFromValue(savedSat != null ? (+savedSat)/100 : 0.12);
  refreshSatDisabledState();
  satCutoffEl?.addEventListener('input', ()=>{
    const v = +satCutoffEl.value;
    if (satCutoffVal) satCutoffVal.textContent = (v/100).toFixed(2);
    updRange(satCutoffEl);
  });
  satCutoffEl?.addEventListener('change', ()=>{
    localStorage.setItem(SAT_KEY, String(+satCutoffEl.value));
    emaPct = null;
  });
  
  inclNeutrals?.addEventListener('change', ()=>{
    localStorage.setItem(INCL_NEUTRALS_KEY, inclNeutrals.checked ? '1' : '0');
    refreshSatDisabledState();
    emaPct = null;
  });

  paletteChips = $('#paletteChips');
  paletteExportBtn = $('#paletteExport');
  paletteToggleBtn = $('#paletteToggle');
  palettePanelElem = $('#palettePanel');
  if (paletteExportBtn) paletteExportBtnLabel = paletteExportBtn.textContent || paletteExportBtnLabel;
  paletteExportBtn?.addEventListener('click', async ()=>{
    const text = buildPaletteExportText(paletteSnapshot);
    if (!text) return;
    try{
      const copied = await copyPaletteText(text);
      paletteExportBtn.textContent = copied ? 'Copied!' : 'Copy failed';
    }catch(_){
      paletteExportBtn.textContent = 'Copy failed';
    }
    clearTimeout(paletteCopyTimeout);
    paletteCopyTimeout = setTimeout(()=>{
      paletteExportBtn.textContent = paletteExportBtnLabel;
    }, 1800);
  });

  const savedCollapsed = localStorage.getItem(PALETTE_COLLAPSE_KEY);
  paletteCollapsed = savedCollapsed ? (savedCollapsed === '1') : true;
  paletteToggleBtn?.addEventListener('click', ()=>{
    paletteCollapsed = !paletteCollapsed;
    syncPalettePanelState();
  });

  const ratioToggle = document.getElementById('ratioToggle');
  const ratioContent = document.getElementById('ratioContent');
  ratioToggle?.addEventListener('click', ()=>{
    if (!ratioContent) return;
    const expanded = ratioContent.hidden;
    ratioContent.hidden = !expanded;
    ratioToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    ratioToggle.textContent = expanded ? 'Hide the ratio' : 'Learn more';
  });
  syncPalettePanelState();

  // Open Studio
  $('#openStudio')?.addEventListener('click', async ()=>{
    ensureAudio();
    if (!(await ensureEntitled())) return;
    const landing = $('#landing');
    const studio  = $('#studio');
    document.body.classList.remove('lock');
    studio.hidden = false;
    init().catch(()=>{});
    landing.classList.add('is-hiding');
    landing.addEventListener('transitionend', ()=>{ landing.hidden = true; }, { once:true });
    try{ studio.scrollIntoView({behavior:'smooth', block:'start'}); }catch(_){}
  });

  // Start camera
  $('#startBtn')?.addEventListener('click', ()=>{
    ensureAudio();
    init();
  });

  // overlay mode → show/hide wipe slider
  $('#overlayMode')?.addEventListener('change', ()=>{
    $('#wipeWrap').style.display = $('#overlayMode').value==='wipe' ? 'inline-block' : 'none';
  });

  // capture + ref still
  $('#btnCapture')?.addEventListener('click', saveCapture);
  $('#refUpload')?.addEventListener('change', onUploadRef);
  $('#grabRef')?.addEventListener('click', grabRefFromVideo);

  // device changes
  navigator.mediaDevices?.addEventListener?.('devicechange', listDevices);

  // score throttle
  initScoreUpdateMode();

  /* =========================
     Composition Guides Integration
     =========================  */
  var guideSelect = document.getElementById('guideSelect');
  if (guideSelect) {
    guideSelect.addEventListener('change', function() {
      currentGuide = guideSelect.value;
    });
  }

  var btnGuideToggle = document.getElementById('btnGuideToggle');
  if (btnGuideToggle) {
    btnGuideToggle.addEventListener('click', function() {
      if (currentGuide === 'off') {
        currentGuide = 'thirds';
        if (guideSelect) guideSelect.value = 'thirds';
      } else {
        currentGuide = 'off';
        if (guideSelect) guideSelect.value = 'off';
      }
      btnGuideToggle.classList.toggle('active', currentGuide !== 'off');
    });
  }

  // Keyboard shortcut: G for guides
  document.addEventListener('keydown', function(e) {
    if (e.key === 'g' || e.key === 'G') {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
        if (btnGuideToggle) btnGuideToggle.click();
      }
    }
  });

}); // <-- This closes DOMContentLoaded

// derive theme after full load if none saved
window.addEventListener('load', ()=>{
  restoreSavedThemeIfAny();
}, { once:true });
