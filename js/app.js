/**
 * DashFinance - Main Application Controller
 * Handles view switching, multi-role switching, user management (Admin CRUD),
 * AI assistant integration, changelog, modals, filters, search, table rendering, toast alerts and theme toggle.
 */

const App = (function () {
  let currentView = 'dashboard';
  let editingTxId = null;
  let editingUserId = null;
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
    setupRoleUI();
    setupEventListeners();
    updateKPIs();
    renderTransactionsTable();
    renderUsersTable();
    ChartsManager.refreshAll();
    CalendarManager.init();
    updateBudgetProgressBar();
    renderChangelog();
    AIAssistant.init();

    console.log('DashFinance Pro v1.3 initialized with Admin User Management and AI Assistant.');
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
    renderUsersTable();
    ChartsManager.refreshAll();
    CalendarManager.refresh();
    showToast(`Moneda cambiada a ${val}`, 'info');
  }

  // --- MULTI-ROLE & MULTI-USER SYSTEM UI ---
  function setupRoleUI() {
    const currentUser = Store.getCurrentUser() || {
      id: 'usr_2',
      name: 'Dany Ramos (Personal)',
      role: 'cliente',
      email: 'dany@finstack.local',
      status: 'Activo'
    };
    const activeRole = currentUser.role || Store.getActiveRole();
    const info = Store.getRoleInfo(activeRole);

    const roleBadgeEl = document.getElementById('userRoleBadge');
    const userNameEl = document.getElementById('userNameLabel');
    const roleSelector = document.getElementById('userRoleSelector');
    const roleBanner = document.getElementById('roleStatusBanner');
    const roleAvatar = document.getElementById('userRoleAvatar');
    const adminOnlyNav = document.getElementById('adminOnlyNavUsers');

    if (roleBadgeEl) {
      roleBadgeEl.textContent = info ? info.badge : (activeRole.toUpperCase());
      roleBadgeEl.className = `text-[10px] font-bold px-2 py-0.5 rounded-full ${info ? info.color : 'bg-blue-100 text-blue-700'}`;
    }
    if (userNameEl) {
      userNameEl.textContent = currentUser.name;
    }

    // Populate user / role selector dynamically with all registered users
    if (roleSelector) {
      const users = Store.getUsers();
      roleSelector.innerHTML = users.map(u => {
        let icon = '💼';
        if (u.role === 'admin') icon = '👑';
        else if (u.role === 'visita') icon = '👁️';
        else icon = '👤';
        const isSelected = u.id === currentUser.id ? 'selected' : '';
        const statusNote = u.status === 'Inactivo' ? ' (Inactivo)' : '';
        return `<option value="${u.id}" ${isSelected}>${icon} ${escapeHtml(u.name)}${statusNote}</option>`;
      }).join('');
      roleSelector.value = currentUser.id;
    }

    // Avatar initials and gradient
    if (roleAvatar) {
      const nameParts = (currentUser.name || 'Usuario').trim().split(/\s+/);
      const initials = nameParts.length > 1
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : nameParts[0].substring(0, 2).toUpperCase();
      roleAvatar.textContent = initials;

      if (activeRole === 'admin') {
        roleAvatar.className = 'w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm';
      } else if (activeRole === 'visita') {
        roleAvatar.className = 'w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-xs flex items-center justify-center shadow-sm';
      } else {
        roleAvatar.className = 'w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm';
      }
    }

    // Role Status Banner
    if (roleBanner) {
      if (activeRole === 'admin') {
        roleBanner.classList.remove('hidden');
        roleBanner.className = 'bg-purple-600/10 border-b border-purple-500/20 px-4 py-2 text-xs flex items-center justify-between text-purple-700 dark:text-purple-300';
        roleBanner.innerHTML = `
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-shield-halved"></i>
            <span><strong>Modo Admin / Laboratorio:</strong> Tienes control de usuarios y pruebas. Tus finanzas personales están aisladas.</span>
          </div>
          <button onclick="App.switchUserRole('cliente')" class="underline font-semibold hover:text-purple-900 dark:hover:text-purple-100">Pasar a Mis Finanzas</button>
        `;
      } else if (activeRole === 'visita') {
        roleBanner.classList.remove('hidden');
        roleBanner.className = 'bg-amber-600/10 border-b border-amber-500/20 px-4 py-2 text-xs flex items-center justify-between text-amber-700 dark:text-amber-300';
        roleBanner.innerHTML = `
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-eye"></i>
            <span><strong>Modo Visita / Demostración:</strong> Estás viendo datos de muestra protegidos para presentar la app a terceros.</span>
          </div>
          <button onclick="App.switchUserRole('cliente')" class="underline font-semibold hover:text-amber-900 dark:hover:text-amber-100">Iniciar Mi Sesión</button>
        `;
      } else {
        roleBanner.classList.add('hidden');
      }
    }

    // Show/Hide Admin users nav item
    if (adminOnlyNav) {
      if (activeRole === 'admin') adminOnlyNav.classList.remove('hidden');
      else adminOnlyNav.classList.add('hidden');
    }
  }

  // Switch between individual user accounts
  function switchUserAccount(userId) {
    const users = Store.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      showToast('No se encontró el usuario seleccionado.', 'danger');
      return;
    }

    if (user.status === 'Inactivo') {
      showToast(`El usuario "${user.name}" está suspendido/inactivo. Actívalo en el Panel Admin antes de ingresar.`, 'warning');
      setupRoleUI(); // Revert selector to active user
      return;
    }

    Store.switchUser(userId);
    setupRoleUI();
    refreshAllUI();
    showToast(`Sesión activa: ${user.name} (${user.role.toUpperCase()})`, 'success');

    // If leaving admin while viewing admin users management, redirect to dashboard
    if (currentView === 'usuarios' && user.role !== 'admin') {
      switchView('dashboard');
    }
  }

  // Switch by role name (finds matching user)
  function switchUserRole(newRole) {
    const users = Store.getUsers();
    const targetUser = users.find(u => u.role === newRole && u.status === 'Activo') || users.find(u => u.role === newRole);
    if (targetUser) {
      switchUserAccount(targetUser.id);
    } else {
      const roleInfo = Store.switchRole(newRole);
      setupRoleUI();
      refreshAllUI();
      showToast(`Cambiado a: ${roleInfo ? roleInfo.badge : newRole}`, 'info');

      if (currentView === 'usuarios' && newRole !== 'admin') {
        switchView('dashboard');
      }
    }
  }

  // --- USER MANAGEMENT (ADMIN VIEW) ---
  function renderUsersTable() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;

    const users = Store.getUsers();
    const settings = Store.getSettings();
    const currentUserId = Store.getCurrentUserId();
    const currency = settings.currencySymbol || '$';

    tableBody.innerHTML = users.map(user => {
      const isCurrent = user.id === currentUserId;
      const isAdmin = user.role === 'admin';
      const isClient = user.role === 'cliente';
      const roleBadge = isAdmin
        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
        : isClient
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';

      const statusBadge = user.status === 'Activo'
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';

      const nameParts = (user.name || 'Usuario').trim().split(/\s+/);
      const initials = nameParts.length > 1
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : nameParts[0].substring(0, 2).toUpperCase();

      return `
        <tr class="${isCurrent ? 'bg-blue-50/50 dark:bg-blue-950/30' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'} border-b border-gray-100 dark:border-slate-800 transition-colors">
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-gradient-to-tr ${isAdmin ? 'from-purple-600 to-indigo-600' : (user.role === 'visita' ? 'from-amber-500 to-orange-500' : 'from-blue-600 to-cyan-600')} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                ${initials}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-100 block">${escapeHtml(user.name)}</span>
                  ${isCurrent ? '<span class="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">Sesión Actual</span>' : ''}
                </div>
                <span class="text-[11px] text-slate-500 dark:text-slate-400 block">${escapeHtml(user.email)}</span>
              </div>
            </div>
          </td>
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${roleBadge}">
              ${user.role.toUpperCase()}
            </span>
          </td>
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusBadge}">
              <span class="w-1.5 h-1.5 rounded-full ${user.status === 'Activo' ? 'bg-emerald-500' : 'bg-slate-400'}"></span>
              ${user.status}
            </span>
          </td>
          <td class="py-3.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
            ${currency}${Number(user.budget || 3000).toLocaleString('es-ES')}
          </td>
          <td class="py-3.5 px-4 text-xs text-slate-400">
            ${user.createdAt}
          </td>
          <td class="py-3.5 px-4 text-center">
            <div class="flex items-center justify-center gap-2">
              ${isCurrent ? `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-700">
                  <i class="fa-solid fa-circle-check text-xs"></i> Activo
                </span>
              ` : `
                <button 
                  onclick="App.switchUserAccount('${user.id}')" 
                  title="Iniciar sesión como este usuario" 
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-blue-900/40 dark:hover:bg-blue-600 dark:text-blue-300 text-xs font-bold transition-all shadow-xs border border-blue-200 dark:border-blue-800"
                >
                  <i class="fa-solid fa-right-to-bracket text-xs"></i>
                  <span>Ingresar</span>
                </button>
              `}
              <button 
                onclick="App.toggleUserStatus('${user.id}')" 
                title="${user.status === 'Activo' ? 'Suspender usuario' : 'Activar usuario'}" 
                class="w-7 h-7 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <i class="fa-solid ${user.status === 'Activo' ? 'fa-ban' : 'fa-check'} text-xs"></i>
              </button>
              <button 
                onclick="App.openUserModal('${user.id}')" 
                title="Editar usuario" 
                class="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <i class="fa-solid fa-pen text-xs"></i>
              </button>
              <button 
                onclick="App.deleteUser('${user.id}')" 
                title="Eliminar usuario" 
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

  function openUserModal(userId = null) {
    editingUserId = userId;
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const title = document.getElementById('userModalTitle');
    if (!modal) return;

    form.reset();

    if (userId) {
      const users = Store.getUsers();
      const user = users.find(u => u.id === userId);
      if (user) {
        title.textContent = 'Editar Usuario';
        document.getElementById('userNameInput').value = user.name;
        document.getElementById('userEmailInput').value = user.email;
        document.getElementById('userRoleSelect').value = user.role;
        document.getElementById('userBudgetInput').value = user.budget || 3000;
      }
    } else {
      title.textContent = 'Crear Nuevo Usuario';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('userNameInput').focus();
  }

  function closeUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      editingUserId = null;
    }
  }

  function handleUserFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('userNameInput').value.trim();
    const email = document.getElementById('userEmailInput').value.trim();
    const role = document.getElementById('userRoleSelect').value;
    const budget = parseFloat(document.getElementById('userBudgetInput').value) || 3000;

    if (!name || !email) {
      showToast('Por favor completa el nombre y el correo', 'warning');
      return;
    }

    if (editingUserId) {
      Store.updateUser(editingUserId, { name, email, role, budget });
      showToast('Usuario actualizado con éxito', 'success');
    } else {
      const newUser = Store.addUser({ name, email, role, budget });
      showToast(`Usuario "${newUser.name}" creado con éxito`, 'success');
    }

    closeUserModal();
    setupRoleUI();
    renderUsersTable();
  }

  function deleteUser(id) {
    const currentId = Store.getCurrentUserId();
    if (id === currentId) {
      showToast('No puedes eliminar el usuario con el que tienes la sesión iniciada actualmente.', 'warning');
      return;
    }
    const users = Store.getUsers();
    if (users.length <= 1) {
      showToast('No puedes eliminar el único usuario del sistema.', 'warning');
      return;
    }

    if (confirm('¿Estás seguro de que deseas eliminar este usuario del sistema?')) {
      Store.deleteUser(id);
      showToast('Usuario eliminado del sistema', 'info');
      setupRoleUI();
      renderUsersTable();
    }
  }

  function toggleUserStatus(id) {
    const currentId = Store.getCurrentUserId();
    if (id === currentId) {
      showToast('No puedes suspender tu propia sesión activa.', 'warning');
      return;
    }
    const updated = Store.toggleUserStatus(id);
    if (updated) {
      showToast(`Usuario ${updated.name} ahora está ${updated.status}`, 'info');
      setupRoleUI();
      renderUsersTable();
    }
  }

  // --- CHANGELOG & ROADMAP RENDER ---
  function renderChangelog() {
    const container = document.getElementById('changelogTimeline');
    if (!container) return;

    const list = Store.getChangelog();
    container.innerHTML = list.map((item, index) => {
      const isLatest = index === 0;
      return `
        <div class="relative pl-6 pb-6 border-l-2 ${isLatest ? 'border-blue-500' : 'border-slate-200 dark:border-slate-800'} last:border-transparent">
          <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full ${isLatest ? 'bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/40' : 'bg-slate-300 dark:bg-slate-700'} border-2 border-white dark:border-slate-900"></div>
          
          <div class="flex items-center gap-2 mb-1.5">
            <span class="text-xs font-black px-2 py-0.5 rounded-full ${isLatest ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'} font-mono">${item.version}</span>
            <span class="text-xs text-slate-500 dark:text-slate-400">${item.date}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isLatest ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}">${item.tag}</span>
          </div>

          <h4 class="text-sm font-bold text-slate-900 dark:text-white">${item.title}</h4>
          
          <ul class="mt-2.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            ${item.highlights.map(h => `
              <li class="flex items-start gap-2">
                <i class="fa-solid fa-circle-check text-[11px] text-emerald-500 mt-0.5"></i>
                <span>${escapeHtml(h)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }).join('');
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

    closeMobileSidebar();

    // Trigger redraws based on view
    if (viewName === 'calendario') {
      CalendarManager.refresh();
    } else if (viewName === 'dashboard' || viewName === 'reportes') {
      ChartsManager.refreshAll();
    } else if (viewName === 'gastos') {
      renderExpenseView();
    } else if (viewName === 'ingresos') {
      renderIncomeView();
    } else if (viewName === 'versiones') {
      renderChangelog();
    } else if (viewName === 'usuarios') {
      renderUsersTable();
    }
  }

  // --- KPI CARDS UPDATER ---
  function updateKPIs() {
    const stats = Store.getKPIStats();

    const kpiBalance = document.getElementById('kpiTotalBalance');
    if (kpiBalance) kpiBalance.textContent = formatMoney(stats.allTimeBalance);

    const kpiIncome = document.getElementById('kpiTotalIncome');
    if (kpiIncome) kpiIncome.textContent = formatMoney(stats.totalIncome);

    const kpiExpense = document.getElementById('kpiTotalExpense');
    if (kpiExpense) kpiExpense.textContent = formatMoney(stats.totalExpense);

    const kpiSavings = document.getElementById('kpiNetSavings');
    if (kpiSavings) kpiSavings.textContent = formatMoney(stats.netSavings);

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
      container.innerHTML = `<div class="p-8 text-center text-slate-400">No hay gastos registrados en este perfil</div>`;
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
      container.innerHTML = `<div class="p-8 text-center text-slate-400">No hay ingresos registrados en este perfil</div>`;
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

    const dateInput = document.getElementById('txDate');
    if (dateInput) {
      dateInput.value = prefillDate || new Date().toISOString().split('T')[0];
    }

    setModalTypeTab(defaultType);

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
      tabGasto.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-rose-500 text-white shadow-sm flex items-center justify-center gap-2';
      tabIngreso.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center gap-2';
    } else {
      tabIngreso.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-500 text-white shadow-sm flex items-center justify-center gap-2';
      tabGasto.className = 'flex-1 py-2 rounded-xl text-xs font-bold transition-all text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center gap-2';
    }

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
    renderUsersTable();
    ChartsManager.refreshAll();
    CalendarManager.refresh();

    if (currentView === 'gastos') renderExpenseView();
    if (currentView === 'ingresos') renderIncomeView();
    if (currentView === 'versiones') renderChangelog();
    if (currentView === 'usuarios') renderUsersTable();
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
    const role = Store.getActiveRole();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FinStack_${role}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Archivo CSV descargado con éxito', 'success');
  }

  function exportJSON() {
    const jsonStr = Store.exportToJSON();
    const role = Store.getActiveRole();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FinStack_Backup_${role}_${new Date().toISOString().split('T')[0]}.json`);
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
    e.target.value = '';
  }

  function resetDemoData() {
    const role = Store.getActiveRole();
    const msg = role === 'admin' 
      ? '¿Deseas restablecer el entorno de pruebas (Admin / Staging)?'
      : role === 'visita'
        ? '¿Deseas restablecer las transacciones de demostración?'
        : '¿Deseas restablecer los datos de este perfil?';

    if (confirm(msg)) {
      Store.resetData();
      showToast('Datos restablecidos correctamente', 'info');
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

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

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
    const txForm = document.getElementById('txForm');
    if (txForm) txForm.addEventListener('submit', handleFormSubmit);

    const userForm = document.getElementById('userForm');
    if (userForm) userForm.addEventListener('submit', handleUserFormSubmit);

    const globalSearch = document.getElementById('globalSearchInput');
    if (globalSearch) {
      globalSearch.addEventListener('input', e => handleSearch(e.target.value));
    }

    const aiInput = document.getElementById('aiChatInput');
    if (aiInput) {
      aiInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          AIAssistant.sendMessage();
        }
      });
    }
  }

  // Public API
  return {
    init,
    switchView,
    toggleTheme,
    changeCurrency,
    switchUserAccount,
    switchUserRole,
    setupRoleUI,
    renderChangelog,
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
    openUserModal,
    closeUserModal,
    deleteUser,
    toggleUserStatus,
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
