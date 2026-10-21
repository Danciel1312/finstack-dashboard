/**
 * DashFinance - Store & State Management
 * Persistent localStorage handler, multi-role data isolation (Admin, Cliente, Visita),
 * user management (CRUD for Admin), calculations, changelog versions and seed generator.
 */

const Store = (function () {
  const STORAGE_KEY_LEGACY = 'finstack_transactions_v2';
  const STORAGE_KEY_SETTINGS = 'finstack_settings_v5';
  const STORAGE_KEY_USERS = 'finstack_users_v5';

  // Distinct storage keys for role data isolation
  const ROLE_STORAGE_KEYS = {
    admin: 'finstack_tx_admin_v5',
    cliente: 'finstack_tx_personal_v5',
    visita: 'finstack_tx_visita_v5'
  };

  const ROLES_INFO = {
    admin: {
      id: 'admin',
      name: 'Dany Ramos (Admin / Dev)',
      badge: 'Admin / Pruebas',
      icon: 'fa-shield-halved',
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
      description: 'Entorno de laboratorio para validar código, crear usuarios, probar nuevas métricas y realizar tests sin alterar finanzas reales.'
    },
    cliente: {
      id: 'cliente',
      name: 'Dany Ramos (Personal)',
      badge: 'Cliente / Personal',
      icon: 'fa-user-check',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      description: 'Tus finanzas reales privadas. Registro oficial de ingresos, gastos, ahorros y presupuestos personales.'
    },
    visita: {
      id: 'visita',
      name: 'Usuario Visita (Invitado)',
      badge: 'Visita / Demo',
      icon: 'fa-eye',
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      description: 'Modo demostración para enseñar la aplicación a amigos o clientes sin exponer jamás tus cuentas reales.'
    }
  };

  const changelogData = [
    {
      version: 'v1.3.0',
      date: '2026-10-21',
      tag: 'Producción',
      title: 'Módulo de Gestión de Usuarios (Admin) & Asistente IA Financiero',
      highlights: [
        'Módulo completo de Administración de Usuarios: creación, asignación de roles y presupuestos.',
        'Asistente de Inteligencia Artificial (FinStack AI) con diagnóstico financiero en tiempo real.',
        'Registro inteligente de gastos e ingresos mediante comandos en lenguaje natural.',
        'Soporte para Google Gemini AI API con motor analítico local integrado.',
        'Preparación integral para despliegue SaaS en producción con Supabase y Vercel.'
      ]
    },
    {
      version: 'v1.2.0',
      date: '2026-10-20',
      tag: 'Estable',
      title: 'Sistema Multi-Rol, Changelog & Preparación PWA Móvil',
      highlights: [
        'Arquitectura Multi-Rol: Admin (Dev/Pruebas), Cliente (Finanzas Reales) y Visita (Demostración).',
        'Aislamiento completo de datos en memoria local para no contaminar tus finanzas personales.',
        'Módulo visual de Versiones y Avances (Changelog & Roadmap) en la interfaz.',
        'Preparación PWA con manifest.json para instalación como app nativa en smartphones Android e iOS.',
        'Conmutador rápido de roles en la barra superior con retroalimentación instantánea.'
      ]
    },
    {
      version: 'v1.1.0',
      date: '2026-10-19',
      tag: 'Estable',
      title: 'Documentación Técnica y Repositorio en GitHub',
      highlights: [
        'Documentación técnica exhaustiva del sistema y arquitectura en DOCUMENTACION.txt.',
        'Repositorio conectado en GitHub con control de versiones y etiquetas (Releases).',
        'Preparación de esquema de datos para integración con bases de datos en la nube (Supabase / Firebase).'
      ]
    },
    {
      version: 'v1.0.0',
      date: '2026-10-19',
      tag: 'Inicial',
      title: 'Lanzamiento Inicial de FinStack Pro',
      highlights: [
        'Diseño corporativo DashStack con tarjetas rounded-2xl y soporte de temas Claro/Oscuro.',
        '4 tarjetas de métricas KPI con cálculo de variación vs mes anterior.',
        'Gráfica interactiva de Flujo de Fondos (Chart.js) con gradientes Bézier y Donut de categorías.',
        'Calendario Histórico interactivo con micro-chips diarios y panel de inspección por fecha.',
        'Persistencia 100% offline con localStorage y exportación a CSV y JSON.'
      ]
    }
  ];

  const defaultSettings = {
    theme: 'light',
    currency: 'USD',
    currencySymbol: '$',
    monthlyBudget: 3500,
    currentUserId: 'usr_2',
    activeRole: 'cliente',
    userName: 'Dany Ramos (Personal)',
    userRole: 'Cliente / Personal',
    geminiApiKey: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    cloudSyncEnabled: false,
    lastCloudSync: null
  };

  const defaultUsers = [
    {
      id: 'usr_1',
      name: 'Dany Ramos',
      email: 'admin@finstack.io',
      role: 'admin',
      status: 'Activo',
      budget: 5000,
      password: 'Dany2207',
      mustChangePassword: false,
      createdAt: '2026-10-15'
    },
    {
      id: 'usr_2',
      name: 'Dany Ramos (Personal)',
      email: 'dany.personal@finstack.io',
      role: 'cliente',
      status: 'Activo',
      budget: 3500,
      password: '1234',
      mustChangePassword: false,
      createdAt: '2026-10-18'
    },
    {
      id: 'usr_4',
      name: 'Invitado Showcase',
      email: 'visita@finstack.io',
      role: 'visita',
      status: 'Activo',
      budget: 1500,
      password: 'demo',
      mustChangePassword: false,
      createdAt: '2026-10-20'
    }
  ];

  function formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function generateSeedData(isTestEnv = false) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    const sampleData = [
      {
        id: 'tx_seed_1',
        type: 'ingreso',
        concept: isTestEnv ? '[TEST] Ingreso de Prueba Nómina' : 'Pago Nómina Empresa Tech',
        amount: 3850.00,
        category: 'Salario',
        date: formatDateISO(new Date(y, m, 1)),
        paymentMethod: 'Transferencia',
        notes: isTestEnv ? 'Transacción de staging para validar cálculos' : 'Depósito quincenal de nómina',
        createdAt: new Date(y, m, 1, 9, 0).toISOString()
      },
      {
        id: 'tx_seed_2',
        type: 'gasto',
        concept: isTestEnv ? '[TEST] Simulación de Renta' : 'Alquiler Departamento',
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
        concept: isTestEnv ? '[TEST] Compra Equipos Lab' : 'Supermercado Mensual Fresko',
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
        concept: isTestEnv ? '[TEST] Asesoría Técnica QA' : 'Asesoría Técnica Remota',
        amount: 450.00,
        category: 'Freelance',
        date: formatDateISO(now),
        paymentMethod: 'Transferencia',
        notes: 'Auditoría de arquitectura web 3h',
        createdAt: new Date(y, m, d, 11, 45).toISOString()
      },
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

  function getCurrentUserId() {
    const settings = loadSettings();
    return settings.currentUserId || 'usr_2';
  }

  function getCurrentStorageKey() {
    const userId = getCurrentUserId();
    return `finstack_tx_v5_user_${userId}`;
  }

  function loadTransactions() {
    try {
      const key = getCurrentStorageKey();
      const data = localStorage.getItem(key);

      if (!data) {
        const userId = getCurrentUserId();
        const users = loadUsers();
        const user = users.find(u => u.id === userId) || { name: 'Usuario', role: 'cliente', budget: 3500 };

        let initialData;
        if (userId === 'usr_1' || user.role === 'admin') {
          // Admin keeps laboratory mock data for developer tests
          initialData = generateSeedData(true);
        } else if (userId === 'usr_4' || user.role === 'visita') {
          // Visita keeps sample data for product showcase
          initialData = generateSeedData(false);
        } else {
          // Dany Ramos (Personal) & ALL newly created accounts start completely clean from 0!
          initialData = [];
        }

        saveTransactions(initialData);
        return initialData;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error loading transactions from localStorage:', e);
      return [];
    }
  }

  function saveTransactions(transactions) {
    try {
      const key = getCurrentStorageKey();
      localStorage.setItem(key, JSON.stringify(transactions));
    } catch (e) {
      console.error('Error saving transactions to localStorage:', e);
    }
  }

  function loadSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (!data) {
        const oldSettings = localStorage.getItem('finstack_settings_v2');
        if (oldSettings) {
          const merged = { ...defaultSettings, ...JSON.parse(oldSettings) };
          saveSettings(merged);
          return merged;
        }
        return { ...defaultSettings };
      }
      return { ...defaultSettings, ...JSON.parse(data) };
    } catch (e) {
      return { ...defaultSettings };
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }

  // --- USER MANAGEMENT (CRUD FOR ADMIN) ---
  function loadUsers() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_USERS);
      if (!data) {
        saveUsers(defaultUsers);
        return defaultUsers;
      }
      const parsed = JSON.parse(data);
      let updated = false;
      parsed.forEach(u => {
        if (u.mustChangePassword === undefined) {
          u.mustChangePassword = false;
          updated = true;
        }
      });
      if (updated) saveUsers(parsed);
      return parsed;
    } catch (e) {
      return defaultUsers;
    }
  }

  function saveUsers(users) {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users to localStorage:', e);
    }
  }

  // --- SUPABASE CLOUD & MULTI-DEVICE SYNCHRONIZATION ---
  let supabaseClient = null;
  let realtimeChannel = null;

  function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    const settings = loadSettings();
    if (settings.supabaseUrl && settings.supabaseAnonKey && typeof window !== 'undefined' && window.supabase) {
      try {
        supabaseClient = window.supabase.createClient(
          settings.supabaseUrl.trim(),
          settings.supabaseAnonKey.trim(),
          { auth: { persistSession: false } }
        );
      } catch (e) {
        console.warn('Could not initialize Supabase client:', e);
      }
    }
    return supabaseClient;
  }

  function mapTxToCloud(tx, userId) {
    return {
      id: tx.id,
      user_id: userId || getCurrentUserId(),
      type: tx.type,
      concept: tx.concept,
      amount: parseFloat(tx.amount),
      category: tx.category,
      date: tx.date,
      payment_method: tx.paymentMethod || 'Efectivo',
      notes: tx.notes || '',
      created_at: tx.createdAt || new Date().toISOString()
    };
  }

  function mapTxFromCloud(row) {
    return {
      id: row.id,
      type: row.type,
      concept: row.concept,
      amount: parseFloat(row.amount),
      category: row.category,
      date: row.date,
      paymentMethod: row.payment_method || row.paymentMethod || 'Efectivo',
      notes: row.notes || '',
      createdAt: row.created_at || row.createdAt || new Date().toISOString()
    };
  }

  function mapUserToCloud(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      budget: parseFloat(user.budget || 3000),
      password: user.password,
      must_change_password: !!user.mustChangePassword,
      created_at: user.createdAt || formatDateISO(new Date())
    };
  }

  function mapUserFromCloud(row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.status,
      budget: parseFloat(row.budget || 3000),
      password: row.password,
      mustChangePassword: !!(row.must_change_password !== undefined ? row.must_change_password : row.mustChangePassword),
      createdAt: row.created_at || row.createdAt || formatDateISO(new Date())
    };
  }

  async function pushTransactionToCloud(tx) {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const payload = mapTxToCloud(tx, getCurrentUserId());
      await client.from('finstack_transactions').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('Offline / sync transaction notice:', e);
    }
  }

  async function deleteTransactionFromCloud(id) {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('finstack_transactions').delete().eq('id', id);
    } catch (e) {
      console.warn('Offline / delete transaction notice:', e);
    }
  }

  async function pushUserToCloud(user) {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const payload = mapUserToCloud(user);
      await client.from('finstack_users').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('Offline / sync user notice:', e);
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
      pushTransactionToCloud(newTx);
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
      pushTransactionToCloud(list[index]);
      return list[index];
    },

    remove: function (id) {
      let list = loadTransactions();
      const initialLength = list.length;
      list = list.filter(item => item.id !== id);
      saveTransactions(list);
      deleteTransactionFromCloud(id);
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
      const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

      const incomeGrowth = prevTotalIncome > 0 
        ? (((totalIncome - prevTotalIncome) / prevTotalIncome) * 100).toFixed(1) 
        : '+0.0';
      const expenseGrowth = prevTotalExpense > 0 
        ? (((totalExpense - prevTotalExpense) / prevTotalExpense) * 100).toFixed(1) 
        : '+0.0';

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

    // --- MULTI-ROLE SYSTEM ---
    getActiveRole: function () {
      const settings = loadSettings();
      return settings.activeRole || 'cliente';
    },

    getRoleInfo: function (roleId) {
      return ROLES_INFO[roleId] || ROLES_INFO.cliente;
    },

    getAllRoles: function () {
      return Object.values(ROLES_INFO);
    },

    getCurrentUserId: function () {
      return getCurrentUserId();
    },

    getCurrentUser: function () {
      const users = loadUsers();
      const currentId = getCurrentUserId();
      return users.find(u => u.id === currentId) || users[0];
    },

    switchUser: function (userId) {
      const users = loadUsers();
      const user = users.find(u => u.id === userId);
      if (!user) return null;

      const settings = loadSettings();
      settings.currentUserId = user.id;
      settings.userName = user.name;
      settings.userEmail = user.email;
      settings.activeRole = user.role;
      settings.monthlyBudget = user.budget || 3500;
      settings.userRole = ROLES_INFO[user.role] ? ROLES_INFO[user.role].badge : 'Cliente';
      saveSettings(settings);

      return user;
    },

    switchRole: function (newRoleId) {
      if (!ROLES_INFO[newRoleId]) return null;
      const users = loadUsers();
      const targetUser = users.find(u => u.role === newRoleId && u.status === 'Activo') || users.find(u => u.role === newRoleId);
      if (targetUser) {
        return this.switchUser(targetUser.id);
      }
      const settings = loadSettings();
      settings.activeRole = newRoleId;
      settings.userName = ROLES_INFO[newRoleId].name;
      settings.userRole = ROLES_INFO[newRoleId].badge;
      saveSettings(settings);
      return ROLES_INFO[newRoleId];
    },

    // --- USER MANAGEMENT METHODS (ADMIN) ---
    getUsers: function () {
      return loadUsers();
    },

    addUser: function (userData) {
      const users = loadUsers();
      const newUser = {
        id: 'usr_' + Date.now(),
        name: userData.name.trim(),
        email: userData.email.trim(),
        role: userData.role || 'cliente',
        status: 'Activo',
        budget: parseFloat(userData.budget) || 3000,
        password: (userData.password && userData.password.trim()) ? userData.password.trim() : '1234',
        mustChangePassword: false,
        createdAt: formatDateISO(new Date())
      };
      users.push(newUser);
      saveUsers(users);
      pushUserToCloud(newUser);

      // Pre-initialize empty transactions so the new user starts from 0
      try {
        localStorage.setItem(`finstack_tx_v5_user_${newUser.id}`, JSON.stringify([]));
      } catch (e) {}

      return newUser;
    },

    updateUser: function (id, updatedData) {
      const users = loadUsers();
      const index = users.findIndex(u => u.id === id);
      if (index === -1) return null;

      users[index] = {
        ...users[index],
        name: updatedData.name !== undefined ? updatedData.name.trim() : users[index].name,
        email: updatedData.email !== undefined ? updatedData.email.trim() : users[index].email,
        role: updatedData.role || users[index].role,
        status: updatedData.status || users[index].status,
        budget: updatedData.budget !== undefined ? parseFloat(updatedData.budget) : users[index].budget,
        password: (updatedData.password && updatedData.password.trim()) ? updatedData.password.trim() : users[index].password,
        mustChangePassword: updatedData.mustChangePassword !== undefined ? !!updatedData.mustChangePassword : users[index].mustChangePassword
      };
      saveUsers(users);
      pushUserToCloud(users[index]);

      // Keep active session synchronized if modifying current user
      if (id === getCurrentUserId()) {
        const settings = loadSettings();
        settings.userName = users[index].name;
        settings.userEmail = users[index].email;
        settings.activeRole = users[index].role;
        settings.monthlyBudget = users[index].budget;
        saveSettings(settings);
      }

      return users[index];
    },

    deleteUser: function (id) {
      let users = loadUsers();
      const initial = users.length;
      users = users.filter(u => u.id !== id);
      saveUsers(users);
      try {
        localStorage.removeItem(`finstack_tx_v5_user_${id}`);
      } catch (e) {}
      const client = getSupabaseClient();
      if (client) {
        client.from('finstack_users').delete().eq('id', id).then(() => {}).catch(() => {});
      }
      return users.length < initial;
    },

    toggleUserStatus: function (id) {
      const users = loadUsers();
      const user = users.find(u => u.id === id);
      if (!user) return null;
      user.status = user.status === 'Activo' ? 'Inactivo' : 'Activo';
      saveUsers(users);
      pushUserToCloud(user);
      return user;
    },

    verifyPassword: function (userId, password) {
      const users = loadUsers();
      const user = users.find(u => u.id === userId);
      if (!user) return false;
      if (!user.password) return true; // If no password set, permit
      return user.password.trim() === (password || '').trim();
    },

    resetUserPassword: function (id, newPassword, requireChange = false) {
      const users = loadUsers();
      const user = users.find(u => u.id === id);
      if (!user) return null;
      user.password = (newPassword || '').trim();
      user.mustChangePassword = requireChange;
      saveUsers(users);
      pushUserToCloud(user);
      return user;
    },

    generateTemporaryPassword: function (id) {
      const users = loadUsers();
      const user = users.find(u => u.id === id);
      if (!user) return null;
      
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const tempPassword = `TEMP-${randomSuffix}`;
      user.password = tempPassword;
      user.mustChangePassword = true;
      saveUsers(users);
      pushUserToCloud(user);
      return { user, tempPassword };
    },

    changePersonalPassword: function (id, newPassword) {
      const users = loadUsers();
      const user = users.find(u => u.id === id);
      if (!user) return null;
      user.password = (newPassword || '').trim();
      user.mustChangePassword = false;
      saveUsers(users);
      pushUserToCloud(user);
      return user;
    },

    // --- SUPABASE CLOUD SYNC API ---
    isCloudConfigured: function () {
      const s = loadSettings();
      return !!(s.supabaseUrl && s.supabaseAnonKey);
    },

    getCloudConfig: function () {
      const s = loadSettings();
      return {
        url: s.supabaseUrl || '',
        key: s.supabaseAnonKey || '',
        lastSync: s.lastCloudSync || null,
        enabled: !!s.cloudSyncEnabled
      };
    },

    setCloudConfig: function (url, key) {
      const s = loadSettings();
      s.supabaseUrl = (url || '').trim();
      s.supabaseAnonKey = (key || '').trim();
      s.cloudSyncEnabled = !!(s.supabaseUrl && s.supabaseAnonKey);
      saveSettings(s);
      supabaseClient = null;
      getSupabaseClient();
      return s;
    },

    disconnectCloud: function () {
      const s = loadSettings();
      s.supabaseUrl = '';
      s.supabaseAnonKey = '';
      s.cloudSyncEnabled = false;
      s.lastCloudSync = null;
      saveSettings(s);
      if (realtimeChannel && supabaseClient) {
        try {
          supabaseClient.removeChannel(realtimeChannel);
        } catch (e) {}
      }
      realtimeChannel = null;
      supabaseClient = null;
      return s;
    },

    syncCloud: async function () {
      const client = getSupabaseClient();
      if (!client) {
        return { success: false, message: 'Supabase no está configurado o no hay credenciales.' };
      }

      try {
        const userId = getCurrentUserId();

        // 1. Fetch transactions for current user
        const { data: cloudTxs, error: txError } = await client
          .from('finstack_transactions')
          .select('*')
          .eq('user_id', userId);

        if (txError) throw txError;

        // 2. Fetch all users
        const { data: cloudUsers, error: usersError } = await client
          .from('finstack_users')
          .select('*');

        if (usersError) throw usersError;

        // 3. Merge cloud users into local cache
        if (cloudUsers && cloudUsers.length > 0) {
          const localUsers = loadUsers();
          const userMap = new Map();
          localUsers.forEach(u => userMap.set(u.id, u));
          cloudUsers.forEach(cu => {
            const mapped = mapUserFromCloud(cu);
            userMap.set(mapped.id, mapped);
          });
          const mergedUsers = Array.from(userMap.values());
          saveUsers(mergedUsers);
        }

        // 4. Merge transactions
        const localKey = getCurrentStorageKey();
        let localTxs = [];
        try {
          const raw = localStorage.getItem(localKey);
          if (raw) localTxs = JSON.parse(raw);
        } catch (e) {}

        const txMap = new Map();
        localTxs.forEach(tx => txMap.set(tx.id, tx));

        if (cloudTxs && cloudTxs.length > 0) {
          cloudTxs.forEach(ctx => {
            const mapped = mapTxFromCloud(ctx);
            txMap.set(mapped.id, mapped);
          });
        }

        const mergedTxs = Array.from(txMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
        saveTransactions(mergedTxs);

        // 5. Bidirectional: upload local-only transactions to Supabase
        if (localTxs.length > 0) {
          const cloudIds = new Set((cloudTxs || []).map(t => t.id));
          const localOnly = localTxs.filter(t => !cloudIds.has(t.id));
          if (localOnly.length > 0) {
            const toUpload = localOnly.map(t => mapTxToCloud(t, userId));
            await client.from('finstack_transactions').upsert(toUpload, { onConflict: 'id' });
          }
        }

        // 6. Update last sync time in settings
        const settings = loadSettings();
        settings.lastCloudSync = new Date().toISOString();
        settings.cloudSyncEnabled = true;
        saveSettings(settings);

        return {
          success: true,
          message: 'Sincronización completada con éxito',
          transactionsCount: mergedTxs.length,
          lastSync: settings.lastCloudSync
        };
      } catch (err) {
        console.error('syncCloud error:', err);
        return { success: false, message: err.message || 'Error al conectar con la base de datos' };
      }
    },

    pullCloudTransactions: async function () {
      const client = getSupabaseClient();
      if (!client) return;
      try {
        const userId = getCurrentUserId();
        const { data: cloudTxs, error } = await client
          .from('finstack_transactions')
          .select('*')
          .eq('user_id', userId);
        if (!error && cloudTxs) {
          const mapped = cloudTxs.map(mapTxFromCloud).sort((a, b) => new Date(b.date) - new Date(a.date));
          saveTransactions(mapped);
        }
      } catch (e) {
        console.warn('pullCloudTransactions notice:', e);
      }
    },

    pullCloudUsers: async function () {
      const client = getSupabaseClient();
      if (!client) return;
      try {
        const { data: cloudUsers, error } = await client
          .from('finstack_users')
          .select('*');
        if (!error && cloudUsers && cloudUsers.length > 0) {
          const mapped = cloudUsers.map(mapUserFromCloud);
          saveUsers(mapped);
        }
      } catch (e) {
        console.warn('pullCloudUsers notice:', e);
      }
    },

    initRealtime: function (onUpdateCallback) {
      const client = getSupabaseClient();
      if (!client || realtimeChannel) return;

      try {
        realtimeChannel = client
          .channel('finstack_realtime_channel')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'finstack_transactions' }, async (payload) => {
            console.log('⚡ Realtime event finstack_transactions:', payload);
            await Store.pullCloudTransactions();
            if (typeof onUpdateCallback === 'function') onUpdateCallback('transactions');
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'finstack_users' }, async (payload) => {
            console.log('⚡ Realtime event finstack_users:', payload);
            await Store.pullCloudUsers();
            if (typeof onUpdateCallback === 'function') onUpdateCallback('users');
          })
          .subscribe((status) => {
            console.log('Realtime status:', status);
          });
      } catch (e) {
        console.warn('Realtime subscription notice:', e);
      }
    },

    // --- CHANGELOG / VERSIONS ---
    getChangelog: function () {
      return changelogData;
    },

    getCurrentVersion: function () {
      return changelogData[0];
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
        role: this.getActiveRole(),
        transactions: loadTransactions(),
        users: loadUsers(),
        settings: loadSettings(),
        exportedAt: new Date().toISOString()
      }, null, 2);
    },

    importFromJSON: function (jsonString) {
      try {
        const data = JSON.parse(jsonString);
        if (Array.isArray(data.transactions)) {
          saveTransactions(data.transactions);
          if (Array.isArray(data.users)) saveUsers(data.users);
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
      const role = this.getActiveRole();
      const userId = this.getCurrentUserId();
      let seed = [];
      if (userId === 'usr_1' || role === 'admin') {
        seed = generateSeedData(true);
      } else if (userId === 'usr_4' || role === 'visita') {
        seed = generateSeedData(false);
      } else {
        // Clean start from 0 for personal / standard clients
        seed = [];
      }
      saveTransactions(seed);
      return seed;
    }
  };
})();
