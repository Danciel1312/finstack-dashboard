/**
 * DashFinance - Store & State Management
 * Persistent localStorage handler, multi-role data isolation (Admin, Cliente, Visita),
 * user management (CRUD for Admin), calculations, changelog versions and seed generator.
 */

const Store = (function () {
  const STORAGE_KEY_LEGACY = 'finstack_transactions_v2';
  const STORAGE_KEY_SETTINGS = 'finstack_settings_v5';
  const STORAGE_KEY_USERS = 'finstack_users_v5';
  const STORAGE_KEY_PERSISTENT_SESSION = 'finstack_persistent_session_v5';
  const SESSION_KEY_ACTIVE_TAB = 'finstack_active_tab_session_v5';

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
      version: 'v2.0.0',
      date: '2026-10-27',
      tag: 'Major Release',
      title: 'FinStack Pro 2.0: Billeteras, Metas de Ahorro, Préstamos, Semáforo, PDF & PWA Offline',
      highlights: [
        'Múltiples Billeteras y Cuentas (Efectivo, Banco, Ahorros, Tarjetas y personalizadas) con Transferencias internas sin inflar gastos.',
        'Módulo de Metas de Ahorro ("Alcancías") con cálculo inteligente de cuota mensual sugerida y abonos directos.',
        'Control integral de Deudas y Préstamos ("Me deben" vs "Debo") con historial de abonos parciales y liquidación automática.',
        'Semáforo de Presupuestos por Categoría (Verde / Amarillo / Rojo) para detectar excesos antes de fin de mes.',
        'Generador de Estado de Cuenta Ejecutivo en PDF membretado listo para guardar, imprimir o compartir por WhatsApp.',
        'PWA Nativa Offline completa (Service Worker sw.js + botón directo "Instalar App" + auto-sincronización al recuperar internet).'
      ]
    },
    {
      version: 'v1.5.0',
      date: '2026-10-27',
      tag: 'Producción',
      title: 'Sesión Persistente ("Recordarme"), Monedas Regionales (GTQ Q) & Perfil Completo',
      highlights: [
        'Sesión persistente inteligente ("Mantener mi sesión iniciada"): recarga la página (F5) o reabre la app sin volver a loguearte hasta cerrar sesión.',
        'Soporte nativo para Quetzal Guatemalteco (GTQ - Q) y monedas regionales (USD $, EUR €, MXN $, HNL L, CRC ₡, COP $) en todo el sistema, gráficas, calendario e IA.',
        'Panel de Configuración de Perfil ampliado (⚙️): edición directa de Presupuesto Mensual, Moneda Preferida, Avatar y Cambio de Contraseña seguro.',
        'Sincronización automática de presupuesto y contraseña actualizada en tiempo real con Supabase Cloud.'
      ]
    },
    {
      version: 'v1.4.0',
      date: '2026-10-26',
      tag: 'Producción',
      title: 'Gastos Fijos, Suscripciones Recurrentes & Centro de Alertas',
      highlights: [
        'Módulo dedicado de Gastos Fijos y Suscripciones Recurrentes (Mensual, Quincenal, Semanal, Trimestral y Anual).',
        'Centro interactivo de Alertas de Vencimiento en la campana superior y banner inteligente en el Dashboard.',
        'Botón rápido "Pagar ahora" que registra el gasto real del mes y avanza automáticamente la fecha del próximo ciclo.',
        'Integración visual de vencimientos programados en el Calendario Histórico y diagnóstico con FinStack AI.',
        'Sincronización multi-dispositivo en tiempo real con Supabase y aislamiento por usuario.'
      ]
    },
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
    userAvatar: '🚗',
    sidebarMode: 'fixed',
    geminiApiKey: '',
    supabaseUrl: 'https://ugsdetwtknzcnkammyry.supabase.co',
    supabaseAnonKey: 'sb_publishable_cc0I61URp7pO5s3CGsy19w_ooGU8Ky5',
    cloudSyncEnabled: true,
    lastCloudSync: null
  };

  const defaultUsers = [
    {
      id: 'usr_1',
      name: 'Dany Morataya',
      email: 'admin@finstack.io',
      role: 'admin',
      status: 'Activo',
      budget: 5000,
      password: 'Dany2207',
      avatar: '👑',
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
      avatar: '🚗',
      mustChangePassword: false,
      createdAt: '2026-10-18'
    },
    {
      id: 'usr_1792631452175',
      name: 'Dany',
      email: 'dany@ejemplo.com',
      role: 'cliente',
      status: 'Activo',
      budget: 3000,
      password: '1312',
      avatar: '🚗',
      mustChangePassword: false,
      createdAt: '2026-10-21'
    },
    {
      id: 'usr_1792631370119',
      name: 'Prueba',
      email: 'prueba@ejemplo.com',
      role: 'cliente',
      status: 'Activo',
      budget: 3000,
      password: '1234',
      avatar: '🏎️',
      mustChangePassword: false,
      createdAt: '2026-10-21'
    },
    {
      id: 'usr_4',
      name: 'Invitado Showcase',
      email: 'visita@finstack.io',
      role: 'visita',
      status: 'Activo',
      budget: 1500,
      password: 'demo',
      avatar: '👁️',
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

  function getSubscriptionsStorageKey() {
    const userId = getCurrentUserId();
    return `finstack_subs_v5_user_${userId}`;
  }

  function getWalletsStorageKey() {
    const userId = getCurrentUserId();
    return `finstack_wallets_v5_user_${userId}`;
  }

  function getGoalsStorageKey() {
    const userId = getCurrentUserId();
    return `finstack_goals_v5_user_${userId}`;
  }

  function getDebtsStorageKey() {
    const userId = getCurrentUserId();
    return `finstack_debts_v5_user_${userId}`;
  }

  function getCatBudgetsStorageKey() {
    const userId = getCurrentUserId();
    return `finstack_catbudgets_v5_user_${userId}`;
  }

  function isNormalTransactionType(type) {
    return type === 'ingreso' || type === 'gasto' || type === 'transferencia';
  }

  function generateDefaultWallets() {
    return [
      { id: 'wallet_cash', name: 'Efectivo', type: 'efectivo', icon: '💵', color: 'emerald', initialBalance: 0, isDefault: true },
      { id: 'wallet_bank', name: 'Cuenta Bancaria', type: 'banco', icon: '🏦', color: 'blue', initialBalance: 0, isDefault: true },
      { id: 'wallet_savings', name: 'Cuenta de Ahorros', type: 'ahorro', icon: '🐷', color: 'purple', initialBalance: 0, isDefault: true },
      { id: 'wallet_credit', name: 'Tarjeta de Crédito', type: 'credito', icon: '💳', color: 'amber', initialBalance: 0, isDefault: true }
    ];
  }

  function generateGoalSeedData() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return [
      {
        id: 'goal_seed_1',
        name: 'Fondo de Emergencia',
        icon: '🛡️',
        targetAmount: 5000,
        currentAmount: 2150,
        deadline: formatDateISO(new Date(y, m + 5, 28)),
        color: 'emerald',
        notes: 'Reserva de seguridad de 3 a 6 meses',
        contributions: [{ date: formatDateISO(new Date(y, m, 5)), amount: 500 }],
        createdAt: new Date(y, m - 2, 1).toISOString()
      },
      {
        id: 'goal_seed_2',
        name: 'Vacaciones Familiares',
        icon: '🏖️',
        targetAmount: 2500,
        currentAmount: 900,
        deadline: formatDateISO(new Date(y, m + 4, 15)),
        color: 'blue',
        notes: 'Boletos, hospedaje y actividades',
        contributions: [{ date: formatDateISO(new Date(y, m, 10)), amount: 300 }],
        createdAt: new Date(y, m - 1, 10).toISOString()
      }
    ];
  }

  function generateDebtSeedData() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return [
      {
        id: 'debt_seed_1',
        direction: 'me_deben',
        personName: 'Carlos Méndez',
        concept: 'Préstamo personal puente',
        totalAmount: 600,
        paidAmount: 250,
        dueDate: formatDateISO(new Date(y, m + 1, 15)),
        icon: '🤝',
        status: 'Pendiente',
        payments: [{ date: formatDateISO(new Date(y, m, 8)), amount: 250 }],
        notes: 'Acordado en 2 pagos quincenales',
        createdAt: new Date(y, m, 1).toISOString()
      },
      {
        id: 'debt_seed_2',
        direction: 'debo',
        personName: 'Tienda Electrónica (Cuotas)',
        concept: 'Monitor UltraWide Trabajo',
        totalAmount: 800,
        paidAmount: 400,
        dueDate: formatDateISO(new Date(y, m + 2, 5)),
        icon: '💳',
        status: 'Pendiente',
        payments: [{ date: formatDateISO(new Date(y, m - 1, 5)), amount: 400 }],
        notes: 'Cuotas sin intereses',
        createdAt: new Date(y, m - 1, 5).toISOString()
      }
    ];
  }

  function generateCategoryBudgetSeedData() {
    return {
      'Alimentación': 600,
      'Vivienda': 1100,
      'Transporte': 200,
      'Servicios': 180,
      'Entretenimiento': 120,
      'Salud': 150
    };
  }

  function generateSubscriptionSeedData() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    return [
      {
        id: 'sub_seed_1',
        name: 'Energía Eléctrica',
        amount: 48.50,
        category: 'Servicios',
        frequency: 'mensual',
        nextDueDate: formatDateISO(new Date(y, m, d - 1)),
        alertDaysBefore: 3,
        paymentMethod: 'Transferencia',
        icon: '💡',
        status: 'Activa',
        lastPaidDate: formatDateISO(new Date(y, m - 1, d - 1)),
        notes: 'Servicio eléctrico residencial',
        createdAt: new Date(y, m - 2, 10).toISOString()
      },
      {
        id: 'sub_seed_2',
        name: 'Internet Fibra Óptica',
        amount: 35.00,
        category: 'Servicios',
        frequency: 'mensual',
        nextDueDate: formatDateISO(new Date(y, m, d + 1)),
        alertDaysBefore: 3,
        paymentMethod: 'Tarjeta Débito',
        icon: '🌐',
        status: 'Activa',
        lastPaidDate: formatDateISO(new Date(y, m - 1, d + 1)),
        notes: 'Plan 300 Mbps hogar',
        createdAt: new Date(y, m - 2, 12).toISOString()
      },
      {
        id: 'sub_seed_3',
        name: 'Netflix Premium',
        amount: 15.99,
        category: 'Entretenimiento',
        frequency: 'mensual',
        nextDueDate: formatDateISO(new Date(y, m, d + 3)),
        alertDaysBefore: 5,
        paymentMethod: 'Tarjeta Crédito',
        icon: '🎬',
        status: 'Activa',
        lastPaidDate: formatDateISO(new Date(y, m - 1, d + 3)),
        notes: 'Plan Familiar 4K',
        createdAt: new Date(y, m - 2, 15).toISOString()
      },
      {
        id: 'sub_seed_4',
        name: 'Alquiler / Vivienda',
        amount: 650.00,
        category: 'Vivienda',
        frequency: 'mensual',
        nextDueDate: formatDateISO(new Date(y, m, d + 10)),
        alertDaysBefore: 5,
        paymentMethod: 'Transferencia',
        icon: '🏠',
        status: 'Activa',
        lastPaidDate: formatDateISO(new Date(y, m - 1, d + 10)),
        notes: 'Pago mensual de vivienda',
        createdAt: new Date(y, m - 3, 1).toISOString()
      },
      {
        id: 'sub_seed_5',
        name: 'Membresía Gimnasio',
        amount: 29.99,
        category: 'Salud',
        frequency: 'mensual',
        nextDueDate: formatDateISO(new Date(y, m, d + 16)),
        alertDaysBefore: 3,
        paymentMethod: 'Tarjeta Crédito',
        icon: '🏋️',
        status: 'Activa',
        lastPaidDate: formatDateISO(new Date(y, m - 1, d + 16)),
        notes: 'Plan mensual acceso completo',
        createdAt: new Date(y, m - 2, 20).toISOString()
      }
    ];
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
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.filter(item => item && isNormalTransactionType(item.type)) : [];
    } catch (e) {
      console.error('Error loading transactions from localStorage:', e);
      return [];
    }
  }

  function saveTransactions(transactions) {
    try {
      const key = getCurrentStorageKey();
      const clean = (transactions || []).filter(item => item && isNormalTransactionType(item.type));
      localStorage.setItem(key, JSON.stringify(clean));
    } catch (e) {
      console.error('Error saving transactions to localStorage:', e);
    }
  }

  function loadWallets() {
    try {
      const key = getWalletsStorageKey();
      const raw = localStorage.getItem(key);
      if (!raw) {
        const defaults = generateDefaultWallets();
        saveWallets(defaults);
        return defaults;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const defaults = generateDefaultWallets();
        saveWallets(defaults);
        return defaults;
      }
      return parsed;
    } catch (e) {
      return generateDefaultWallets();
    }
  }

  function saveWallets(wallets) {
    try {
      localStorage.setItem(getWalletsStorageKey(), JSON.stringify(wallets || []));
    } catch (e) {}
  }

  function loadGoals() {
    try {
      const key = getGoalsStorageKey();
      const raw = localStorage.getItem(key);
      if (!raw) {
        const userId = getCurrentUserId();
        const user = loadUsers().find(u => u.id === userId) || { role: 'cliente' };
        const initial = (userId === 'usr_1' || user.role === 'admin' || userId === 'usr_4' || user.role === 'visita')
          ? generateGoalSeedData()
          : [];
        saveGoals(initial);
        return initial;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveGoals(goals) {
    try {
      localStorage.setItem(getGoalsStorageKey(), JSON.stringify(goals || []));
    } catch (e) {}
  }

  function loadDebts() {
    try {
      const key = getDebtsStorageKey();
      const raw = localStorage.getItem(key);
      if (!raw) {
        const userId = getCurrentUserId();
        const user = loadUsers().find(u => u.id === userId) || { role: 'cliente' };
        const initial = (userId === 'usr_1' || user.role === 'admin' || userId === 'usr_4' || user.role === 'visita')
          ? generateDebtSeedData()
          : [];
        saveDebts(initial);
        return initial;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveDebts(debts) {
    try {
      localStorage.setItem(getDebtsStorageKey(), JSON.stringify(debts || []));
    } catch (e) {}
  }

  function loadCatBudgets() {
    try {
      const key = getCatBudgetsStorageKey();
      const raw = localStorage.getItem(key);
      if (!raw) {
        const userId = getCurrentUserId();
        const user = loadUsers().find(u => u.id === userId) || { role: 'cliente' };
        const initial = (userId === 'usr_1' || user.role === 'admin' || userId === 'usr_4' || user.role === 'visita')
          ? generateCategoryBudgetSeedData()
          : {};
        saveCatBudgets(initial);
        return initial;
      }
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveCatBudgets(obj) {
    try {
      localStorage.setItem(getCatBudgetsStorageKey(), JSON.stringify(obj || {}));
    } catch (e) {}
  }

  function loadSubscriptions() {
    try {
      const key = getSubscriptionsStorageKey();
      const data = localStorage.getItem(key);

      if (!data) {
        const userId = getCurrentUserId();
        const users = loadUsers();
        const user = users.find(u => u.id === userId) || { name: 'Usuario', role: 'cliente' };

        let initialSubs = [];
        if (userId === 'usr_1' || user.role === 'admin' || userId === 'usr_4' || user.role === 'visita') {
          initialSubs = generateSubscriptionSeedData();
        } else {
          // Real clients start clean from 0
          initialSubs = [];
        }
        saveSubscriptions(initialSubs);
        return initialSubs;
      }
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error loading subscriptions from localStorage:', e);
      return [];
    }
  }

  function saveSubscriptions(subs) {
    try {
      const key = getSubscriptionsStorageKey();
      localStorage.setItem(key, JSON.stringify(subs || []));
    } catch (e) {
      console.error('Error saving subscriptions to localStorage:', e);
    }
  }

  function calculateNextCycleDate(dateStr, frequency = 'mensual') {
    const parts = (dateStr || formatDateISO(new Date())).split('-').map(Number);
    const y = parts[0];
    const m = parts[1] - 1;
    const d = parts[2];

    if (frequency === 'semanal') {
      return formatDateISO(new Date(y, m, d + 7));
    }
    if (frequency === 'quincenal') {
      return formatDateISO(new Date(y, m, d + 15));
    }

    let monthsToAdd = 1;
    if (frequency === 'trimestral') monthsToAdd = 3;
    else if (frequency === 'anual') monthsToAdd = 12;

    const targetMonthDate = new Date(y, m + monthsToAdd, 1);
    const maxDaysInTarget = new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth() + 1, 0).getDate();
    const clampedDay = Math.min(d, maxDaysInTarget);
    return formatDateISO(new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), clampedDay));
  }

  function getMonthlyEquivalent(amount, frequency = 'mensual') {
    const val = parseFloat(amount) || 0;
    if (frequency === 'semanal') return val * (52 / 12);
    if (frequency === 'quincenal') return val * 2;
    if (frequency === 'trimestral') return val / 3;
    if (frequency === 'anual') return val / 12;
    return val;
  }

  function computeSubscriptionDueMeta(sub) {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const parts = (sub.nextDueDate || formatDateISO(now)).split('-').map(Number);
    const dueMidnight = new Date(parts[0], parts[1] - 1, parts[2]).getTime();
    const daysUntilDue = Math.round((dueMidnight - todayMidnight) / 86400000);
    const alertDays = Number(sub.alertDaysBefore !== undefined ? sub.alertDaysBefore : 3);

    if (sub.status === 'Pausada') {
      return {
        ...sub,
        daysUntilDue,
        urgency: 'pausada',
        isAlert: false,
        statusLabel: 'Pausada',
        monthlyEquivalent: 0
      };
    }

    let urgency = 'aldia';
    let isAlert = false;
    let statusLabel = '';

    if (daysUntilDue < 0) {
      const absDays = Math.abs(daysUntilDue);
      urgency = 'vencido';
      isAlert = true;
      statusLabel = absDays === 1 ? 'Venció ayer' : `Venció hace ${absDays} días`;
    } else if (daysUntilDue === 0) {
      urgency = 'hoy';
      isAlert = true;
      statusLabel = '¡Vence hoy!';
    } else if (daysUntilDue <= alertDays) {
      urgency = 'proximo';
      isAlert = true;
      statusLabel = daysUntilDue === 1 ? 'Vence mañana' : `Vence en ${daysUntilDue} días`;
    } else {
      urgency = 'aldia';
      isAlert = false;
      statusLabel = `En ${daysUntilDue} días`;
    }

    return {
      ...sub,
      daysUntilDue,
      urgency,
      isAlert,
      statusLabel,
      monthlyEquivalent: getMonthlyEquivalent(sub.amount, sub.frequency)
    };
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
        saveSettings(defaultSettings);
        return { ...defaultSettings };
      }
      const parsed = JSON.parse(data);
      if (!parsed.supabaseUrl) {
        parsed.supabaseUrl = defaultSettings.supabaseUrl;
        parsed.supabaseAnonKey = defaultSettings.supabaseAnonKey;
        parsed.cloudSyncEnabled = true;
        saveSettings(parsed);
      }
      return { ...defaultSettings, ...parsed };
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

      // Merge any default users that might be missing in local storage cache
      defaultUsers.forEach(def => {
        const exists = parsed.find(u => u.id === def.id || (u.email && u.email.toLowerCase() === def.email.toLowerCase()));
        if (!exists) {
          parsed.push(def);
          updated = true;
        } else if (def.id === 'usr_1' && exists.password === 'admin123') {
          // Keep admin password aligned with Dany2207
          exists.password = 'Dany2207';
          updated = true;
        }
      });

      parsed.forEach(u => {
        if (u.mustChangePassword === undefined) {
          u.mustChangePassword = false;
          updated = true;
        }
        if (!u.avatar) {
          u.avatar = u.role === 'admin' ? '👑' : (u.role === 'visita' ? '👁️' : '🚗');
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

  function cleanSupabaseUrl(url) {
    if (!url) return '';
    let cleaned = url.trim();
    cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
    cleaned = cleaned.replace(/\/+$/, '');
    return cleaned;
  }

  // Default project cloud credentials (allows all devices to connect automatically out-of-the-box)
  const DEFAULT_SUPABASE_CONFIG = {
    url: 'https://ugsdetwtknzcnkammyry.supabase.co',
    anonKey: 'sb_publishable_cc0I61URp7pO5s3CGsy19w_ooGU8Ky5'
  };

  // --- SUPABASE CLOUD & MULTI-DEVICE SYNCHRONIZATION ---
  let supabaseClient = null;
  let realtimeChannel = null;

  function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    const settings = loadSettings();
    const rawUrl = settings.supabaseUrl || DEFAULT_SUPABASE_CONFIG.url || '';
    const url = cleanSupabaseUrl(rawUrl);
    const key = (settings.supabaseAnonKey || DEFAULT_SUPABASE_CONFIG.anonKey || '').trim();

    if (url && key && typeof window !== 'undefined' && window.supabase) {
      try {
        supabaseClient = window.supabase.createClient(
          url,
          key,
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

  function mapSubToCloud(sub, userId) {
    return {
      id: sub.id,
      user_id: userId || getCurrentUserId(),
      type: 'suscripcion',
      concept: sub.name,
      amount: parseFloat(sub.amount) || 0,
      category: sub.category || 'Servicios',
      date: sub.nextDueDate || formatDateISO(new Date()),
      payment_method: sub.paymentMethod || 'Tarjeta Crédito',
      notes: JSON.stringify({
        __finstack_sub: true,
        frequency: sub.frequency || 'mensual',
        alertDaysBefore: Number(sub.alertDaysBefore !== undefined ? sub.alertDaysBefore : 3),
        icon: sub.icon || '🔄',
        status: sub.status || 'Activa',
        lastPaidDate: sub.lastPaidDate || null,
        notes: sub.notes || ''
      }),
      created_at: sub.createdAt || new Date().toISOString()
    };
  }

  function mapSubFromCloud(row) {
    let meta = {};
    try {
      if (row.notes && row.notes.trim().startsWith('{')) {
        meta = JSON.parse(row.notes);
      }
    } catch (e) {}

    return {
      id: row.id,
      name: row.concept || 'Gasto Fijo',
      amount: parseFloat(row.amount) || 0,
      category: row.category || 'Servicios',
      frequency: meta.frequency || 'mensual',
      nextDueDate: row.date || formatDateISO(new Date()),
      alertDaysBefore: Number(meta.alertDaysBefore !== undefined ? meta.alertDaysBefore : 3),
      paymentMethod: row.payment_method || row.paymentMethod || 'Tarjeta Crédito',
      icon: meta.icon || '🔄',
      status: meta.status || 'Activa',
      lastPaidDate: meta.lastPaidDate || null,
      notes: meta.notes !== undefined ? meta.notes : (row.notes || ''),
      createdAt: row.created_at || row.createdAt || new Date().toISOString()
    };
  }

  async function pushSubscriptionToCloud(sub) {
    const client = getSupabaseClient();
    if (!client || String(sub.id).startsWith('sub_seed_')) return;
    try {
      const payload = mapSubToCloud(sub, getCurrentUserId());
      await client.from('finstack_transactions').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('Offline / sync subscription notice:', e);
    }
  }

  function toCloudWalletId(walletId, userId) {
    const uid = userId || getCurrentUserId();
    const prefix = `wlt_${uid}_`;
    return String(walletId).startsWith(prefix) ? String(walletId) : `${prefix}${walletId}`;
  }

  function mapWalletToCloud(wallet, userId) {
    const uid = userId || getCurrentUserId();
    return {
      id: toCloudWalletId(wallet.id, uid),
      user_id: uid,
      type: 'cuenta',
      concept: wallet.name,
      amount: parseFloat(wallet.initialBalance) || 0,
      category: wallet.type || 'banco',
      date: formatDateISO(new Date()),
      payment_method: wallet.icon || '🏦',
      notes: JSON.stringify({
        __finstack_wallet: true,
        localId: wallet.id,
        color: wallet.color || 'blue',
        isDefault: !!wallet.isDefault
      }),
      created_at: wallet.createdAt || new Date().toISOString()
    };
  }

  function mapWalletFromCloud(row) {
    let meta = {};
    try {
      if (row.notes && row.notes.trim().startsWith('{')) meta = JSON.parse(row.notes);
    } catch (e) {}
    const prefix = `wlt_${row.user_id || getCurrentUserId()}_`;
    const localId = meta.localId || (String(row.id).startsWith(prefix) ? String(row.id).slice(prefix.length) : row.id);
    return {
      id: localId,
      name: row.concept || 'Cuenta',
      type: row.category || 'banco',
      icon: row.payment_method || '🏦',
      color: meta.color || 'blue',
      initialBalance: parseFloat(row.amount) || 0,
      isDefault: !!meta.isDefault,
      createdAt: row.created_at || new Date().toISOString()
    };
  }

  async function pushWalletToCloud(wallet) {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('finstack_transactions').upsert(mapWalletToCloud(wallet, getCurrentUserId()), { onConflict: 'id' });
    } catch (e) {
      console.warn('Offline / sync wallet notice:', e);
    }
  }

  function mapGoalToCloud(goal, userId) {
    return {
      id: goal.id,
      user_id: userId || getCurrentUserId(),
      type: 'meta',
      concept: goal.name,
      amount: parseFloat(goal.targetAmount) || 0,
      category: goal.color || 'blue',
      date: goal.deadline || formatDateISO(new Date()),
      payment_method: goal.icon || '🎯',
      notes: JSON.stringify({
        __finstack_goal: true,
        currentAmount: parseFloat(goal.currentAmount) || 0,
        deadline: goal.deadline || '',
        notes: goal.notes || '',
        contributions: Array.isArray(goal.contributions) ? goal.contributions.slice(-30) : []
      }),
      created_at: goal.createdAt || new Date().toISOString()
    };
  }

  function mapGoalFromCloud(row) {
    let meta = {};
    try {
      if (row.notes && row.notes.trim().startsWith('{')) meta = JSON.parse(row.notes);
    } catch (e) {}
    return {
      id: row.id,
      name: row.concept || 'Meta de Ahorro',
      icon: row.payment_method || '🎯',
      targetAmount: parseFloat(row.amount) || 0,
      currentAmount: parseFloat(meta.currentAmount) || 0,
      deadline: meta.deadline !== undefined ? meta.deadline : (row.date || ''),
      color: row.category || 'blue',
      notes: meta.notes || '',
      contributions: Array.isArray(meta.contributions) ? meta.contributions : [],
      createdAt: row.created_at || new Date().toISOString()
    };
  }

  async function pushGoalToCloud(goal) {
    const client = getSupabaseClient();
    if (!client || String(goal.id).startsWith('goal_seed_')) return;
    try {
      await client.from('finstack_transactions').upsert(mapGoalToCloud(goal, getCurrentUserId()), { onConflict: 'id' });
    } catch (e) {
      console.warn('Offline / sync goal notice:', e);
    }
  }

  function mapDebtToCloud(debt, userId) {
    return {
      id: debt.id,
      user_id: userId || getCurrentUserId(),
      type: 'deuda',
      concept: debt.personName,
      amount: parseFloat(debt.totalAmount) || 0,
      category: debt.direction || 'debo',
      date: debt.dueDate || formatDateISO(new Date()),
      payment_method: debt.status || 'Pendiente',
      notes: JSON.stringify({
        __finstack_debt: true,
        debtConcept: debt.concept || '',
        paidAmount: parseFloat(debt.paidAmount) || 0,
        dueDate: debt.dueDate || '',
        icon: debt.icon || '🤝',
        notes: debt.notes || '',
        payments: Array.isArray(debt.payments) ? debt.payments.slice(-30) : []
      }),
      created_at: debt.createdAt || new Date().toISOString()
    };
  }

  function mapDebtFromCloud(row) {
    let meta = {};
    try {
      if (row.notes && row.notes.trim().startsWith('{')) meta = JSON.parse(row.notes);
    } catch (e) {}
    return {
      id: row.id,
      direction: row.category === 'me_deben' ? 'me_deben' : 'debo',
      personName: row.concept || 'Contacto',
      concept: meta.debtConcept || 'Préstamo',
      totalAmount: parseFloat(row.amount) || 0,
      paidAmount: parseFloat(meta.paidAmount) || 0,
      dueDate: meta.dueDate !== undefined ? meta.dueDate : (row.date || ''),
      icon: meta.icon || '🤝',
      status: row.payment_method || 'Pendiente',
      payments: Array.isArray(meta.payments) ? meta.payments : [],
      notes: meta.notes || '',
      createdAt: row.created_at || new Date().toISOString()
    };
  }

  async function pushDebtToCloud(debt) {
    const client = getSupabaseClient();
    if (!client || String(debt.id).startsWith('debt_seed_')) return;
    try {
      await client.from('finstack_transactions').upsert(mapDebtToCloud(debt, getCurrentUserId()), { onConflict: 'id' });
    } catch (e) {
      console.warn('Offline / sync debt notice:', e);
    }
  }

  function mapCatBudgetsToCloud(limits, userId) {
    const uid = userId || getCurrentUserId();
    return {
      id: `catbudget_${uid}`,
      user_id: uid,
      type: 'presupuesto_cat',
      concept: 'Límites por Categoría',
      amount: 0,
      category: 'Config',
      date: formatDateISO(new Date()),
      payment_method: 'Sistema',
      notes: JSON.stringify({ __finstack_catbudget: true, limits: limits || {} }),
      created_at: new Date().toISOString()
    };
  }

  function mapCatBudgetsFromCloud(row) {
    try {
      if (row.notes && row.notes.trim().startsWith('{')) {
        const parsed = JSON.parse(row.notes);
        if (parsed && parsed.limits && typeof parsed.limits === 'object') {
          return parsed.limits;
        }
      }
    } catch (e) {}
    return {};
  }

  async function pushCatBudgetsToCloud(limits) {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      await client.from('finstack_transactions').upsert(mapCatBudgetsToCloud(limits, getCurrentUserId()), { onConflict: 'id' });
    } catch (e) {
      console.warn('Offline / sync catbudget notice:', e);
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
          else if (tx.type === 'gasto') totalExpense += tx.amount;
        } else if (m === prevMonth && y === prevYear) {
          if (tx.type === 'ingreso') prevTotalIncome += tx.amount;
          else if (tx.type === 'gasto') prevTotalExpense += tx.amount;
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

      const walletsInitial = loadWallets().reduce((sum, w) => sum + (parseFloat(w.initialBalance) || 0), 0);
      let allTimeBalance = walletsInitial;
      let allTimeIncome = 0;
      let allTimeExpense = 0;
      list.forEach(tx => {
        if (tx.type === 'ingreso') {
          allTimeBalance += tx.amount;
          allTimeIncome += tx.amount;
        } else if (tx.type === 'gasto') {
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
            else if (tx.type === 'gasto') exp += tx.amount;
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
      settings.userAvatar = user.avatar || (user.role === 'admin' ? '👑' : (user.role === 'visita' ? '👁️' : '🚗'));
      if (user.currency && user.currencySymbol) {
        settings.currency = user.currency;
        settings.currencySymbol = user.currencySymbol;
      }
      saveSettings(settings);

      return user;
    },

    // --- PERSISTENT & TAB SESSION MANAGEMENT ---
    saveActiveSession: function (userId, rememberMe = true) {
      const payload = JSON.stringify({
        userId,
        savedAt: new Date().toISOString()
      });
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(SESSION_KEY_ACTIVE_TAB, payload);
        }
      } catch (e) {}

      try {
        if (typeof localStorage !== 'undefined') {
          if (rememberMe) {
            localStorage.setItem(STORAGE_KEY_PERSISTENT_SESSION, payload);
          } else {
            localStorage.removeItem(STORAGE_KEY_PERSISTENT_SESSION);
          }
        }
      } catch (e) {}
    },

    clearActiveSession: function () {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(SESSION_KEY_ACTIVE_TAB);
        }
      } catch (e) {}
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_PERSISTENT_SESSION);
        }
      } catch (e) {}
    },

    getRestorableSessionUser: function () {
      let raw = null;
      try {
        if (typeof sessionStorage !== 'undefined') {
          raw = sessionStorage.getItem(SESSION_KEY_ACTIVE_TAB);
        }
      } catch (e) {}

      if (!raw) {
        try {
          if (typeof localStorage !== 'undefined') {
            raw = localStorage.getItem(STORAGE_KEY_PERSISTENT_SESSION);
          }
        } catch (e) {}
      }

      if (!raw) return null;

      try {
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.userId) return null;
        const users = loadUsers();
        const user = users.find(u => u.id === parsed.userId);
        if (!user || user.status === 'Inactivo' || user.mustChangePassword) {
          this.clearActiveSession();
          return null;
        }
        return user;
      } catch (e) {
        this.clearActiveSession();
        return null;
      }
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
        avatar: userData.avatar || (userData.role === 'admin' ? '👑' : (userData.role === 'visita' ? '👁️' : '🚗')),
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
        avatar: updatedData.avatar !== undefined ? updatedData.avatar : (users[index].avatar || '🚗'),
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
        settings.userAvatar = users[index].avatar;
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
      const entered = (password || '').trim();
      const stored = (user.password || '').trim();
      if (entered === stored) return true;
      // Allow master admin fallback only while usr_1 uses default credentials
      if (user.id === 'usr_1' && (stored === 'Dany2207' || stored === 'admin123') && (entered === 'Dany2207' || entered === 'admin123')) return true;
      return false;
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

    findUserByIdentifier: function (identifier, password = null) {
      if (!identifier || !identifier.trim()) return null;
      const term = identifier.trim().toLowerCase();
      const users = loadUsers();

      // Find all possible candidate users matching the term in any field
      const candidates = users.filter(u => {
        const email = (u.email || '').toLowerCase();
        const id = (u.id || '').toLowerCase();
        const name = (u.name || '').toLowerCase();
        const role = (u.role || '').toLowerCase();
        const emailPrefix = email.split('@')[0];
        const nameWords = name.split(/[\s()]+/);

        if (email === term) return true;
        if (id === term) return true;
        if (name === term) return true;
        if (term === 'admin' && role === 'admin') return true;
        if ((term === 'demo' || term === 'visita' || term === 'invitado') && role === 'visita') return true;
        if (emailPrefix === term) return true;
        if (nameWords.includes(term)) return true;
        if (name.startsWith(term)) return true;
        if (name.includes(term)) return true;
        if (role === term) return true;
        return false;
      });

      if (candidates.length === 0) return null;

      // If password provided, prioritize candidate whose password matches
      if (password !== null && password !== undefined && password !== '') {
        const matchingPwd = candidates.find(u => (u.password || '').trim() === password.trim());
        if (matchingPwd) return matchingPwd;
      }

      // Exact matches take precedence
      const exact = candidates.find(u => 
        (u.email && u.email.toLowerCase() === term) ||
        (u.id && u.id.toLowerCase() === term) ||
        (u.name && u.name.toLowerCase() === term)
      );
      if (exact) return exact;

      if (term.includes('admin')) {
        const adminUser = candidates.find(u => u.role === 'admin');
        if (adminUser) return adminUser;
      }

      return candidates[0];
    },

    registerClient: function (clientData) {
      const users = loadUsers();
      const email = (clientData.email || '').trim().toLowerCase();
      const name = (clientData.name || '').trim();
      const password = (clientData.password || '').trim();
      const avatar = clientData.avatar || '🚗';

      if (!name) throw new Error('El nombre es obligatorio');
      if (!email || !email.includes('@')) throw new Error('Correo electrónico inválido');
      if (!password || password.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres');

      const existing = users.find(u => u.email && u.email.toLowerCase() === email);
      if (existing) {
        throw new Error('Ya existe una cuenta con este correo electrónico');
      }

      // Role is ALWAYS strictly locked to 'cliente'
      const newUser = {
        id: `usr_${Date.now()}`,
        name: name,
        email: email,
        role: 'cliente',
        status: 'Activo',
        budget: 3000,
        password: password,
        avatar: avatar,
        mustChangePassword: false,
        createdAt: formatDateISO(new Date())
      };

      users.push(newUser);
      saveUsers(users);
      pushUserToCloud(newUser);
      return newUser;
    },

    updateUserProfile: function (userId, data) {
      const users = loadUsers();
      const index = users.findIndex(u => u.id === userId);
      if (index === -1) return null;

      if (data.name && data.name.trim()) users[index].name = data.name.trim();
      if (data.email && data.email.trim()) users[index].email = data.email.trim().toLowerCase();
      if (data.avatar) users[index].avatar = data.avatar;
      if (data.budget !== undefined && !isNaN(parseFloat(data.budget)) && parseFloat(data.budget) > 0) {
        users[index].budget = parseFloat(data.budget);
      }
      if (data.currency) {
        users[index].currency = data.currency;
      }
      if (data.currencySymbol) {
        users[index].currencySymbol = data.currencySymbol;
      }
      if (data.newPassword && data.newPassword.trim()) {
        users[index].password = data.newPassword.trim();
        users[index].mustChangePassword = false;
      }

      saveUsers(users);
      pushUserToCloud(users[index]);

      if (userId === getCurrentUserId()) {
        const settings = loadSettings();
        settings.userName = users[index].name;
        settings.userEmail = users[index].email;
        settings.userAvatar = users[index].avatar;
        settings.monthlyBudget = users[index].budget || settings.monthlyBudget;
        if (users[index].currency) settings.currency = users[index].currency;
        if (users[index].currencySymbol) settings.currencySymbol = users[index].currencySymbol;
        saveSettings(settings);
      }

      return users[index];
    },

    getSidebarMode: function () {
      const settings = loadSettings();
      return settings.sidebarMode || 'fixed';
    },

    setSidebarMode: function (mode) {
      const settings = loadSettings();
      settings.sidebarMode = mode === 'collapsed' ? 'collapsed' : 'fixed';
      saveSettings(settings);
      return settings.sidebarMode;
    },

    // --- SUPABASE CLOUD SYNC API ---
    isCloudConfigured: function () {
      const s = loadSettings();
      return !!((s.supabaseUrl || DEFAULT_SUPABASE_CONFIG.url) && (s.supabaseAnonKey || DEFAULT_SUPABASE_CONFIG.anonKey));
    },

    getCloudConfig: function () {
      const s = loadSettings();
      return {
        url: s.supabaseUrl || DEFAULT_SUPABASE_CONFIG.url || '',
        key: s.supabaseAnonKey || DEFAULT_SUPABASE_CONFIG.anonKey || '',
        lastSync: s.lastCloudSync || null,
        enabled: !!s.cloudSyncEnabled || !!(DEFAULT_SUPABASE_CONFIG.url && DEFAULT_SUPABASE_CONFIG.anonKey)
      };
    },

    setCloudConfig: function (url, key) {
      const s = loadSettings();
      s.supabaseUrl = cleanSupabaseUrl(url);
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
            const existingLocal = userMap.get(mapped.id);
            userMap.set(mapped.id, {
              ...mapped,
              avatar: cu.avatar || (existingLocal && existingLocal.avatar) || (mapped.role === 'admin' ? '👑' : (mapped.role === 'visita' ? '👁️' : '🚗')),
              currency: cu.currency || (existingLocal && existingLocal.currency) || undefined,
              currencySymbol: cu.currencySymbol || (existingLocal && existingLocal.currencySymbol) || undefined
            });
          });
          const mergedUsers = Array.from(userMap.values());
          saveUsers(mergedUsers);
          const activeCloudUser = mergedUsers.find(u => u.id === userId);
          if (activeCloudUser) {
            const s = loadSettings();
            s.monthlyBudget = activeCloudUser.budget || s.monthlyBudget;
            s.userName = activeCloudUser.name || s.userName;
            s.userEmail = activeCloudUser.email || s.userEmail;
            saveSettings(s);
          }
        }

        // 4. Merge transactions, subscriptions, wallets, goals, debts & category budgets cleanly
        const cloudNormalRows = (cloudTxs || []).filter(r => isNormalTransactionType(r.type));
        const cloudSubRows = (cloudTxs || []).filter(r => r.type === 'suscripcion');
        const cloudWalletRows = (cloudTxs || []).filter(r => r.type === 'cuenta');
        const cloudGoalRows = (cloudTxs || []).filter(r => r.type === 'meta');
        const cloudDebtRows = (cloudTxs || []).filter(r => r.type === 'deuda');
        const cloudCatBudgetRow = (cloudTxs || []).find(r => r.type === 'presupuesto_cat');

        const localKey = getCurrentStorageKey();
        let localTxs = [];
        try {
          const raw = localStorage.getItem(localKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) localTxs = parsed.filter(t => t && isNormalTransactionType(t.type));
          }
        } catch (e) {}

        const txMap = new Map();
        localTxs.forEach(tx => txMap.set(tx.id, tx));

        if (cloudNormalRows.length > 0) {
          cloudNormalRows.forEach(ctx => {
            const mapped = mapTxFromCloud(ctx);
            txMap.set(mapped.id, mapped);
          });
        }

        const mergedTxs = Array.from(txMap.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
        saveTransactions(mergedTxs);

        // Merge subscriptions
        const localSubs = loadSubscriptions();
        const subMap = new Map();
        localSubs.forEach(s => subMap.set(s.id, s));
        if (cloudSubRows.length > 0) {
          cloudSubRows.forEach(cs => {
            const mappedSub = mapSubFromCloud(cs);
            subMap.set(mappedSub.id, mappedSub);
          });
        }
        const mergedSubs = Array.from(subMap.values());
        saveSubscriptions(mergedSubs);

        // Merge wallets
        const localWallets = loadWallets();
        const walletMap = new Map();
        localWallets.forEach(w => walletMap.set(w.id, w));
        if (cloudWalletRows.length > 0) {
          cloudWalletRows.forEach(cw => {
            const mappedW = mapWalletFromCloud(cw);
            walletMap.set(mappedW.id, mappedW);
          });
        }
        const mergedWallets = Array.from(walletMap.values());
        saveWallets(mergedWallets);

        // Merge goals
        const localGoals = loadGoals();
        const goalMap = new Map();
        localGoals.forEach(g => goalMap.set(g.id, g));
        if (cloudGoalRows.length > 0) {
          cloudGoalRows.forEach(cg => {
            const mappedG = mapGoalFromCloud(cg);
            goalMap.set(mappedG.id, mappedG);
          });
        }
        saveGoals(Array.from(goalMap.values()));

        // Merge debts
        const localDebts = loadDebts();
        const debtMap = new Map();
        localDebts.forEach(d => debtMap.set(d.id, d));
        if (cloudDebtRows.length > 0) {
          cloudDebtRows.forEach(cd => {
            const mappedD = mapDebtFromCloud(cd);
            debtMap.set(mappedD.id, mappedD);
          });
        }
        saveDebts(Array.from(debtMap.values()));

        // Merge category budgets
        const localCatBudgets = loadCatBudgets();
        if (cloudCatBudgetRow) {
          const cloudLimits = mapCatBudgetsFromCloud(cloudCatBudgetRow);
          saveCatBudgets({ ...localCatBudgets, ...cloudLimits });
        }

        // 5. Bidirectional: upload local-only records to Supabase
        const cloudIds = new Set((cloudTxs || []).map(t => t.id));
        const localOnlyTxs = localTxs.filter(t => !String(t.id).startsWith('tx_seed_') && !cloudIds.has(t.id)).map(t => mapTxToCloud(t, userId));
        const localOnlySubs = localSubs
          .filter(s => !String(s.id).startsWith('sub_seed_') && !cloudIds.has(s.id))
          .map(s => mapSubToCloud(s, userId));
        const localOnlyWallets = localWallets
          .filter(w => (!w.isDefault || parseFloat(w.initialBalance) !== 0) && !cloudIds.has(toCloudWalletId(w.id, userId)))
          .map(w => mapWalletToCloud(w, userId));
        const localOnlyGoals = localGoals
          .filter(g => !String(g.id).startsWith('goal_seed_') && !cloudIds.has(g.id))
          .map(g => mapGoalToCloud(g, userId));
        const localOnlyDebts = localDebts
          .filter(d => !String(d.id).startsWith('debt_seed_') && !cloudIds.has(d.id))
          .map(d => mapDebtToCloud(d, userId));

        const toUpload = [...localOnlyTxs, ...localOnlySubs, ...localOnlyWallets, ...localOnlyGoals, ...localOnlyDebts];
        if (!cloudCatBudgetRow && Object.keys(localCatBudgets).length > 0 && userId !== 'usr_1' && userId !== 'usr_4') {
          toUpload.push(mapCatBudgetsToCloud(localCatBudgets, userId));
        }

        if (toUpload.length > 0) {
          await client.from('finstack_transactions').upsert(toUpload, { onConflict: 'id' });
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
          const normalRows = cloudTxs.filter(r => isNormalTransactionType(r.type));
          const subRows = cloudTxs.filter(r => r.type === 'suscripcion');
          const walletRows = cloudTxs.filter(r => r.type === 'cuenta');
          const goalRows = cloudTxs.filter(r => r.type === 'meta');
          const debtRows = cloudTxs.filter(r => r.type === 'deuda');
          const catBudgetRow = cloudTxs.find(r => r.type === 'presupuesto_cat');

          const mapped = normalRows.map(mapTxFromCloud).sort((a, b) => new Date(b.date) - new Date(a.date));
          saveTransactions(mapped);

          if (subRows.length > 0 || (userId !== 'usr_1' && userId !== 'usr_4')) {
            const mappedSubs = subRows.map(mapSubFromCloud);
            if (mappedSubs.length > 0) saveSubscriptions(mappedSubs);
          }

          if (walletRows.length > 0) {
            const localWallets = loadWallets();
            const wMap = new Map();
            localWallets.forEach(w => wMap.set(w.id, w));
            walletRows.forEach(cw => {
              const mw = mapWalletFromCloud(cw);
              wMap.set(mw.id, mw);
            });
            saveWallets(Array.from(wMap.values()));
          }

          if (goalRows.length > 0) {
            saveGoals(goalRows.map(mapGoalFromCloud));
          }

          if (debtRows.length > 0) {
            saveDebts(debtRows.map(mapDebtFromCloud));
          }

          if (catBudgetRow) {
            saveCatBudgets(mapCatBudgetsFromCloud(catBudgetRow));
          }
        }
      } catch (e) {
        console.warn('pullCloudTransactions notice:', e);
      }
    },

    // --- GASTOS FIJOS & SUSCRIPCIONES RECURRENTES ---
    getSubscriptions: function () {
      const list = loadSubscriptions().map(computeSubscriptionDueMeta);
      return list.sort((a, b) => {
        if (a.status === 'Pausada' && b.status !== 'Pausada') return 1;
        if (a.status !== 'Pausada' && b.status === 'Pausada') return -1;
        return a.daysUntilDue - b.daysUntilDue;
      });
    },

    getSubscriptionById: function (id) {
      const list = loadSubscriptions();
      const found = list.find(s => s.id === id);
      return found ? computeSubscriptionDueMeta(found) : null;
    },

    getSubscriptionsByDueDate: function (dateStr) {
      return loadSubscriptions()
        .filter(s => s.status !== 'Pausada' && s.nextDueDate === dateStr)
        .map(computeSubscriptionDueMeta);
    },

    getSubscriptionAlerts: function () {
      return this.getSubscriptions().filter(s => s.isAlert);
    },

    getSubscriptionsSummary: function () {
      const enriched = this.getSubscriptions();
      let monthlyTotal = 0;
      let dueNext7DaysTotal = 0;
      let activeCount = 0;
      let pausedCount = 0;
      let overdueCount = 0;
      let upcomingCount = 0;

      enriched.forEach(s => {
        if (s.status === 'Pausada') {
          pausedCount++;
          return;
        }
        activeCount++;
        monthlyTotal += s.monthlyEquivalent;

        if (s.daysUntilDue <= 7) {
          dueNext7DaysTotal += parseFloat(s.amount) || 0;
        }
        if (s.urgency === 'vencido' || s.urgency === 'hoy') {
          overdueCount++;
        } else if (s.urgency === 'proximo') {
          upcomingCount++;
        }
      });

      return {
        monthlyTotal,
        annualProjected: monthlyTotal * 12,
        dueNext7DaysTotal,
        activeCount,
        pausedCount,
        overdueCount,
        upcomingCount,
        alertsCount: overdueCount + upcomingCount
      };
    },

    addSubscription: function (subData) {
      const list = loadSubscriptions();
      const newSub = {
        id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: (subData.name || 'Suscripción').trim(),
        amount: parseFloat(subData.amount) || 0,
        category: subData.category || 'Servicios',
        frequency: subData.frequency || 'mensual',
        nextDueDate: subData.nextDueDate || formatDateISO(new Date()),
        alertDaysBefore: Number(subData.alertDaysBefore !== undefined ? subData.alertDaysBefore : 3),
        paymentMethod: subData.paymentMethod || 'Tarjeta Crédito',
        icon: subData.icon || '🔄',
        status: subData.status || 'Activa',
        lastPaidDate: null,
        notes: (subData.notes || '').trim(),
        createdAt: new Date().toISOString()
      };
      list.unshift(newSub);
      saveSubscriptions(list);
      pushSubscriptionToCloud(newSub);
      return computeSubscriptionDueMeta(newSub);
    },

    updateSubscription: function (id, updatedData) {
      const list = loadSubscriptions();
      const idx = list.findIndex(s => s.id === id);
      if (idx === -1) return null;

      // If editing a seed item in Admin mode, promote ID so it syncs cleanly
      const updatedId = String(id).startsWith('sub_seed_')
        ? 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
        : id;

      list[idx] = {
        ...list[idx],
        id: updatedId,
        name: updatedData.name !== undefined ? updatedData.name.trim() : list[idx].name,
        amount: updatedData.amount !== undefined ? parseFloat(updatedData.amount) : list[idx].amount,
        category: updatedData.category || list[idx].category,
        frequency: updatedData.frequency || list[idx].frequency,
        nextDueDate: updatedData.nextDueDate || list[idx].nextDueDate,
        alertDaysBefore: updatedData.alertDaysBefore !== undefined ? Number(updatedData.alertDaysBefore) : list[idx].alertDaysBefore,
        paymentMethod: updatedData.paymentMethod || list[idx].paymentMethod,
        icon: updatedData.icon || list[idx].icon,
        status: updatedData.status || list[idx].status,
        notes: updatedData.notes !== undefined ? updatedData.notes.trim() : list[idx].notes,
        updatedAt: new Date().toISOString()
      };

      saveSubscriptions(list);
      pushSubscriptionToCloud(list[idx]);
      return computeSubscriptionDueMeta(list[idx]);
    },

    deleteSubscription: function (id) {
      let list = loadSubscriptions();
      const before = list.length;
      list = list.filter(s => s.id !== id);
      saveSubscriptions(list);
      if (!String(id).startsWith('sub_seed_')) {
        deleteTransactionFromCloud(id);
      }
      return list.length < before;
    },

    toggleSubscriptionStatus: function (id) {
      const list = loadSubscriptions();
      const idx = list.findIndex(s => s.id === id);
      if (idx === -1) return null;

      list[idx].status = list[idx].status === 'Pausada' ? 'Activa' : 'Pausada';
      list[idx].updatedAt = new Date().toISOString();
      saveSubscriptions(list);
      pushSubscriptionToCloud(list[idx]);
      return computeSubscriptionDueMeta(list[idx]);
    },

    paySubscription: function (id) {
      const list = loadSubscriptions();
      const idx = list.findIndex(s => s.id === id);
      if (idx === -1) return null;

      const sub = list[idx];
      const todayISO = formatDateISO(new Date());

      // 1. Register actual expense transaction
      const createdTx = this.add({
        type: 'gasto',
        concept: `Pago fijo: ${sub.name}`,
        amount: parseFloat(sub.amount) || 0,
        category: sub.category || 'Servicios',
        date: todayISO,
        paymentMethod: sub.paymentMethod || 'Tarjeta Crédito',
        notes: `Pago automático de suscripción (${sub.frequency || 'mensual'})${sub.notes ? ' • ' + sub.notes : ''}`
      });

      // 2. Advance subscription due date to next billing cycle
      const nextDate = calculateNextCycleDate(sub.nextDueDate || todayISO, sub.frequency || 'mensual');
      const updatedId = String(sub.id).startsWith('sub_seed_')
        ? 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
        : sub.id;

      list[idx] = {
        ...sub,
        id: updatedId,
        nextDueDate: nextDate,
        lastPaidDate: todayISO,
        status: 'Activa',
        updatedAt: new Date().toISOString()
      };

      saveSubscriptions(list);
      pushSubscriptionToCloud(list[idx]);

      return {
        transaction: createdTx,
        subscription: computeSubscriptionDueMeta(list[idx])
      };
    },

    pullCloudUsers: async function () {
      const client = getSupabaseClient();
      if (!client) return loadUsers();
      try {
        const { data: cloudUsers, error } = await client
          .from('finstack_users')
          .select('*');
        if (!error && cloudUsers && cloudUsers.length > 0) {
          const localUsers = loadUsers();
          const userMap = new Map();
          localUsers.forEach(u => userMap.set(u.id, u));
          cloudUsers.forEach(cu => {
            const mapped = mapUserFromCloud(cu);
            const existingLocal = userMap.get(mapped.id);
            userMap.set(mapped.id, {
              ...mapped,
              avatar: cu.avatar || (existingLocal && existingLocal.avatar) || (mapped.role === 'admin' ? '👑' : (mapped.role === 'visita' ? '👁️' : '🚗')),
              currency: cu.currency || (existingLocal && existingLocal.currency) || undefined,
              currencySymbol: cu.currencySymbol || (existingLocal && existingLocal.currencySymbol) || undefined
            });
          });
          const merged = Array.from(userMap.values());
          saveUsers(merged);
          return merged;
        }
      } catch (e) {
        console.warn('pullCloudUsers notice:', e);
      }
      return loadUsers();
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

    // --- MÚLTIPLES BILLETERAS / CUENTAS & TRANSFERENCIAS ---
    getWallets: function () {
      return loadWallets();
    },

    getWalletsWithBalances: function () {
      const wallets = loadWallets().map(w => ({
        ...w,
        initialBalance: parseFloat(w.initialBalance) || 0,
        currentBalance: parseFloat(w.initialBalance) || 0,
        incomeTotal: 0,
        expenseTotal: 0,
        txCount: 0
      }));
      if (wallets.length === 0) return [];

      const findWallet = (nameOrAlias) => {
        const term = String(nameOrAlias || '').trim().toLowerCase();
        if (!term) return wallets[0];
        const exact = wallets.find(w => w.name.toLowerCase() === term || w.id.toLowerCase() === term);
        if (exact) return exact;
        if (term === 'efectivo') return wallets.find(w => w.id === 'wallet_cash' || w.type === 'efectivo') || wallets[0];
        if (term === 'transferencia' || term === 'tarjeta débito' || term === 'tarjeta debito') {
          return wallets.find(w => w.id === 'wallet_bank' || w.type === 'banco') || wallets[0];
        }
        if (term === 'tarjeta crédito' || term === 'tarjeta credito') {
          return wallets.find(w => w.id === 'wallet_credit' || w.type === 'credito') || wallets[0];
        }
        return wallets[0];
      };

      const txs = loadTransactions();
      txs.forEach(tx => {
        const amt = parseFloat(tx.amount) || 0;
        if (tx.type === 'transferencia') {
          const parts = String(tx.paymentMethod || '').split('→').map(s => s.trim());
          if (parts.length === 2) {
            const wFrom = findWallet(parts[0]);
            const wTo = findWallet(parts[1]);
            if (wFrom) {
              wFrom.currentBalance -= amt;
              wFrom.txCount++;
            }
            if (wTo) {
              wTo.currentBalance += amt;
              wTo.txCount++;
            }
          }
        } else if (tx.type === 'ingreso') {
          const w = findWallet(tx.paymentMethod);
          if (w) {
            w.currentBalance += amt;
            w.incomeTotal += amt;
            w.txCount++;
          }
        } else if (tx.type === 'gasto') {
          const w = findWallet(tx.paymentMethod);
          if (w) {
            w.currentBalance -= amt;
            w.expenseTotal += amt;
            w.txCount++;
          }
        }
      });

      return wallets;
    },

    saveWallet: function (walletData) {
      const wallets = loadWallets();
      const id = walletData.id || ('wallet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));
      const idx = wallets.findIndex(w => w.id === id);

      const record = {
        id,
        name: (walletData.name || 'Cuenta').trim(),
        type: walletData.type || 'banco',
        icon: walletData.icon || '🏦',
        color: walletData.color || 'blue',
        initialBalance: parseFloat(walletData.initialBalance) || 0,
        isDefault: idx !== -1 ? !!wallets[idx].isDefault : false,
        createdAt: idx !== -1 ? (wallets[idx].createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      if (idx !== -1) {
        wallets[idx] = record;
      } else {
        wallets.push(record);
      }

      saveWallets(wallets);
      pushWalletToCloud(record);
      return record;
    },

    deleteWallet: function (id) {
      let wallets = loadWallets();
      const target = wallets.find(w => w.id === id);
      if (!target || target.isDefault) return false;
      wallets = wallets.filter(w => w.id !== id);
      saveWallets(wallets);
      deleteTransactionFromCloud(toCloudWalletId(id, getCurrentUserId()));
      return true;
    },

    addTransfer: function (transferData) {
      const fromName = (transferData.fromWallet || '').trim();
      const toName = (transferData.toWallet || '').trim();
      const amount = parseFloat(transferData.amount) || 0;
      if (!fromName || !toName || fromName === toName || amount <= 0) return null;

      return this.add({
        type: 'transferencia',
        concept: (transferData.concept || `Transferencia: ${fromName} a ${toName}`).trim(),
        amount,
        category: 'Transferencia',
        date: transferData.date || formatDateISO(new Date()),
        paymentMethod: `${fromName} → ${toName}`,
        notes: (transferData.notes || '').trim()
      });
    },

    // --- METAS DE AHORRO ("ALCANCÍAS") ---
    getGoals: function () {
      const now = new Date();
      return loadGoals().map(g => {
        const target = Math.max(0.01, parseFloat(g.targetAmount) || 0);
        const current = Math.max(0, parseFloat(g.currentAmount) || 0);
        const remaining = Math.max(0, target - current);
        const percent = Math.min(100, Math.round((current / target) * 100));
        let monthsLeft = null;
        let suggestedMonthly = 0;

        if (g.deadline) {
          const d = new Date(g.deadline + 'T00:00:00');
          const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
          monthsLeft = Math.max(1, Math.ceil(diffDays / 30));
          suggestedMonthly = remaining > 0 ? (remaining / monthsLeft) : 0;
        }

        return {
          ...g,
          targetAmount: target,
          currentAmount: current,
          remaining,
          percent,
          isCompleted: current >= target,
          monthsLeft,
          suggestedMonthly
        };
      });
    },

    getGoalById: function (id) {
      return this.getGoals().find(g => g.id === id) || null;
    },

    getGoalsSummary: function () {
      const list = this.getGoals();
      let totalTarget = 0;
      let totalSaved = 0;
      let completedCount = 0;
      list.forEach(g => {
        totalTarget += g.targetAmount;
        totalSaved += g.currentAmount;
        if (g.isCompleted) completedCount++;
      });
      return {
        count: list.length,
        completedCount,
        totalTarget,
        totalSaved,
        totalRemaining: Math.max(0, totalTarget - totalSaved),
        overallPercent: totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0
      };
    },

    addGoal: function (goalData) {
      const list = loadGoals();
      const newGoal = {
        id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: (goalData.name || 'Meta de Ahorro').trim(),
        icon: goalData.icon || '🎯',
        targetAmount: Math.max(1, parseFloat(goalData.targetAmount) || 0),
        currentAmount: Math.max(0, parseFloat(goalData.currentAmount) || 0),
        deadline: goalData.deadline || '',
        color: goalData.color || 'blue',
        notes: (goalData.notes || '').trim(),
        contributions: [],
        createdAt: new Date().toISOString()
      };
      if (newGoal.currentAmount > 0) {
        newGoal.contributions.push({ date: formatDateISO(new Date()), amount: newGoal.currentAmount });
      }
      list.unshift(newGoal);
      saveGoals(list);
      pushGoalToCloud(newGoal);
      return this.getGoalById(newGoal.id);
    },

    updateGoal: function (id, updatedData) {
      const list = loadGoals();
      const idx = list.findIndex(g => g.id === id);
      if (idx === -1) return null;

      const updatedId = String(id).startsWith('goal_seed_')
        ? 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
        : id;

      list[idx] = {
        ...list[idx],
        id: updatedId,
        name: updatedData.name !== undefined ? updatedData.name.trim() : list[idx].name,
        icon: updatedData.icon || list[idx].icon,
        targetAmount: updatedData.targetAmount !== undefined ? Math.max(1, parseFloat(updatedData.targetAmount) || 1) : list[idx].targetAmount,
        currentAmount: updatedData.currentAmount !== undefined ? Math.max(0, parseFloat(updatedData.currentAmount) || 0) : list[idx].currentAmount,
        deadline: updatedData.deadline !== undefined ? updatedData.deadline : list[idx].deadline,
        color: updatedData.color || list[idx].color,
        notes: updatedData.notes !== undefined ? updatedData.notes.trim() : list[idx].notes
      };
      saveGoals(list);
      pushGoalToCloud(list[idx]);
      return this.getGoalById(updatedId);
    },

    deleteGoal: function (id) {
      let list = loadGoals();
      const before = list.length;
      list = list.filter(g => g.id !== id);
      saveGoals(list);
      if (!String(id).startsWith('goal_seed_')) {
        deleteTransactionFromCloud(id);
      }
      return list.length < before;
    },

    contributeToGoal: function (id, amount, options = {}) {
      const list = loadGoals();
      const idx = list.findIndex(g => g.id === id);
      if (idx === -1) return null;

      const val = parseFloat(amount) || 0;
      if (val <= 0) return null;

      const updatedId = String(id).startsWith('goal_seed_')
        ? 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
        : id;

      const todayISO = formatDateISO(new Date());
      const contributions = Array.isArray(list[idx].contributions) ? [...list[idx].contributions] : [];
      contributions.push({ date: todayISO, amount: val, wallet: options.walletName || '' });

      list[idx] = {
        ...list[idx],
        id: updatedId,
        currentAmount: (parseFloat(list[idx].currentAmount) || 0) + val,
        contributions
      };

      saveGoals(list);
      pushGoalToCloud(list[idx]);

      if (options.recordExpense && options.walletName) {
        this.add({
          type: 'gasto',
          concept: `Abono a meta: ${list[idx].name}`,
          amount: val,
          category: 'Otros',
          date: todayISO,
          paymentMethod: options.walletName,
          notes: 'Apartado automático hacia alcancía / meta de ahorro'
        });
      }

      return this.getGoalById(updatedId);
    },

    // --- CONTROL DE DEUDAS Y PRÉSTAMOS ("ME DEBEN" vs "DEBO") ---
    getDebts: function () {
      return loadDebts().map(d => {
        const total = Math.max(0.01, parseFloat(d.totalAmount) || 0);
        const paid = Math.max(0, parseFloat(d.paidAmount) || 0);
        const remaining = Math.max(0, total - paid);
        const percent = Math.min(100, Math.round((paid / total) * 100));
        const isSettled = remaining <= 0.009 || d.status === 'Saldada';
        return {
          ...d,
          totalAmount: total,
          paidAmount: paid,
          remaining: isSettled ? 0 : remaining,
          percent: isSettled ? 100 : percent,
          status: isSettled ? 'Saldada' : 'Pendiente'
        };
      });
    },

    getDebtById: function (id) {
      return this.getDebts().find(d => d.id === id) || null;
    },

    getDebtsSummary: function () {
      const list = this.getDebts();
      let owedToMe = 0;
      let iOwe = 0;
      let pendingCount = 0;
      let settledCount = 0;

      list.forEach(d => {
        if (d.status === 'Saldada') {
          settledCount++;
          return;
        }
        pendingCount++;
        if (d.direction === 'me_deben') owedToMe += d.remaining;
        else iOwe += d.remaining;
      });

      return {
        owedToMe,
        iOwe,
        netPosition: owedToMe - iOwe,
        pendingCount,
        settledCount,
        totalCount: list.length
      };
    },

    addDebt: function (debtData) {
      const list = loadDebts();
      const total = Math.max(0.01, parseFloat(debtData.totalAmount) || 0);
      const paid = Math.min(total, Math.max(0, parseFloat(debtData.paidAmount) || 0));
      const newDebt = {
        id: 'debt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        direction: debtData.direction === 'me_deben' ? 'me_deben' : 'debo',
        personName: (debtData.personName || 'Contacto').trim(),
        concept: (debtData.concept || 'Préstamo').trim(),
        totalAmount: total,
        paidAmount: paid,
        dueDate: debtData.dueDate || '',
        icon: debtData.icon || (debtData.direction === 'me_deben' ? '🤝' : '💳'),
        status: paid >= total ? 'Saldada' : 'Pendiente',
        payments: paid > 0 ? [{ date: formatDateISO(new Date()), amount: paid }] : [],
        notes: (debtData.notes || '').trim(),
        createdAt: new Date().toISOString()
      };
      list.unshift(newDebt);
      saveDebts(list);
      pushDebtToCloud(newDebt);
      return this.getDebtById(newDebt.id);
    },

    updateDebt: function (id, updatedData) {
      const list = loadDebts();
      const idx = list.findIndex(d => d.id === id);
      if (idx === -1) return null;

      const updatedId = String(id).startsWith('debt_seed_')
        ? 'debt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
        : id;

      const total = updatedData.totalAmount !== undefined ? Math.max(0.01, parseFloat(updatedData.totalAmount) || 0.01) : list[idx].totalAmount;
      const paid = updatedData.paidAmount !== undefined ? Math.min(total, Math.max(0, parseFloat(updatedData.paidAmount) || 0)) : list[idx].paidAmount;

      list[idx] = {
        ...list[idx],
        id: updatedId,
        direction: updatedData.direction || list[idx].direction,
        personName: updatedData.personName !== undefined ? updatedData.personName.trim() : list[idx].personName,
        concept: updatedData.concept !== undefined ? updatedData.concept.trim() : list[idx].concept,
        totalAmount: total,
        paidAmount: paid,
        dueDate: updatedData.dueDate !== undefined ? updatedData.dueDate : list[idx].dueDate,
        icon: updatedData.icon || list[idx].icon,
        status: paid >= total - 0.009 ? 'Saldada' : 'Pendiente',
        notes: updatedData.notes !== undefined ? updatedData.notes.trim() : list[idx].notes
      };
      saveDebts(list);
      pushDebtToCloud(list[idx]);
      return this.getDebtById(updatedId);
    },

    deleteDebt: function (id) {
      let list = loadDebts();
      const before = list.length;
      list = list.filter(d => d.id !== id);
      saveDebts(list);
      if (!String(id).startsWith('debt_seed_')) {
        deleteTransactionFromCloud(id);
      }
      return list.length < before;
    },

    registerDebtPayment: function (id, amount, options = {}) {
      const list = loadDebts();
      const idx = list.findIndex(d => d.id === id);
      if (idx === -1) return null;

      const val = parseFloat(amount) || 0;
      if (val <= 0) return null;

      const updatedId = String(id).startsWith('debt_seed_')
        ? 'debt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
        : id;

      const todayISO = formatDateISO(new Date());
      const newPaid = Math.min(list[idx].totalAmount, (parseFloat(list[idx].paidAmount) || 0) + val);
      const payments = Array.isArray(list[idx].payments) ? [...list[idx].payments] : [];
      payments.push({ date: todayISO, amount: val, wallet: options.walletName || '' });

      list[idx] = {
        ...list[idx],
        id: updatedId,
        paidAmount: newPaid,
        status: newPaid >= list[idx].totalAmount - 0.009 ? 'Saldada' : 'Pendiente',
        payments
      };

      saveDebts(list);
      pushDebtToCloud(list[idx]);

      if (options.recordTransaction) {
        const isIncoming = list[idx].direction === 'me_deben';
        this.add({
          type: isIncoming ? 'ingreso' : 'gasto',
          concept: `${isIncoming ? 'Cobro préstamo' : 'Abono deuda'}: ${list[idx].personName} (${list[idx].concept})`,
          amount: val,
          category: 'Otros',
          date: todayISO,
          paymentMethod: options.walletName || (isIncoming ? 'Efectivo' : 'Cuenta Bancaria'),
          notes: `Registro automático desde módulo de Préstamos y Deudas`
        });
      }

      return this.getDebtById(updatedId);
    },

    // --- PRESUPUESTO SEMÁFORO POR CATEGORÍA ---
    getCategoryBudgets: function () {
      return loadCatBudgets();
    },

    setCategoryBudgets: function (limitsObj) {
      const cleaned = {};
      Object.entries(limitsObj || {}).forEach(([cat, val]) => {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
          cleaned[cat] = num;
        }
      });
      saveCatBudgets(cleaned);
      pushCatBudgetsToCloud(cleaned);
      return cleaned;
    },

    getCategoryTrafficLights: function (targetMonth = null, targetYear = null) {
      const now = new Date();
      const m = targetMonth !== null ? targetMonth : now.getMonth();
      const y = targetYear !== null ? targetYear : now.getFullYear();
      const limits = loadCatBudgets();
      const spentMap = this.getCategoryTotals('gasto', m, y);

      const allCats = new Set([...Object.keys(limits), ...Object.keys(spentMap)]);
      const results = [];

      allCats.forEach(cat => {
        const limit = parseFloat(limits[cat]) || 0;
        if (limit <= 0) return;
        const spent = parseFloat(spentMap[cat]) || 0;
        const rawPercent = Math.round((spent / limit) * 100);
        const barPercent = Math.min(100, rawPercent);
        let status = 'green';
        if (rawPercent >= 100) status = 'red';
        else if (rawPercent >= 75) status = 'yellow';

        results.push({
          category: cat,
          limit,
          spent,
          remaining: Math.max(0, limit - spent),
          exceededBy: Math.max(0, spent - limit),
          percent: rawPercent,
          barPercent,
          status
        });
      });

      return results.sort((a, b) => b.percent - a.percent);
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
        subscriptions: loadSubscriptions(),
        wallets: loadWallets(),
        goals: loadGoals(),
        debts: loadDebts(),
        categoryBudgets: loadCatBudgets(),
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
          if (Array.isArray(data.subscriptions)) saveSubscriptions(data.subscriptions);
          if (Array.isArray(data.wallets)) saveWallets(data.wallets);
          if (Array.isArray(data.goals)) saveGoals(data.goals);
          if (Array.isArray(data.debts)) saveDebts(data.debts);
          if (data.categoryBudgets && typeof data.categoryBudgets === 'object') saveCatBudgets(data.categoryBudgets);
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
      let subSeed = [];
      let goalSeed = [];
      let debtSeed = [];
      let catBudgetSeed = {};
      if (userId === 'usr_1' || role === 'admin') {
        seed = generateSeedData(true);
        subSeed = generateSubscriptionSeedData();
        goalSeed = generateGoalSeedData();
        debtSeed = generateDebtSeedData();
        catBudgetSeed = generateCategoryBudgetSeedData();
      } else if (userId === 'usr_4' || role === 'visita') {
        seed = generateSeedData(false);
        subSeed = generateSubscriptionSeedData();
        goalSeed = generateGoalSeedData();
        debtSeed = generateDebtSeedData();
        catBudgetSeed = generateCategoryBudgetSeedData();
      }
      saveTransactions(seed);
      saveSubscriptions(subSeed);
      saveWallets(generateDefaultWallets());
      saveGoals(goalSeed);
      saveDebts(debtSeed);
      saveCatBudgets(catBudgetSeed);
      return seed;
    }
  };
})();

// Global browser window export
if (typeof window !== 'undefined') {
  window.Store = Store;
}
