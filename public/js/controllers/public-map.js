/**
 * Controller: public-map
 * Public-facing Moldova weather warnings page — reads from Laravel API.
 * Depends on: models/warnings.js, district-codes.js
 */

const PUBLIC_MAP_NORMAL_COLOR = '#28D762';
const POPUP_DISMISSED_KEY     = 'moldova_warnings_popup_dismissed';
const POPUP_INSTANCE_ID       = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const IS_MAP_WIDGET           = document.documentElement.classList.contains('map-widget');
const IS_EMBED                = document.documentElement.classList.contains('embed');
const WIDGET_DEFAULT_REDIRECT = warningKind() === 'env'
  ? 'https://www.meteo.md/index.php/ro/environmental/current-warnings'
  : 'https://www.meteo.md/index.php/ro/weather/current-warnings';

function widgetRedirectUrl() {
  try {
    const q = new URLSearchParams(location.search).get('redirect');
    if (q && /^https?:\/\//i.test(q)) return q;
  } catch (_) {}
  return WIDGET_DEFAULT_REDIRECT;
}

function goFromWidget() {
  if (!IS_MAP_WIDGET) return;
  const url = widgetRedirectUrl();
  try {
    if (window.top && window.top !== window) window.top.location.href = url;
    else window.location.href = url;
  } catch (_) {
    window.location.href = url;
  }
}

let publicMap          = null;
let publicGeojsonLayer = null;
let districtWarnings   = {};
let selectedWarningIndex = null;
let cachedWarnings     = [];

// ── Helpers ───────────────────────────────────────────────────────────────────
function escapeHtmlPublic(value) {
  return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function colorRank(color) {
  if (!color) return 0;
  const v = color.toLowerCase();
  if (v.includes('ff0000')) return 4;
  if (v.includes('ff8a00')) return 3;
  if (v.includes('ffff00') || v.includes('ffed00') || v.includes('fce636')) return 2;
  if (v.includes('28d762')) return 1;
  return 0;
}

function codeMeta(code) {
  if (code.includes('ROȘU'))       return { color: '#FF0000', box: 'bg-red-50 border-red-200',     title: 'text-red-800' };
  if (code.includes('PORTOCALIU')) return { color: '#FF8A00', box: 'bg-orange-50 border-orange-200', title: 'text-orange-800' };
  if (code.includes('VERDE'))      return { color: '#28D762', box: 'bg-emerald-50 border-emerald-200', title: 'text-emerald-800' };
  return { color: '#FFED00', box: 'bg-amber-50 border-amber-200', title: 'text-amber-800' };
}

// ── Side panel rendering ──────────────────────────────────────────────────────
function codesHtml(codes) {
  if (!codes?.length) return '';
  return `<div class="mt-3 flex flex-col gap-2">${codes.map(c => {
    const m = codeMeta(c.code);
    return `<div class="rounded-xl border p-3 ${m.box}">
      <div class="mb-1 flex items-center gap-2 text-sm font-bold ${m.title}">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background:${m.color}"></span>
        ${escapeHtmlPublic(c.code)}
      </div>
      <div class="text-[15px] leading-relaxed text-slate-700">${escapeHtmlPublic(c.description||'Fără descriere')}</div>
    </div>`;
  }).join('')}</div>`;
}

function warningCardHtml(item, index, isSelected) {
  const cls = isSelected
    ? 'bg-white border-brand-200 shadow-md ring-2 ring-brand-100'
    : 'bg-slate-50 border-slate-200 shadow-none';
  return `
    <article class="mb-3 cursor-pointer rounded-xl border p-4 outline-none transition hover:border-brand-200 hover:bg-white ${cls}"
             data-warning="${index}" onclick="selectWarning(${index})">
      <h3 class="text-base font-bold text-brand-700">${escapeHtmlPublic(item.phenomenon||(warningKind()==='env'?'Avertizare de mediu':'Avertizare meteorologică'))}</h3>
      <p class="mt-1 text-[11px] text-slate-500">${escapeHtmlPublic(formatInterval(item)||formatDateTime(item.emitDate))}</p>
      ${codesHtml(item.codes)}
    </article>`;
}

function renderPopupToggleButton(count) {
  const btn = document.getElementById('open-popup-btn');
  if (!btn) return;
  if (!IS_EMBED) {
    btn.disabled = false;
    btn.textContent = 'Descarcă harta';
    btn.onclick = downloadMapScreenshot;
    return;
  }
  btn.disabled    = count === 0;
  btn.textContent = count > 0 ? 'Deschide popup' : 'Nu există avertizări';
}

function updateDownloadMapButton(count) {
  const btn = document.getElementById('download-map-btn');
  if (!btn) return;
  if (IS_EMBED && count > 0) btn.classList.add('is-visible');
  else btn.classList.remove('is-visible');
}

function walkLatLngRings(latlngs, out = []) {
  if (!latlngs?.length) return out;
  if (latlngs[0] && typeof latlngs[0].lat === 'number') {
    out.push(latlngs);
    return out;
  }
  latlngs.forEach(part => walkLatLngRings(part, out));
  return out;
}

function downloadTransparentMap() {
  if (!IS_EMBED || !publicMap || !publicGeojsonLayer) return;
  if (!cachedWarnings.length) return;

  const bounds = publicGeojsonLayer.getBounds();
  if (!bounds || !bounds.isValid()) return;

  // Same projection as the live Leaflet map (Web Mercator), not raw lat/lng.
  const crs = L.CRS.EPSG3857;
  const zoom = 9;

  const layers = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  publicGeojsonLayer.eachLayer(layer => {
    if (!layer.getLatLngs) return;
    const rings = walkLatLngRings(layer.getLatLngs())
      .map(ring => ring.map(ll => {
        const p = crs.latLngToPoint(L.latLng(ll.lat, ll.lng), zoom);
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
        return p;
      }))
      .filter(ring => ring.length > 2);
    if (!rings.length) return;

    const label = layer.feature?.properties?._label
      || districtLabel(layer.feature?.properties?.shapeName
        || layer.feature?.properties?.NAME
        || layer.feature?.properties?.name
        || '');
    let labelPt = null;
    if (label && layer.getBounds) {
      const c = layer.getBounds().getCenter();
      labelPt = crs.latLngToPoint(c, zoom);
    }

    layers.push({
      rings,
      label,
      labelPt,
      fill: layer.options?.fillColor || PUBLIC_MAP_NORMAL_COLOR,
      fillOpacity: layer.options?.fillOpacity ?? 0.9,
      stroke: layer.options?.color || '#ffffff',
      weight: layer.options?.weight ?? 1.3,
    });
  });

  if (!layers.length || !Number.isFinite(minX)) return;

  const contentW = Math.max(maxX - minX, 1);
  const contentH = Math.max(maxY - minY, 1);
  const pad = 36;
  const target = 1000;
  const fit = Math.min(target / contentW, target / contentH);

  const outW = contentW * fit + pad * 2;
  const outH = contentH * fit + pad * 2;
  const scale = 2;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(outW * scale);
  canvas.height = Math.round(outH * scale);
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, outW, outH);

  function toCanvas(p) {
    return {
      x: pad + (p.x - minX) * fit,
      y: pad + (p.y - minY) * fit,
    };
  }

  layers.forEach(item => {
    item.rings.forEach(ring => {
      ctx.beginPath();
      ring.forEach((p, i) => {
        const c = toCanvas(p);
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      });
      ctx.closePath();
      ctx.globalAlpha = item.fillOpacity;
      ctx.fillStyle = item.fill;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = item.stroke;
      ctx.lineWidth = Math.max(1, item.weight * fit * 0.35);
      ctx.stroke();
    });
  });

  const fontPx = Math.max(10, Math.round(12 * fit * 0.55));
  ctx.font = `700 ${fontPx}px Inter, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  layers.forEach(item => {
    if (!item.label || !item.labelPt) return;
    const c = toCanvas(item.labelPt);
    const halo = [
      [-1, -1], [1, -1], [-1, 1], [1, 1],
      [-1, 0], [1, 0], [0, -1], [0, 1],
    ];
    ctx.fillStyle = '#ffffff';
    halo.forEach(([dx, dy]) => ctx.fillText(item.label, c.x + dx, c.y + dy));
    ctx.fillStyle = '#14532d';
    ctx.fillText(item.label, c.x, c.y);
  });

  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  link.download = `harta-avertizari-${stamp}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function downloadMapScreenshot() {
  if (!publicMap || !publicGeojsonLayer) return;

  const crs = L.CRS.EPSG3857;
  const zoom = 12;
  const shapes = [];
  const roads = [];
  const labels = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function project(ll) {
    const p = crs.latLngToPoint(L.latLng(ll.lat, ll.lng), zoom);
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
    return p;
  }

  function projectRing(latlngs) {
    return latlngs.map(project);
  }

  function addPolygon(layer, kind) {
    const rings = walkLatLngRings(layer.getLatLngs()).map(projectRing).filter(ring => ring.length > 2);
    if (!rings.length) return;
    shapes.push({
      kind,
      rings,
      fill: layer.options.fillColor || ENV_LAND_FILL,
      fillOpacity: layer.options.fillOpacity == null ? 1 : layer.options.fillOpacity,
      stroke: layer.options.color || ENV_LAND_EDGE,
      weight: layer.options.weight || 1,
    });
  }

  publicMap.eachLayer(layer => {
    if (layer === publicGeojsonLayer || !layer.eachLayer) return;
    if (layer.options && layer.options.pane === 'envRoads') {
      layer.eachLayer(line => {
        if (!line.getLatLngs) return;
        const parts = [];
        walkLatLngRings(line.getLatLngs()).forEach(ring => {
          // Roads are lines; walkLatLngRings only keeps point rings.
          if (ring.length > 1) parts.push(projectRing(ring));
        });
        if (!parts.length) return;
        roads.push({
          parts,
          stroke: line.options.color || '#B7C0BB',
          weight: line.options.weight || 1.2,
          opacity: line.options.opacity == null ? 1 : line.options.opacity,
        });
      });
      return;
    }
    layer.eachLayer(child => {
      if (!child.getLatLngs || child.getRadius) return;
      if (child.options && child.options.fill === false) return;
      addPolygon(child, 'outline');
    });
  });

  publicGeojsonLayer.eachLayer(layer => {
    if (!layer.getLatLngs) return;
    addPolygon(layer, 'district');
    const text = layer.feature && layer.feature.properties && layer.feature.properties._label;
    if (!text || !layer.getBounds) return;
    let center = null;
    if (typeof layer.getCenter === 'function') {
      try { center = layer.getCenter(); } catch (e) { center = null; }
    }
    if (!center || !Number.isFinite(center.lat)) center = layer.getBounds().getCenter();
    const shapeName = layer.feature.properties.shapeName
      || layer.feature.properties.NAME
      || layer.feature.properties.name
      || '';
    const offset = warningKind() === 'env'
      ? envLabelOffset(shapeName)
      : (typeof meteoLabelOffset === 'function' ? meteoLabelOffset(shapeName) : [0, 0]);
    const screenPt = publicMap.latLngToContainerPoint(center);
    const shifted = publicMap.containerPointToLatLng(L.point(
      screenPt.x + (offset[0] || 0),
      screenPt.y + (offset[1] || 0)
    ));
    labels.push({ text, pt: project(shifted) });
  });

  if (!Number.isFinite(minX) || !shapes.length) return;

  const contentW = Math.max(maxX - minX, 1);
  const contentH = Math.max(maxY - minY, 1);
  const target = 3400;
  const fit = Math.min(target / contentW, target / contentH);
  const screenBounds = publicGeojsonLayer.getBounds();
  const screenNW = publicMap.latLngToContainerPoint(screenBounds.getNorthWest());
  const screenSE = publicMap.latLngToContainerPoint(screenBounds.getSouthEast());
  const screenSpan = Math.max(Math.abs(screenSE.x - screenNW.x), Math.abs(screenSE.y - screenNW.y), 1);
  const lineScale = Math.max(contentW, contentH) * fit / screenSpan;
  const pad = 96;
  const outW = Math.round(contentW * fit + pad * 2);
  const outH = Math.round(contentH * fit + pad * 2);
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.clearRect(0, 0, outW, outH);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  function toCanvas(p) {
    return {
      x: pad + (p.x - minX) * fit,
      y: pad + (p.y - minY) * fit,
    };
  }

  function traceRing(ring) {
    ring.forEach((p, i) => {
      const c = toCanvas(p);
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.closePath();
  }

  shapes.forEach(item => {
    ctx.beginPath();
    item.rings.forEach(traceRing);
    ctx.globalAlpha = item.fillOpacity;
    ctx.fillStyle = item.fill;
    ctx.fill('evenodd');
    ctx.globalAlpha = 1;
    ctx.strokeStyle = item.stroke;
    ctx.lineWidth = Math.max(1.5, item.weight * lineScale);
    ctx.stroke();
  });

  roads.forEach(road => {
    ctx.beginPath();
    road.parts.forEach(part => {
      part.forEach((p, i) => {
        const c = toCanvas(p);
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      });
    });
    ctx.globalAlpha = road.opacity;
    ctx.strokeStyle = road.stroke;
    ctx.lineWidth = Math.max(1.25, road.weight * lineScale);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  Object.values(envPublicMarkers).forEach(marker => {
    const c = toCanvas(project(marker.getLatLng()));
    const radius = Math.max(8, marker.getRadius() * lineScale);
    const weight = Math.max(3, (marker.options.weight || 5) * lineScale);
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = marker.options.fillColor || '#28D762';
    ctx.fill();
    ctx.lineWidth = weight;
    ctx.strokeStyle = marker.options.color || '#ffffff';
    ctx.stroke();
  });

  const fontPx = Math.max(22, 11 * lineScale);
  ctx.font = `700 ${fontPx}px Inter, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, fontPx * 0.22);
  labels.forEach(item => {
    const c = toCanvas(item.pt);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(item.text, c.x, c.y);
    ctx.fillStyle = '#14532d';
    ctx.fillText(item.text, c.x, c.y);
  });

  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  link.download = `${warningKind() === 'env' ? 'harta-mediu' : 'harta-meteo'}-${stamp}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function renderPhenomenaPanel(data) {
  const panel = document.getElementById('phenomena-panel');
  renderPopupToggleButton(data.length);
  updateDownloadMapButton(data.length);
  if (!panel) return;
  if (!data.length) { panel.innerHTML = ''; return; }
  panel.innerHTML = data.map((item, i) => warningCardHtml(item, i, selectedWarningIndex === i)).join('');
}

// ── Popup ─────────────────────────────────────────────────────────────────────
function alertBlockHtml(item, index) {
  const img = item.mapImage
    ? `<img src="${item.mapImage}" alt="Harta">`
    : `<div style="min-height:180px" class="flex items-center justify-center rounded-xl bg-slate-50 py-12 text-center text-sm text-slate-400">Fără hartă</div>`;

  const badges = (item.codes||[]).map(c => {
    const m = codeMeta(c.code);
    return `<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style="background:${m.color};color:${/ffff00|ffed00|fce636/i.test(m.color)?'#78350f':'#fff'}">${escapeHtmlPublic(c.code)}</span>`;
  }).join('');

  const footer = (item.codes||[]).map(c => {
    const m = codeMeta(c.code);
    return `<div class="flex items-start gap-3 rounded-xl border p-3 ${m.box}">
      <span class="mt-0.5 h-3 w-3 shrink-0 rounded-full" style="background:${m.color}"></span>
      <div class="min-w-0">
        <div class="text-xs font-bold ${m.title}">${escapeHtmlPublic(c.code)}</div>
        <div class="mt-0.5 text-sm leading-relaxed text-slate-700">${escapeHtmlPublic(c.description||'Fără descriere')}</div>
      </div>
    </div>`;
  }).join('');

  return `
    <section class="border-b border-slate-100 px-6 py-5 last:border-b-0" id="alert-${index}">
      <div class="alert-content flex items-stretch gap-5">
        <div class="popup-map w-[30%] min-w-[160px] max-w-[280px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">${img}</div>
        <div class="flex min-w-0 flex-1 flex-col justify-center">
          <h3 class="mb-2 text-lg font-extrabold text-slate-900">${escapeHtmlPublic(item.phenomenon||'Avertizare')}</h3>
          <div class="mb-1 flex flex-wrap gap-1 text-sm">
            <span class="text-slate-500">Data emiterii:</span>
            <span class="font-semibold text-slate-900">${escapeHtmlPublic(formatDateTime(item.emitDate)||'—')}</span>
          </div>
          <div class="mb-3 flex flex-wrap gap-1 text-sm">
            <span class="text-slate-500">Intervalul de acțiune:</span>
            <span class="font-semibold text-slate-900">${escapeHtmlPublic(formatInterval(item)||'—')}</span>
          </div>
          <div class="flex flex-wrap gap-2">${badges}</div>
        </div>
      </div>
      ${footer ? `<div class="mt-4 grid gap-2 sm:grid-cols-2">${footer}</div>` : ''}
    </section>`;
}

function showStartupPopups(data, force = false) {
  const list    = document.getElementById('popup-list');
  const overlay = document.getElementById('overlay');
  renderPopupToggleButton(data.length);
  if (!list || !overlay) return;
  if (!data.length) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); return; }
  if (!force && sessionStorage.getItem(POPUP_DISMISSED_KEY) === POPUP_INSTANCE_ID) return;
  list.innerHTML = data.map((item, i) => alertBlockHtml(item, i)).join('');
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
}

function openPopup(index) {
  showStartupPopups(cachedWarnings, true);
  if (typeof index === 'number') {
    const block = document.getElementById('alert-' + index);
    if (block) block.scrollIntoView({ block: 'nearest' });
  }
}

function closePopup(e, { persistDismissal = true } = {}) {
  if (e && e.target?.id !== 'overlay') return;
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('overlay').classList.remove('flex');
  if (persistDismissal) sessionStorage.setItem(POPUP_DISMISSED_KEY, POPUP_INSTANCE_ID);
}

// ── Map ───────────────────────────────────────────────────────────────────────
function restoreLayer(layer) {
  const name  = layer.feature.properties.shapeName || layer.feature.properties.NAME || layer.feature.properties.name;
  const label = layer.feature.properties._label;
  const found = districtWarnings[name] || districtWarnings[label];
  if (found?.color) {
    const fill = /ffff00|ffed00|fce636/i.test(found.color) ? '#FFED00' : found.color;
    layer.setStyle({ fillColor: fill, fillOpacity: 0.9, color: '#ffffff', weight: 1.3 });
  } else {
    publicGeojsonLayer.resetStyle(layer);
  }
}

function stationColors(data) {
  const source = selectedWarningIndex == null
    ? data.map((warning, index) => ({ warning, index }))
    : data[selectedWarningIndex] ? [{ warning: data[selectedWarningIndex], index: selectedWarningIndex }] : [];
  const result = {};
  source.forEach(({ warning, index }) => {
    (warning.districts || []).forEach(station => {
      [station.name, station.label].filter(Boolean).forEach(key => {
        if (!result[key] || colorRank(station.color) > colorRank(result[key].color)) {
          result[key] = { color: station.color, warningIndex: index };
        }
      });
    });
  });
  return result;
}

const envPublicMarkers = {};

function envPublicRadius() {
  if (IS_MAP_WIDGET || window.self !== window.top || window.innerWidth < 901) return 14;
  return 25;
}

function resizeEnvPublicCircles() {
  const radius = envPublicRadius();
  const weight = radius >= 80 ? 10 : (radius >= 22 ? 5 : 4);
  Object.values(envPublicMarkers).forEach(marker => marker.setStyle({ radius, weight }));
}

function applyEnvCircleColors(data) {
  const colors = stationColors(data);
  const radius = envPublicRadius();
  Object.entries(envPublicMarkers).forEach(([id, marker]) => {
    const match = colors[id];
    marker.setStyle(envMarkerOptions(match?.color || '', radius));
    marker._warningIndex = match ? match.warningIndex : null;
  });
  renderPhenomenaPanel(data);
  renderPopupToggleButton(data.length);
  updateDownloadMapButton(data.length);
}

function addEnvPublicMarkers() {
  Object.entries(ENV_STATIONS).forEach(([id, station]) => {
    const marker = L.circleMarker([station.lat, station.lng], Object.assign({ pane: 'markerPane' }, envMarkerOptions('', envPublicRadius()))).addTo(publicMap);
    marker.bindTooltip(station.label, {
      permanent: false, direction: 'top', offset: [0, -8], className: 'district-label',
    });
    marker.on('click', () => {
      if (IS_MAP_WIDGET) { goFromWidget(); return; }
      if (marker._warningIndex != null) selectWarning(marker._warningIndex);
    });
    envPublicMarkers[id] = marker;
  });
}

function applyMapColors(data) {
  if (warningKind() === 'env') {
    applyEnvCircleColors(data);
    return;
  }
  if (!publicGeojsonLayer) return;
  districtWarnings = stationColors(data);
  publicGeojsonLayer.eachLayer(restoreLayer);
  renderPhenomenaPanel(data);
}

function selectWarning(index) {
  selectedWarningIndex = index;
  applyMapColors(cachedWarnings);
}

function initPublicMap() {
  publicMap = L.map('map', {
    zoomControl: false, dragging: false, touchZoom: false, scrollWheelZoom: false,
    doubleClickZoom: false, boxZoom: false, keyboard: false, attributionControl: false,
    // Canvas fills opaque; SVG keeps the page background transparent for iframe widgets.
    preferCanvas: !IS_MAP_WIDGET, zoomSnap: 0, zoomDelta: 0.1,
  });
  if (IS_MAP_WIDGET) {
    const el = publicMap.getContainer();
    el.style.cursor = 'pointer';
    el.addEventListener('click', goFromWidget);
  }

  fetch('/data/MD_MAP.geojson')
    .then(r => r.json())
    .then(geo => {
      const envMap = warningKind() === 'env';
      if (envMap) addEnvCountryOutline(publicMap, geo);
      publicGeojsonLayer = L.geoJSON(geo, {
        style: envMap
          ? { color: ENV_LAND_FILL, weight: 3, fillColor: ENV_LAND_FILL, fillOpacity: 1 }
          : { color: '#ffffff', weight: 1.3, fillColor: PUBLIC_MAP_NORMAL_COLOR, fillOpacity: 0.9 },
        onEachFeature: (feature, layer) => {
          const fullName = feature.properties.shapeName || feature.properties.NAME || feature.properties.name || '???';
          const label    = envMap ? envPlaceName(fullName) : districtLabel(fullName);
          layer.feature.properties._label = label;
          if (typeof largestPartCenter === 'function') {
            const anchor = largestPartCenter(layer);
            layer.getCenter = () => anchor;
          }
          if (!IS_MAP_WIDGET && label) {
            layer.bindTooltip(label, { permanent: true, direction: 'center', className: 'district-label', offset: envMap ? envLabelOffset(fullName) : meteoLabelOffset(fullName) });
          }

          layer.on({
            mouseover: e => {
              if (IS_MAP_WIDGET || warningKind() === 'env') return;
              e.target.setStyle({ weight: 3, color: '#0f172a', fillOpacity: 0.98 });
              e.target.bringToFront();
            },
            mouseout:  e => {
              if (IS_MAP_WIDGET) return;
              restoreLayer(e.target);
            },
            click:     () => {
              if (IS_MAP_WIDGET) {
                goFromWidget();
                return;
              }
              const name  = feature.properties.shapeName || feature.properties.NAME || feature.properties.name;
              const label = feature.properties._label;
              const found = districtWarnings[name] || districtWarnings[label];
              if (found) selectWarning(found.warningIndex);
            },
          });
        },
      }).addTo(publicMap);

      function mapFitPadding() {
        if (IS_MAP_WIDGET) {
          return { paddingTopLeft: [4, 4], paddingBottomRight: [4, 4] };
        }
        const wide = window.matchMedia('(min-width: 901px)').matches;
        if (!wide) return { paddingTopLeft: [8, 8], paddingBottomRight: [8, 8] };
        const panel = document.querySelector('.info-panel');
        const right = panel && window.getComputedStyle(panel).position === 'absolute'
          ? Math.min(panel.offsetWidth + 16, elWidthSafe())
          : 12;
        return { paddingTopLeft: [4, 12], paddingBottomRight: [right, 12] };
      }
      function elWidthSafe() {
        const el = publicMap.getContainer();
        return Math.max(80, Math.floor((el.clientWidth || 320) * 0.45));
      }
      function fitMap() {
        if (!publicMap || !publicGeojsonLayer) return;
        const el = publicMap.getContainer();
        if (!el.clientWidth || !el.clientHeight) return;
        publicMap.invalidateSize({ animate: false });
        publicMap.fitBounds(publicGeojsonLayer.getBounds(), Object.assign({
          animate: false,
          maxZoom: 20,
        }, mapFitPadding()));
      }
      fitMap();
      requestAnimationFrame(fitMap);
      setTimeout(fitMap, 50);
      setTimeout(fitMap, 250);
      window.addEventListener('resize', () => {
        fitMap();
        resizeEnvPublicCircles();
      });
      if (window.ResizeObserver) {
        new ResizeObserver(() => {
          fitMap();
          resizeEnvPublicCircles();
        }).observe(document.getElementById('map'));
      }

      if (warningKind() === 'env') {
        addEnvRoads(publicMap);
        addEnvPublicMarkers();
      }
      refreshData();
    })
    .catch(err => console.error('Map load error:', err));
}

// ── Data refresh ──────────────────────────────────────────────────────────────
let publicRefreshTimer = null;

async function refreshData(showPopup = false) {
  const data = await getWarnings();
  cachedWarnings = data;
  if (selectedWarningIndex != null && !data[selectedWarningIndex]) {
    selectedWarningIndex = null;
  }
  applyMapColors(data);
  if (!publicGeojsonLayer) renderPhenomenaPanel(data);
  else updateDownloadMapButton(data.length);
  if (showPopup) showStartupPopups(data);

  const now   = Date.now();
  const nexts = data.map(getExpiryTime).filter(t => t && t > now).sort((a, b) => a - b);
  const delay = nexts.length ? Math.min(nexts[0] - now + 50, 30000) : 30000;
  clearTimeout(publicRefreshTimer);
  publicRefreshTimer = setTimeout(() => refreshData(false), Math.max(50, delay));
}

function applyPublicKindChrome() {
  document.querySelectorAll('[data-kind-tab]').forEach(link => {
    const on = link.dataset.kindTab === warningKind();
    link.classList.toggle('bg-brand-600', on);
    link.classList.toggle('text-white', on);
    link.classList.toggle('text-brand-600', !on);
    link.classList.toggle('bg-white', !on);
  });
  const homeLink = document.querySelector('[data-home-link]');
  if (homeLink) homeLink.setAttribute('href', '/home?kind=' + warningKind());
  renderPopupToggleButton(0);
  if (warningKind() !== 'env') return;
  document.title = 'Avertizări de mediu — Moldova';
  const crumb = document.getElementById('crumb-current');
  if (crumb) crumb.textContent = 'Avertizări de mediu';
  const heading = document.getElementById('page-heading');
  if (heading) heading.textContent = 'AVERTIZĂRI DE MEDIU';
  const popupTitle = document.getElementById('popup-title');
  if (popupTitle) popupTitle.textContent = 'Avertizare privind poluarea aerului';
  const adminLink = document.querySelector('a[href="/login"]');
  if (adminLink) adminLink.setAttribute('href', '/login?next=' + encodeURIComponent('/admin/environmental'));
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
applyPublicKindChrome();
initPublicMap();

window.addEventListener('load', async () => {
  const data = await getWarnings();
  cachedWarnings = data;
  renderPhenomenaPanel(data);
  // Auto-popup lives on the host site homepage (meteo.md), not on this map page.
});
