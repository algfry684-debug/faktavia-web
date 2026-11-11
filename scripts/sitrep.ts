import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ================= Data & helper ================= */
type Insiden = {
  id: string; title: string; type: string; status: string; severity: string; place: string; province: string;
  lat: number; lng: number; t: number; description: string; sourceName: string; sourceUrl: string; article: string;
};
type Cam = { name: string; type: 'iframe' | 'youtube' | 'hls' | 'image'; url: string; openUrl?: string; note?: string };
type XAcc = { label: string; handle: string };

const cfg = JSON.parse(document.getElementById('sitrep-config')!.textContent || '{}') as {
  insiden: Insiden[]; cctv: Cam[]; x: XAcc[];
};
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
function safeHref(u: string) {
  try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : ''; } catch { return ''; }
}
function link(text: string, href: string) {
  const a = h('a', '', text);
  const s = safeHref(href);
  if (s) { a.href = s; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  return a;
}
const tfmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
const cfmt = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
const fmt = (t: number) => tfmt.format(t).replace(/\./g, ':') + ' WIB';
const clock = (t = Date.now()) => cfmt.format(t).replace(/\./g, ':');
function rel(t: number | null) {
  if (!t) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 90) return 'baru saja';
  if (s < 3600) return Math.round(s / 60) + ' menit lalu';
  if (s < 86400) return Math.round(s / 3600) + ' jam lalu';
  return Math.round(s / 86400) + ' hari lalu';
}
async function getJson(path: string) {
  const r = await fetch(path, { signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j?.error || 'HTTP ' + r.status), { status: r.status });
  return j;
}
function errorItem(list: HTMLElement, msg: string, retry: () => void) {
  list.replaceChildren();
  const li = h('li', 'state err', msg + ' ');
  const b = h('button', 'retry', 'Coba lagi');
  b.type = 'button';
  b.addEventListener('click', retry);
  li.append(b);
  list.append(li);
}
function every(fn: () => void, ms: number) {
  fn();
  setInterval(() => { if (!document.hidden) fn(); }, ms);
}

/* ================= Jam ================= */
setInterval(() => { $('srClock').textContent = clock(); }, 1000);
$('srClock').textContent = clock();

/* ================= Peta ================= */
const TYPE_COLOR: Record<string, string> = {
  Demo: '#E5484D', Kebakaran: '#F76B15', Banjir: '#0091FF', Gempa: '#8E4EC6', Longsor: '#8E4EC6', 'Bencana Lain': '#8E4EC6',
};
const typeColor = (t: string) => TYPE_COLOR[t] ?? '#687076';
const magClass = (m: number) => (m >= 6 ? 'm4' : m >= 5 ? 'm3' : m >= 4 ? 'm2' : 'm1');
const magColor = (m: number) => (m >= 6 ? '#8A1C14' : m >= 5 ? '#D4441C' : m >= 4 ? '#D9961A' : '#3E8E5C');

const map = L.map('srMap', { center: [-2.5, 118], zoom: 5, minZoom: 4, maxZoom: 14, zoomControl: true });
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
}).addTo(map);
const canvas = L.canvas({ padding: 0.4 });
const lyInsiden = L.layerGroup().addTo(map);
const lyGempa = L.layerGroup().addTo(map);
const lyHot = L.layerGroup();
const insidenMarkers = new Map<string, L.CircleMarker>();

function bindLayer(id: string, layer: L.LayerGroup) {
  const cb = $<HTMLInputElement>(id);
  cb.addEventListener('change', () => (cb.checked ? layer.addTo(map) : map.removeLayer(layer)));
}
bindLayer('lyInsiden', lyInsiden);
bindLayer('lyGempa', lyGempa);
const hotCb = $<HTMLInputElement>('lyHot');
hotCb.addEventListener('change', () => (hotCb.checked ? lyHot.addTo(map) : map.removeLayer(lyHot)));

/* ================= Catatan insiden ================= */
function popupInsiden(i: Insiden) {
  const d = h('div');
  d.append(h('strong', '', i.title), h('br'), h('span', '', `${i.type} · ${i.status} · ${fmt(i.t)}`), h('br'), h('span', '', i.place));
  if (i.description) { d.append(h('br'), h('span', '', i.description)); }
  if (i.article) { const a = h('a', '', 'Baca laporan Faktavia'); a.href = i.article; d.append(h('br'), a); }
  return d;
}
function renderInsiden() {
  const list = $('insidenList');
  list.replaceChildren();
  if (!cfg.insiden.length) list.append(h('li', 'state', 'Belum ada catatan insiden.'));
  for (const i of cfg.insiden) {
    const m = L.circleMarker([i.lat, i.lng], {
      radius: i.severity === 'Tinggi' ? 11 : i.severity === 'Sedang' ? 9 : 7,
      color: '#fff', weight: 2, fillColor: typeColor(i.type), fillOpacity: i.status === 'Mereda' ? 0.45 : 0.95,
    }).bindPopup(popupInsiden(i));
    m.addTo(lyInsiden);
    insidenMarkers.set(i.id, m);

    const li = h('li');
    const head = h('div');
    const btn = h('button', 'retry', i.title);
    btn.type = 'button';
    btn.style.textDecoration = 'none';
    btn.style.textAlign = 'left';
    btn.title = 'Lihat di peta';
    btn.addEventListener('click', () => {
      map.flyTo([i.lat, i.lng], 11, { duration: 0.8 });
      m.openPopup();
      $('srMap').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    btn.style.marginLeft = '0';
    btn.style.fontWeight = '700';
    head.append(btn);
    const meta = h('div', 'm');
    meta.append(h('span', 'st ' + i.status, i.status), h('span', 'tagp', i.type), h('span', '', fmt(i.t) + ' · ' + rel(i.t)), h('span', '', i.place));
    li.append(head, meta);
    if (i.description) li.append(h('div', 'm', i.description));
    const links = h('div', 'm');
    if (i.article) { const a = h('a', '', 'Laporan Faktavia'); a.href = i.article; links.append(a); }
    if (i.sourceUrl) links.append(link('Sumber: ' + (i.sourceName || 'tautan'), i.sourceUrl));
    else if (i.sourceName) links.append(h('span', '', 'Sumber: ' + i.sourceName));
    if (links.childNodes.length) li.append(links);
    list.append(li);
  }
  const active = cfg.insiden.filter((i) => i.status !== 'Mereda').length;
  const ver = cfg.insiden.filter((i) => i.status === 'Terverifikasi').length;
  $('kInsiden').textContent = String(active);
  $('kInsidenSub').textContent = `${cfg.insiden.length} tercatat · ${ver} terverifikasi`;
}
renderInsiden();

/* ================= Gempa (BMKG) ================= */
let notifOn = false;
let seenQuakes: Set<string> | null = null;
async function loadGempa() {
  const list = $('gempaList');
  try {
    const j = await getJson('/api/gempa');
    const items = j.items as { t: number; mag: number; depth: number | null; lat: number; lon: number; wilayah: string; potensi: string; felt: boolean }[];
    list.replaceChildren();
    lyGempa.clearLayers();
    for (const q of items) {
      const li = h('li');
      const top = h('div');
      top.append(h('span', 'mag ' + magClass(q.mag), 'M ' + q.mag.toFixed(1)), h('span', '', q.wilayah));
      const meta = h('div', 'm');
      meta.append(h('span', '', fmt(q.t) + ' · ' + rel(q.t)));
      if (q.depth != null) meta.append(h('span', '', 'Kedalaman ' + q.depth + ' km'));
      if (q.felt) meta.append(h('span', 'tagp', 'Dirasakan'));
      if (q.potensi) meta.append(h('span', '', q.potensi));
      li.append(top, meta);
      list.append(li);
      const c = L.circleMarker([q.lat, q.lon], {
        radius: 3 + q.mag * 1.8, color: magColor(q.mag), weight: 1.5, fillColor: magColor(q.mag), fillOpacity: 0.3,
      });
      const pop = h('div');
      pop.append(h('strong', '', `Gempa M ${q.mag.toFixed(1)}`), h('br'), h('span', '', q.wilayah), h('br'), h('span', '', fmt(q.t) + (q.depth != null ? ` · ${q.depth} km` : '')), h('br'), h('span', '', 'Sumber: BMKG'));
      c.bindPopup(pop).addTo(lyGempa);
    }
    const top = items[0];
    $('kGempa').textContent = 'M ' + top.mag.toFixed(1);
    $('kGempaSub').textContent = `${top.wilayah} · ${rel(top.t)}`;
    $('gempaStamp').textContent = 'Diperbarui ' + clock();

    const keys = new Set(items.map((q) => q.t + '|' + q.lat + '|' + q.lon));
    if (seenQuakes && notifOn && 'Notification' in window && Notification.permission === 'granted') {
      for (const q of items) {
        const k = q.t + '|' + q.lat + '|' + q.lon;
        if (!seenQuakes.has(k) && q.mag >= 5 && Date.now() - q.t < 3 * 3600 * 1000) {
          new Notification(`Gempa M ${q.mag.toFixed(1)}`, { body: `${q.wilayah}\nSumber: BMKG`, tag: k });
        }
      }
    }
    seenQuakes = keys;
  } catch {
    errorItem(list, 'Data gempa BMKG belum bisa dimuat.', loadGempa);
    $('kGempa').textContent = 'n/a';
    $('kGempaSub').textContent = 'Data tidak tersedia saat ini';
  }
}

/* ================= Peringatan dini cuaca (BMKG) ================= */
async function loadCuaca() {
  const list = $('cuacaList');
  try {
    const j = await getJson('/api/cuaca');
    const items = j.items as { title: string; link: string; t: number | null }[];
    list.replaceChildren();
    if (!items.length) list.append(h('li', 'state', 'Tidak ada peringatan dini aktif.'));
    for (const it of items.slice(0, 30)) {
      const li = h('li');
      li.append(link(it.title, it.link));
      if (it.t) li.append(h('div', 'm', fmt(it.t) + ' · ' + rel(it.t)));
      list.append(li);
    }
    if (j.total > 30) list.append(h('li', 'state', `…dan ${j.total - 30} peringatan lain di BMKG`));
    $('kCuaca').textContent = String(j.total);
    $('kCuacaSub').textContent = j.total ? 'Peringatan aktif · sumber BMKG' : 'Tidak ada peringatan aktif';
    $('cuacaStamp').textContent = 'Diperbarui ' + clock();
  } catch {
    errorItem(list, 'Peringatan dini BMKG belum bisa dimuat.', loadCuaca);
    $('kCuaca').textContent = 'n/a';
    $('kCuacaSub').textContent = 'Data tidak tersedia saat ini';
  }
}

/* ================= Titik panas (NASA FIRMS) ================= */
async function loadHot() {
  try {
    const j = await getJson('/api/hotspot');
    lyHot.clearLayers();
    for (const [lat, lon, frp, t, conf] of j.points as [number, number, number, number | null, string][]) {
      const m = L.circleMarker([lat, lon], { renderer: canvas, radius: 3, color: '#F76B15', weight: 0, fillColor: '#F76B15', fillOpacity: 0.75 });
      const pop = h('div');
      pop.append(h('strong', '', 'Titik panas (bukan konfirmasi kebakaran)'), h('br'),
        h('span', '', `${t ? fmt(t) : ''} · FRP ${frp} MW · kepercayaan ${conf === 'h' ? 'tinggi' : 'sedang'}`), h('br'), h('span', '', 'Sumber: NASA FIRMS'));
      m.bindPopup(pop);
      m.addTo(lyHot);
    }
    $('kHot').textContent = String(j.total);
    $('kHotSub').textContent = 'Deteksi satelit, bukan konfirmasi api · NASA FIRMS';
  } catch (e: any) {
    $('kHot').textContent = 'n/a';
    $('kHotSub').textContent = e?.status === 503 ? 'Belum aktif: kunci API belum diatur' : 'Data tidak tersedia saat ini';
  }
}

/* ================= Wire berita ================= */
type WireItem = { title: string; link: string; t: number | null; src: string; tags: string[] };
let wire: WireItem[] = [];
let wireTag = 'all';
function renderWire() {
  const list = $('wireList');
  list.replaceChildren();
  const rows = wire.filter((x) => wireTag === 'all' || x.tags.includes(wireTag)).slice(0, 40);
  if (!rows.length) list.append(h('li', 'state', 'Belum ada berita untuk topik ini.'));
  for (const it of rows) {
    const li = h('li');
    li.append(link(it.title, it.link));
    const m = h('div', 'm');
    m.append(h('span', '', it.src));
    if (it.t) m.append(h('span', '', rel(it.t)));
    for (const t of it.tags) m.append(h('span', 'tagp', t));
    li.append(m);
    list.append(li);
  }
}
async function loadWire() {
  try {
    const j = await getJson('/api/wire');
    wire = j.items;
    renderWire();
    $('wireStamp').textContent = 'Diperbarui ' + clock();
  } catch {
    errorItem($('wireList'), 'Wire berita belum bisa dimuat.', loadWire);
  }
}
$('wireChips').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button[data-tag]') as HTMLButtonElement | null;
  if (!b) return;
  wireTag = b.dataset.tag || 'all';
  $('wireChips').querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === b));
  renderWire();
});

/* ================= CCTV ================= */
let camCleanup: (() => void) | null = null;
function ytId(u: string) {
  if (/^[\w-]{11}$/.test(u)) return u;
  try {
    const x = new URL(u);
    if (x.hostname.endsWith('youtu.be')) return x.pathname.slice(1, 12);
    return x.searchParams.get('v') || x.pathname.split('/').filter(Boolean).pop()?.slice(0, 11) || '';
  } catch { return ''; }
}
async function playCam(cam: Cam, stage: HTMLElement) {
  camCleanup?.();
  camCleanup = null;
  stage.replaceChildren();
  const url = cam.type === 'youtube' ? cam.url : safeHref(cam.url);
  if (!url || (cam.type !== 'youtube' && !url.startsWith('https://'))) {
    stage.append(h('p', 'state', 'Alamat kamera tidak valid atau tidak memakai https.'));
    return;
  }
  if (cam.type === 'iframe' || cam.type === 'youtube') {
    const f = document.createElement('iframe');
    if (cam.type === 'youtube') {
      const id = ytId(cam.url);
      if (!id) { stage.append(h('p', 'state', 'ID video YouTube tidak valid.')); return; }
      f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=1&rel=0`;
    } else f.src = url;
    f.title = cam.name;
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer';
    f.allow = 'autoplay; fullscreen; picture-in-picture';
    f.allowFullscreen = true;
    f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
    stage.append(f);
  } else if (cam.type === 'hls') {
    const v = document.createElement('video');
    v.controls = true; v.muted = true; v.autoplay = true; v.playsInline = true;
    stage.append(v);
    if (v.canPlayType('application/vnd.apple.mpegurl')) v.src = url;
    else {
      try {
        const { default: Hls } = await import('hls.js');
        if (Hls.isSupported()) {
          const hls = new Hls({ lowLatencyMode: true });
          hls.loadSource(url);
          hls.attachMedia(v);
          camCleanup = () => hls.destroy();
        } else stage.replaceChildren(h('p', 'state', 'Peramban ini tidak mendukung siaran HLS.'));
      } catch { stage.replaceChildren(h('p', 'state', 'Pemutar siaran gagal dimuat.')); }
    }
  } else if (cam.type === 'image') {
    const img = document.createElement('img');
    img.alt = cam.name;
    const tick = () => { img.src = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(); };
    tick();
    const id = setInterval(tick, 10000);
    camCleanup = () => clearInterval(id);
    stage.append(img);
  }
}
function setupCctv() {
  const tabs = $('cctvTabs');
  const stage = $('cctvStage');
  const note = $('cctvNote');
  if (!cfg.cctv.length) { stage.replaceChildren(h('p', 'state', 'Belum ada kamera. Tambahkan lewat admin: Pengaturan Sitrep.')); return; }
  let current = -1;
  const select = (i: number, autoplay: boolean) => {
    current = i;
    const cam = cfg.cctv[i];
    tabs.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-selected', String(k === i)));
    camCleanup?.(); camCleanup = null;
    stage.replaceChildren();
    const actions = h('div', 'cctv-actions');
    const load = h('button', 'btn btn-amber', 'Tampilkan siaran di sini');
    load.type = 'button';
    load.addEventListener('click', () => playCam(cam, stage));
    actions.append(load);
    const open = safeHref(cam.openUrl || cam.url);
    if (open) { const a = h('a', 'btn btn-ghost', 'Buka di tab baru'); a.href = open; a.target = '_blank'; a.rel = 'noopener noreferrer'; actions.append(a); }
    stage.append(actions);
    note.textContent = (cam.note ? cam.note + ' ' : '') + 'Jika layar kosong, situs sumber tidak mengizinkan ditampilkan di situs lain: pakai "Buka di tab baru".';
    if (autoplay) playCam(cam, stage);
  };
  cfg.cctv.forEach((cam, i) => {
    const b = h('button', '', cam.name);
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => select(i, true));
    tabs.append(b);
  });
  select(0, false);
  // Siaran pertama dimuat otomatis saat panel CCTV terlihat di layar.
  const panel = stage.closest('.panel') as HTMLElement;
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((en) => {
      if (en.some((x) => x.isIntersecting) && current === 0 && !stage.querySelector('iframe,video,img')) {
        select(0, true);
        io.disconnect();
      }
    }, { threshold: 0.25 });
    io.observe(panel);
  }
}
setupCctv();

/* ================= X live (dimuat setelah klik) ================= */
function setupX() {
  const tabs = $('xTabs');
  const stage = $('xStage');
  if (!cfg.x.length) { stage.replaceChildren(h('p', 'note', 'Belum ada akun. Tambahkan lewat admin: Pengaturan Sitrep.')); return; }
  let handle = cfg.x[0].handle;
  let loaded = false;
  const draw = () => {
    stage.replaceChildren();
    if (!/^\w{1,15}$/.test(handle)) { stage.append(h('p', 'note', 'Nama akun X tidak valid.')); return; }
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const a = h('a', 'twitter-timeline', `Posts oleh @${handle}`);
    a.href = `https://twitter.com/${handle}`;
    a.setAttribute('data-height', '520');
    a.setAttribute('data-dnt', 'true');
    a.setAttribute('data-theme', dark ? 'dark' : 'light');
    stage.append(a, h('p', 'note', 'Jika timeline tidak muncul, X mungkin membatasi tampilan di situs lain. Buka langsung di X: @' + handle));
    (window as any).twttr?.widgets?.load(stage);
  };
  const load = () => {
    if (loaded) return draw();
    loaded = true;
    const s = document.createElement('script');
    s.src = 'https://platform.twitter.com/widgets.js';
    s.async = true;
    s.onload = draw;
    s.onerror = () => { loaded = false; stage.replaceChildren(h('p', 'note err', 'Gagal memuat X.')); };
    document.head.append(s);
    draw();
  };
  cfg.x.forEach((acc, i) => {
    const b = h('button', '', acc.label);
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(i === 0));
    b.addEventListener('click', () => {
      handle = acc.handle;
      tabs.querySelectorAll('button').forEach((x, k) => x.setAttribute('aria-selected', String(k === i)));
      if (loaded) draw();
    });
    tabs.append(b);
  });
  $('xLoad').addEventListener('click', load);
}
setupX();

/* ================= Notifikasi gempa (hanya saat halaman terbuka) ================= */
function setupNotif() {
  const b = $<HTMLButtonElement>('srNotif');
  if (!('Notification' in window)) { b.hidden = true; return; }
  const label = () => { b.textContent = notifOn ? 'Notifikasi gempa M ≥ 5 aktif' : 'Aktifkan notifikasi gempa'; };
  try { notifOn = localStorage.getItem('sitrep-notif') === '1' && Notification.permission === 'granted'; } catch {}
  label();
  b.addEventListener('click', async () => {
    if (notifOn) { notifOn = false; try { localStorage.setItem('sitrep-notif', '0'); } catch {} label(); return; }
    const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    notifOn = p === 'granted';
    try { localStorage.setItem('sitrep-notif', notifOn ? '1' : '0'); } catch {}
    label();
    if (notifOn) b.title = 'Notifikasi hanya muncul selama halaman Sitrep terbuka di peramban.';
  });
}
setupNotif();

/* ================= Jadwal pembaruan ================= */
every(loadGempa, 2 * 60 * 1000);
every(loadCuaca, 5 * 60 * 1000);
every(loadWire, 2 * 60 * 1000);
every(loadHot, 15 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadGempa(); loadWire(); } });
