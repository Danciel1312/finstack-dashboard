/**
 * DashFinance - Store & State Management
 * Persistent localStorage handler, data calculations and sample seed generator.
 */

const Store = (function () {
  const STORAGE_KEY_TX = 'finstack_transactions_v2';
  const STORAGE_KEY_SETTINGS = 'finstack_settings_v2';

  const defaultSettings = {
    theme: 'light',
    currency: 'USD',
    currencySymbol: '$',
    monthlyBudget: 3500,
    userName: 'Dany Ramos',
    userRole: 'Senior Dev / Pro Admin'
  };

  // Helper to format ISO date string (YYYY-MM-DD)
  function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Pre-seed realistic transactions relative to current date
  function generateSeedData() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    const sampleData = [
      {
        id: 'tx_seed_1',
        type: 'ingreso',
        concept: 'Pago Nómina Empresa Tech',
        amount: 3850.00,
        category: 'Salario',
        date: formatDateISO(new Date(y, m, 1)),
        paymentMethod: 'Transferencia',
        notes: 'Depósito quincenal de nómina',
        createdAt: new Date(y, m, 1, 9, 0).toISOString()
      },
      {
        id: 'tx_seed_2',
        type: 'gasto',
        concept: 'Alquiler Departamento',
        amount: 950.00,
        category: 'Vivienda',
        date: formatDateISO(new Date(y, m, 2)),
        paymentMethod: 'Transferencia',
        notes: 'Pago mensual renta departamento',
        createdAt: new Date(y, m, 2, 10, 30).toISOString()
      },
      {
        id: 'tx_seed_3',
        type: 'gasto',
        concept: 'Supermercado Mensual Fresko',
        amount: 245.80,
        category: 'Alimentación',
        date: formatDateISO(new Date(y, m, 3)),
        paymentMethod: 'Tarjeta Débito',
        notes: 'Despensa y artículos para el hogar',
        createdAt: new Date(y, m, 3, 16, 20).toISOString()
      },
      {
        id: 'tx_seed_4',
        type: 'gasto',
        concept: 'Servicios de Internet & Móvil',
        amount: 68.50,
        category: 'Servicios',
        date: formatDateISO(new Date(y, m, 5)),
        paymentMethod: 'Tarjeta Crédito',
        notes: 'Fibra óptica 600mb y plan celular',
        createdAt: new Date(y, m, 5, 11, 0).toISOString()
      },
      {
        id: 'tx_seed_5',
        type: 'ingreso',
        concept: 'Proyecto Freelance Frontend Dashboard',
        amount: 1450.00,
        category: 'Freelance',
        date: formatDateISO(new Date(y, m, 8)),
        paymentMethod: 'Transferencia',
        notes: 'Entrega hito 1 cliente internacional',
        createdAt: new Date(y, m, 8, 14, 15).toISOString()
      },
      {
        id: 'tx_seed_6',
        type: 'gasto',
        concept: 'Gasolina y Cargas Vehículo',
        amount: 55.00,
        category: 'Transporte',
        date: formatDateISO(new Date(y, m, 10)),
        paymentMethod: 'Tarjeta Débito',
        notes: 'Tanque lleno estación Shell',
        createdAt: new Date(y, m, 10, 8, 45).toISOString()
      },
      {
        id: 'tx_seed_7',
        type: 'gasto',
        concept: 'Cena Restaurante La Toscana',
        amount: 92.40,
        category: 'Alimentación',
        date: formatDateISO(new Date(y, m, 12)),
        paymentMethod: 'Tarjeta Crédito',
        notes: 'Cena familiar fin de semana',
        createdAt: new Date(y, m, 12, 21, 30).toISOString()
      },
      {
        id: 'tx_seed_8',
        type: 'gasto',
        concept: 'Membresía Gimnasio SmartFit',
        amount: 39.99,
        category: 'Salud',
        date: formatDateISO(new Date(y, m, 14)),
        paymentMethod: 'Tarjeta Débito',
        notes: 'Plan Black mensual',
        createdAt: new Date(y, m, 14, 7, 0).toISOString()
      },
      {
        id: 'tx_seed_9',
        type: 'ingreso',
        concept: 'Segunda Quincena Nómina',
        amount: 3850.00,
        category: 'Salario',
        date: formatDateISO(new Date(y, m, 15)),
        paymentMethod: 'Transferencia',
        notes: 'Depósito quincenal nómina',
        createdAt: new Date(y, m, 15, 9, 0).toISOString()
      },
      {
        id: 'tx_seed_10',
        type: 'gasto',
        concept: 'Suscripciones Streaming & Cloud',
        amount: 32.50,
        category: 'Entretenimiento',
        date: formatDateISO(new Date(y, m, 16)),
        paymentMethod: 'Tarjeta Crédito',
        notes: 'Netflix, Spotify, GitHub Pro',
        createdAt: new Date(y, m, 16, 12, 0).toISOString()
      },
      {
        id: 'tx_seed_11',
        type: 'ingreso',
        concept: 'Rendimientos Fondos Indexados S&P500',
        amount: 310.25,
        category: 'Inversiones',
        date: formatDateISO(new Date(y, m, Math.max(1, d - 2))),
        paymentMethod: 'Transferencia',
        notes: 'Dividendos y revalorización mensual',
        createdAt: new Date(y, m, Math.max(1, d - 2), 17, 30).toISOString()
      },
      {
        id: 'tx_seed_12',
        type: 'gasto',
        concept: 'Farmacia & Vitaminas',
        amount: 48.00,
        category: 'Salud',
        date: formatDateISO(new Date(y, m, Math.max(1, d - 1))),
        paymentMethod: 'Tarjeta Débito',
        notes: 'Suplementos y botiquín',
        createdAt: new Date(y, m, Math.max(1, d - 1), 18, 0).toISOString()
      },
      {
        id: 'tx_seed_13',
        type: 'gasto',
        concept: 'Cafetería & Snacks Trabajo',
        amount: 14.50,
        category: 'Alimentación',
        date: formatDateISO(now),
        paymentMethod: 'Efectivo',
        notes: 'Café de especialidad y croissant',
        createdAt: new Date(y, m, d, 10, 15).toISOString()
      },
      {
        id: 'tx_seed_14',
        type: 'ingreso',
        concept: 'Asesoría Técnica Remota',
        amount: 450.00,
        category: 'Freelance',
        date: formatDateISO(now),
        paymentMethod: 'Transferencia',
        notes: 'Auditoría de arquitectura web 3h',
        createdAt: new Date(y, m, d, 11, 45).toISOString()
      },
      // Previous month sample for trend comparisons
      {
        id: 'tx_seed_prev_1',
        type: 'ingreso',
        concept: 'Nómina Mes Anterior',
        amount: 7200.00,
        category: 'Salario',
        date: formatDateISO(new Date(y, m - 1, 15)),
        paymentMethod: 'Transferencia',
        notes: 'Salario completo mes pasado',
        createdAt: new Date(y, m - 1, 15, 9, 0).toISOString()
      },
      {
        id: 'tx_seed_prev_2',
        type: 'gasto',
        concept: 'Gastos Globales Mes Anterior',
        amount: 2280.00,
        category: 'Vivienda',
        date: formatDateISO(new Date(y, m - 1, 20)),
        paymentMethod: 'Tarjeta Débito',
        notes: 'Resumen consolidado mes anterior',
        createdAt: new Date(y, m - 1, 20, 18, 0).toISOString()
      }
    ];

    return sampleData;
  }

  // Load from LocalStorage
  function loadTransactions() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_TX);
      if (!data) {
        const seed = generateSeedData();
        saveTransactions(seed);
        return seed;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading transactions from localStorage:', e);
      return generateSeedData();
    }
  }

  // Save to LocalStorage
  function saveTransactions(transactions) {
    try {
      localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
    } catch (e) {
      console.error('Error saving transactions to localStorage:', e);
    }
  }

  // Load Settings
  function loadSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (!data) return { ...defaultSettings };
      return { ...defaultSettings, ...JSON.parse(data) };
    } catch (e) {
      return { ...defaultSettings };
    }
  }

  // Save Settings
  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }

  return {
    getAll: function () {
      return loadTransactions().sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    getById: function (id) {
      const list = loadTransactions();
      return list.find(item => item.id === id) || null;
    },

    add: function (txData) {
      const list = loadTransactions();
      const newTx = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        type: txData.type || 'gasto',
        concept: txData.concept.trim(),
        amount: parseFloat(txData.amount) || 0,
        category: txData.category || 'Otros',
        date: txData.date || formatDateISO(new Date()),
        paymentMethod: txData.paymentMethod || 'Efectivo',
        notes: (txData.notes || '').trim(),
        createdAt: new Date().toISOString()
      };
      list.unshift(newTx);
      saveTransactions(list);
      return newTx;
    },

    update: function (id, updatedData) {
      const list = loadTransactions();
      const index = list.findIndex(item => item.id === id);
      if (index === -1) return null;

      list[index] = {
        ...list[index],
        type: updatedData.type || list[index].type,
        concept: updatedData.concept !== undefined ? updatedData.concept.trim() : list[index].concept,
        amount: updatedData.amount !== undefined ? parseFloat(updatedData.amount) : list[index].amount,
        category: updatedData.category || list[index].category,
        date: updatedData.date || list[index].date,
        paymentMethod: updatedData.paymentMethod || list[index].paymentMethod,
        notes: updatedData.notes !== undefined ? updatedData.notes.trim() : list[index].notes,
        updatedAt: new Date().toISOString()
      };

      saveTransactions(list);
      return list[index];
    },

    remove: function (id) {
      let list = loadTransactions();
      const initialLength = list.length;
      list = list.filter(item => item.id !== id);
      saveTransactions(list);
      return list.length < initialLength;
    },

    getByDate: function (dateStr) {
      const list = loadTransactions();
      return list.filter(item => item.date === dateStr);
    },

    getFiltered: function (filters = {}) {
      let list = loadTransactions();

      if (filters.type && filters.type !== 'todos') {
        list = list.filter(item => item.type === filters.type);
      }

      if (filters.category && filters.category !== 'todas') {
        list = list.filter(item => item.category.toLowerCase() === filters.category.toLowerCase());
      }

      if (filters.search) {
        const query = filters.search.toLowerCase();
        list = list.filter(item =>
          item.concept.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          (item.notes && item.notes.toLowerCase().includes(query)) ||
          item.amount.toString().includes(query)
        );
      }

      if (filters.month !== undefined && filters.year !== undefined) {
        list = list.filter(item => {
          const d = new Date(item.date + 'T00:00:00');
          return d.getMonth() === filters.month && d.getFullYear() === filters.year;
        });
      }

      return list.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    getKPIStats: function (targetMonth = null, targetYear = null) {
      const now = new Date();
      const currentMonth = targetMonth !== null ? targetMonth : now.getMonth();
      const currentYear = targetYear !== null ? targetYear : now.getFullYear();

      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const list = loadTransactions();

      let totalIncome = 0;
      let totalExpense = 0;
      let prevTotalIncome = 0;
      let prevTotalExpense = 0;

      list.forEach(tx => {
        const txDate = new Date(tx.date + 'T00:00:00');
        const m = txDate.getMonth();
        const y = txDate.getFullYear();

        if (m === currentMonth && y === currentYear) {
          if (tx.type === 'ingreso') totalIncome += tx.amount;
          else totalExpense += tx.amount;
        } else if (m === prevMonth && y === prevYear) {
          if (tx.type === 'ingreso') prevTotalIncome += tx.amount;
          else prevTotalExpense += tx.amount;
        }
      });

      const netSavings = totalIncome - totalExpense;
      const prevNetSavings = prevTotalIncome - prevTotalExpense;
      const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

      // Calculate percentage trends vs previous month
      const incomeGrowth = prevTotalIncome > 0 
        ? (((totalIncome - prevTotalIncome) / prevTotalIncome) * 100).toFixed(1) 
        : '+0.0';
      const expenseGrowth = prevTotalExpense > 0 
        ? (((totalExpense - prevTotalExpense) / prevTotalExpense) * 100).toFixed(1) 
        : '+0.0';

      // All-time balance
      let allTimeBalance = 0;
      let allTimeIncome = 0;
      let allTimeExpense = 0;
      list.forEach(tx => {
        if (tx.type === 'ingreso') {
          allTimeBalance += tx.amount;
          allTimeIncome += tx.amount;
        } else {
          allTimeBalance -= tx.amount;
          allTimeExpense += tx.amount;
        }
      });

      return {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        incomeGrowth,
        expenseGrowth,
        allTimeBalance,
        allTimeIncome,
        allTimeExpense,
        transactionCount: list.length
      };
    },

    getCategoryTotals: function (type = 'gasto', month = null, year = null) {
      const list = loadTransactions();
      const totals = {};

      list.forEach(tx => {
        if (tx.type !== type) return;

        if (month !== null && year !== null) {
          const d = new Date(tx.date + 'T00:00:00');
          if (d.getMonth() !== month || d.getFullYear() !== year) return;
        }

        const cat = tx.category || 'Otros';
        totals[cat] = (totals[cat] || 0) + tx.amount;
      });

      return totals;
    },

    getCashFlowChartData: function (days = 30) {
      const list = loadTransactions();
      const now = new Date();
      const labels = [];
      const incomeMap = {};
      const expenseMap = {};

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const iso = formatDateISO(d);
        const label = `${d.getDate()} ${d.toLocaleString('es-ES', { month: 'short' })}`;
        labels.push(label);
        incomeMap[iso] = 0;
        expenseMap[iso] = 0;
      }

      list.forEach(tx => {
        if (incomeMap[tx.date] !== undefined && tx.type === 'ingreso') {
          incomeMap[tx.date] += tx.amount;
        } else if (expenseMap[tx.date] !== undefined && tx.type === 'gasto') {
          expenseMap[tx.date] += tx.amount;
        }
      });

      return {
        labels,
        incomeData: Object.values(incomeMap),
        expenseData: Object.values(expenseMap)
      };
    },

    getMonthlyComparisonData: function (monthsBack = 6) {
      const list = loadTransactions();
      const now = new Date();
      const labels = [];
      const incomes = [];
      const expenses = [];

      for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        labels.push(d.toLocaleString('es-ES', { month: 'short', year: '2-digit' }));

        let inc = 0;
        let exp = 0;
        list.forEach(tx => {
          const txd = new Date(tx.date + 'T00:00:00');
          if (txd.getMonth() === m && txd.getFullYear() === y) {
            if (tx.type === 'ingreso') inc += tx.amount;
            else exp += tx.amount;
          }
        });

        incomes.push(inc);
        expenses.push(exp);
      }

      return { labels, incomes, expenses };
    },

    getSettings: loadSettings,
    updateSettings: function (newSettings) {
      const current = loadSettings();
      const updated = { ...current, ...newSettings };
      saveSettings(updated);
      return updated;
    },

    exportToCSV: function () {
      const list = loadTransactions();
      if (!list.length) return '';

      const headers = ['ID', 'Tipo', 'Concepto', 'Monto', 'Categoría', 'Fecha', 'Método de Pago', 'Notas'];
      const rows = list.map(tx => [
        tx.id,
        tx.type,
        `"${(tx.concept || '').replace(/"/g, '""')}"`,
        tx.amount,
        `"${(tx.category || '').replace(/"/g, '""')}"`,
        tx.date,
        `"${(tx.paymentMethod || '').replace(/"/g, '""')}"`,
        `"${(tx.notes || '').replace(/"/g, '""')}"`
      ]);

      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    },

    exportToJSON: function () {
      return JSON.stringify({
        transactions: loadTransactions(),
        settings: loadSettings(),
        exportedAt: new Date().toISOString()
      }, null, 2);
    },

    importFromJSON: function (jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (Array.isArray(data.transactions)) {
          saveTransactions(data.transactions);
          if (data.settings) saveSettings(data.settings);
          return true;
        }
        return false;
      } catch (e) {
        console.error('Import error:', e);
        return false;
      }
    },

    resetData: function () {
      const seed = generateSeedData();
      saveTransactions(seed);
      return seed;
    }
  };
})();
