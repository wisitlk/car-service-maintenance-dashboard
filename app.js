// ============================================================
//  Car Service Maintenance Dashboard – App Logic
// ============================================================

// ---- Storage helpers -------------------------------------------------------
const STORAGE_KEY = 'carServiceRecords';

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ---- Seed data (shown on first visit) --------------------------------------
const SEED = [
  {
    id: 1,
    car: 'Toyota Camry 2020',
    service: 'Oil Change',
    date: '2025-03-15',
    dueDate: '2025-09-15',
    cost: 45,
    status: 'completed',
    notes: 'Used synthetic 5W-30.'
  },
  {
    id: 2,
    car: 'Honda Civic 2019',
    service: 'Brake Inspection',
    date: '2025-04-01',
    dueDate: '2026-04-01',
    cost: 80,
    status: 'completed',
    notes: 'Front pads replaced.'
  },
  {
    id: 3,
    car: 'Ford F-150 2021',
    service: 'Tire Rotation',
    date: '2025-05-10',
    dueDate: '2025-11-10',
    cost: 30,
    status: 'pending',
    notes: ''
  },
  {
    id: 4,
    car: 'Toyota Camry 2020',
    service: 'Air Filter Replacement',
    date: '2025-01-20',
    dueDate: '2025-07-20',
    cost: 25,
    status: 'overdue',
    notes: 'Engine air filter.'
  },
  {
    id: 5,
    car: 'BMW 3 Series 2022',
    service: 'Transmission Service',
    date: '2025-02-28',
    dueDate: '2027-02-28',
    cost: 220,
    status: 'completed',
    notes: 'Fluid flush and filter.'
  }
];

// ---- State -----------------------------------------------------------------
let records   = [];
let editingId = null;
let sortField = 'date';
let sortDir   = 'desc';
let currentPage = 1;
const PAGE_SIZE  = 8;

// ---- DOM refs --------------------------------------------------------------
const form           = document.getElementById('serviceForm');
const formCar        = document.getElementById('formCar');
const formService    = document.getElementById('formService');
const formDate       = document.getElementById('formDate');
const formDueDate    = document.getElementById('formDueDate');
const formCost       = document.getElementById('formCost');
const formStatus     = document.getElementById('formStatus');
const formNotes      = document.getElementById('formNotes');
const cancelBtn      = document.getElementById('cancelEdit');
const submitBtn      = document.getElementById('submitBtn');

const searchInput    = document.getElementById('searchInput');
const filterStatus   = document.getElementById('filterStatus');
const filterCar      = document.getElementById('filterCar');
const sortSelect     = document.getElementById('sortSelect');

const recordsBody    = document.getElementById('recordsBody');
const pagination     = document.getElementById('pagination');

const statTotal      = document.getElementById('statTotal');
const statDue        = document.getElementById('statDue');
const statDone       = document.getElementById('statDone');
const statCost       = document.getElementById('statCost');

const editModal      = document.getElementById('editModal');
const editModalClose = document.getElementById('editModalClose');
const editForm       = document.getElementById('editForm');
const editCar        = document.getElementById('editCar');
const editService    = document.getElementById('editService');
const editDate       = document.getElementById('editDate');
const editDueDate    = document.getElementById('editDueDate');
const editCost       = document.getElementById('editCost');
const editStatus     = document.getElementById('editStatus');
const editNotes      = document.getElementById('editNotes');

const themeToggle    = document.getElementById('themeToggle');
const toastContainer = document.getElementById('toast-container');

// ---- Init ------------------------------------------------------------------
function init() {
  const stored = loadRecords();
  records = stored.length ? stored : JSON.parse(JSON.stringify(SEED));
  if (!stored.length) saveRecords(records);

  renderAll();
  bindEvents();
  applyTheme(localStorage.getItem('theme') || 'light');
  formDate.value = today();
}

// ---- Rendering -------------------------------------------------------------
function renderAll() {
  renderStats();
  renderCarFilter();
  renderTable();
}

function renderStats() {
  const today_ = today();
  const total   = records.length;
  const due     = records.filter(r => r.status !== 'completed' && r.dueDate <= today_).length;
  const done    = records.filter(r => r.status === 'completed').length;
  const cost    = records.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0);

  statTotal.textContent = total;
  statDue.textContent   = due;
  statDone.textContent  = done;
  statCost.textContent  = '$' + cost.toFixed(2);
}

function renderCarFilter() {
  const cars = [...new Set(records.map(r => r.car).filter(Boolean))].sort();
  const current = filterCar.value;
  filterCar.innerHTML = '<option value="">All Vehicles</option>';
  cars.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    if (c === current) opt.selected = true;
    filterCar.appendChild(opt);
  });
}

function getFiltered() {
  const q   = searchInput.value.trim().toLowerCase();
  const st  = filterStatus.value;
  const car = filterCar.value;

  return records.filter(r => {
    const matchQ  = !q || [r.car, r.service, r.notes].join(' ').toLowerCase().includes(q);
    const matchSt = !st  || r.status === st;
    const matchCar= !car || r.car === car;
    return matchQ && matchSt && matchCar;
  });
}

function getSorted(list) {
  const [field, dir] = sortSelect.value.split('-');
  return [...list].sort((a, b) => {
    let av = a[field] ?? '';
    let bv = b[field] ?? '';
    if (field === 'cost') { av = parseFloat(av) || 0; bv = parseFloat(bv) || 0; }
    if (av < bv) return dir === 'asc' ? -1 : 1;
    if (av > bv) return dir === 'asc' ?  1 : -1;
    return 0;
  });
}

function renderTable() {
  const filtered = getSorted(getFiltered());
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const page = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  recordsBody.innerHTML = '';

  if (page.length === 0) {
    recordsBody.innerHTML = `<tr><td colspan="8" class="no-records">No service records found.</td></tr>`;
  } else {
    page.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escHtml(r.car)}</td>
        <td>${escHtml(r.service)}</td>
        <td>${formatDate(r.date)}</td>
        <td>${formatDate(r.dueDate)}</td>
        <td>$${(parseFloat(r.cost)||0).toFixed(2)}</td>
        <td><span class="badge badge-${r.status}">${r.status}</span></td>
        <td>${escHtml(r.notes || '—')}</td>
        <td>
          <div class="action-btns">
            <button class="edit-btn"   title="Edit"   data-id="${r.id}">✏️</button>
            <button class="delete-btn" title="Delete" data-id="${r.id}">🗑️</button>
          </div>
        </td>`;
      recordsBody.appendChild(tr);
    });
  }

  renderPagination(totalPages, filtered.length);
}

function renderPagination(totalPages, total) {
  pagination.innerHTML = '';

  const prev = document.createElement('button');
  prev.textContent = '‹ Prev';
  prev.disabled = currentPage === 1;
  prev.addEventListener('click', () => { currentPage--; renderTable(); });
  pagination.appendChild(prev);

  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement('button');
    btn.textContent = p;
    if (p === currentPage) btn.classList.add('active');
    btn.addEventListener('click', () => { currentPage = p; renderTable(); });
    pagination.appendChild(btn);
  }

  const next = document.createElement('button');
  next.textContent = 'Next ›';
  next.disabled = currentPage === totalPages;
  next.addEventListener('click', () => { currentPage++; renderTable(); });
  pagination.appendChild(next);

  const info = document.createElement('span');
  info.className = 'page-info';
  info.textContent = `${total} record${total !== 1 ? 's' : ''}`;
  pagination.appendChild(info);
}

// ---- Add Form --------------------------------------------------------------
function bindEvents() {
  form.addEventListener('submit', handleAdd);
  cancelBtn.addEventListener('click', resetAddForm);

  searchInput.addEventListener('input',  () => { currentPage = 1; renderTable(); });
  filterStatus.addEventListener('change',() => { currentPage = 1; renderTable(); });
  filterCar.addEventListener('change',   () => { currentPage = 1; renderTable(); });
  sortSelect.addEventListener('change',  () => { currentPage = 1; renderTable(); });

  recordsBody.addEventListener('click', e => {
    const editBtn   = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    if (editBtn)   openEditModal(parseInt(editBtn.dataset.id));
    if (deleteBtn) deleteRecord(parseInt(deleteBtn.dataset.id));
  });

  editModalClose.addEventListener('click', closeEditModal);
  editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });
  editForm.addEventListener('submit', handleEdit);

  themeToggle.addEventListener('click', toggleTheme);
}

function handleAdd(e) {
  e.preventDefault();
  if (!validateFields(formCar, formService, formDate)) return;

  const record = {
    id:       Date.now(),
    car:      formCar.value.trim(),
    service:  formService.value.trim(),
    date:     formDate.value,
    dueDate:  formDueDate.value,
    cost:     parseFloat(formCost.value) || 0,
    status:   formStatus.value,
    notes:    formNotes.value.trim()
  };

  records.push(record);
  saveRecords(records);
  resetAddForm();
  renderAll();
  currentPage = 1;
  renderTable();
  toast('Service record added.', 'success');
}

function resetAddForm() {
  form.reset();
  formDate.value = today();
  cancelBtn.style.display = 'none';
  submitBtn.textContent = '➕ Add Record';
  editingId = null;
}

// ---- Edit Modal ------------------------------------------------------------
function openEditModal(id) {
  const r = records.find(x => x.id === id);
  if (!r) return;
  editingId = id;
  editCar.value     = r.car;
  editService.value = r.service;
  editDate.value    = r.date;
  editDueDate.value = r.dueDate;
  editCost.value    = r.cost;
  editStatus.value  = r.status;
  editNotes.value   = r.notes;
  editModal.classList.add('open');
}

function closeEditModal() {
  editModal.classList.remove('open');
  editingId = null;
}

function handleEdit(e) {
  e.preventDefault();
  if (!validateFields(editCar, editService, editDate)) return;

  const idx = records.findIndex(x => x.id === editingId);
  if (idx === -1) return;

  records[idx] = {
    ...records[idx],
    car:     editCar.value.trim(),
    service: editService.value.trim(),
    date:    editDate.value,
    dueDate: editDueDate.value,
    cost:    parseFloat(editCost.value) || 0,
    status:  editStatus.value,
    notes:   editNotes.value.trim()
  };

  saveRecords(records);
  closeEditModal();
  renderAll();
  toast('Record updated.', 'success');
}

// ---- Delete ----------------------------------------------------------------
function deleteRecord(id) {
  if (!confirm('Delete this service record?')) return;
  records = records.filter(r => r.id !== id);
  saveRecords(records);
  renderAll();
  toast('Record deleted.');
}

// ---- Utilities -------------------------------------------------------------
function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function validateFields(...inputs) {
  let valid = true;
  inputs.forEach(inp => {
    if (!inp.value.trim()) {
      inp.style.borderColor = 'var(--danger)';
      valid = false;
    } else {
      inp.style.borderColor = '';
    }
  });
  if (!valid) toast('Please fill in all required fields.', 'error');
  return valid;
}

function toast(msg, type = '') {
  const div = document.createElement('div');
  div.className = 'toast ' + type;
  div.textContent = msg;
  toastContainer.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

// ---- Theme -----------------------------------------------------------------
function applyTheme(t) {
  document.body.classList.toggle('dark', t === 'dark');
  themeToggle.textContent = t === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('theme', t);
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark');
  applyTheme(isDark ? 'light' : 'dark');
}

// ---- Bootstrap -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', init);
