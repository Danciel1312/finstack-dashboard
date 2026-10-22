/**
 * DashFinance - Interactive Historical Calendar Module
 * Provides full monthly calendar navigation, daily activity chips (income/expense),
 * and an interactive Day Inspector Panel for transaction tracking.
 */

const CalendarManager = (function () {
  let currentDate = new Date();
  let selectedDateStr = formatDateISO(new Date());

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNamesShort = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatMoney(amount) {
    const settings = Store.getSettings();
    return `${settings.currencySymbol || '$'}${Number(amount).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function formatMoneyCompact(amount) {
    const settings = Store.getSettings();
    if (amount >= 1000) {
      return `${settings.currencySymbol || '$'}${(amount / 1000).toFixed(1)}k`;
    }
    return `${settings.currencySymbol || '$'}${Math.round(amount)}`;
  }

  /**
   * Render the Calendar Month Grid and Day Inspector
   */
  function render() {
    const calendarGridEl = document.getElementById('calendarDaysGrid');
    const currentMonthLabelEl = document.getElementById('calendarCurrentMonth');
    const monthStatsEl = document.getElementById('calendarMonthSummary');
    if (!calendarGridEl) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (currentMonthLabelEl) {
      currentMonthLabelEl.textContent = `${monthNames[month]} ${year}`;
    }

    // Days in current month & first day index (0 = Monday, 6 = Sunday)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Convert JS Sunday=0 to Monday=0
    const startOffset = (firstDayIndex + 6) % 7;
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

    const todayISO = formatDateISO(new Date());
    let html = '';

    let monthTotalIncome = 0;
    let monthTotalExpense = 0;

    // 1. Previous Month Filler Cells
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = totalDaysInPrevMonth - i;
      html += `
        <div class="calendar-day-cell p-2 border border-dashed border-gray-100 dark:border-slate-800/60 bg-gray-50/50 dark:bg-slate-900/30 text-gray-400 dark:text-slate-600 rounded-xl select-none cursor-not-allowed">
          <div class="text-xs font-medium">${dayNum}</div>
        </div>
      `;
    }

    // 2. Current Month Days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const thisDate = new Date(year, month, day);
      const dateStr = formatDateISO(thisDate);
      const isToday = dateStr === todayISO;
      const isSelected = dateStr === selectedDateStr;

      // Fetch transactions for this specific day
      const dayTxs = Store.getByDate(dateStr);
      let dayIncome = 0;
      let dayExpense = 0;

      dayTxs.forEach(tx => {
        if (tx.type === 'ingreso') {
          dayIncome += tx.amount;
          monthTotalIncome += tx.amount;
        } else {
          dayExpense += tx.amount;
          monthTotalExpense += tx.amount;
        }
      });

      const hasActivity = dayTxs.length > 0;

      html += `
        <div 
          onclick="CalendarManager.selectDate('${dateStr}')" 
          class="calendar-day-cell relative p-2 md:p-2.5 rounded-xl border ${
            isSelected 
              ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/20 shadow-sm ring-2 ring-blue-500/20' 
              : 'border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-blue-400 dark:hover:border-blue-500'
          } cursor-pointer flex flex-col justify-between transition-all group"
          data-date="${dateStr}"
        >
          <!-- Top Row: Day number & Today indicator -->
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold ${
              isToday 
                ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm' 
                : isSelected
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'
            }">
              ${day}
            </span>
            ${hasActivity ? `
              <span class="w-2 h-2 rounded-full ${dayIncome > dayExpense ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
            ` : ''}
          </div>

          <!-- Activity Chips / Badges -->
          <div class="space-y-1 mt-auto">
            ${dayIncome > 0 ? `
              <div class="flex items-center justify-between px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold leading-tight truncate">
                <span class="truncate">+$${formatMoneyCompact(dayIncome).replace('$', '')}</span>
                <i class="fa-solid fa-arrow-trend-up text-[9px] ml-0.5"></i>
              </div>
            ` : ''}

            ${dayExpense > 0 ? `
              <div class="flex items-center justify-between px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-[10px] font-semibold leading-tight truncate">
                <span class="truncate">-$${formatMoneyCompact(dayExpense).replace('$', '')}</span>
                <i class="fa-solid fa-arrow-trend-down text-[9px] ml-0.5"></i>
              </div>
            ` : ''}

            ${!hasActivity ? `
              <div class="hidden md:block h-3"></div>
            ` : ''}
          </div>
        </div>
      `;
    }

    // 3. Next Month Filler Cells to complete 35 or 42 grid
    const totalCells = startOffset + totalDaysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= remainingCells; day++) {
      html += `
        <div class="calendar-day-cell p-2 border border-dashed border-gray-100 dark:border-slate-800/60 bg-gray-50/50 dark:bg-slate-900/30 text-gray-400 dark:text-slate-600 rounded-xl select-none cursor-not-allowed">
          <div class="text-xs font-medium">${day}</div>
        </div>
      `;
    }

    calendarGridEl.innerHTML = html;

    // Update Month Stats header if exists
    if (monthStatsEl) {
      const monthBalance = monthTotalIncome - monthTotalExpense;
      monthStatsEl.innerHTML = `
        <div class="flex items-center gap-4 text-xs font-medium">
          <div class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            Ingresos: <span class="font-bold">${formatMoney(monthTotalIncome)}</span>
          </div>
          <div class="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            Gastos: <span class="font-bold">${formatMoney(monthTotalExpense)}</span>
          </div>
          <div class="hidden sm:flex items-center gap-1.5 ${monthBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}">
            Balance: <span class="font-bold">${formatMoney(monthBalance)}</span>
          </div>
        </div>
      `;
    }

    // Render the Daily Inspector Panel for the selected date
    renderDayInspector(selectedDateStr);
  }

  /**
   * Render the Day Inspector Panel (List of transactions for the clicked day)
   */
  function renderDayInspector(dateStr) {
    const inspectorContainer = document.getElementById('calendarDayInspector');
    if (!inspectorContainer) return;

    // Parse date safely
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateLabel = dateObj.toLocaleDateString('es-ES', options);
    // Capitalize first letter
    const formattedDateTitle = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

    const txs = Store.getByDate(dateStr);
    let dayIncome = 0;
    let dayExpense = 0;

    txs.forEach(tx => {
      if (tx.type === 'ingreso') dayIncome += tx.amount;
      else dayExpense += tx.amount;
    });

    const dayBalance = dayIncome - dayExpense;

    let itemsHtml = '';
    if (txs.length === 0) {
      itemsHtml = `
        <div class="py-12 px-4 text-center">
          <div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center text-2xl">
            <i class="fa-regular fa-calendar-xmark"></i>
          </div>
          <h4 class="text-sm font-semibold text-slate-800 dark:text-slate-200">Sin movimientos en esta fecha</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            No se realizaron compras ni ingresos el ${day} de ${monthNames[month - 1]}.
          </p>
          <button 
            onclick="App.openTransactionModal('gasto', '${dateStr}')" 
            class="mt-4 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
          >
            <i class="fa-solid fa-plus"></i> Registrar en este día
          </button>
        </div>
      `;
    } else {
      itemsHtml = `
        <div class="divide-y divide-gray-100 dark:divide-slate-800/80">
          ${txs.map(tx => {
            const isInc = tx.type === 'ingreso';
            return `
              <div class="py-3 px-3.5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl transition-colors group">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center ${
                    isInc 
                      ? 'bg-emerald-100/70 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400' 
                      : 'bg-rose-100/70 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  }">
                    <i class="fa-solid ${isInc ? 'fa-arrow-down-left' : 'fa-arrow-up-right'} text-sm"></i>
                  </div>
                  <div>
                    <h5 class="text-xs font-bold text-slate-800 dark:text-slate-100">${escapeHtml(tx.concept)}</h5>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                        isInc 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                      }">
                        ${escapeHtml(tx.category)}
                      </span>
                      <span class="text-[10px] text-slate-600 dark:text-slate-300">
                        <i class="fa-regular fa-credit-card text-[9px] mr-1"></i>${escapeHtml(tx.paymentMethod)}
                      </span>
                    </div>
                    ${tx.notes ? `
                      <p class="text-[11px] text-slate-600 dark:text-slate-300 italic mt-0.5">${escapeHtml(tx.notes)}</p>
                    ` : ''}
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <span class="text-xs font-bold ${
                    isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }">
                    ${isInc ? '+' : '-'}${formatMoney(tx.amount)}
                  </span>
                  
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onclick="App.editTransaction('${tx.id}')" 
                      title="Editar" 
                      class="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                    >
                      <i class="fa-solid fa-pen text-xs"></i>
                    </button>
                    <button 
                      onclick="App.confirmDeleteTransaction('${tx.id}')" 
                      title="Eliminar" 
                      class="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                    >
                      <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    inspectorContainer.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 md:p-5 flex flex-col h-full">
        <!-- Inspector Header -->
        <div class="flex items-center justify-between pb-3.5 border-b border-gray-100 dark:border-slate-800">
          <div>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Historial Diario</span>
            <h3 class="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100">${formattedDateTitle}</h3>
          </div>
          <button 
            onclick="App.openTransactionModal('gasto', '${dateStr}')" 
            class="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 transition-colors flex items-center gap-1.5"
          >
            <i class="fa-solid fa-plus text-[10px]"></i> Añadir
          </button>
        </div>

        <!-- Daily Mini Stat Badges -->
        <div class="grid grid-cols-3 gap-2 py-3 border-b border-gray-100 dark:border-slate-800 text-center">
          <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">Ingresos</span>
            <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">${formatMoney(dayIncome)}</span>
          </div>
          <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">Gastos</span>
            <span class="text-xs font-bold text-rose-600 dark:text-rose-400">${formatMoney(dayExpense)}</span>
          </div>
          <div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">Balance</span>
            <span class="text-xs font-bold ${dayBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}">
              ${formatMoney(dayBalance)}
            </span>
          </div>
        </div>

        <!-- Transactions List -->
        <div class="mt-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
          ${itemsHtml}
        </div>
      </div>
    `;
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

  return {
    init: function () {
      selectedDateStr = formatDateISO(new Date());
      render();
    },

    nextMonth: function () {
      currentDate.setMonth(currentDate.getMonth() + 1);
      render();
    },

    prevMonth: function () {
      currentDate.setMonth(currentDate.getMonth() - 1);
      render();
    },

    goToToday: function () {
      currentDate = new Date();
      selectedDateStr = formatDateISO(new Date());
      render();
    },

    selectDate: function (dateStr) {
      selectedDateStr = dateStr;
      render();
    },

    refresh: function () {
      render();
    },

    getSelectedDate: function () {
      return selectedDateStr;
    }
  };
})();

if (typeof window !== 'undefined') {
  window.CalendarManager = CalendarManager;
}
