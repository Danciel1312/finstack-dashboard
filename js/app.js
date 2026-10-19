/**
 * DashFinance - Main Application Controller
 * Handles view switching, modals, filters, search, table rendering, toast alerts and theme toggle.
 */

const App = (function () {
  let currentView = 'dashboard';
  let editingTxId = null;
  let activeFilterType = 'todos';
  let activeSearchQuery = '';

  const categoryPresets = {
    gasto: [
      { name: 'Alimentación', icon: 'fa-utensils' },
      { name: 'Vivienda', icon: 'fa-house' },
      { name: 'Transporte', icon: 'fa-car' },
      { name: 'Servicios', icon: 'fa-bolt' },
      { name: 'Entretenimiento', icon: 'fa-film' },
      { name: 'Salud', icon: 'fa-heart-pulse' },
      { name: 'Educación', icon: 'fa-graduation-cap' },
      { name: 'Ropa & Compras', icon: 'fa-bag-shopping' },
      { name: 'Otros', icon: 'fa-receipt' }
    ],
    ingreso: [
      { name: 'Salario', icon: 'fa-money-bill-wave' },
      { name: 'Freelance', icon: 'fa-laptop-code' },
      { name: 'Inversiones', icon: 'fa-chart-line' },
      { name: 'Ventas', icon: 'fa-store' },
      { name: 'Premios / Regalos', icon: 'fa-gift' },
      { name: 'Otros', icon: 'fa-wallet' }
    ]
  };

  function init() {
    setupTheme();
    setupCurrency();
    setupEventListeners();
    updateKPIs();
    renderTransactionsTable();
    ChartsManager.refreshAll();
    CalendarManager.init();
    updateBudgetProgressBar();

    console.log('DashFinance Admin Dashboard initialized successfully.');
  }

  // --- THEME MANAGEMENT (Dark / Light) ---
  function setupTheme() {
    const settings = Store.getSettings();
    if (settings.theme === 'dark' || (!settings.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      updateThemeIcon(true);
    } else {
      document.documentElement.classList.remove('dark');
      updateThemeIcon(false);
    }
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    Store.updateSettings({ theme: isDark ? 'dark' : 'light' });
    updateThemeIcon(isDark);
    ChartsManager.refreshAll();
    showToast(isDark ? 'Modo Oscuro activado' : 'Modo Claro activado', 'info');
  }

  function updateThemeIcon(isDark) {
    const themeIcon = document.getElementById('themeToggleIcon');
    if (themeIcon) {
      themeIcon.className = isDark ? 'fa-solid fa-sun text-amber-400 text-lg' : 'fa-solid fa-moon text-slate-600 dark:text-slate-300 text-lg';
    }
  }

  // --- CURRENCY SELECTOR ---
  function setupCurrency() {
    const settings = Store.getSettings();
    const select = document.getElementById('currencySelector');
    if (select) {
      select.value = settings.currency || 'USD';
    }
  }

  function changeCurrency(val) {
    let symbol = '$';
    if (val === 'EUR') symbol = '€';
    else if (val === 'GBP') symbol = '£';
    else symbol = '$';

    Store.updateSettings({ currency: val, currencySymbol: symbol });
    updateKPIs();
    renderTransactionsTable();
    ChartsManager.refreshAll();
    CalendarManager.refresh();
    showToast(`Moneda cambiada a ${val}`, 'info');
  }

  // Format money shorthand
  function formatMoney(amount) {
    const settings = Store.getSettings();
    return `${settings.currencySymbol || '$'}${Number(amount).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  // --- NAVIGATION & VIEW SWITCHING ---
  function switchView(viewName) {
    currentView = viewName;

    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(el => {
      el.classList.add('hidden');
    });

    // Show target view
    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }

    // Update active state in sidebar
    document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
      const btnView = btn.getAttribute('data-view');
      if (btnView === viewName) {
        btn.classList.add('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-500/25');
        btn.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        const icon = btn.querySelector('i');
        if (icon) icon.classList.add('text-white');
      } else {
        btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md', 'shadow-blue-500/25');
        btn.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
        const icon = btn.querySelector('i');
        if (icon) icon.classList.remove('text-white');
      }
    });

    // Close mobile drawer if open
    closeMobileSidebar();

    // Trigger redraws if calendar or charts
    if (viewName === 'calendario') {
      CalendarManager.refresh();
    } else if (viewName === 'dashboard' || viewName === 'reportes') {
      ChartsManager.refreshAll();
    } else if (viewName === 'gastos') {
      renderExpenseView();
    } else if (viewName === 'ingresos') {
      renderIncomeView();
    }
  }

  // --- KPI CARDS UPDATER ---
  function updateKPIs() {
    const stats = Store.getKPIStats();

    // Balance Total
    const kpiBalance = document.getElementById('kpiTotalBalance');
    if (kpiBalance) kpiBalance.textContent = formatMoney(stats.allTimeBalance);

    // Ingresos Totales (Mes actual)
    const kpiIncome = document.getElementById('kpiTotalIncome');
    if (kpiIncome) kpiIncome.textContent = formatMoney(stats.totalIncome);

    // Gastos Totales (Mes actual)
    const kpiExpense = document.getElementById('kpiTotalExpense');
    if (kpiExpense) kpiExpense.textContent = formatMoney(stats.totalExpense);

    // Ahorro Neto
    const kpiSavings = document.getElementById('kpiNetSavings');
    if (kpiSavings) kpiSavings.textContent = formatMoney(stats.netSavings);

    // Trends Badges
    const badgeIncome = document.getElementById('kpiIncomeTrend');
    if (badgeIncome) {
      badgeIncome.innerHTML = `<i class="fa-solid fa-arrow-trend-up text-xs mr-1"></i>${stats.incomeGrowth}% vs mes anterior`;
    }

    const badgeExpense = document.getElementById('kpiExpenseTrend');
    if (badgeExpense) {
      const isDown = parseFloat(stats.expenseGrowth) <= 0;
      badgeExpense.className = `inline-flex items-center text-xs font-semibold ${isDown ? 'text-emerald-500' : 'text-rose-500'}`;
      badgeExpense.innerHTML = `<i class="fa-solid ${isDown ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'} text-xs mr-1"></i>${stats.expenseGrowth}% vs mes ant.`;
    }

    const badgeSavings = document.getElementById('kpiSavingsRate');
    if (badgeSavings) {
      badgeSavings.textContent = `${stats.savingsRate}% tasa de ahorro`;
    }
  }

  function updateBudgetProgressBar() {
    const stats = Store.getKPIStats();
    const settings = Store.getSettings();
    const budget = settings.monthlyBudget || 3500;
    const spent = stats.totalExpense;
    const percent = Math.min(100, Math.round((spent / budget) * 100));

    const bar = document.getElementById('budgetProgressBar');
    const label = document.getElementById('budgetProgressLabel');
    if (bar) {
      bar.style.width = `${percent}%`;
      if (percent > 90) bar.className = 'h-2 rounded-full transition-all duration-500 bg-rose-500';
      else if (percent > 70) bar.className = 'h-2 rounded-full transition-all duration-500 bg-amber-500';
      else bar.className = 'h-2 rounded-full transition-all duration-500 bg-blue-600';
    }
    if (label) {
      label.textContent = `${percent}% de ${formatMoney(budget)}`;
    }
  }

  // --- TRANSACTIONS TABLE RENDERING ---
  function renderTransactionsTable() {
    const tableBody = document.getElementById('transactionsTableBody');
    const emptyState = document.getElementById('transactionsEmptyState');
    if (!tableBody) return;

    const list = Store.getFiltered({
      type: activeFilterType,
      search: activeSearchQuery
    });

    if (list.length === 0) {
      tableBody.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    tableBody.innerHTML = list.map(tx => {
      const isInc = tx.type === 'ingreso';
      const [y, m, d] = tx.date.split('-');
      const dateFormatted = `${d}/${m}/${y}`;

      return `
        <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800 transition-colors">
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isInc 
                  ? 'bg-emerald-100/70 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' 
                  : 'bg-rose-100/70 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
              }">
                <i class="fa-solid ${isInc ? 'fa-arrow-down-left' : 'fa-arrow-up-right'} text-sm"></i>
              </div>
              <div>
                <span class="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-100 block">${escapeHtml(tx.concept)}</span>
                ${tx.notes ? `<span class="text-[11px] text-slate-600 dark:text-slate-300 block truncate max-w-xs">${escapeHtml(tx.notes)}</span>` : ''}
              </div>
            </div>
          </td>
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              isInc 
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                : 'bg-slate-100 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300'
            }">
              ${escapeHtml(tx.category)}
            </span>
          </td>
          <td class="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
            ${dateFormatted}
          </td>
          <td class="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
            <i class="fa-regular fa-credit-card text-[11px] mr-1.5 opacity-60"></i>${escapeHtml(tx.paymentMethod)}
          </td>
          <td class="py-3.5 px-4 text-right">
            <span class="text-xs md:text-sm font-bold ${isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
              ${isInc ? '+' : '-'}${formatMoney(tx.amount)}
            </span>
          </td>
          <td class="py-3.5 px-4 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button 
                onclick="App.editTransaction('${tx.id}')" 
                title="Editar transacción" 
                class="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <i class="fa-solid fa-pen text-xs"></i>
              </button>
              <button 
                onclick="App.confirmDeleteTransaction('${tx.id}')" 
                title="Eliminar transacción" 
                class="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- DEDICATED EXPENSES VIEW ---
  function renderExpenseView() {
    const container = document.getElementById('expenseListContainer');
    if (!container) return;
    const expenses = Store.getFiltered({ type: 'gasto' });

    let total = 0;
    expenses.forEach(e => total += e.amount);

    const expenseTotalEl = document.getElementById('expenseViewTotal');
    if (expenseTotalEl) expenseTotalEl.textContent = formatMoney(total);

    if (expenses.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400">No hay gastos registrados</div>`;
      return;
    }

    container.innerHTML = expenses.map(tx => `
      <div class="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between hover:border-blue-300 dark:hover:border-slate-700 transition-all">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center">
            <i class="fa-solid fa-receipt text-sm"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">${escapeHtml(tx.concept)}</h4>
            <div class="flex items-center gap-2 mt-1">
              <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">${escapeHtml(tx.category)}</span>
              <span class="text-xs text-slate-600 dark:text-slate-300">${tx.date}</span>
              <span class="text-xs text-slate-600 dark:text-slate-300">• ${escapeHtml(tx.paymentMethod)}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm font-bold text-rose-600 dark:text-rose-400">-${formatMoney(tx.amount)}</span>
          <div class="flex items-center gap-1">
            <button onclick="App.editTransaction('${tx.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 flex items-center justify-center">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button onclick="App.confirmDeleteTransaction('${tx.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-600 flex items-center justify-center">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // --- DEDICATED INCOMES VIEW ---
  function renderIncomeView() {
    const container = document.getElementById('incomeListContainer');
    if (!container) return;
    const incomes = Store.getFiltered({ type: 'ingreso' });

    let total = 0;
    incomes.forEach(i => total += i.amount);

    const incomeTotalEl = document.getElementById('incomeViewTotal');
    if (incomeTotalEl) incomeTotalEl.textContent = formatMoney(total);

    if (incomes.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400">No hay ingresos registrados</div>`;
      return;
    }

    container.innerHTML = incomes.map(tx => `
      <div class="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between hover:border-blue-300 dark:hover:border-slate-700 transition-all">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center">
            <i class="fa-solid fa-money-bill-wave text-sm"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">${escapeHtml(tx.concept)}</h4>
            <div class="flex items-center gap-2 mt-1">
              <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">${escapeHtml(tx.category)}</span>
              <span class="text-xs text-slate-600 dark:text-slate-300">${tx.date}</span>
              <span class="text-xs text-slate-600 dark:text-slate-300">• ${escapeHtml(tx.paymentMethod)}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400">+${formatMoney(tx.amount)}</span>
          <div class="flex items-center gap-1">
            <button onclick="App.editTransaction('${tx.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 flex items-center justify-center">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button onclick="App.confirmDeleteTransaction('${tx.id}')" class="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-600 flex items-center justify-center">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // --- MODAL: ADD / EDIT TRANSACTION ---
  function openTransactionModal(defaultType = 'gasto', prefillDate = null) {
    editingTxId = null;
    document.getElementById('txModalTitle').textContent = 'Nueva Transacción';
    document.getElementById('txForm').reset();

    // Default Date
    const dateInput = document.getElementById('txDate');
    if (dateInput) {
      dateInput.value = prefillDate || new Date().toISOString().split('T')[0];
    }

    // Set Type
    setModalTypeTab(defaultType);

    // Show modal
    const modal = document.getElementById('transactionModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('txConcept').focus();
  }

  function editTransaction(id) {
    const tx = Store.getById(id);
    if (!tx) return;

    editingTxId = id;
    document.getElementById('txModalTitle').textContent = 'Editar Transacción';

    setModalTypeTab(tx.type);
    document.getElementById('txConcept').value = tx.concept;
    document.getElementById('txAmount').value = tx.amount;
    document.getElementById('txCategory').value = tx.category;
    document.getElementById('txDate').value = tx.date;
    document.getElementById('txPaymentMethod').value = tx.paymentMethod;
    document.getElementById('txNotes').value = tx.notes || '';

    const modal = document.getElementById('transactionModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeTransactionModal() {
    const modal = document.getElementById('transactionModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    editingTxId = null;
  }

  function setModalTypeTab(type) {
    const typeHidden = document.getElementById('txType');
    const tabGasto = document.getElementById('tabTypeGasto');
    const tabIngreso = document.getElementById('tabTypeIngreso');
    typeHidden.value = type;

    if (type === 'gasto') {
      tabGasto.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-rose-500 text-white shadow-sm';
      tabIngreso.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all text-slate-500 hover:text-slate-800 dark:hover:text-slate-200';
    } else {
      tabIngreso.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-500 text-white shadow-sm';
      tabGasto.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all text-slate-500 hover:text-slate-800 dark:hover:text-slate-200';
    }

    // Populate category options
    updateCategorySelectOptions(type);
  }

  function updateCategorySelectOptions(type) {
    const select = document.getElementById('txCategory');
    if (!select) return;

    const list = categoryPresets[type] || categoryPresets.gasto;
    select.innerHTML = list.map(item => `
      <option value="${item.name}">${item.name}</option>
    `).join('');
  }

  function handleFormSubmit(e) {
    e.preventDefault();

    const type = document.getElementById('txType').value;
    const concept = document.getElementById('txConcept').value.trim();
    const amount = parseFloat(document.getElementById('txAmount').value);
    const category = document.getElementById('txCategory').value;
    const date = document.getElementById('txDate').value;
    const paymentMethod = document.getElementById('txPaymentMethod').value;
    const notes = document.getElementById('txNotes').value.trim();

    if (!concept) {
      showToast('Por favor introduce un concepto o descripción', 'warning');
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      showToast('Por favor introduce un monto válido mayor a 0', 'warning');
      return;
    }

    const payload = { type, concept, amount, category, date, paymentMethod, notes };

    if (editingTxId) {
      Store.update(editingTxId, payload);
      showToast('Transacción actualizada con éxito', 'success');
    } else {
      Store.add(payload);
      showToast('Transacción registrada con éxito', 'success');
    }

    closeTransactionModal();
    refreshAllUI();
  }

  // --- DELETE MODAL ---
  let pendingDeleteId = null;

  function confirmDeleteTransaction(id) {
    pendingDeleteId = id;
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  function closeDeleteModal() {
    pendingDeleteId = null;
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function executeDelete() {
    if (pendingDeleteId) {
      Store.remove(pendingDeleteId);
      showToast('Transacción eliminada correctamente', 'success');
      closeDeleteModal();
      refreshAllUI();
    }
  }

  // Refresh entire UI
  function refreshAllUI() {
    updateKPIs();
    updateBudgetProgressBar();
    renderTransactionsTable();
    ChartsManager.refreshAll();
    CalendarManager.refresh();

    if (currentView === 'gastos') renderExpenseView();
    if (currentView === 'ingresos') renderIncomeView();
  }

  // --- FILTERS & SEARCH ---
  function setTableFilter(type) {
    activeFilterType = type;
    document.querySelectorAll('.table-filter-btn').forEach(btn => {
      const f = btn.getAttribute('data-filter');
      if (f === type) {
        btn.classList.add('bg-blue-600', 'text-white');
        btn.classList.remove('bg-slate-100', 'text-slate-600', 'dark:bg-slate-800', 'dark:text-slate-300');
      } else {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('bg-slate-100', 'text-slate-600', 'dark:bg-slate-800', 'dark:text-slate-300');
      }
    });
    renderTransactionsTable();
  }

  function handleSearch(query) {
    activeSearchQuery = query;
    renderTransactionsTable();
  }

  // --- MOBILE SIDEBAR ---
  function toggleMobileSidebar() {
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar.classList.contains('-translate-x-full')) {
      sidebar.classList.remove('-translate-x-full');
      overlay.classList.remove('hidden');
    } else {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    }
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (overlay) overlay.classList.add('hidden');
  }

  // --- BACKUP & EXPORTS ---
  function exportCSV() {
    const csvContent = Store.exportToCSV();
    if (!csvContent) {
      showToast('No hay transacciones para exportar', 'warning');
      return;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FinStack_Transacciones_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Archivo CSV descargado con éxito', 'success');
  }

  function exportJSON() {
    const jsonStr = Store.exportToJSON();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FinStack_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Copia de seguridad JSON descargada', 'success');
  }

  function triggerImportJSON() {
    const fileInput = document.getElementById('jsonFileInput');
    if (fileInput) fileInput.click();
  }

  function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const success = Store.importFromJSON(event.target.result);
      if (success) {
        showToast('Datos restaurados con éxito desde la copia', 'success');
        refreshAllUI();
      } else {
        showToast('Archivo JSON no válido o con formato incorrecto', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  }

  function resetDemoData() {
    if (confirm('¿Deseas restablecer los datos de muestra originales? Tus transacciones actuales serán reemplazadas por el demo.')) {
      Store.resetData();
      showToast('Datos de demostración restablecidos', 'info');
      refreshAllUI();
    }
  }

  // --- TOAST NOTIFICATIONS ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const colors = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      warning: 'bg-amber-500 text-white',
      info: 'bg-blue-600 text-white'
    };

    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-exclamation',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info'
    };

    const toast = document.createElement('div');
    toast.className = `flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold ${colors[type] || colors.info} transition-all duration-300 transform translate-y-4 opacity-0`;
    toast.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.info} text-sm"></i>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto remove after 3.2s
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Form submit
    const txForm = document.getElementById('txForm');
    if (txForm) txForm.addEventListener('submit', handleFormSubmit);

    // Search inputs
    const globalSearch = document.getElementById('globalSearchInput');
    if (globalSearch) {
      globalSearch.addEventListener('input', e => handleSearch(e.target.value));
    }
  }

  // Public API
  return {
    init,
    switchView,
    toggleTheme,
    changeCurrency,
    openTransactionModal,
    editTransaction,
    closeTransactionModal,
    setModalTypeTab,
    confirmDeleteTransaction,
    closeDeleteModal,
    executeDelete,
    setTableFilter,
    handleSearch,
    toggleMobileSidebar,
    closeMobileSidebar,
    exportCSV,
    exportJSON,
    triggerImportJSON,
    handleFileImport,
    resetDemoData,
    showToast
  };
})();

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
