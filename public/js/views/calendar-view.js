/**
 * View: calendar
 * Renders the date-time picker popover for the admin editor form.
 */

const CALENDAR_MONTHS = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];

const calendarState = {
  fieldId:   null,
  viewYear:  new Date().getFullYear(),
  viewMonth: new Date().getMonth(),
  selected:  new Date(),
};

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateTimeValue(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Parse YYYY-MM-DDTHH:mm as local wall clock (avoids UTC shift in some browsers). */
function parseDateTimeValue(value) {
  if (!value) return null;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (m) {
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function setDateField(id, value) {
  const input = document.getElementById(id);
  if (!input) return;
  input.value = value || '';
  updateDateTrigger(id);
  updateSendButton();
}

function updateDateTrigger(id) {
  const input   = document.getElementById(id);
  const label   = document.getElementById(id + '-label');
  const trigger = document.getElementById(id + '-trigger');
  if (!input || !label || !trigger) return;

  if (input.value) {
    label.textContent = formatDateTime(input.value);
    trigger.classList.add('has-value');
  } else {
    label.textContent = 'Alege data și ora';
    trigger.classList.remove('has-value');
  }
}

function fillTimeSelects() {
  const hour   = document.getElementById('cal-hour');
  const minute = document.getElementById('cal-minute');
  if (!hour || !minute) return;
  if (!hour.options.length) {
    for (let i = 0; i < 24; i++) hour.appendChild(new Option(pad2(i), i));
  }
  if (!minute.options.length) {
    for (let i = 0; i < 60; i++) minute.appendChild(new Option(pad2(i), i));
  }
}

function commitCalendarValue() {
  if (!calendarState.fieldId || !calendarState.selected) return;
  const hour   = Number(document.getElementById('cal-hour').value);
  const minute = Number(document.getElementById('cal-minute').value);
  const next   = new Date(calendarState.selected);
  next.setHours(hour, minute, 0, 0);
  calendarState.selected = next;
  setDateField(calendarState.fieldId, toDateTimeValue(next));
  updateSelectedLabel();
}

function updateSelectedLabel() {
  const label = document.getElementById('calendar-selected-label');
  if (!label || !calendarState.selected) return;
  label.textContent = formatDateTime(toDateTimeValue(calendarState.selected));
}

function renderCalendar() {
  document.getElementById('calendar-title').textContent =
    `${CALENDAR_MONTHS[calendarState.viewMonth]} ${calendarState.viewYear}`;
  updateSelectedLabel();

  const first      = new Date(calendarState.viewYear, calendarState.viewMonth, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart  = new Date(calendarState.viewYear, calendarState.viewMonth, 1 - startOffset);
  const today      = new Date();
  const days       = document.getElementById('calendar-days');
  days.innerHTML   = '';

  for (let i = 0; i < 42; i++) {
    const date     = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const inMonth  = date.getMonth() === calendarState.viewMonth;
    const isToday  =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth()    === today.getMonth()    &&
      date.getDate()     === today.getDate();
    const sel      = calendarState.selected;
    const isSelected = sel &&
      date.getFullYear() === sel.getFullYear() &&
      date.getMonth()    === sel.getMonth()    &&
      date.getDate()     === sel.getDate();

    const btn = document.createElement('button');
    btn.type        = 'button';
    btn.textContent = date.getDate();
    // Do not put a default bg-* here: Tailwind CDN resolves conflicting
    // utilities by stylesheet order, so bg-transparent would hide selected days.
    btn.className   = 'flex h-8 w-full items-center justify-center rounded-full border-0 text-[13px] font-medium outline-none transition';
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    // Interval fields (De la / Până la) must allow any future date — never disable days.
    const isFuture = dayStart > todayStart;
    if (!inMonth) {
      // Next/prev month days stay clickable (not "disabled grey").
      btn.className += ' bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800';
    } else if (isSelected) {
      btn.className += ' bg-[#1E4B8E] font-semibold text-white shadow-sm shadow-[#1E4B8E]/35';
    } else if (isToday) {
      btn.className += ' bg-[#EEF4FB] font-semibold text-[#1E4B8E] hover:bg-[#D7E6F6]';
    } else if (isFuture) {
      btn.className += ' bg-transparent text-slate-800 hover:bg-[#EEF4FB] hover:text-[#1E4B8E]';
    } else {
      btn.className += ' bg-transparent text-slate-700 hover:bg-slate-100';
    }
    btn.title = toDateTimeValue(date).slice(0, 10);
    btn.disabled = false;

    btn.addEventListener('click', () => {
      const h = Number(document.getElementById('cal-hour').value);
      const m = Number(document.getElementById('cal-minute').value);
      calendarState.selected  = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0);
      calendarState.viewYear  = date.getFullYear();
      calendarState.viewMonth = date.getMonth();
      commitCalendarValue();
      renderCalendar();
    });
    days.appendChild(btn);
  }
}

function positionCalendar(fieldId) {
  const trigger  = document.getElementById(fieldId + '-trigger');
  const pop      = document.getElementById('calendar-popover');
  const margin   = 12;
  const popWidth = 300;
  let left = Math.min(trigger.getBoundingClientRect().left, window.innerWidth - popWidth - margin);
  left = Math.max(margin, left);

  pop.style.left = `${left}px`;
  pop.style.top = '0px';
  pop.style.maxHeight = '';
  pop.style.overflowY = '';
  pop.classList.remove('hidden');

  const rect = trigger.getBoundingClientRect();
  const popHeight = pop.offsetHeight;
  const vh = window.innerHeight;
  const spaceBelow = vh - rect.bottom - margin;
  const spaceAbove = rect.top - margin;

  let top;
  if (popHeight <= spaceBelow) {
    top = rect.bottom + 8;
  } else if (popHeight <= spaceAbove) {
    top = rect.top - popHeight - 8;
  } else {
    // Not enough room above or below — pin inside the viewport.
    top = Math.max(margin, Math.min(rect.bottom + 8, vh - popHeight - margin));
    if (popHeight > vh - 2 * margin) {
      top = margin;
      pop.style.maxHeight = `${vh - 2 * margin}px`;
      pop.style.overflowY = 'auto';
    }
  }

  pop.style.left = `${left}px`;
  pop.style.top  = `${top}px`;
}

function openCalendar(fieldId) {
  fillTimeSelects();
  calendarState.fieldId = fieldId;
  const current = parseDateTimeValue(document.getElementById(fieldId).value) || new Date();
  calendarState.selected  = current;
  calendarState.viewYear  = current.getFullYear();
  calendarState.viewMonth = current.getMonth();
  document.getElementById('cal-hour').value   = String(current.getHours());
  document.getElementById('cal-minute').value = String(current.getMinutes());
  renderCalendar();
  positionCalendar(fieldId);
}

function closeCalendar(apply) {
  if (apply) commitCalendarValue();
  document.getElementById('calendar-popover').classList.add('hidden');
  calendarState.fieldId = null;
}

function shiftCalendarMonth(delta) {
  calendarState.viewMonth += delta;
  if (calendarState.viewMonth < 0)  { calendarState.viewMonth = 11; calendarState.viewYear -= 1; }
  if (calendarState.viewMonth > 11) { calendarState.viewMonth = 0;  calendarState.viewYear += 1; }
  renderCalendar();
}

function setCalendarToday() {
  const now = new Date();
  calendarState.selected  = now;
  calendarState.viewYear  = now.getFullYear();
  calendarState.viewMonth = now.getMonth();
  document.getElementById('cal-hour').value   = String(now.getHours());
  document.getElementById('cal-minute').value = String(now.getMinutes());
  commitCalendarValue();
  renderCalendar();
}
