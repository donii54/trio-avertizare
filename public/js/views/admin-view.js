/**
 * View: admin
 * Renders warning cards, popup details, and code UI in the admin panel.
 */

const CODE_COLORS = {
  'COD GALBEN':    '#FFED00',
  'COD PORTOCALIU': '#FF8A00',
  'COD ROȘU':     '#FF0000',
};

const CODE_ORDER = ['COD GALBEN', 'COD PORTOCALIU', 'COD ROȘU'];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function codeBorderClass(code) {
  if (!code) return 'yellow';
  if (code.includes('PORTOCALIU')) return 'orange';
  if (code.includes('ROȘU'))      return 'red';
  if (code.includes('VERDE'))     return 'green';
  return 'yellow';
}

function codeColor(code) {
  if (!code) return '#FFED00';
  if (code.includes('PORTOCALIU')) return '#FF8A00';
  if (code.includes('ROȘU'))      return '#FF0000';
  if (code.includes('VERDE'))     return '#28D762';
  return '#FFED00';
}

function formatWarningDate(emitDate) {
  return formatDateTime(emitDate).replace(/, ora.*/, '');
}

function renderSavedWarnings(data = []) {
  const list = document.getElementById('saved-list');
  if (!list) return;

  if (data.length === 0) {
    list.innerHTML = `<div class="empty">Nu există avertizări</div>`;
    return;
  }

  list.innerHTML = data.map((item, index) => {
    const id      = getWarningId(item);
    const mainCode = item.codes?.[0]?.code || 'COD GALBEN';
    const date    = formatWarningDate(item.emitDate);
    const interval = formatInterval(item);
    const meta    = [date, interval].filter(Boolean).join(' · ');

    const badges = (item.codes || [])
      .map(c => `<span class="badge" style="background:${codeColor(c.code)}">${escapeHtml(c.code)}</span>`)
      .join('');

    return `
      <div class="card ${codeBorderClass(mainCode)}" onclick="openAdminPopup(${index})">
        <div>
          <div class="card-title">${escapeHtml(item.phenomenon || 'Avertizare meteorologică')}</div>
          <div class="card-meta">${escapeHtml(meta)}</div>
        </div>
        <div class="card-codes">
          ${badges}
          <button class="card-delete" onclick="onDeleteWarning(event, '${id}')">Delete</button>
        </div>
      </div>`;
  }).join('');
}

function openAdminPopup(index) {
  const data = getWarnings();
  const item = data[index];
  if (!item) return;

  document.getElementById('p-date').textContent      = formatDateTime(item.emitDate) || '—';
  document.getElementById('p-phenomenon').textContent = item.phenomenon || '—';
  document.getElementById('p-interval').textContent   = formatInterval(item) || '—';
  document.getElementById('popup-img').src            = item.mapImage || '';

  document.getElementById('p-codes').innerHTML = (item.codes || []).map(c => `
    <div class="code-item ${codeBorderClass(c.code)}">
      <div class="code-title">
        <div class="dot" style="background:${codeColor(c.code)}"></div>
        ${escapeHtml(c.code)}
      </div>
      <div class="code-desc">${escapeHtml(c.description || '')}</div>
    </div>`).join('');

  document.getElementById('overlay').classList.add('active');
}

function closeAdminPopup(e) {
  if (!e || e.target.id === 'overlay') {
    document.getElementById('overlay').classList.remove('active');
  }
}

function renderCodeBlock(codeToAdd) {
  const div = document.createElement('div');
  div.className    = 'code-block';
  div.dataset.code = codeToAdd;

  div.innerHTML = `
    <div class="code-header">
      <div class="code-dot" style="background:${CODE_COLORS[codeToAdd]}"></div>
      <select class="code-select" onchange="onCodeChange(this)">
        <option value="COD GALBEN">COD GALBEN</option>
        <option value="COD PORTOCALIU">COD PORTOCALIU</option>
        <option value="COD ROȘU">COD ROȘU</option>
      </select>
      <button onclick="removeCodeBlock(this)" class="code-remove">x</button>
    </div>
    <textarea></textarea>`;

  div.querySelector('select').value = codeToAdd;
  return div;
}

function updateAddButton() {
  const count = document.querySelectorAll('.code-block').length;
  const btn   = document.querySelector('.btn-add');
  if (!btn) return;
  btn.disabled      = count >= 3;
  btn.style.opacity = count >= 3 ? '0.5' : '1';
  btn.style.cursor  = count >= 3 ? 'not-allowed' : 'pointer';
}
