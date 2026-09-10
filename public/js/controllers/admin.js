/**
 * Controller: admin
 * Coordinates the admin panel: map init, form logic, code blocks, submit.
 * Depends on: models/warnings.js, models/auth.js,
 *             views/admin-view.js, views/calendar-view.js,
 *             district-codes.js (global districtLabel)
 */

const NORMAL_COLOR = '#28D762';

const PHENOMENA = [
  'Obaje (descărcări electrice)',
  'Instabilitate atmosferică (descărcări electrice)',
  'Vînt puternic și vijelie în rafale',
  'Ploi puternice',
  'Ploi torențiale',
  'Ploi de lungă durată',
  'Grindină',
  'Ceață',
  'Ninsori puternice',
  'Viscol',
  'Viscol însoțit de întroieniri',
  'Depuneri de lapoviță pe conductori',
  'Polei pe conductori',
  'Ghețuș (polei pe drumuri)',
  'Scăderea temperaturii aerului',
  'Înghețuri tardive de primăvară și timpurii de toamnă',
  'Ger',
  'Caniculă',
  'Secetă moderată',
  'Secetă puternică',
  'Secetă foarte puternică',
  'Suhovei moderat',
  'Suhovei puternic',
  'Suhovei foarte puternic',
  'Pericol excepțional de incendiu',
  'Pericol excepțional de incendiu de lungă durată',
];

// ── Map state ─────────────────────────────────────────────────────────────────
let adminMap       = null;
let geojsonLayer   = null;
let currentColor   = '#FFED00';
const districtData = {};

// ── View transitions ──────────────────────────────────────────────────────────
function showList() {
  document.body.classList.remove('editor-mode');
  if (location.hash === '#editor') {
    history.replaceState(null, '', '/admin');
  }
  loadAndRenderWarnings();
}

function showEditor() {
  document.body.classList.add('editor-mode');
  if (location.hash !== '#editor') {
    history.replaceState(null, '', '/admin#editor');
  }
  prepareEditorForm();
  requestAnimationFrame(() => {
    initAdminMap();
    refreshMapSize();
  });
}

// ── Warning list ──────────────────────────────────────────────────────────────
async function loadAndRenderWarnings() {
  const data = await getWarnings();
  renderSavedWarnings(data);
}

// ── Editor form ───────────────────────────────────────────────────────────────
function prepareEditorForm() {
  document.getElementById('phenomenon').value = '';
  setDateField('intervalFrom', '');
  setDateField('intervalTo', '');
  document.getElementById('codes-container').innerHTML = '';
  addCodeBlock('COD GALBEN');
  updateAddButton();

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  setDateField('emitDate', now.toISOString().slice(0, 16));

  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
  const yellowBtn = document.querySelector('.color-btn.yellow');
  if (yellowBtn) yellowBtn.classList.add('active');
  currentColor = '#FFED00';

  resetMapColors();
  updateSendButton();
}

function fillPhenomena() {
  const select = document.getElementById('phenomenon');
  if (!select || select.options.length > 1) return;
  PHENOMENA.forEach(name => select.appendChild(new Option(name, name)));
}

function areRequiredFieldsFilled() {
  const emitDate    = document.getElementById('emitDate').value.trim();
  const phenomenon  = document.getElementById('phenomenon').value.trim();
  const intervalFrom = document.getElementById('intervalFrom').value.trim();
  const intervalTo  = document.getElementById('intervalTo').value.trim();
  if (!emitDate || !phenomenon || !intervalFrom || !intervalTo) return false;
  return new Date(intervalTo) > new Date(intervalFrom);
}

function updateSendButton() {
  const btn = document.getElementById('send-btn');
  if (btn) btn.disabled = !areRequiredFieldsFilled();
}

// ── Code blocks ───────────────────────────────────────────────────────────────
function addCodeBlock(preferredCode = null) {
  const container = document.getElementById('codes-container');
  const existing  = Array.from(container.querySelectorAll('.code-block'));
  if (existing.length >= 3) { alert('Poți adăuga maximum 3 coduri'); return; }

  const usedCodes = existing.map(b => b.querySelector('select').value);
  let codeToAdd = preferredCode;
  if (!codeToAdd || usedCodes.includes(codeToAdd) || !CODE_ORDER.includes(codeToAdd)) {
    codeToAdd = CODE_ORDER.find(c => !usedCodes.includes(c));
  }
  if (!codeToAdd) { alert('Toate codurile au fost deja adăugate'); return; }

  container.appendChild(renderCodeBlock(codeToAdd));
  sortCodeBlocks();
  updateAddButton();
}

function onCodeChange(select) {
  const newCode = select.value;
  const block   = select.closest('.code-block');
  const container = document.getElementById('codes-container');
  const alreadyUsed = Array.from(container.querySelectorAll('.code-block'))
    .filter(b => b !== block)
    .some(b => b.querySelector('select').value === newCode);

  if (alreadyUsed) { alert('Acest cod este deja folosit'); select.value = block.dataset.code; return; }
  block.dataset.code = newCode;
  block.querySelector('.code-dot').style.background = CODE_COLORS[newCode];
  sortCodeBlocks();
}

function removeCodeBlock(btn) {
  btn.closest('.code-block').remove();
  sortCodeBlocks();
  updateAddButton();
}

function sortCodeBlocks() {
  const container = document.getElementById('codes-container');
  const blocks    = Array.from(container.querySelectorAll('.code-block'));
  blocks
    .sort((a, b) => CODE_ORDER.indexOf(a.querySelector('select').value) - CODE_ORDER.indexOf(b.querySelector('select').value))
    .forEach(b => container.appendChild(b));
}

// ── Map ───────────────────────────────────────────────────────────────────────
function getId(feature) {
  return feature.properties.shapeID || feature.properties.shapeName || Math.random().toString(36).slice(2);
}

function refreshMapSize() {
  if (!adminMap) return;
  adminMap.invalidateSize(true);
  if (geojsonLayer) adminMap.fitBounds(geojsonLayer.getBounds(), { padding: [15, 15] });
}

function setDistrictColor(layer, color) {
  const id       = getId(layer.feature);
  const fullName = layer.feature.properties._name;
  const label    = layer.feature.properties._label;

  if (color === NORMAL_COLOR) {
    delete districtData[id];
    geojsonLayer.resetStyle(layer);
    updateCount();
    return;
  }
  layer.setStyle({ fillColor: color, fillOpacity: 0.85, weight: 1.5, color: '#334155' });
  districtData[id] = { name: fullName, label, color };
  updateCount();
}

function paintDistrict(layer, toggle) {
  if (currentColor === NORMAL_COLOR) { setDistrictColor(layer, NORMAL_COLOR); return; }
  const id = getId(layer.feature);
  if (toggle && districtData[id]?.color === currentColor) { setDistrictColor(layer, NORMAL_COLOR); return; }
  setDistrictColor(layer, currentColor);
}

function paintAllDistricts() {
  if (!geojsonLayer) return;
  geojsonLayer.eachLayer(l => setDistrictColor(l, currentColor));
  if (typeof geojsonLayer.redraw === 'function') geojsonLayer.redraw();
}

function resetMapColors() {
  Object.keys(districtData).forEach(k => delete districtData[k]);
  if (geojsonLayer) geojsonLayer.eachLayer(l => geojsonLayer.resetStyle(l));
  updateCount();
}

function updateCount() {
  const el = document.getElementById('count');
  if (el) el.textContent = Object.keys(districtData).length;
}

function paintedDistricts() {
  return Object.values(districtData).filter(d => d.color && d.color !== NORMAL_COLOR);
}

function initAdminMap() {
  if (adminMap) { refreshMapSize(); return; }

  adminMap = L.map('map', {
    zoomControl: false, dragging: false, touchZoom: false,
    scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false,
    keyboard: false, attributionControl: false, preferCanvas: true,
  });

  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentColor = btn.dataset.color;
    });
  });

  fetch('/data/MD_MAP.geojson')
    .then(r => r.json())
    .then(data => {
      geojsonLayer = L.geoJSON(data, {
        style: { color: '#f2f7f7', weight: 1.2, fillColor: NORMAL_COLOR, fillOpacity: 0.85 },
        onEachFeature: (feature, layer) => {
          const fullName = feature.properties.shapeName || feature.properties.NAME || feature.properties.name || '???';
          const label    = districtLabel(fullName);
          layer.feature.properties._name  = fullName;
          layer.feature.properties._label = label;
          layer.bindTooltip(label, { permanent: true, direction: 'center', className: 'district-label' });

          layer.on({
            mouseover(e) {
              geojsonLayer.eachLayer(l => {
                const id = getId(l.feature);
                districtData[id]
                  ? l.setStyle({ fillColor: districtData[id].color, fillOpacity: 0.85, weight: 1.2, color: '#64748b' })
                  : geojsonLayer.resetStyle(l);
              });
              e.target.setStyle({ weight: 3, color: '#0f172a', fillOpacity: 0.95 });
              e.target.bringToFront();
            },
            mouseout(e) {
              const id = getId(feature);
              districtData[id]
                ? e.target.setStyle({ fillColor: districtData[id].color, fillOpacity: 0.85, weight: 1.2, color: '#64748b' })
                : geojsonLayer.resetStyle(e.target);
            },
            click(e)    { if (e.originalEvent?.shiftKey)  { L.DomEvent.stop(e); paintDistrict(e.target, false); } },
            dblclick(e) { if (!e.originalEvent?.shiftKey) { L.DomEvent.stop(e); paintDistrict(e.target, true);  } },
          });
        },
      }).addTo(adminMap);
      setTimeout(refreshMapSize, 50);
    })
    .catch(err => { alert('Nu s-a putut încărca harta.'); console.error(err); });
}

// ── Submit ────────────────────────────────────────────────────────────────────
function validatePaintedCodes(codes) {
  const districts    = paintedDistricts();
  const codeColorSet = codes.map(c => CODE_COLORS[c]).filter(Boolean);
  if (!districts.length || !districts.some(d => codeColorSet.includes(d.color))) {
    alert('Colorează cel puțin un raion cu culoarea codului selectat');
    return false;
  }
  return true;
}

async function sendToServer() {
  if (!areRequiredFieldsFilled()) return;

  const emitDate    = document.getElementById('emitDate').value.trim();
  const phenomenon  = document.getElementById('phenomenon').value.trim();
  const intervalFrom = document.getElementById('intervalFrom').value.trim();
  const intervalTo  = document.getElementById('intervalTo').value.trim();

  const codes = [];
  document.querySelectorAll('.code-block').forEach(block => {
    codes.push({ code: block.querySelector('select').value, description: block.querySelector('textarea').value.trim() });
  });

  if (!validatePaintedCodes(codes.map(c => c.code))) return;

  const btn = document.getElementById('send-btn');
  btn.disabled = true;
  btn.textContent = 'Se trimite...';

  try {
    adminMap.invalidateSize(true);
    await new Promise(r => setTimeout(r, 400));

    const canvas = await html2canvas(document.getElementById('map'), {
      useCORS: true, allowTaint: true, backgroundColor: '#f0f4f8', scale: 2, logging: false, removeContainer: true,
    });

    await addWarning({
      phenomenon, emitDate, intervalFrom, intervalTo,
      codes, districts: paintedDistricts(),
      mapImage: canvas.toDataURL('image/png'),
    });

    alert('Trimis!');
    showList();
  } catch (err) {
    console.error(err);
    alert('Eroare: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Trimite pe server';
    updateSendButton();
  }
}

// ── Warning CRUD ──────────────────────────────────────────────────────────────
async function onDeleteWarning(event, id) {
  event.stopPropagation();
  if (!confirm('Stergere avertizare?')) return;
  await deleteWarning(id);
  closeAdminPopup();
  loadAndRenderWarnings();
}

async function clearAllWarnings() {
  const data = await getWarnings();
  if (!data.length) return;
  if (!confirm('Șterge toate avertizările?')) return;
  await clearWarnings();
  loadAndRenderWarnings();
}

// ── Expiry check ──────────────────────────────────────────────────────────────
let expiryTimer = null;

async function scheduleExpiryCheck() {
  clearTimeout(expiryTimer);
  const data  = await getWarnings();
  renderSavedWarnings(data);

  const now   = Date.now();
  const nexts = data.map(getExpiryTime).filter(t => t && t > now).sort((a, b) => a - b);
  const delay = nexts.length ? Math.min(nexts[0] - now + 50, 30000) : 30000;
  expiryTimer = setTimeout(scheduleExpiryCheck, Math.max(50, delay));
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function startAdmin() {
  document.body.classList.add('logged-in');
  initAdminMap();
  await loadAndRenderWarnings();
  fillTimeSelects();
  fillPhenomena();
  scheduleExpiryCheck();

  document.getElementById('phenomenon').addEventListener('change', updateSendButton);
  document.getElementById('cal-hour').addEventListener('change', commitCalendarValue);
  document.getElementById('cal-minute').addEventListener('change', commitCalendarValue);

  document.addEventListener('mousedown', event => {
    const pop = document.getElementById('calendar-popover');
    if (pop.classList.contains('hidden')) return;
    if (pop.contains(event.target) || event.target.closest('.date-trigger')) return;
    closeCalendar(true);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeCalendar(true); });

  // After a successful login the editor opens immediately.
  // Direct visits to /admin without #editor still land on the saved-warning list.
  if (location.hash === '#editor') {
    showEditor();
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const authed = await checkAuth();
  if (!authed) {
    window.location.replace('/login');
    return;
  }
  startAdmin();
});
