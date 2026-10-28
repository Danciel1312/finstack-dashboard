/**
 * FinStack Pro v2.0 - Wealth, Wallets, Savings Goals, Debts, Category Traffic Lights,
 * Executive PDF Statement & Native PWA Offline Controller.
 */

const WealthManager = (function () {
  let activePatrimonioTab = 'metas'; // 'metas' | 'billeteras' | 'deudas'
  let activeDebtFilter = 'todos';    // 'todos' | 'me_deben' | 'debo' | 'saldadas'
  let editingWalletId = null;
  let editingGoalId = null;
  let contributingGoalId = null;
  let editingDebtId = null;
  let payingDebtId = null;
  let deferredInstallPrompt = null;

  const EXPENSE_CATEGORIES = [
    { name: 'Alimentación', icon: '🍽️' },
    { name: 'Vivienda', icon: '🏠' },
    { name: 'Transporte', icon: '🚗' },
    { name: 'Servicios', icon: '💡' },
    { name: 'Entretenimiento', icon: '🎬' },
    { name: 'Salud', icon: '💊' },
    { name: 'Educación', icon: '🎓' },
    { name: 'Ropa & Compras', icon: '🛍️' },
    { name: 'Otros', icon: '📦' }
  ];

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMoney(amount) {
    const settings = Store.getSettings();
    const sym = settings.currencySymbol || '$';
    const val = Number(amount) || 0;
    const sign = val < 0 ? '-' : '';
    return `${sign}${sym}${Math.abs(val).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function isDemoRestricted() {
    if (Store.getActiveRole() === 'visita') {
      if (window.App && typeof App.showToast === 'function') {
        App.showToast('Modo Demo: Vista previa de sólo lectura. Crea tu cuenta gratis para guardar datos reales.', 'warning');
      }
      return true;
    }
    return false;
  }

  function init() {
    initPWA();
    const pdfMonthEl = document.getElementById('pdfReportMonthInput');
    if (pdfMonthEl && !pdfMonthEl.value) {
      const now = new Date();
      pdfMonthEl.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    refreshAll();
  }

  function refreshAll() {
    syncWalletSelectOptions();
    renderDashboardWalletsStrip();
    renderCategoryTrafficLights();
    renderPatrimonioView();
  }

  // =========================================================================
  // 1. PWA NATIVE INSTALL & OFFLINE AUTO-SYNC ENGINE
  // =========================================================================
  function initPWA() {
    if (typeof window === 'undefined') return;

    // Register Service Worker
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('Service Worker notice:', err);
      });
    }

    // Listen for install prompt on Android / Chrome / Edge
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const btn = document.getElementById('pwaInstallHeaderBtn');
      const sidebarBtn = document.getElementById('pwaInstallSidebarBtn');
      if (btn) btn.classList.remove('hidden');
      if (sidebarBtn) sidebarBtn.classList.remove('hidden');
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      const btn = document.getElementById('pwaInstallHeaderBtn');
      const sidebarBtn = document.getElementById('pwaInstallSidebarBtn');
      if (btn) btn.classList.add('hidden');
      if (sidebarBtn) sidebarBtn.classList.add('hidden');
      if (window.App) App.showToast('¡FinStack Pro instalada con éxito en tu dispositivo!', 'success');
    });

    // Show iOS helper button if running in mobile Safari browser (not standalone yet)
    if (typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent || '')) {
      const isStandalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
      if (!isStandalone) {
        const btn = document.getElementById('pwaInstallHeaderBtn');
        if (btn) btn.classList.remove('hidden');
      }
    }

    // Online / Offline live status & auto-reconciliation
    const updateConnectivityUI = (online, notify = false) => {
      const pill = document.getElementById('offlineStatusPill');
      if (pill) {
        if (online) pill.classList.add('hidden');
        else pill.classList.remove('hidden');
      }
      if (notify && window.App) {
        if (!online) {
          App.showToast('Modo Sin Internet activo: puedes seguir registrando tus movimientos localmente.', 'warning');
        } else {
          if (Store.isCloudConfigured()) {
            Store.syncCloud().then(res => {
              if (res && res.success) {
                App.refreshAllUI();
                App.updateCloudSyncUI();
                App.showToast('Conexión restaurada: tus movimientos se sincronizaron en la nube.', 'success');
              }
            }).catch(() => {});
          } else {
            App.showToast('Conexión a internet restaurada.', 'info');
          }
        }
      }
    };

    if (typeof navigator !== 'undefined' && navigator.onLine !== undefined) {
      updateConnectivityUI(navigator.onLine, false);
    }

    window.addEventListener('offline', () => updateConnectivityUI(false, true));
    window.addEventListener('online', () => updateConnectivityUI(true, true));
  }

  async function triggerInstallApp() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      try {
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          deferredInstallPrompt = null;
        }
      } catch (e) {}
      return;
    }

    // Fallback guidance for iOS Safari or browsers where prompt was already used
    const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent || '');
    if (isIOS) {
      if (window.App) {
        App.showToast('En iPhone/iPad: toca el botón "Compartir" de Safari y elige "Agregar a pantalla de inicio".', 'info');
      }
    } else if (window.App) {
      App.showToast('Usa el ícono de instalar en la barra superior de tu navegador o el menú "Instalar aplicación".', 'info');
    }
  }

  // =========================================================================
  // 2. WALLETS & ACCOUNT-TO-ACCOUNT TRANSFERS
  // =========================================================================
  function syncWalletSelectOptions() {
    const wallets = Store.getWallets();
    if (!wallets.length) return;

    const selectIds = [
      'txPaymentMethod',
      'subPaymentMethod',
      'transferFromWallet',
      'transferToWallet',
      'goalContributeWallet',
      'debtPayWallet'
    ];

    selectIds.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const prevVal = sel.value;
      sel.innerHTML = wallets.map(w => `
        <option value="${escapeHtml(w.name)}">${escapeHtml(w.icon || '🏦')} ${escapeHtml(w.name)}</option>
      `).join('');

      if (prevVal && wallets.some(w => w.name === prevVal)) {
        sel.value = prevVal;
      } else if (id === 'transferToWallet' && wallets.length > 1) {
        sel.value = wallets[1].name;
      }
    });
  }

  function renderDashboardWalletsStrip() {
    const container = document.getElementById('dashboardWalletsStrip');
    if (!container) return;

    const wallets = Store.getWalletsWithBalances();
    const colorMap = {
      emerald: 'from-emerald-500/10 to-teal-500/5 border-emerald-200/70 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300',
      blue: 'from-blue-500/10 to-indigo-500/5 border-blue-200/70 dark:border-blue-800/50 text-blue-700 dark:text-blue-300',
      purple: 'from-purple-500/10 to-fuchsia-500/5 border-purple-200/70 dark:border-purple-800/50 text-purple-700 dark:text-purple-300',
      amber: 'from-amber-500/10 to-orange-500/5 border-amber-200/70 dark:border-amber-800/50 text-amber-700 dark:text-amber-300',
      rose: 'from-rose-500/10 to-pink-500/5 border-rose-200/70 dark:border-rose-800/50 text-rose-700 dark:text-rose-300'
    };

    container.innerHTML = `
      <div class="bg-white dark:bg-[#1E293B] p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-slate-800/80 shadow-sm space-y-3.5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-building-columns text-blue-600 dark:text-blue-400 text-sm"></i>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Mis Cuentas y Billeteras</h3>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">${wallets.length} activas</span>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="WealthManager.openTransferModal()" class="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold inline-flex items-center gap-1.5 transition-colors">
              <i class="fa-solid fa-right-left text-[11px]"></i> Transferir
            </button>
            <button type="button" onclick="WealthManager.openWalletModal()" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors">
              <i class="fa-solid fa-plus text-[11px]"></i> Cuenta
            </button>
            <button type="button" onclick="App.switchView('patrimonio'); WealthManager.switchTab('billeteras');" class="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 px-1.5">
              Ver detalle
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          ${wallets.map(w => {
            const themeCls = colorMap[w.color] || colorMap.blue;
            const isNeg = w.currentBalance < 0;
            return `
              <div onclick="WealthManager.openWalletModal('${escapeHtml(w.id)}')" title="Clic para editar saldo inicial o nombre" class="p-3.5 rounded-xl bg-gradient-to-br ${themeCls} border cursor-pointer hover:scale-[1.01] transition-transform">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-lg select-none">${escapeHtml(w.icon || '🏦')}</span>
                  <span class="text-[10px] font-semibold opacity-75">${w.txCount} mov.</span>
                </div>
                <div class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${escapeHtml(w.name)}</div>
                <div class="text-sm md:text-base font-black mt-0.5 ${isNeg ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}">
                  ${formatMoney(w.currentBalance)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function openWalletModal(walletId = null) {
    if (isDemoRestricted()) return;
    editingWalletId = walletId;
    const modal = document.getElementById('walletModal');
    const title = document.getElementById('walletModalTitle');
    const form = document.getElementById('walletForm');
    if (!modal || !form) return;

    form.reset();
    let icon = '🏦';

    if (walletId) {
      const w = Store.getWallets().find(item => item.id === walletId);
      if (w) {
        if (title) title.textContent = `Editar Cuenta: ${w.name}`;
        document.getElementById('walletNameInput').value = w.name;
        document.getElementById('walletTypeSelect').value = w.type || 'banco';
        document.getElementById('walletColorSelect').value = w.color || 'blue';
        document.getElementById('walletInitialBalanceInput').value = w.initialBalance || 0;
        icon = w.icon || '🏦';
      }
    } else {
      if (title) title.textContent = 'Nueva Cuenta o Billetera';
      document.getElementById('walletInitialBalanceInput').value = 0;
    }

    const iconInput = document.getElementById('walletIconInput');
    if (iconInput) iconInput.value = icon;
    document.querySelectorAll('.wallet-icon-btn').forEach(btn => {
      const isSel = btn.textContent.trim() === icon;
      btn.className = isSel
        ? 'wallet-icon-btn w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500 text-base flex items-center justify-center shrink-0'
        : 'wallet-icon-btn w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent text-base flex items-center justify-center shrink-0';
    });

    if (window.App && typeof App.changeCurrency === 'function') {
      // Ensure currency symbol prefix inside modal matches
      const sym = Store.getSettings().currencySymbol || '$';
      modal.querySelectorAll('.currency-symbol-prefix').forEach(el => { el.textContent = sym; });
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeWalletModal() {
    editingWalletId = null;
    const modal = document.getElementById('walletModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function selectWalletIcon(btn, emoji) {
    const inp = document.getElementById('walletIconInput');
    if (inp) inp.value = emoji;
    document.querySelectorAll('.wallet-icon-btn').forEach(b => {
      b.className = 'wallet-icon-btn w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent text-base flex items-center justify-center shrink-0';
    });
    if (btn) {
      btn.className = 'wallet-icon-btn w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500 text-base flex items-center justify-center shrink-0';
    }
  }

  function handleWalletSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isDemoRestricted()) return;

    const name = document.getElementById('walletNameInput')?.value.trim();
    const type = document.getElementById('walletTypeSelect')?.value || 'banco';
    const color = document.getElementById('walletColorSelect')?.value || 'blue';
    const initialBalance = parseFloat(document.getElementById('walletInitialBalanceInput')?.value) || 0;
    const icon = document.getElementById('walletIconInput')?.value || '🏦';

    if (!name) {
      App.showToast('Ingresa el nombre de la cuenta o billetera', 'warning');
      return;
    }

    Store.saveWallet({
      id: editingWalletId || undefined,
      name,
      type,
      color,
      initialBalance,
      icon
    });

    closeWalletModal();
    App.refreshAllUI();
    App.showToast(`Cuenta "${name}" guardada correctamente`, 'success');
  }

  function deleteWallet(id) {
    if (isDemoRestricted()) return;
    if (!confirm('¿Eliminar esta cuenta personalizada? Los movimientos pasados se conservarán.')) return;
    const ok = Store.deleteWallet(id);
    if (ok) {
      App.refreshAllUI();
      App.showToast('Cuenta eliminada', 'info');
    } else {
      App.showToast('Las cuentas principales predeterminadas no se pueden eliminar (puedes renombrarlas).', 'warning');
    }
  }

  function openTransferModal(defaultFrom = null) {
    if (isDemoRestricted()) return;
    syncWalletSelectOptions();
    const modal = document.getElementById('transferModal');
    const form = document.getElementById('transferForm');
    if (!modal || !form) return;

    form.reset();
    syncWalletSelectOptions();

    const dateInp = document.getElementById('transferDateInput');
    if (dateInp) dateInp.value = new Date().toISOString().split('T')[0];

    const fromSel = document.getElementById('transferFromWallet');
    const toSel = document.getElementById('transferToWallet');
    const wallets = Store.getWallets();
    if (defaultFrom && fromSel) fromSel.value = defaultFrom;
    if (fromSel && toSel && fromSel.value === toSel.value && wallets.length > 1) {
      const alt = wallets.find(w => w.name !== fromSel.value);
      if (alt) toSel.value = alt.name;
    }

    const sym = Store.getSettings().currencySymbol || '$';
    modal.querySelectorAll('.currency-symbol-prefix').forEach(el => { el.textContent = sym; });

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeTransferModal() {
    const modal = document.getElementById('transferModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function handleTransferSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isDemoRestricted()) return;

    const fromWallet = document.getElementById('transferFromWallet')?.value;
    const toWallet = document.getElementById('transferToWallet')?.value;
    const amount = parseFloat(document.getElementById('transferAmountInput')?.value);
    const date = document.getElementById('transferDateInput')?.value;
    const concept = document.getElementById('transferConceptInput')?.value.trim();

    if (!fromWallet || !toWallet || fromWallet === toWallet) {
      App.showToast('Selecciona una cuenta origen y una cuenta destino diferentes', 'warning');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      App.showToast('Ingresa un monto válido mayor a 0', 'warning');
      return;
    }

    Store.addTransfer({
      fromWallet,
      toWallet,
      amount,
      date,
      concept: concept || `Traspaso: ${fromWallet} → ${toWallet}`
    });

    closeTransferModal();
    App.refreshAllUI();
    App.showToast(`Transferencia de ${formatMoney(amount)} realizada (${fromWallet} → ${toWallet})`, 'success');
  }

  // =========================================================================
  // 3. UNIFIED PATRIMONIO VIEW (METAS, BILLETERAS & PRÉSTAMOS)
  // =========================================================================
  function switchTab(tabName) {
    activePatrimonioTab = tabName;
    ['metas', 'billeteras', 'deudas'].forEach(t => {
      const btn = document.getElementById(`patrimonioTabBtn_${t}`);
      const panel = document.getElementById(`patrimonioPanel_${t}`);
      if (btn) {
        btn.className = t === tabName
          ? 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 text-white shadow-sm flex items-center gap-2 transition-all'
          : 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 flex items-center gap-2 transition-all';
      }
      if (panel) {
        if (t === tabName) panel.classList.remove('hidden');
        else panel.classList.add('hidden');
      }
    });
    renderPatrimonioView();
  }

  function renderPatrimonioView() {
    const goalSummary = Store.getGoalsSummary();
    const debtSummary = Store.getDebtsSummary();
    const wallets = Store.getWalletsWithBalances();
    const walletsTotal = wallets.reduce((acc, w) => acc + w.currentBalance, 0);

    const kpiWallets = document.getElementById('patKpiWalletsTotal');
    const kpiGoals = document.getElementById('patKpiGoalsSaved');
    const kpiGoalsPct = document.getElementById('patKpiGoalsSubtitle');
    const kpiOwedToMe = document.getElementById('patKpiOwedToMe');
    const kpiIOwe = document.getElementById('patKpiIOwe');

    if (kpiWallets) kpiWallets.textContent = formatMoney(walletsTotal);
    if (kpiGoals) kpiGoals.textContent = formatMoney(goalSummary.totalSaved);
    if (kpiGoalsPct) kpiGoalsPct.textContent = `${goalSummary.overallPercent}% de ${formatMoney(goalSummary.totalTarget)} (${goalSummary.count} metas)`;
    if (kpiOwedToMe) kpiOwedToMe.textContent = formatMoney(debtSummary.owedToMe);
    if (kpiIOwe) kpiIOwe.textContent = formatMoney(debtSummary.iOwe);

    renderGoalsGrid();
    renderWalletsDetailGrid(wallets);
    renderDebtsList();
  }

  function renderGoalsGrid() {
    const container = document.getElementById('goalsGridContainer');
    if (!container) return;

    const goals = Store.getGoals();
    if (goals.length === 0) {
      container.innerHTML = `
        <div class="col-span-full bg-white dark:bg-[#1E293B] rounded-2xl border border-gray-100 dark:border-slate-800 p-10 text-center">
          <div class="w-16 h-16 mx-auto mb-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl">🎯</div>
          <h4 class="text-sm font-bold text-slate-900 dark:text-white">Aún no tienes metas de ahorro</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Crea tu primera alcancía (Fondo de emergencia, Viaje, Vehículo o Estudios) y FinStack calculará cuánto ahorrar cada mes.
          </p>
          <button type="button" onclick="WealthManager.openGoalModal()" class="mt-4 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm">
            <i class="fa-solid fa-plus"></i> Crear Primera Meta
          </button>
        </div>
      `;
      return;
    }

    const barColors = {
      blue: 'bg-blue-600',
      emerald: 'bg-emerald-500',
      purple: 'bg-purple-600',
      amber: 'bg-amber-500',
      rose: 'bg-rose-500'
    };

    container.innerHTML = goals.map(g => {
      const barCls = g.isCompleted ? 'bg-emerald-500' : (barColors[g.color] || 'bg-blue-600');
      return `
        <div class="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl select-none shrink-0">
                  ${escapeHtml(g.icon || '🎯')}
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="text-sm font-extrabold text-slate-900 dark:text-white">${escapeHtml(g.name)}</h4>
                    ${g.isCompleted ? `<span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">🎉 ¡Lograda!</span>` : ''}
                  </div>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ${g.deadline ? `Meta para: <strong>${escapeHtml(g.deadline)}</strong>` : 'Sin fecha límite'}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <button type="button" onclick="WealthManager.openGoalModal('${escapeHtml(g.id)}')" class="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                  <i class="fa-solid fa-pen text-xs"></i>
                </button>
                <button type="button" onclick="WealthManager.deleteGoal('${escapeHtml(g.id)}')" class="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                  <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            </div>

            <div class="mt-4 space-y-1.5">
              <div class="flex items-baseline justify-between">
                <span class="text-lg font-black text-slate-900 dark:text-white">${formatMoney(g.currentAmount)}</span>
                <span class="text-xs font-bold text-slate-500 dark:text-slate-400">de ${formatMoney(g.targetAmount)} (${g.percent}%)</span>
              </div>
              <div class="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div class="h-2.5 rounded-full transition-all duration-500 ${barCls}" style="width: ${g.percent}%"></div>
              </div>
            </div>

            ${!g.isCompleted ? `
              <div class="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>Faltan: <strong>${formatMoney(g.remaining)}</strong></span>
                ${g.suggestedMonthly > 0 ? `<span class="text-blue-600 dark:text-blue-400 font-bold">Sugerido: ${formatMoney(g.suggestedMonthly)}/mes</span>` : ''}
              </div>
            ` : `
              <div class="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                ¡Felicidades! Has completado el 100% de esta meta financiera.
              </div>
            `}
          </div>

          <button 
            type="button" 
            onclick="WealthManager.openGoalContributeModal('${escapeHtml(g.id)}')"
            class="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <i class="fa-solid fa-coins"></i> Abonar a esta Alcancía
          </button>
        </div>
      `;
    }).join('');
  }

  function renderWalletsDetailGrid(wallets) {
    const container = document.getElementById('walletsDetailContainer');
    if (!container) return;

    container.innerHTML = wallets.map(w => `
      <div class="bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-2xl flex items-center justify-center select-none">
              ${escapeHtml(w.icon || '🏦')}
            </div>
            <div>
              <h4 class="text-sm font-extrabold text-slate-900 dark:text-white">${escapeHtml(w.name)}</h4>
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">${escapeHtml(w.type || 'cuenta')}</span>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button type="button" onclick="WealthManager.openWalletModal('${escapeHtml(w.id)}')" title="Editar cuenta" class="w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            ${!w.isDefault ? `
              <button type="button" onclick="WealthManager.deleteWallet('${escapeHtml(w.id)}')" title="Eliminar cuenta" class="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <div>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Saldo Disponible Actual</span>
          <div class="text-2xl font-black ${w.currentBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'} mt-0.5">
            ${formatMoney(w.currentBalance)}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 dark:border-slate-800 text-[11px]">
          <div>
            <span class="text-slate-400 block">Saldo Inicial</span>
            <strong class="text-slate-700 dark:text-slate-200">${formatMoney(w.initialBalance)}</strong>
          </div>
          <div class="text-right">
            <span class="text-slate-400 block">Movimientos</span>
            <strong class="text-slate-700 dark:text-slate-200">${w.txCount} registros</strong>
          </div>
        </div>

        <button type="button" onclick="WealthManager.openTransferModal('${escapeHtml(w.name)}')" class="w-full py-2 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-colors flex items-center justify-center gap-1.5">
          <i class="fa-solid fa-right-left text-[11px]"></i> Transferir desde esta cuenta
        </button>
      </div>
    `).join('');
  }

  // =========================================================================
  // 4. SAVINGS GOALS MODALS
  // =========================================================================
  function openGoalModal(goalId = null) {
    if (isDemoRestricted()) return;
    editingGoalId = goalId;
    const modal = document.getElementById('goalModal');
    const form = document.getElementById('goalForm');
    const title = document.getElementById('goalModalTitle');
    if (!modal || !form) return;

    form.reset();
    let icon = '🎯';

    if (goalId) {
      const g = Store.getGoalById(goalId);
      if (g) {
        if (title) title.textContent = 'Editar Meta de Ahorro';
        document.getElementById('goalNameInput').value = g.name;
        document.getElementById('goalTargetInput').value = g.targetAmount;
        document.getElementById('goalCurrentInput').value = g.currentAmount;
        document.getElementById('goalDeadlineInput').value = g.deadline || '';
        document.getElementById('goalColorSelect').value = g.color || 'blue';
        document.getElementById('goalNotesInput').value = g.notes || '';
        icon = g.icon || '🎯';
      }
    } else {
      if (title) title.textContent = 'Nueva Meta de Ahorro (Alcancía)';
      document.getElementById('goalCurrentInput').value = 0;
    }

    const iconInp = document.getElementById('goalIconInput');
    if (iconInp) iconInp.value = icon;
    document.querySelectorAll('.goal-icon-btn').forEach(btn => {
      const isSel = btn.textContent.trim() === icon;
      btn.className = isSel
        ? 'goal-icon-btn w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500 text-base flex items-center justify-center shrink-0'
        : 'goal-icon-btn w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent text-base flex items-center justify-center shrink-0';
    });

    const sym = Store.getSettings().currencySymbol || '$';
    modal.querySelectorAll('.currency-symbol-prefix').forEach(el => { el.textContent = sym; });

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeGoalModal() {
    editingGoalId = null;
    const modal = document.getElementById('goalModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function selectGoalIcon(btn, emoji) {
    const inp = document.getElementById('goalIconInput');
    if (inp) inp.value = emoji;
    document.querySelectorAll('.goal-icon-btn').forEach(b => {
      b.className = 'goal-icon-btn w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent text-base flex items-center justify-center shrink-0';
    });
    if (btn) {
      btn.className = 'goal-icon-btn w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500 text-base flex items-center justify-center shrink-0';
    }
  }

  function handleGoalSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isDemoRestricted()) return;

    const name = document.getElementById('goalNameInput')?.value.trim();
    const targetAmount = parseFloat(document.getElementById('goalTargetInput')?.value);
    const currentAmount = parseFloat(document.getElementById('goalCurrentInput')?.value) || 0;
    const deadline = document.getElementById('goalDeadlineInput')?.value || '';
    const color = document.getElementById('goalColorSelect')?.value || 'blue';
    const notes = document.getElementById('goalNotesInput')?.value.trim() || '';
    const icon = document.getElementById('goalIconInput')?.value || '🎯';

    if (!name || isNaN(targetAmount) || targetAmount <= 0) {
      App.showToast('Ingresa un nombre y un monto objetivo mayor a 0', 'warning');
      return;
    }

    if (editingGoalId) {
      Store.updateGoal(editingGoalId, { name, targetAmount, currentAmount, deadline, color, notes, icon });
      App.showToast('Meta de ahorro actualizada', 'success');
    } else {
      Store.addGoal({ name, targetAmount, currentAmount, deadline, color, notes, icon });
      App.showToast(`Meta "${name}" creada con éxito`, 'success');
    }

    closeGoalModal();
    App.refreshAllUI();
  }

  function deleteGoal(id) {
    if (isDemoRestricted()) return;
    if (!confirm('¿Deseas eliminar esta meta de ahorro?')) return;
    Store.deleteGoal(id);
    App.refreshAllUI();
    App.showToast('Meta eliminada', 'info');
  }

  function openGoalContributeModal(goalId) {
    if (isDemoRestricted()) return;
    const goal = Store.getGoalById(goalId);
    if (!goal) return;
    contributingGoalId = goalId;
    syncWalletSelectOptions();

    const modal = document.getElementById('goalContributeModal');
    const title = document.getElementById('goalContributeTitle');
    const subtitle = document.getElementById('goalContributeSubtitle');
    const amtInput = document.getElementById('goalContributeAmount');
    if (!modal) return;

    if (title) title.textContent = `${goal.icon || '🎯'} Abonar a: ${goal.name}`;
    if (subtitle) subtitle.textContent = `Llevas ${formatMoney(goal.currentAmount)} de ${formatMoney(goal.targetAmount)} (Faltan ${formatMoney(goal.remaining)})`;
    if (amtInput) amtInput.value = goal.suggestedMonthly > 0 ? Math.round(goal.suggestedMonthly) : '';

    const sym = Store.getSettings().currencySymbol || '$';
    modal.querySelectorAll('.currency-symbol-prefix').forEach(el => { el.textContent = sym; });

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeGoalContributeModal() {
    contributingGoalId = null;
    const modal = document.getElementById('goalContributeModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function handleGoalContributeSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isDemoRestricted() || !contributingGoalId) return;

    const amount = parseFloat(document.getElementById('goalContributeAmount')?.value);
    const walletName = document.getElementById('goalContributeWallet')?.value || 'Cuenta Bancaria';
    const recordExpense = !!document.getElementById('goalContributeDeductCheck')?.checked;

    if (isNaN(amount) || amount <= 0) {
      App.showToast('Ingresa un monto de abono válido mayor a 0', 'warning');
      return;
    }

    const updated = Store.contributeToGoal(contributingGoalId, amount, { walletName, recordExpense });
    closeGoalContributeModal();
    App.refreshAllUI();

    if (updated && updated.isCompleted) {
      App.showToast(`🎉 ¡Felicidades! Completaste al 100% tu meta "${updated.name}"`, 'success');
    } else {
      App.showToast(`¡Abono de ${formatMoney(amount)} sumado a tu meta!`, 'success');
    }
  }

  // =========================================================================
  // 5. DEBTS & LOANS ("ME DEBEN" vs "DEBO")
  // =========================================================================
  function setDebtFilter(filter) {
    activeDebtFilter = filter;
    document.querySelectorAll('.debt-filter-btn').forEach(btn => {
      const f = btn.getAttribute('data-debt-filter');
      btn.className = f === filter
        ? 'debt-filter-btn px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold transition-all'
        : 'debt-filter-btn px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 text-xs font-semibold transition-all';
    });
    renderDebtsList();
  }

  function renderDebtsList() {
    const container = document.getElementById('debtsListContainer');
    if (!container) return;

    let list = Store.getDebts();
    if (activeDebtFilter === 'me_deben') list = list.filter(d => d.direction === 'me_deben' && d.status !== 'Saldada');
    else if (activeDebtFilter === 'debo') list = list.filter(d => d.direction === 'debo' && d.status !== 'Saldada');
    else if (activeDebtFilter === 'saldadas') list = list.filter(d => d.status === 'Saldada');

    if (list.length === 0) {
      container.innerHTML = `
        <div class="p-10 text-center">
          <div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-2xl flex items-center justify-center">🤝</div>
          <h4 class="text-sm font-bold text-slate-900 dark:text-white">Sin préstamos ni deudas en este filtro</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Lleva el control exacto de quién te debe dinero o tus compras en cuotas.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(d => {
      const isOwedToMe = d.direction === 'me_deben';
      const isSettled = d.status === 'Saldada';
      const badgeCls = isSettled
        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
        : (isOwedToMe ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300');
      const badgeLabel = isSettled ? '✅ Saldada' : (isOwedToMe ? '🟢 Me deben (Por cobrar)' : '🔴 Debo (Por pagar)');

      return `
        <div class="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
          <div class="flex items-start gap-3.5 min-w-0 flex-1">
            <div class="w-11 h-11 rounded-2xl ${isOwedToMe ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-rose-50 dark:bg-rose-950/40'} flex items-center justify-center text-xl shrink-0">
              ${escapeHtml(d.icon || (isOwedToMe ? '🤝' : '💳'))}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-sm font-extrabold text-slate-900 dark:text-white">${escapeHtml(d.personName)}</h4>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeCls}">${badgeLabel}</span>
              </div>
              <p class="text-xs text-slate-600 dark:text-slate-300 mt-0.5">${escapeHtml(d.concept)} ${d.dueDate ? `• Vence: <strong>${escapeHtml(d.dueDate)}</strong>` : ''}</p>
              
              <div class="mt-2.5 max-w-md space-y-1">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-slate-500 dark:text-slate-400">Abonado: <strong>${formatMoney(d.paidAmount)}</strong> de ${formatMoney(d.totalAmount)}</span>
                  <span class="font-bold text-slate-700 dark:text-slate-200">${d.percent}%</span>
                </div>
                <div class="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div class="h-2 rounded-full ${isOwedToMe ? 'bg-emerald-500' : 'bg-rose-500'}" style="width: ${d.percent}%"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-slate-800">
            <div class="text-left md:text-right">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Saldo Pendiente</span>
              <span class="text-base font-black ${isSettled ? 'text-slate-400 line-through' : (isOwedToMe ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}">
                ${formatMoney(isSettled ? d.totalAmount : d.remaining)}
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              ${!isSettled ? `
                <button type="button" onclick="WealthManager.openDebtPaymentModal('${escapeHtml(d.id)}')" class="px-3 py-2 rounded-xl text-xs font-bold ${isOwedToMe ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-xs transition-all">
                  ${isOwedToMe ? 'Cobrar Abono' : 'Pagar Abono'}
                </button>
              ` : ''}
              <button type="button" onclick="WealthManager.openDebtModal('${escapeHtml(d.id)}')" class="w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                <i class="fa-solid fa-pen text-xs"></i>
              </button>
              <button type="button" onclick="WealthManager.deleteDebt('${escapeHtml(d.id)}')" class="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function openDebtModal(debtId = null, defaultDir = 'me_deben') {
    if (isDemoRestricted()) return;
    editingDebtId = debtId;
    const modal = document.getElementById('debtModal');
    const form = document.getElementById('debtForm');
    const title = document.getElementById('debtModalTitle');
    if (!modal || !form) return;

    form.reset();

    if (debtId) {
      const d = Store.getDebtById(debtId);
      if (d) {
        if (title) title.textContent = 'Editar Registro de Préstamo / Deuda';
        setDebtDirectionTab(d.direction);
        document.getElementById('debtPersonInput').value = d.personName;
        document.getElementById('debtConceptInput').value = d.concept;
        document.getElementById('debtTotalInput').value = d.totalAmount;
        document.getElementById('debtPaidInput').value = d.paidAmount;
        document.getElementById('debtDueDateInput').value = d.dueDate || '';
        document.getElementById('debtNotesInput').value = d.notes || '';
      }
    } else {
      if (title) title.textContent = 'Nuevo Préstamo o Deuda';
      setDebtDirectionTab(defaultDir);
      document.getElementById('debtPaidInput').value = 0;
    }

    const sym = Store.getSettings().currencySymbol || '$';
    modal.querySelectorAll('.currency-symbol-prefix').forEach(el => { el.textContent = sym; });

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeDebtModal() {
    editingDebtId = null;
    const modal = document.getElementById('debtModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function setDebtDirectionTab(dir) {
    const inp = document.getElementById('debtDirectionInput');
    const btnOwed = document.getElementById('debtTabMeDeben');
    const btnOwe = document.getElementById('debtTabDebo');
    if (inp) inp.value = dir;

    if (dir === 'me_deben') {
      if (btnOwed) btnOwed.className = 'flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-sm transition-all';
      if (btnOwe) btnOwe.className = 'flex-1 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-300 transition-all';
    } else {
      if (btnOwe) btnOwe.className = 'flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white shadow-sm transition-all';
      if (btnOwed) btnOwed.className = 'flex-1 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-300 transition-all';
    }
  }

  function handleDebtSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isDemoRestricted()) return;

    const direction = document.getElementById('debtDirectionInput')?.value || 'me_deben';
    const personName = document.getElementById('debtPersonInput')?.value.trim();
    const concept = document.getElementById('debtConceptInput')?.value.trim();
    const totalAmount = parseFloat(document.getElementById('debtTotalInput')?.value);
    const paidAmount = parseFloat(document.getElementById('debtPaidInput')?.value) || 0;
    const dueDate = document.getElementById('debtDueDateInput')?.value || '';
    const notes = document.getElementById('debtNotesInput')?.value.trim() || '';

    if (!personName || !concept || isNaN(totalAmount) || totalAmount <= 0) {
      App.showToast('Completa la persona/entidad, concepto y monto total válido', 'warning');
      return;
    }

    if (editingDebtId) {
      Store.updateDebt(editingDebtId, { direction, personName, concept, totalAmount, paidAmount, dueDate, notes });
      App.showToast('Registro actualizado con éxito', 'success');
    } else {
      Store.addDebt({ direction, personName, concept, totalAmount, paidAmount, dueDate, notes });
      App.showToast('Registro guardado en Préstamos y Deudas', 'success');
    }

    closeDebtModal();
    App.refreshAllUI();
  }

  function deleteDebt(id) {
    if (isDemoRestricted()) return;
    if (!confirm('¿Eliminar este registro de préstamo/deuda?')) return;
    Store.deleteDebt(id);
    App.refreshAllUI();
    App.showToast('Registro eliminado', 'info');
  }

  function openDebtPaymentModal(debtId) {
    if (isDemoRestricted()) return;
    const d = Store.getDebtById(debtId);
    if (!d) return;
    payingDebtId = debtId;
    syncWalletSelectOptions();

    const modal = document.getElementById('debtPaymentModal');
    const title = document.getElementById('debtPayModalTitle');
    const subtitle = document.getElementById('debtPayModalSubtitle');
    const amtInp = document.getElementById('debtPayAmountInput');
    if (!modal) return;

    const isOwedToMe = d.direction === 'me_deben';
    if (title) title.textContent = isOwedToMe ? `Cobrar abono de ${d.personName}` : `Registrar pago a ${d.personName}`;
    if (subtitle) subtitle.textContent = `${d.concept} • Saldo pendiente: ${formatMoney(d.remaining)}`;
    if (amtInp) {
      amtInp.value = d.remaining.toFixed(2);
      amtInp.max = d.remaining;
    }

    const sym = Store.getSettings().currencySymbol || '$';
    modal.querySelectorAll('.currency-symbol-prefix').forEach(el => { el.textContent = sym; });

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeDebtPaymentModal() {
    payingDebtId = null;
    const modal = document.getElementById('debtPaymentModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function handleDebtPaymentSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isDemoRestricted() || !payingDebtId) return;

    const amount = parseFloat(document.getElementById('debtPayAmountInput')?.value);
    const walletName = document.getElementById('debtPayWallet')?.value || 'Efectivo';
    const recordTransaction = !!document.getElementById('debtPayRecordTxCheck')?.checked;

    if (isNaN(amount) || amount <= 0) {
      App.showToast('Ingresa un monto de abono válido mayor a 0', 'warning');
      return;
    }

    const updated = Store.registerDebtPayment(payingDebtId, amount, { walletName, recordTransaction });
    closeDebtPaymentModal();
    App.refreshAllUI();

    if (updated && updated.status === 'Saldada') {
      App.showToast(`✅ ¡Cuenta con ${updated.personName} liquidada al 100%!`, 'success');
    } else {
      App.showToast(`Abono de ${formatMoney(amount)} registrado correctamente`, 'success');
    }
  }

  // =========================================================================
  // 6. CATEGORY BUDGETS TRAFFIC LIGHTS (SEMÁFORO VERDE / AMARILLO / ROJO)
  // =========================================================================
  function renderCategoryTrafficLights() {
    const items = Store.getCategoryTrafficLights();
    const expenseContainer = document.getElementById('categoryBudgetsTrafficContainer');
    const dashBanner = document.getElementById('dashboardCategoryTrafficSummary');

    // Dashboard alert strip if any category is yellow or red
    if (dashBanner) {
      const warningItems = items.filter(i => i.status === 'red' || i.status === 'yellow');
      if (warningItems.length === 0) {
        dashBanner.classList.add('hidden');
        dashBanner.innerHTML = '';
      } else {
        dashBanner.classList.remove('hidden');
        const hasRed = warningItems.some(i => i.status === 'red');
        dashBanner.innerHTML = `
          <div class="p-4 rounded-2xl border ${hasRed ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60' : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'} flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="text-xl">${hasRed ? '🔴' : '🟡'}</span>
              <div>
                <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Semáforo de Categorías: ${warningItems.length} ${warningItems.length === 1 ? 'categoría requiere' : 'categorías requieren'} atención
                </h4>
                <p class="text-xs text-slate-600 dark:text-slate-300">
                  ${warningItems.slice(0, 3).map(i => `<strong>${escapeHtml(i.category)}</strong> (${i.percent}%)`).join(' • ')}
                </p>
              </div>
            </div>
            <button type="button" onclick="App.switchView('gastos')" class="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 border border-gray-200 dark:border-slate-700 hover:border-blue-500 transition-colors shrink-0">
              Ver Semáforo
            </button>
          </div>
        `;
      }
    }

    if (!expenseContainer) return;

    if (items.length === 0) {
      expenseContainer.innerHTML = `
        <div class="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-gray-200 dark:border-slate-700">
          <p class="text-xs text-slate-600 dark:text-slate-300">
            No has configurado límites específicos por categoría todavía. Activa el semáforo para controlar topes en Alimentación, Transporte, Entretenimiento y más.
          </p>
          <button type="button" onclick="WealthManager.openCategoryBudgetsModal()" class="mt-3 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5">
            <i class="fa-solid fa-sliders"></i> Configurar Límites por Categoría
          </button>
        </div>
      `;
      return;
    }

    expenseContainer.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        ${items.map(item => {
          let dot = '🟢';
          let barCls = 'bg-emerald-500';
          let pillCls = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
          let statusTxt = `Disponible: ${formatMoney(item.remaining)}`;

          if (item.status === 'red') {
            dot = '🔴';
            barCls = 'bg-rose-500';
            pillCls = 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
            statusTxt = `Excedido por ${formatMoney(item.exceededBy)}`;
          } else if (item.status === 'yellow') {
            dot = '🟡';
            barCls = 'bg-amber-500';
            pillCls = 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
            statusTxt = `Cerca del tope (Quedan ${formatMoney(item.remaining)})`;
          }

          return `
            <div class="p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-extrabold text-slate-800 dark:text-slate-100">${dot} ${escapeHtml(item.category)}</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${pillCls}">${item.percent}%</span>
              </div>
              <div class="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-700 overflow-hidden">
                <div class="h-2 rounded-full transition-all duration-500 ${barCls}" style="width: ${item.barPercent}%"></div>
              </div>
              <div class="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                <span><strong>${formatMoney(item.spent)}</strong> / ${formatMoney(item.limit)}</span>
                <span class="font-semibold">${statusTxt}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function openCategoryBudgetsModal() {
    if (isDemoRestricted()) return;
    const modal = document.getElementById('categoryBudgetsModal');
    const container = document.getElementById('categoryBudgetsInputsList');
    if (!modal || !container) return;

    const currentLimits = Store.getCategoryBudgets();
    const sym = Store.getSettings().currencySymbol || '$';

    container.innerHTML = EXPENSE_CATEGORIES.map(cat => {
      const val = currentLimits[cat.name] || '';
      return `
        <div class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700/60">
          <label class="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <span class="text-base">${cat.icon}</span>
            <span>${escapeHtml(cat.name)}</span>
          </label>
          <div class="relative w-36">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">${escapeHtml(sym)}</span>
            <input 
              type="number" 
              step="10" 
              min="0" 
              data-cat-budget="${escapeHtml(cat.name)}"
              value="${val}" 
              placeholder="Sin límite"
              class="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>
      `;
    }).join('');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function closeCategoryBudgetsModal() {
    const modal = document.getElementById('categoryBudgetsModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function handleCategoryBudgetsSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isDemoRestricted()) return;

    const inputs = document.querySelectorAll('[data-cat-budget]');
    const nextLimits = {};
    inputs.forEach(inp => {
      const cat = inp.getAttribute('data-cat-budget');
      const v = parseFloat(inp.value);
      if (cat && !isNaN(v) && v > 0) {
        nextLimits[cat] = v;
      }
    });

    Store.setCategoryBudgets(nextLimits);
    closeCategoryBudgetsModal();
    App.refreshAllUI();
    App.showToast('Semáforo de presupuestos por categoría actualizado', 'success');
  }

  // =========================================================================
  // 7. EXECUTIVE MONTHLY PDF STATEMENT GENERATOR
  // =========================================================================
  function exportMonthlyPDF() {
    const now = new Date();
    let month = now.getMonth();
    let year = now.getFullYear();

    const monthInputVal = document.getElementById('pdfReportMonthInput')?.value || '';
    if (/^\d{4}-\d{2}$/.test(monthInputVal)) {
      const [yStr, mStr] = monthInputVal.split('-');
      year = parseInt(yStr, 10);
      month = parseInt(mStr, 10) - 1;
    }

    const refDate = new Date(year, month, 1);
    const monthLabel = refDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    const settings = Store.getSettings();
    const user = Store.getCurrentUser() || { name: settings.userName || 'Usuario FinStack', email: settings.userEmail || '' };
    const stats = Store.getKPIStats(month, year);
    const wallets = Store.getWalletsWithBalances();
    const traffic = Store.getCategoryTrafficLights(month, year);
    const goalsList = Store.getGoals();
    const goalsSummary = Store.getGoalsSummary();
    const monthTxs = Store.getFiltered({ month, year });

    const reportHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Estado de Cuenta FinStack Pro - ${escapeHtml(monthLabel)}</title>
  <style>
    * { box-sizing: border-box; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 32px; color: #0F172A; background: #FFFFFF; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563EB; padding-bottom: 16px; margin-bottom: 22px; }
    .brand { font-size: 22px; font-weight: 900; color: #1E3A8A; letter-spacing: -0.5px; }
    .brand span { background: #DBEAFE; color: #1D4ED8; font-size: 11px; padding: 2px 7px; border-radius: 6px; vertical-align: middle; margin-left: 6px; }
    .meta { text-align: right; color: #475569; font-size: 11px; line-height: 1.5; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px; }
    .kpi-box { border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px 14px; background: #F8FAFC; }
    .kpi-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748B; }
    .kpi-val { font-size: 17px; font-weight: 900; margin-top: 4px; color: #0F172A; }
    .inc { color: #059669; }
    .exp { color: #E11D48; }
    h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.4px; color: #1E293B; border-left: 4px solid #2563EB; padding-left: 8px; margin: 20px 0 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    th { background: #F1F5F9; color: #334155; font-size: 10px; text-transform: uppercase; text-align: left; padding: 8px 10px; border-bottom: 1px solid #CBD5E1; }
    td { padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 11px; }
    .right { text-align: right; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #64748B; display: flex; justify-content: space-between; }
    @media print { body { padding: 12px; } .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px; padding:10px 14px; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">
    <span style="font-weight:700; color:#1E40AF;">📄 Vista previa lista: elige "Guardar como PDF" en el cuadro de impresión.</span>
    <button onclick="window.print()" style="background:#2563EB; color:#FFF; border:none; padding:7px 14px; border-radius:8px; font-weight:700; cursor:pointer;">Imprimir / Guardar PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="brand">FinStack Pro <span>v2.0</span></div>
      <div style="color:#64748B; font-size:11px; margin-top:3px;">Estado de Cuenta Ejecutivo — <strong style="text-transform:capitalize;">${escapeHtml(monthLabel)}</strong></div>
    </div>
    <div class="meta">
      <div><strong>Titular:</strong> ${escapeHtml(user.name)}</div>
      <div><strong>Correo:</strong> ${escapeHtml(user.email || '—')}</div>
      <div><strong>Moneda:</strong> ${escapeHtml(settings.currency || 'USD')} (${escapeHtml(settings.currencySymbol || '$')}) • <strong>Fecha:</strong> ${now.toLocaleDateString('es-ES')}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">Patrimonio / Balance Total</div>
      <div class="kpi-val">${formatMoney(stats.allTimeBalance)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Ingresos del Mes</div>
      <div class="kpi-val inc">+${formatMoney(stats.totalIncome)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Gastos del Mes</div>
      <div class="kpi-val exp">-${formatMoney(stats.totalExpense)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">Ahorro Neto (${stats.savingsRate}%)</div>
      <div class="kpi-val">${formatMoney(stats.netSavings)}</div>
    </div>
  </div>

  <h3>Saldos por Cuenta / Billetera</h3>
  <table>
    <thead>
      <tr><th>Cuenta</th><th>Tipo</th><th class="right">Saldo Inicial</th><th class="right">Movimientos</th><th class="right">Saldo Actual</th></tr>
    </thead>
    <tbody>
      ${wallets.map(w => `
        <tr>
          <td><strong>${escapeHtml(w.icon || '')} ${escapeHtml(w.name)}</strong></td>
          <td>${escapeHtml(w.type || 'cuenta')}</td>
          <td class="right">${formatMoney(w.initialBalance)}</td>
          <td class="right">${w.txCount}</td>
          <td class="right"><strong>${formatMoney(w.currentBalance)}</strong></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${traffic.length > 0 ? `
    <h3>Semáforo de Presupuestos por Categoría</h3>
    <table>
      <thead>
        <tr><th>Categoría</th><th class="right">Gastado</th><th class="right">Límite Mensual</th><th class="right">% Consumo</th><th>Estado</th></tr>
      </thead>
      <tbody>
        ${traffic.map(t => `
          <tr>
            <td><strong>${escapeHtml(t.category)}</strong></td>
            <td class="right">${formatMoney(t.spent)}</td>
            <td class="right">${formatMoney(t.limit)}</td>
            <td class="right"><strong>${t.percent}%</strong></td>
            <td>${t.status === 'red' ? '🔴 Excedido' : (t.status === 'yellow' ? '🟡 Precaución' : '🟢 Saludable')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  ${goalsList.length > 0 ? `
    <h3>Metas de Ahorro (Alcancías)</h3>
    <table>
      <thead>
        <tr><th>Meta</th><th class="right">Acumulado</th><th class="right">Objetivo</th><th class="right">Avance</th><th>Fecha Meta</th></tr>
      </thead>
      <tbody>
        ${goalsList.map(g => `
          <tr>
            <td><strong>${escapeHtml(g.icon || '🎯')} ${escapeHtml(g.name)}</strong></td>
            <td class="right">${formatMoney(g.currentAmount)}</td>
            <td class="right">${formatMoney(g.targetAmount)}</td>
            <td class="right"><strong>${g.percent}%</strong></td>
            <td>${escapeHtml(g.deadline || 'Abierta')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <h3>Detalle de Movimientos del Mes (${monthTxs.length})</h3>
  <table>
    <thead>
      <tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Cuenta / Método</th><th class="right">Monto</th></tr>
    </thead>
    <tbody>
      ${monthTxs.length === 0 ? `<tr><td colspan="5" style="text-align:center; color:#64748B; padding:16px;">No hay transacciones registradas en este mes.</td></tr>` : monthTxs.map(tx => {
        const sign = tx.type === 'ingreso' ? '+' : (tx.type === 'gasto' ? '-' : '⇄ ');
        const cls = tx.type === 'ingreso' ? 'inc' : (tx.type === 'gasto' ? 'exp' : '');
        return `
          <tr>
            <td>${escapeHtml(tx.date)}</td>
            <td><strong>${escapeHtml(tx.concept)}</strong></td>
            <td>${escapeHtml(tx.category)}</td>
            <td>${escapeHtml(tx.paymentMethod)}</td>
            <td class="right ${cls}"><strong>${sign}${formatMoney(tx.amount)}</strong></td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    <span>Generado por FinStack Pro • Metas ahorradas: ${formatMoney(goalsSummary.totalSaved)}</span>
    <span>Documento confidencial para uso personal del titular</span>
  </div>

  <script>
    window.onload = function () { setTimeout(function () { window.print(); }, 250); };
  <\/script>
</body>
</html>`;

    const win = typeof window !== 'undefined' && typeof window.open === 'function' ? window.open('', '_blank') : null;
    if (win && win.document) {
      win.document.open();
      win.document.write(reportHtml);
      win.document.close();
      if (window.App) App.showToast('Estado de Cuenta PDF generado. Elige "Guardar como PDF" al imprimir.', 'success');
    } else if (typeof document !== 'undefined') {
      // Fallback via hidden iframe if popup blocker is active
      let iframe = document.getElementById('pdfPrintFallbackFrame');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'pdfPrintFallbackFrame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }
      if (iframe.contentWindow && iframe.contentWindow.document) {
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(reportHtml);
        iframe.contentWindow.document.close();
      }
    }
  }

  return {
    init,
    refreshAll,
    triggerInstallApp,
    syncWalletSelectOptions,
    switchTab,
    openWalletModal,
    closeWalletModal,
    selectWalletIcon,
    handleWalletSubmit,
    deleteWallet,
    openTransferModal,
    closeTransferModal,
    handleTransferSubmit,
    openGoalModal,
    closeGoalModal,
    selectGoalIcon,
    handleGoalSubmit,
    deleteGoal,
    openGoalContributeModal,
    closeGoalContributeModal,
    handleGoalContributeSubmit,
    setDebtFilter,
    openDebtModal,
    closeDebtModal,
    setDebtDirectionTab,
    handleDebtSubmit,
    deleteDebt,
    openDebtPaymentModal,
    closeDebtPaymentModal,
    handleDebtPaymentSubmit,
    openCategoryBudgetsModal,
    closeCategoryBudgetsModal,
    handleCategoryBudgetsSubmit,
    exportMonthlyPDF
  };
})();

if (typeof window !== 'undefined') {
  window.WealthManager = WealthManager;
}
