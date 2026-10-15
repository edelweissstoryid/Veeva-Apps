(function () {
  'use strict';

  // ⚠️ GANTI DENGAN URL DEPLOYMENT WEB APP GOOGLE APPS SCRIPT ANDA
  const API_URL = "https://script.google.com/macros/s/AKfycbzdkTLEantv_j0PZARwcO4VOfBxfzA9J9f-ynkrcYvlc51lXJw4n9Pt0o5dDStuv2Q/exec";

  const SESSION_KEY = 'veevaAppsSession';
  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const state = { token: sessionStorage.getItem(SESSION_KEY) || '', user: null, categories: [], items: [], users: [], page: '', dashboard: null, busy: false };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    document.getElementById('copyrightYear').textContent = String(new Date().getFullYear());
    bindEvents();
    setTodayDefaults();
    if (state.token) {
      showLoading('Memeriksa sesi…');
      callServer('apiGetInit', state.token).then(function (data) {
        hideLoading(); startAuthenticatedApp(data);
      }).catch(function () {
        hideLoading(); clearSession(); showLogin();
      });
    } else {
      showLogin();
    }
  }

  function bindEvents() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('changePasswordBtn').addEventListener('click', function () { toggleProfileMenu(false); openModal('changePasswordModal'); });
    document.getElementById('profileMenuBtn').addEventListener('click', function () { toggleProfileMenu(); });
    document.getElementById('mobileMenuBtn').addEventListener('click', function () { document.getElementById('sidebar').classList.toggle('mobile-open'); });
    document.getElementById('applyDashFilter').addEventListener('click', loadAdminDashboard);
    document.getElementById('resetDashFilter').addEventListener('click', resetAdminFilters);
    document.getElementById('applyOwnerFilter').addEventListener('click', loadOwnerDashboard);
    document.getElementById('resetOwnerFilter').addEventListener('click', resetOwnerFilters);
    document.getElementById('txnType').addEventListener('change', updateTransactionCategories);
    document.getElementById('transactionForm').addEventListener('submit', saveTransaction);
    document.getElementById('refreshTransactions').addEventListener('click', loadRecentTransactions);
    document.getElementById('addItemBtn').addEventListener('click', function () { openItemModal(null); });
    document.getElementById('itemForm').addEventListener('submit', saveItem);
    document.getElementById('itemSearchBtn').addEventListener('click', renderItemsTable);
    document.getElementById('itemSearch').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); renderItemsTable(); } });
    document.getElementById('itemCategoryFilter').addEventListener('change', renderItemsTable);
    document.getElementById('itemSort').addEventListener('change', renderItemsTable);
    document.getElementById('ownerItemSearch').addEventListener('input', renderOwnerItemsTable);
    document.getElementById('applyOwnerTxnFilter').addEventListener('click', loadOwnerTransactions);
    document.getElementById('ownerTxnSearch').addEventListener('keydown', function (e) { if (e.key === 'Enter') loadOwnerTransactions(); });
    document.getElementById('downloadReportBtn').addEventListener('click', downloadReport);
    document.getElementById('addAdminBtn').addEventListener('click', function () { openModal('adminModal'); });
    document.getElementById('adminForm').addEventListener('submit', createAdmin);
    document.getElementById('refreshUsersBtn').addEventListener('click', loadUsers);
    document.getElementById('resetPasswordForm').addEventListener('submit', resetAdminPassword);
    document.getElementById('changePasswordForm').addEventListener('submit', changePassword);
    document.addEventListener('click', delegatedClick);
    document.addEventListener('change', delegatedChange);
    document.querySelectorAll('[data-toggle-password]').forEach(function (button) {
      button.addEventListener('click', function () {
        const input = document.getElementById(button.getAttribute('data-toggle-password'));
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        button.textContent = input.type === 'password' ? 'Lihat' : 'Sembunyi';
      });
    });
    document.querySelectorAll('[data-close-modal]').forEach(function (button) {
      button.addEventListener('click', function () { closeModal(button.getAttribute('data-close-modal')); });
    });
    document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
      backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeModal(backdrop.id); });
    });
  }

  // UBAH callServer MENGGUNAKAN HTTP FETCH
  async function callServer(method) {
    const args = Array.prototype.slice.call(arguments, 1);
    
    try {
      if (method === 'apiLogin') {
        return await postAPI({ action: 'login', email: args[0], password: args[1] });
      } else if (method === 'apiLogout') {
        return await postAPI({ action: 'logout', token: args[0] });
      } else if (method === 'apiGetInit') {
        return await getAPI({ action: 'init', token: args[0] });
      } else if (method === 'apiGetDashboard') {
        return await getAPI({ action: 'dashboard', token: args[0], ...args[1] });
      } else if (method === 'apiGetTransactions') {
        return await getAPI({ action: 'transactions', token: args[0], ...args[1] });
      } else if (method === 'apiSaveTransaction') {
        return await postAPI({ action: 'saveTransaction', token: args[0], payload: args[1] });
      } else if (method === 'apiGetItems') {
        return await getAPI({ action: 'items', token: args[0] });
      } else if (method === 'apiSaveItem') {
        return await postAPI({ action: 'saveItem', token: args[0], payload: args[1] });
      } else if (method === 'apiGetStockMovements') {
        return await getAPI({ action: 'movements', token: args[0], ...args[1] });
      } else if (method === 'apiSetVerification') {
        return await postAPI({ action: 'setVerification', token: args[0], payload: { transactionId: args[1], status: args[2] } });
      } else if (method === 'apiGetReportCsv') {
        return await getAPI({ action: 'report', token: args[0], reportType: args[1], ...args[2] });
      } else if (method === 'apiGetUsers') {
        return await getAPI({ action: 'users', token: args[0] });
      } else if (method === 'apiCreateAdmin') {
        return await postAPI({ action: 'createAdmin', token: args[0], payload: args[1] });
      } else if (method === 'apiSetUserStatus') {
        return await postAPI({ action: 'setUserStatus', token: args[0], payload: { userId: args[1], status: args[2] } });
      } else if (method === 'apiResetAdminPassword') {
        return await postAPI({ action: 'resetAdminPassword', token: args[0], payload: { userId: args[1], password: args[2] } });
      } else if (method === 'apiChangePassword') {
        return await postAPI({ action: 'changePassword', token: args[0], payload: { currentPassword: args[1], newPassword: args[2] } });
      }
    } catch (error) {
      const message = error && error.message ? error.message : String(error || 'Terjadi kesalahan pada server.');
      if (/sesi berakhir|sesi tidak valid/i.test(message)) {
        clearSession(); showLogin(); toast('Sesi berakhir. Silakan login kembali.', 'error');
      }
      throw new Error(message);
    }
  }

  // Helper Request GET
  async function getAPI(params) {
    const url = new URL(API_URL);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });
    
    const response = await fetch(url.toString(), { method: 'GET' });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  // Helper Request POST
  async function postAPI(body) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorBox = document.getElementById('loginError');
    errorBox.classList.add('hidden');
    const button = document.querySelector('#loginForm button[type="submit"]');
    button.disabled = true; button.innerHTML = 'Memeriksa…';
    try {
      const result = await callServer('apiLogin', email, password);
      state.token = result.token;
      sessionStorage.setItem(SESSION_KEY, result.token);
      document.getElementById('loginPassword').value = '';
      showLoading('Menyiapkan ruang kerja…');
      const data = await callServer('apiGetInit', state.token);
      hideLoading(); startAuthenticatedApp(data);
      toast('Selamat datang, ' + data.user.name + '.', 'success');
    } catch (error) {
      hideLoading(); errorBox.textContent = error.message || 'Login gagal. Silakan coba kembali.'; errorBox.classList.remove('hidden');
    } finally {
      button.disabled = false; button.innerHTML = 'Masuk <span>→</span>';
    }
  }

  function startAuthenticatedApp(data) {
    state.user = data.user;
    state.categories = data.categories || [];
    state.dashboard = data.dashboard || null;
    document.getElementById('loginView').classList.add('hidden');
    document.getElementById('appView').classList.remove('hidden');
    document.getElementById('userName').textContent = state.user.name;
    document.getElementById('userRole').textContent = state.user.role;
    document.getElementById('userAvatar').textContent = (state.user.name || 'V').trim().charAt(0).toUpperCase();
    document.getElementById('topbarDate').textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
    populateMonthYearSelects(data.month, data.year);
    document.getElementById('dashDate').value = data.today;
    document.getElementById('ownerDashDate').value = data.today;
    document.getElementById('txnDate').value = data.today;
    document.getElementById('ownerTxnFrom').value = data.today.slice(0, 7) + '-01';
    document.getElementById('ownerTxnTo').value = data.today;
    document.getElementById('reportFrom').value = data.today.slice(0, 7) + '-01';
    document.getElementById('reportTo').value = data.today;
    populateItemCategoryControls();
    updateTransactionCategories();
    buildNav();
    navigate(state.user.role === 'OWNER' ? 'owner-dashboard' : 'dashboard');
  }

  function showLogin() {
    document.getElementById('appView').classList.add('hidden');
    document.getElementById('loginView').classList.remove('hidden');
    document.getElementById('loginEmail').focus();
  }
  function clearSession() { state.token = ''; state.user = null; sessionStorage.removeItem(SESSION_KEY); }
  async function logout() {
    const token = state.token;
    clearSession();
    try { if (token) await callServer('apiLogout', token); } catch (e) { /* sesi lokal sudah dibersihkan */ }
    toggleProfileMenu(false); showLogin(); toast('Anda telah keluar dari Veeva Apps.', 'success');
  }

  function buildNav() {
    const owner = state.user.role === 'OWNER';
    const links = owner ? [
      ['owner-dashboard','◫','Dashboard Owner'],['owner-transaksi','⇄','Monitoring Transaksi'],['owner-stok','▦','Monitoring Stok'],['laporan','▤','Laporan'],['pengguna','♙','Pengguna']
    ] : [
      ['dashboard','◫','Dashboard'],['transaksi','⇄','Transaksi'],['barang','▦','Daftar Barang']
    ];
    const nav = document.getElementById('sidebarNav');
    nav.innerHTML = links.map(function (item) { return '<button type="button" class="nav-item" data-page="' + item[0] + '"><span class="nav-icon">' + item[1] + '</span><span>' + item[2] + '</span><span class="nav-chevron">›</span></button>'; }).join('');
  }

  function navigate(page) {
    const owner = state.user && state.user.role === 'OWNER';
    const valid = owner ? ['owner-dashboard','owner-transaksi','owner-stok','laporan','pengguna'] : ['dashboard','transaksi','barang'];
    if (valid.indexOf(page) < 0) page = owner ? 'owner-dashboard' : 'dashboard';
    state.page = page;
    document.querySelectorAll('.page').forEach(function (element) { element.classList.add('hidden'); });
    const section = document.getElementById('page-' + page);
    if (section) section.classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(function (button) { button.classList.toggle('active', button.getAttribute('data-page') === page); });
    const labels = {
      dashboard:['RINGKASAN AKTIVITAS','Dashboard'], transaksi:['PENCATATAN KEUANGAN','Transaksi'], barang:['MANAJEMEN INVENTARIS','Daftar Barang'],
      'owner-dashboard':['OWNER CONTROL CENTER','Dashboard Owner'], 'owner-transaksi':['AUDIT TRANSAKSI','Monitoring Transaksi'], 'owner-stok':['MONITORING INVENTARIS','Monitoring Stok'], laporan:['LAPORAN & EKSPOR','Laporan'], pengguna:['AKSES & PENGGUNA','Pengguna']
    };
    document.getElementById('topbarKicker').textContent = labels[page][0];
    document.getElementById('topbarTitle').textContent = labels[page][1];
    document.getElementById('sidebar').classList.remove('mobile-open');
    toggleProfileMenu(false);
    if (page === 'dashboard') loadAdminDashboard();
    if (page === 'transaksi') loadRecentTransactions();
    if (page === 'barang') loadItems();
    if (page === 'owner-dashboard') loadOwnerDashboard();
    if (page === 'owner-transaksi') loadOwnerTransactions();
    if (page === 'owner-stok') loadOwnerStock();
    if (page === 'laporan') {/* laporan memakai filter pilihan sampai pengguna mengekspor */}
    if (page === 'pengguna') loadUsers();
  }

  function delegatedClick(event) {
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) { navigate(pageButton.getAttribute('data-page')); return; }
    const go = event.target.closest('[data-go]');
    if (go) { navigate(go.getAttribute('data-go')); return; }
    const close = event.target.closest('[data-close-modal]');
    if (close) { closeModal(close.getAttribute('data-close-modal')); return; }
    const edit = event.target.closest('[data-edit-item]');
    if (edit) { openItemById(edit.getAttribute('data-edit-item')); return; }
    const verify = event.target.closest('[data-verify-save]');
    if (verify) saveVerification(verify.getAttribute('data-verify-save'));
    const toggle = event.target.closest('[data-toggle-user]');
    if (toggle) toggleUserStatus(toggle.getAttribute('data-toggle-user'), toggle.getAttribute('data-next-status'));
    const reset = event.target.closest('[data-reset-user]');
    if (reset) openResetPasswordModal(reset.getAttribute('data-reset-user'));
  }

  function delegatedChange(event) {
    if (event.target.matches('[data-verify-select]')) {
      const row = event.target.closest('tr');
      const button = row && row.querySelector('[data-verify-save]');
      if (button) button.classList.add('pending');
    }
  }

  async function loadAdminDashboard() {
    if (!state.token || state.user.role !== 'ADMIN') return;
    const date = document.getElementById('dashDate').value || localDate();
    const month = Number(document.getElementById('dashMonth').value || date.slice(5,7));
    const year = Number(document.getElementById('dashYear').value || date.slice(0,4));
    try {
      const data = await callServer('apiGetDashboard', state.token, { date: date, month: month, year: year });
      state.dashboard = data;
      renderAdminDashboard(data);
    } catch (error) { toast(error.message, 'error'); }
  }

  async function loadOwnerDashboard() {
    if (!state.token || state.user.role !== 'OWNER') return;
    const date = document.getElementById('ownerDashDate').value || localDate();
    const month = Number(document.getElementById('ownerDashMonth').value || date.slice(5,7));
    const year = Number(document.getElementById('ownerDashYear').value || date.slice(0,4));
    try {
      const data = await callServer('apiGetDashboard', state.token, { date: date, month: month, year: year });
      state.dashboard = data;
      renderOwnerDashboard(data);
    } catch (error) { toast(error.message, 'error'); }
  }

  function renderAdminDashboard(data) {
    const s = data.stats || {};
    setText('statTransfer', money(s.transferToday)); setText('statCash', money(s.cashToday)); setText('statIncome', money(s.incomeToday)); setText('statExpense', money(s.expenseToday));
    setText('statIncomeMtd', money(s.incomeMtd)); setText('statIncomeYtd', money(s.incomeYtd)); setText('statExpenseMtd', money(s.expenseMtd));
    const period = formatDate(data.filters.date);
    setText('dashboardPeriodLabel', period); setText('dashboardTableSubtitle', 'Rincian transaksi untuk ' + period + '.');
    renderTxnTable(document.getElementById('dashboardTransactions'), data.transactions || [], 'dashboard');
    renderStockAlerts(document.getElementById('dashboardStockAlerts'), data.stockAlerts || [], false);
  }

  function renderOwnerDashboard(data) {
    const s = data.stats || {};
    setText('ownerIncome', money(s.incomeMtd)); setText('ownerExpense', money(s.expenseMtd)); setText('ownerNet', money(s.netMtd));
    const critical = Number(s.stockCriticalCount || 0), low = Number(s.stockLowCount || 0);
    setText('ownerStockAlertCount', String(critical + low) + ' barang');
    setText('ownerStockAlertSub', critical + ' kritis · ' + low + ' menipis');
    renderTxnTable(document.getElementById('ownerRecentTransactions'), (data.recentTransactions || []).slice(0, 8), 'ownerRecent');
    renderStockAlerts(document.getElementById('ownerDashboardStock'), data.stockAlerts || [], true);
  }

  function resetAdminFilters() {
    const date = localDate(); document.getElementById('dashDate').value = date;
    document.getElementById('dashMonth').value = String(Number(date.slice(5,7))); document.getElementById('dashYear').value = date.slice(0,4); loadAdminDashboard();
  }
  function resetOwnerFilters() {
    const date = localDate(); document.getElementById('ownerDashDate').value = date;
    document.getElementById('ownerDashMonth').value = String(Number(date.slice(5,7))); document.getElementById('ownerDashYear').value = date.slice(0,4); loadOwnerDashboard();
  }

  async function saveTransaction(event) {
    event.preventDefault();
    const button = document.getElementById('saveTransactionBtn');
    const payload = {
      tanggal: document.getElementById('txnDate').value,
      tipe: document.getElementById('txnType').value,
      metode: document.querySelector('input[name="txnMethod"]:checked').value,
      nominal: document.getElementById('txnAmount').value,
      kategori: document.getElementById('txnCategory').value,
      keterangan: document.getElementById('txnNote').value
    };
    button.disabled = true; button.textContent = 'Menyimpan transaksi…';
    try {
      const result = await callServer('apiSaveTransaction', state.token, payload);
      toast('Transaksi berhasil disimpan.', 'success');
      document.getElementById('txnAmount').value = ''; document.getElementById('txnNote').value = '';
      document.getElementById('txnDate').value = localDate(); document.getElementById('txnType').value = 'Pemasukan';
      document.querySelector('input[name="txnMethod"][value="Transfer"]').checked = true; updateTransactionCategories();
      await loadRecentTransactions();
      if (state.user.role === 'ADMIN') await loadAdminDashboard();
    } catch (error) { toast(error.message, 'error'); }
    finally { button.disabled = false; button.innerHTML = '✓ &nbsp; SIMPAN TRANSAKSI'; }
  }

  async function loadRecentTransactions() {
    if (!state.token || state.user.role !== 'ADMIN') return;
    try {
      const rows = await callServer('apiGetTransactions', state.token, {});
      renderTxnTable(document.getElementById('recentTransactionsTable'), rows.slice(0, 25), 'adminHistory');
    } catch (error) { toast(error.message, 'error'); }
  }

  async function loadOwnerTransactions() {
    if (!state.token || state.user.role !== 'OWNER') return;
    const filters = { from: document.getElementById('ownerTxnFrom').value, to: document.getElementById('ownerTxnTo').value, search: document.getElementById('ownerTxnSearch').value.trim() };
    if (filters.from && filters.to && filters.from > filters.to) { toast('Tanggal awal tidak boleh melewati tanggal akhir.', 'error'); return; }
    try {
      const rows = await callServer('apiGetTransactions', state.token, filters);
      renderTxnTable(document.getElementById('ownerTransactionsTable'), rows, 'ownerMonitor');
    } catch (error) { toast(error.message, 'error'); }
  }

  function renderTxnTable(container, rows, mode) {
    if (!container) return;
    if (!rows.length) { container.innerHTML = emptyTable('Belum ada transaksi', 'Transaksi yang sesuai akan tampil di sini.'); return; }
    let headers = '';
    if (mode === 'dashboard') headers = '<th>Jam</th><th>Tipe</th><th>Metode</th><th>Nominal</th><th>Keterangan</th>';
    else if (mode === 'ownerRecent') headers = '<th>Tanggal</th><th>Tipe</th><th>Metode</th><th>Nominal</th><th>Verifikasi</th>';
    else if (mode === 'ownerMonitor') headers = '<th>Tanggal / ID</th><th>Tipe</th><th>Metode</th><th>Kategori</th><th>Nominal</th><th>Keterangan</th><th>Verifikasi</th><th>Aksi</th>';
    else headers = '<th>Tanggal</th><th>Tipe</th><th>Metode</th><th>Nominal</th><th>Kategori</th><th>Keterangan</th><th>Status</th>';
    const body = rows.map(function (r) {
      const typeBadge = r.Tipe === 'Pemasukan' ? badge('Pemasukan','green') : badge('Pengeluaran','red');
      const amountClass = r.Tipe === 'Pemasukan' ? 'amount-income' : 'amount-expense';
      const note = escapeHtml(r.Keterangan || '—');
      if (mode === 'dashboard') return '<tr><td>' + escapeHtml((r.Waktu || '').slice(0,5)) + '</td><td>' + typeBadge + '</td><td>' + escapeHtml(r.Metode) + '</td><td class="amount-cell ' + amountClass + '">' + money(r.Nominal) + '</td><td title="' + note + '">' + clampText(note, 48) + '</td></tr>';
      if (mode === 'ownerRecent') return '<tr><td>' + escapeHtml(formatDate(r.Tanggal)) + '</td><td>' + typeBadge + '</td><td>' + escapeHtml(r.Metode) + '</td><td class="amount-cell ' + amountClass + '">' + money(r.Nominal) + '</td><td>' + verificationBadge(r.Status_Verifikasi) + '</td></tr>';
      if (mode === 'ownerMonitor') {
        const select = '<select class="table-status-select" data-verify-select="' + escapeAttr(r.ID_Transaksi) + '">' + ['Belum Diverifikasi','Terverifikasi','Perlu Review'].map(function (s) { return '<option value="' + s + '" ' + (r.Status_Verifikasi === s ? 'selected' : '') + '>' + s + '</option>'; }).join('') + '</select>';
        return '<tr><td><div class="table-primary">' + escapeHtml(formatDate(r.Tanggal)) + ' ' + escapeHtml((r.Waktu || '').slice(0,5)) + '</div><div class="table-secondary">' + escapeHtml(r.ID_Transaksi) + '</div></td><td>' + typeBadge + '</td><td>' + escapeHtml(r.Metode) + '</td><td>' + escapeHtml(r.Kategori) + '</td><td class="amount-cell ' + amountClass + '">' + money(r.Nominal) + '</td><td title="' + note + '">' + clampText(note, 40) + '</td><td>' + verificationBadge(r.Status_Verifikasi) + '</td><td><div class="table-actions">' + select + '<button class="table-action" data-verify-save="' + escapeAttr(r.ID_Transaksi) + '">Simpan</button></div></td></tr>';
      }
      return '<tr><td>' + escapeHtml(formatDate(r.Tanggal)) + '<div class="table-secondary">' + escapeHtml((r.Waktu || '').slice(0,5)) + '</div></td><td>' + typeBadge + '</td><td>' + escapeHtml(r.Metode) + '</td><td class="amount-cell ' + amountClass + '">' + money(r.Nominal) + '</td><td>' + escapeHtml(r.Kategori) + '</td><td title="' + note + '">' + clampText(note, 44) + '</td><td>' + verificationBadge(r.Status_Verifikasi) + '</td></tr>';
    }).join('');
    container.innerHTML = '<table class="data-table"><thead><tr>' + headers + '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  async function saveVerification(transactionId) {
    const select = document.querySelector('[data-verify-select="' + cssEscape(transactionId) + '"]');
    if (!select) return;
    const button = document.querySelector('[data-verify-save="' + cssEscape(transactionId) + '"]');
    if (button) button.disabled = true;
    try {
      await callServer('apiSetVerification', state.token, transactionId, select.value);
      toast('Status verifikasi transaksi diperbarui.', 'success');
      await loadOwnerTransactions();
      if (state.page === 'owner-dashboard') await loadOwnerDashboard();
    } catch (error) { toast(error.message, 'error'); }
    finally { if (button) button.disabled = false; }
  }

  async function openItemById(itemId) {
    let item = state.items.find(function (i) { return i.ID_Barang === itemId; });
    if (!item) {
      try {
        state.items = await callServer('apiGetItems', state.token);
        item = state.items.find(function (i) { return i.ID_Barang === itemId; });
      } catch (error) { toast(error.message, 'error'); return; }
    }
    if (!item) { toast('Barang tidak ditemukan. Muat ulang daftar barang.', 'error'); return; }
    openItemModal(item);
  }

  async function loadItems() {
    if (!state.token || state.user.role !== 'ADMIN') return;
    try {
      state.items = await callServer('apiGetItems', state.token);
      renderItemsTable(); updateInventoryCounts();
    } catch (error) { toast(error.message, 'error'); }
  }

  function renderItemsTable() {
    const container = document.getElementById('itemsTable');
    if (!container) return;
    const query = document.getElementById('itemSearch').value.trim().toLowerCase();
    const category = document.getElementById('itemCategoryFilter').value;
    const sort = document.getElementById('itemSort').value;
    let rows = state.items.filter(function (i) {
      const searchText = [i.ID_Barang, i.Nama_Barang, i.Kategori].join(' ').toLowerCase();
      return (!query || searchText.indexOf(query) !== -1) && (category === 'Semua' || i.Kategori === category) && i.Status === 'Aktif';
    });
    rows.sort(function (a,b) {
      if (sort === 'stock') return a.Stok - b.Stok;
      if (sort === 'priceAsc') return a.Harga_Jual - b.Harga_Jual;
      if (sort === 'priceDesc') return b.Harga_Jual - a.Harga_Jual;
      return a.Nama_Barang.localeCompare(b.Nama_Barang);
    });
    if (!rows.length) { container.innerHTML = emptyTable('Barang tidak ditemukan', 'Coba ubah kata pencarian atau filter kategori.'); return; }
    const body = rows.map(function (i) {
      const stockCls = i.statusStok === 'Kritis' ? 'critical' : i.statusStok === 'Menipis' ? 'low' : '';
      return '<tr><td><span class="table-id">' + escapeHtml(i.ID_Barang) + '</span></td><td><div class="item-name-cell"><span class="item-thumb">▤</span><div><div class="table-primary">' + escapeHtml(i.Nama_Barang) + '</div><div class="table-secondary">' + escapeHtml(i.Satuan) + '</div></div></div></td><td>' + escapeHtml(i.Kategori) + '</td><td class="amount-cell">' + money(i.Harga_Jual) + '</td><td><span class="stock-number ' + stockCls + '">' + num(i.Stok) + ' ' + escapeHtml(i.Satuan) + '</span><div class="table-secondary">Min. ' + num(i.Stok_Minimum) + '</div></td><td>' + stockBadge(i.statusStok) + '</td><td><button class="table-action" data-edit-item="' + escapeAttr(i.ID_Barang) + '">✎ Edit</button></td></tr>';
    }).join('');
    container.innerHTML = '<table class="data-table"><thead><tr><th>ID Barang</th><th>Nama Barang</th><th>Kategori</th><th>Harga Jual</th><th>Stok</th><th>Status Stok</th><th>Aksi</th></tr></thead><tbody>' + body + '</tbody></table>';
  }

  function updateInventoryCounts() {
    const active = state.items.filter(function (i) { return i.Status === 'Aktif'; });
    setText('itemsTotalCount', active.length);
    setText('itemsLowCount', active.filter(function (i) { return i.statusStok === 'Menipis'; }).length);
    setText('itemsCriticalCount', active.filter(function (i) { return i.statusStok === 'Kritis'; }).length);
  }

  function openItemModal(item) {
    const form = document.getElementById('itemForm'); form.reset(); clearError('itemFormError');
    document.getElementById('itemId').value = item ? item.ID_Barang : '';
    document.getElementById('itemModalTitle').textContent = item ? 'Edit Barang' : 'Tambah Barang';
    populateItemCategoryControls(item ? item.Kategori : '');
    document.getElementById('itemName').value = item ? item.Nama_Barang : '';
    document.getElementById('itemUnit').value = item ? item.Satuan : 'pcs';
    document.getElementById('itemPrice').value = item ? item.Harga_Jual : '';
    document.getElementById('itemStock').value = item ? item.Stok : 0;
    document.getElementById('itemMinStock').value = item ? item.Stok_Minimum : 5;
    document.getElementById('itemStockNote').value = '';
    openModal('itemModal');
  }

  async function saveItem(event) {
    event.preventDefault(); clearError('itemFormError');
    const button = document.getElementById('saveItemBtn'); button.disabled = true; button.textContent = 'Menyimpan…';
    const payload = {
      id: document.getElementById('itemId').value,
      nama: document.getElementById('itemName').value,
      kategori: document.getElementById('itemCategory').value,
      satuan: document.getElementById('itemUnit').value,
      hargaJual: document.getElementById('itemPrice').value,
      stok: document.getElementById('itemStock').value,
      stokMinimum: document.getElementById('itemMinStock').value,
      catatanStok: document.getElementById('itemStockNote').value
    };
    try {
      const result = await callServer('apiSaveItem', state.token, payload);
      closeModal('itemModal'); toast(result.message || 'Data barang berhasil disimpan.', 'success');
      await loadItems();
      if (state.page === 'dashboard') await loadAdminDashboard();
    } catch (error) { setError('itemFormError', error.message); }
    finally { button.disabled = false; button.textContent = 'Simpan Barang'; }
  }

  async function loadOwnerStock() {
    if (!state.token || state.user.role !== 'OWNER') return;
    try {
      const results = await Promise.all([callServer('apiGetItems', state.token), callServer('apiGetStockMovements', state.token, {})]);
      state.items = results[0];
      renderOwnerItemsTable(); renderMovementsTable(document.getElementById('ownerStockMovements'), results[1]);
    } catch (error) { toast(error.message, 'error'); }
  }

  function renderOwnerItemsTable() {
    const container = document.getElementById('ownerItemsTable'); if (!container) return;
    const query = document.getElementById('ownerItemSearch').value.trim().toLowerCase();
    const rows = state.items.filter(function (i) { return i.Status === 'Aktif' && (!query || [i.ID_Barang,i.Nama_Barang,i.Kategori].join(' ').toLowerCase().includes(query)); });
    if (!rows.length) { container.innerHTML = emptyTable('Tidak ada barang', 'Barang yang cocok akan tampil di sini.'); return; }
    const body = rows.map(function (i) {
      const cls = i.statusStok === 'Kritis' ? 'critical' : i.statusStok === 'Menipis' ? 'low' : '';
      return '<tr><td><span class="table-id">' + escapeHtml(i.ID_Barang) + '</span></td><td><div class="table-primary">' + escapeHtml(i.Nama_Barang) + '</div><div class="table-secondary">' + escapeHtml(i.Kategori) + '</div></td><td class="amount-cell">' + money(i.Harga_Jual) + '</td><td><span class="stock-number ' + cls + '">' + num(i.Stok) + ' ' + escapeHtml(i.Satuan) + '</span><div class="table-secondary">Minimum ' + num(i.Stok_Minimum) + '</div></td><td>' + stockBadge(i.statusStok) + '</td></tr>';
    }).join('');
    container.innerHTML = '<table class="data-table"><thead><tr><th>ID Barang</th><th>Barang</th><th>Harga Jual</th><th>Stok Saat Ini</th><th>Status</th></tr></thead><tbody>' + body + '</tbody></table>';
  }

  function renderStockAlerts(container, rows, ownerMode) {
    if (!container) return;
    rows = (rows || []).filter(function (i) { return i.statusStok !== 'Aman'; });
    if (!rows.length) { container.innerHTML = emptyTable('Stok dalam kondisi aman', 'Tidak ada barang yang melewati batas stok minimum.'); return; }
    const body = rows.map(function (i) {
      const action = ownerMode ? '' : '<button class="table-action" data-edit-item="' + escapeAttr(i.ID_Barang) + '">Periksa</button>';
      return '<tr><td><div class="table-primary">' + escapeHtml(i.Nama_Barang) + '</div><div class="table-secondary">' + escapeHtml(i.ID_Barang) + ' · ' + escapeHtml(i.Kategori) + '</div></td><td><span class="stock-number ' + (i.statusStok === 'Kritis' ? 'critical' : 'low') + '">' + num(i.Stok) + ' ' + escapeHtml(i.Satuan) + '</span><div class="table-secondary">Min. ' + num(i.Stok_Minimum) + '</div></td><td>' + stockBadge(i.statusStok) + '</td>' + (ownerMode ? '' : '<td>' + action + '</td>') + '</tr>';
    }).join('');
    container.innerHTML = '<table class="data-table"><thead><tr><th>Barang</th><th>Stok</th><th>Status</th>' + (ownerMode ? '' : '<th>Aksi</th>') + '</tr></thead><tbody>' + body + '</tbody></table>';
  }

  function renderMovementsTable(container, rows) {
    if (!rows.length) { container.innerHTML = emptyTable('Belum ada riwayat mutasi', 'Perubahan stok manual akan tercatat setelah Admin memperbarui barang.'); return; }
    const body = rows.slice(0,150).map(function (r) {
      const sign = /\(-\)/.test(r.Jenis_Mutasi) ? '−' : /\(\+\)/.test(r.Jenis_Mutasi) || r.Jenis_Mutasi === 'Stok Awal' ? '+' : '±';
      const amountClass = sign === '−' ? 'amount-expense' : 'amount-income';
      return '<tr><td>' + escapeHtml(formatDate(r.Tanggal)) + '<div class="table-secondary">' + escapeHtml((r.Waktu || '').slice(0,5)) + '</div></td><td><div class="table-primary">' + escapeHtml(r.Nama_Barang) + '</div><div class="table-secondary">' + escapeHtml(r.ID_Barang) + '</div></td><td>' + escapeHtml(r.Jenis_Mutasi) + '</td><td class="amount-cell ' + amountClass + '">' + sign + num(r.Jumlah) + '</td><td>' + num(r.Stok_Sebelum) + ' → ' + num(r.Stok_Sesudah) + '</td><td>' + escapeHtml(r.Dibuat_Oleh) + '</td><td title="' + escapeAttr(r.Keterangan) + '">' + clampText(escapeHtml(r.Keterangan || '—'), 40) + '</td></tr>';
    }).join('');
    container.innerHTML = '<table class="data-table"><thead><tr><th>Tanggal</th><th>Barang</th><th>Jenis Mutasi</th><th>Perubahan</th><th>Stok</th><th>Dibuat Oleh</th><th>Keterangan</th></tr></thead><tbody>' + body + '</tbody></table>';
  }

  function renderUsersTable(rows) {
    const container = document.getElementById('usersTable');
    if (!rows.length) { container.innerHTML = emptyTable('Belum ada pengguna', 'Buat akun Admin untuk mulai menggunakan aplikasi.'); return; }
    const body = rows.map(function (u) {
      const owner = u.Role === 'OWNER';
      const active = u.Status_Akun === 'Aktif';
      const actions = owner ? '<span class="table-secondary">Akun utama</span>' : '<div class="table-actions"><button class="table-action" data-reset-user="' + escapeAttr(u.User_ID) + '">Reset sandi</button><button class="table-action ' + (active ? 'danger' : 'success') + '" data-toggle-user="' + escapeAttr(u.User_ID) + '" data-next-status="' + (active ? 'Nonaktif' : 'Aktif') + '">' + (active ? 'Nonaktifkan' : 'Aktifkan') + '</button></div>';
      return '<tr><td><div class="table-primary">' + escapeHtml(u.Nama) + '</div><div class="table-secondary">' + escapeHtml(u.User_ID) + '</div></td><td>' + escapeHtml(u.Email) + '</td><td><span class="badge ' + (owner ? 'role-owner' : 'role-admin') + '">' + escapeHtml(u.Role) + '</span></td><td><span class="badge ' + (active ? 'user-status-active' : 'user-status-inactive') + '">' + escapeHtml(u.Status_Akun) + '</span></td><td>' + escapeHtml(u.Last_Login || 'Belum login') + '</td><td>' + actions + '</td></tr>';
    }).join('');
    container.innerHTML = '<table class="data-table"><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Status Akun</th><th>Login Terakhir</th><th>Aksi</th></tr></thead><tbody>' + body + '</tbody></table>';
  }

  async function loadUsers() {
    if (!state.token || state.user.role !== 'OWNER') return;
    try { state.users = await callServer('apiGetUsers', state.token); renderUsersTable(state.users); }
    catch (error) { toast(error.message, 'error'); }
  }

  async function createAdmin(event) {
    event.preventDefault(); clearError('adminFormError');
    const button = document.getElementById('saveAdminBtn'); button.disabled = true; button.textContent = 'Membuat akun…';
    try {
      const result = await callServer('apiCreateAdmin', state.token, {
        nama: document.getElementById('adminName').value,
        email: document.getElementById('adminEmail').value,
        password: document.getElementById('adminPassword').value
      });
      closeModal('adminModal'); document.getElementById('adminForm').reset(); toast(result.message, 'success'); await loadUsers();
    } catch (error) { setError('adminFormError', error.message); }
    finally { button.disabled = false; button.textContent = 'Buat Akun'; }
  }

  async function toggleUserStatus(userId, status) {
    const verb = status === 'Aktif' ? 'mengaktifkan' : 'menonaktifkan';
    if (!window.confirm('Yakin ingin ' + verb + ' akun Admin ini?')) return;
    try { await callServer('apiSetUserStatus', state.token, userId, status); toast('Status akun diperbarui.', 'success'); await loadUsers(); }
    catch (error) { toast(error.message, 'error'); }
  }

  function openResetPasswordModal(userId) {
    document.getElementById('resetPasswordUserId').value = userId;
    document.getElementById('resetPasswordValue').value = '';
    clearError('resetPasswordError'); openModal('resetPasswordModal');
  }

  async function resetAdminPassword(event) {
    event.preventDefault(); clearError('resetPasswordError');
    const userId = document.getElementById('resetPasswordUserId').value;
    const password = document.getElementById('resetPasswordValue').value;
    try {
      const result = await callServer('apiResetAdminPassword', state.token, userId, password);
      closeModal('resetPasswordModal'); document.getElementById('resetPasswordForm').reset(); toast(result.message, 'success');
    } catch (error) { setError('resetPasswordError', error.message); }
  }

  async function changePassword(event) {
    event.preventDefault(); clearError('changePasswordError');
    const current = document.getElementById('currentPassword').value;
    const next = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    if (next !== confirm) { setError('changePasswordError', 'Kata sandi baru dan konfirmasi tidak cocok.'); return; }
    try {
      const result = await callServer('apiChangePassword', state.token, current, next);
      closeModal('changePasswordModal'); toast(result.message, 'success');
      const token = state.token; const signedInEmail = state.user ? state.user.email : ''; clearSession();
      try { await callServer('apiLogout', token); } catch (e) { /* token invalid setelah sandi diganti */ }
      showLogin(); document.getElementById('loginEmail').value = signedInEmail;
    } catch (error) { setError('changePasswordError', error.message); }
  }

  async function downloadReport() {
    const button = document.getElementById('downloadReportBtn'); button.disabled = true; button.textContent = 'Menyiapkan CSV…';
    const type = document.getElementById('reportType').value;
    const from = document.getElementById('reportFrom').value;
    const to = document.getElementById('reportTo').value;
    if (from && to && from > to) { toast('Tanggal awal tidak boleh melewati tanggal akhir.', 'error'); button.disabled = false; button.innerHTML = '⇩ &nbsp; Unduh CSV'; return; }
    try {
      const result = await callServer('apiGetReportCsv', state.token, type, { from: from, to: to });
      const blob = new Blob([result.content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = result.filename || 'veeva-laporan.csv'; anchor.style.display = 'none';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      toast('Laporan berhasil disiapkan: ' + result.filename, 'success');
    } catch (error) { toast(error.message, 'error'); }
    finally { button.disabled = false; button.innerHTML = '⇩ &nbsp; Unduh CSV'; }
  }

  function populateMonthYearSelects(month, year) {
    const currentYear = Number(year || new Date().getFullYear());
    ['dashMonth','ownerDashMonth'].forEach(function (id) {
      const select = document.getElementById(id);
      select.innerHTML = MONTHS.map(function (m, index) { return '<option value="' + (index + 1) + '">' + m + '</option>'; }).join('');
      select.value = String(Number(month || new Date().getMonth() + 1));
    });
    ['dashYear','ownerDashYear'].forEach(function (id) {
      const select = document.getElementById(id);
      const years = [];
      for (let y = currentYear; y >= currentYear - 7; y--) years.push(y);
      select.innerHTML = years.map(function (y) { return '<option value="' + y + '">' + y + '</option>'; }).join('');
      select.value = String(currentYear);
    });
  }

  function updateTransactionCategories() {
    const type = document.getElementById('txnType').value;
    const options = state.categories.filter(function (c) { return c.Jenis_Kategori === type; });
    const select = document.getElementById('txnCategory');
    const current = select.value;
    select.innerHTML = options.map(function (c) { return '<option value="' + escapeAttr(c.Nama_Kategori) + '">' + escapeHtml(c.Nama_Kategori) + '</option>'; }).join('');
    if (options.some(function (c) { return c.Nama_Kategori === current; })) select.value = current;
  }

  function populateItemCategoryControls(selected) {
    const options = state.categories.filter(function (c) { return c.Jenis_Kategori === 'Barang'; });
    const categorySelect = document.getElementById('itemCategory');
    if (categorySelect) {
      categorySelect.innerHTML = options.map(function (c) { return '<option value="' + escapeAttr(c.Nama_Kategori) + '">' + escapeHtml(c.Nama_Kategori) + '</option>'; }).join('');
      if (selected && options.some(function (c) { return c.Nama_Kategori === selected; })) categorySelect.value = selected;
    }
    const filter = document.getElementById('itemCategoryFilter');
    if (filter) {
      const current = filter.value || 'Semua';
      filter.innerHTML = '<option value="Semua">Semua kategori</option>' + options.map(function (c) { return '<option value="' + escapeAttr(c.Nama_Kategori) + '">' + escapeHtml(c.Nama_Kategori) + '</option>'; }).join('');
      filter.value = options.some(function (c) { return c.Nama_Kategori === current; }) ? current : 'Semua';
    }
  }

  function showLoading(text) { document.getElementById('loadingText').textContent = text || 'Memuat…'; document.getElementById('loadingOverlay').classList.remove('hidden'); }
  function hideLoading() { document.getElementById('loadingOverlay').classList.add('hidden'); }
  function openModal(id) { document.getElementById(id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const element = document.getElementById(id); if (element) element.classList.add('hidden'); if (!document.querySelector('.modal-backdrop:not(.hidden)')) document.body.style.overflow = ''; }
  function toggleProfileMenu(force) { const menu = document.getElementById('profileMenu'); if (typeof force === 'boolean') menu.classList.toggle('hidden', !force); else menu.classList.toggle('hidden'); }
  function toast(message, type) {
    const host = document.getElementById('toastHost'); const box = document.createElement('div'); box.className = 'toast ' + (type || '');
    const icon = document.createElement('span'); icon.className = 'toast-mark'; icon.textContent = type === 'error' ? '!' : type === 'success' ? '✓' : 'i';
    const text = document.createElement('span'); text.textContent = String(message || 'Selesai.'); box.appendChild(icon); box.appendChild(text); host.appendChild(box);
    window.setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 4300);
  }
  function setError(id, message) { const el = document.getElementById(id); el.textContent = String(message || 'Terjadi kesalahan.'); el.classList.remove('hidden'); }
  function clearError(id) { const el = document.getElementById(id); if (el) { el.textContent = ''; el.classList.add('hidden'); } }
  function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value === undefined || value === null ? '' : String(value); }
  function money(value) { return 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(value || 0)); }
  function num(value) { return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(value || 0)); }
  function localDate(date) { const d = date || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function setTodayDefaults() { const today = localDate(); ['txnDate','dashDate','ownerDashDate'].forEach(function (id) { const el = document.getElementById(id); if (el) el.value = today; }); }
  function formatDate(value) { const s = String(value || ''); const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (!match) return s || '—'; return match[3] + ' ' + MONTHS[Number(match[2]) - 1] + ' ' + match[1]; }
  function badge(text, kind) { return '<span class="badge badge-' + kind + '">' + escapeHtml(text) + '</span>'; }
  function verificationBadge(status) {
    if (status === 'Terverifikasi') return badge(status, 'green');
    if (status === 'Perlu Review') return badge(status, 'orange');
    return badge(status || 'Belum Diverifikasi', 'gray');
  }
  function stockBadge(status) {
    if (status === 'Aman') return badge(status, 'green');
    if (status === 'Menipis') return badge(status, 'orange');
    return badge(status || 'Kritis', 'red');
  }
  function emptyTable(title, description) { return '<div class="empty-state"><span class="empty-icon">▤</span><strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(description) + '</span></div>'; }
  function escapeHtml(value) { return String(value === null || value === undefined ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
  function clampText(escaped, max) { const text = String(escaped || ''); return text.length > max ? text.slice(0, max - 1) + '…' : text; }
  function cssEscape(value) { return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

})();