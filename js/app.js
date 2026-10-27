/**
 * DashFinance - Main Application Controller
 * Handles view switching, multi-role switching, user management (Admin CRUD),
 * AI assistant integration, changelog, modals, filters, search, table rendering, toast alerts and theme toggle.
 */

const App = (function () {
  let currentView = 'dashboard';
  let editingTxId = null;
  let editingUserId = null;
  let pendingSwitchUserId = null;
  let pendingResetUserId = null;
  let isSessionLocked = true;
  let activeFilterType = 'todos';
  let activeSearchQuery = '';
  let editingSubId = null;
  let activeSubscriptionFilter = 'todas';

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
    // Clean any accidental GET query parameters in URL bar from prior form submissions
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {}
    }

    // Check for active tab or persistent ("Remember Me") session before rendering
    const restoredUser = Store.getRestorableSessionUser();
    if (restoredUser) {
      Store.switchUser(restoredUser.id);
      isSessionLocked = false;
    }

    setupTheme();
    setupCurrency();
    applySidebarMode(Store.getSidebarMode());
    setupRoleUI();
    setupEventListeners();
    updateKPIs();
    renderTransactionsTable();
    renderUsersTable();
    refreshSubscriptionsWidgets();
    ChartsManager.refreshAll();
    CalendarManager.init();
    updateBudgetProgressBar();
    renderChangelog();
    AIAssistant.init();

    if (restoredUser) {
      const lockScreen = document.getElementById('authLockScreen');
      if (lockScreen) {
        lockScreen.classList.add('hidden');
        lockScreen.classList.remove('flex');
        lockScreen.style.setProperty('display', 'none', 'important');
      }
    } else {
      initLockScreen();
    }

    // Multi-Device Cloud Sync Initialization
    if (Store.isCloudConfigured()) {
      Store.syncCloud().then(res => {
        if (res.success) {
          if (!isSessionLocked) {
            const activeAfterSync = Store.getCurrentUser();
            if (!activeAfterSync || activeAfterSync.status === 'Inactivo') {
              lockSession();
              return;
            }
          }
          setupCurrency();
          setupRoleUI();
          refreshAllUI();
          updateCloudSyncUI();
        }
      });
      Store.initRealtime(() => {
        setupCurrency();
        setupRoleUI();
        refreshAllUI();
        showToast('Actualización en tiempo real recibida de la nube', 'info');
      });
    }
    updateCloudSyncUI();

    console.log('FinStack Pro v1.5 initialized with Persistent Sessions, Regional Currencies & Cloud Sync.');
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

  // --- CURRENCY SELECTOR & REGIONAL SYMBOLS ---
  const CURRENCY_MAP = {
    GTQ: 'Q',
    USD: '$',
    MXN: '$',
    COP: '$',
    EUR: '€',
    GBP: '£',
    HNL: 'L',
    CRC: '₡'
  };

  function setupCurrency() {
    const settings = Store.getSettings();
    const code = settings.currency || 'USD';
    const symbol = settings.currencySymbol || CURRENCY_MAP[code] || '$';

    const select = document.getElementById('currencySelector');
    if (select) {
      select.value = code;
    }

    const profileSelect = document.getElementById('profileEditCurrency');
    if (profileSelect) {
      profileSelect.value = code;
    }

    document.querySelectorAll('.currency-symbol-prefix').forEach(el => {
      el.textContent = symbol;
    });
  }

  function changeCurrency(val) {
    const code = CURRENCY_MAP[val] ? val : 'USD';
    const symbol = CURRENCY_MAP[code] || '$';

    Store.updateSettings({ currency: code, currencySymbol: symbol });

    const currentUser = Store.getCurrentUser();
    if (currentUser && currentUser.role !== 'visita') {
      Store.updateUserProfile(currentUser.id, { currency: code, currencySymbol: symbol });
    }

    setupCurrency();
    refreshAllUI();
    AIAssistant.init();
    showToast(`Moneda actualizada a ${code} (${symbol})`, 'info');
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

    // Avatar emoji / icon
    if (roleAvatar) {
      const avatarIcon = currentUser.avatar || (activeRole === 'admin' ? '👑' : (activeRole === 'visita' ? '👁️' : '🚗'));
      roleAvatar.textContent = avatarIcon;
      roleAvatar.className = 'w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-lg flex items-center justify-center shadow-sm select-none border-2 border-white dark:border-slate-800';
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

    // Cloud Sync UI (Only Admin manages the button, all users sync automatically)
    updateCloudSyncUI();
  }

  // --- STRICT AUTH & LOCK SCREEN SYSTEM ---
  // --- STRICT AUTH & PORTAL SYSTEM (LOGIN / REGISTRO / VISTA DEMO) ---
  function initLockScreen() {
    const lockScreen = document.getElementById('authLockScreen');
    if (lockScreen) {
      lockScreen.classList.remove('hidden');
      lockScreen.classList.add('flex');
      lockScreen.style.display = '';
    }
    switchAuthPortalTab('login');
    const idInput = document.getElementById('portalLoginIdentifier');
    if (idInput) setTimeout(() => idInput.focus(), 150);
  }

  function switchAuthPortalTab(tab) {
    const loginForm = document.getElementById('portalLoginForm');
    const regForm = document.getElementById('portalRegisterForm');
    const tabLogin = document.getElementById('portalTabLogin');
    const tabReg = document.getElementById('portalTabRegister');
    const errLogin = document.getElementById('portalLoginError');

    if (errLogin) errLogin.classList.add('hidden');

    if (tab === 'login') {
      if (loginForm) loginForm.classList.remove('hidden');
      if (regForm) regForm.classList.add('hidden');
      if (tabLogin) tabLogin.className = 'flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm flex items-center justify-center gap-2';
      if (tabReg) tabReg.className = 'flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center gap-2';
      const idInput = document.getElementById('portalLoginIdentifier');
      if (idInput) idInput.focus();
    } else {
      if (loginForm) loginForm.classList.add('hidden');
      if (regForm) regForm.classList.remove('hidden');
      if (tabReg) tabReg.className = 'flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm flex items-center justify-center gap-2';
      if (tabLogin) tabLogin.className = 'flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center gap-2';
      const nameInput = document.getElementById('portalRegisterName');
      if (nameInput) nameInput.focus();
    }
  }

  function selectRegisterAvatar(btn, emoji) {
    const hidden = document.getElementById('portalRegisterAvatar');
    if (hidden) hidden.value = emoji;
    document.querySelectorAll('.portal-reg-avatar-btn').forEach(b => {
      b.className = 'portal-reg-avatar-btn w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent text-lg flex items-center justify-center shrink-0 transition-transform';
    });
    if (btn) {
      btn.className = 'portal-reg-avatar-btn w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500 text-lg flex items-center justify-center shrink-0 scale-105';
    }
  }

  let isSubmittingLogin = false;

  async function submitPortalLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    if (isSubmittingLogin) return false;
    isSubmittingLogin = true;

    const idInput = document.getElementById('portalLoginIdentifier');
    const pwdInput = document.getElementById('portalLoginPassword');
    const errorMsg = document.getElementById('portalLoginError');
    const submitBtn = document.getElementById('portalLoginSubmitBtn');

    const resetSubmitBtn = () => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Ingresar a FinStack</span><i class="fa-solid fa-arrow-right text-xs"></i>';
      }
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> <span>Verificando...</span>';
    }

    try {
      if (!idInput || !pwdInput) {
        resetSubmitBtn();
        return false;
      }

      const identifier = idInput.value.trim();
      const password = pwdInput.value.trim();

      if (!identifier) {
        if (errorMsg) {
          errorMsg.innerHTML = '<i class="fa-solid fa-circle-exclamation mr-1"></i> Por favor ingresa tu usuario, nombre o correo.';
          errorMsg.classList.remove('hidden');
        }
        idInput.classList.add('border-rose-500', 'ring-2', 'ring-rose-500/50');
        idInput.focus();
        resetSubmitBtn();
        return false;
      }

      if (!password) {
        if (errorMsg) {
          errorMsg.innerHTML = '<i class="fa-solid fa-circle-exclamation mr-1"></i> Por favor ingresa tu contraseña.';
          errorMsg.classList.remove('hidden');
        }
        idInput.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/50');
        pwdInput.classList.add('border-rose-500', 'ring-2', 'ring-rose-500/50');
        pwdInput.focus();
        resetSubmitBtn();
        return false;
      }

      // Try finding locally first with flexible matching
      let user = Store.findUserByIdentifier(identifier, password);

      // If user not found locally or password mismatch, check Supabase cloud users with a 2.5s safe timeout
      if (Store.isCloudConfigured() && (!user || !Store.verifyPassword(user.id, password))) {
        try {
          await Promise.race([
            Store.pullCloudUsers(),
            new Promise(resolve => setTimeout(resolve, 2500))
          ]);
          user = Store.findUserByIdentifier(identifier, password);
        } catch (cloudErr) {
          console.warn('Notice during login cloud check:', cloudErr);
        }
      }

      if (!user) {
        if (errorMsg) {
          errorMsg.innerHTML = '<i class="fa-solid fa-circle-exclamation mr-1"></i> Usuario no encontrado. Puedes escribir <strong>admin</strong>, tu nombre o tu correo.';
          errorMsg.classList.remove('hidden');
        }
        idInput.classList.add('border-rose-500', 'ring-2', 'ring-rose-500/50');
        idInput.focus();
        resetSubmitBtn();
        return false;
      }

      if (user.status === 'Inactivo') {
        showToast(`La cuenta de "${user.name}" está inactiva. Contacta a soporte o al administrador.`, 'warning');
        resetSubmitBtn();
        return false;
      }

      const isValid = Store.verifyPassword(user.id, password);
      if (!isValid) {
        if (errorMsg) {
          errorMsg.innerHTML = `<i class="fa-solid fa-circle-exclamation mr-1"></i> Contraseña incorrecta para <strong>${escapeHtml(user.name)}</strong>. Inténtalo de nuevo.`;
          errorMsg.classList.remove('hidden');
        }
        idInput.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/50');
        pwdInput.classList.add('border-rose-500', 'ring-2', 'ring-rose-500/50');
        pwdInput.focus();
        resetSubmitBtn();
        return false;
      }

      // Intercept if temporary password is used: force new password creation
      if (user.mustChangePassword) {
        if (errorMsg) errorMsg.classList.add('hidden');
        pwdInput.value = '';
        const lockScreen = document.getElementById('authLockScreen');
        if (lockScreen) {
          lockScreen.classList.add('hidden');
          lockScreen.classList.remove('flex');
          lockScreen.style.setProperty('display', 'none', 'important');
        }
        resetSubmitBtn();
        openForceChangePasswordModal(user.id);
        return false;
      }

      // Success: unlock session
      if (errorMsg) errorMsg.classList.add('hidden');
      idInput.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/50');
      pwdInput.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/50');
      idInput.value = '';
      pwdInput.value = '';

      const rememberCheckbox = document.getElementById('portalRememberMe');
      const rememberMe = rememberCheckbox ? !!rememberCheckbox.checked : true;

      Store.switchUser(user.id);
      Store.saveActiveSession(user.id, rememberMe);
      isSessionLocked = false;

      const lockScreen = document.getElementById('authLockScreen');
      if (lockScreen) {
        lockScreen.classList.add('hidden');
        lockScreen.classList.remove('flex');
        lockScreen.style.setProperty('display', 'none', 'important');
      }

      setupCurrency();
      setupRoleUI();
      refreshAllUI();
      AIAssistant.init();
      showToast(`¡Bienvenido de nuevo, ${user.name}!`, 'success');

      // Automatic background cloud sync
      if (Store.isCloudConfigured()) {
        Store.syncCloud().then(() => {
          refreshAllUI();
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Unhandled login error:', err);
      if (errorMsg) {
        errorMsg.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i> Ocurrió un error: ${escapeHtml(err.message || 'Inténtalo de nuevo')}`;
        errorMsg.classList.remove('hidden');
      }
    } finally {
      isSubmittingLogin = false;
      resetSubmitBtn();
    }
    return false;
  }

  function submitPortalRegister(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    const nameInput = document.getElementById('portalRegisterName');
    const emailInput = document.getElementById('portalRegisterEmail');
    const pwdInput = document.getElementById('portalRegisterPassword');
    const avatarInput = document.getElementById('portalRegisterAvatar');
    const submitBtn = document.getElementById('portalRegisterSubmitBtn');

    if (!nameInput || !emailInput || !pwdInput) return false;

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = pwdInput.value.trim();
    const avatar = avatarInput ? avatarInput.value : '🚗';

    if (!name || !email || !password) {
      showToast('Por favor completa todos los campos del registro.', 'warning');
      return false;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> <span>Creando cuenta...</span>';
    }

    try {
      const newUser = Store.registerClient({ name, email, password, avatar });
      Store.switchUser(newUser.id);
      Store.saveActiveSession(newUser.id, true);
      isSessionLocked = false;

      // Reset fields
      nameInput.value = '';
      emailInput.value = '';
      pwdInput.value = '';

      const lockScreen = document.getElementById('authLockScreen');
      if (lockScreen) {
        lockScreen.classList.add('hidden');
        lockScreen.classList.remove('flex');
        lockScreen.style.setProperty('display', 'none', 'important');
      }

      setupCurrency();
      setupRoleUI();
      refreshAllUI();
      AIAssistant.init();
      showToast(`¡Cuenta creada con éxito! Bienvenido a FinStack, ${newUser.name}.`, 'success');

      // Auto cloud sync
      if (Store.isCloudConfigured()) {
        Store.syncCloud().then(() => {
          refreshAllUI();
        }).catch(() => {});
      }
    } catch (err) {
      showToast(err.message || 'Error al crear la cuenta', 'danger');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Crear Cuenta y Entrar</span><i class="fa-solid fa-check text-xs"></i>';
      }
    }
    return false;
  }

  function loginAsDemo() {
    const users = Store.getUsers();
    let demoUser = users.find(u => u.role === 'visita' || u.id === 'usr_4');
    if (!demoUser) {
      demoUser = users[0];
    }

    Store.switchUser(demoUser.id);
    Store.saveActiveSession(demoUser.id, false);
    isSessionLocked = false;

    const lockScreen = document.getElementById('authLockScreen');
    if (lockScreen) {
      lockScreen.classList.add('hidden');
      lockScreen.classList.remove('flex');
      lockScreen.style.display = 'none';
    }

    setupCurrency();
    setupRoleUI();
    refreshAllUI();
    AIAssistant.init();
    showToast('👁️ Has ingresado al Modo Demo (Vista Previa). Las modificaciones de datos están deshabilitadas.', 'info');
  }

  function openSupportHelp(type) {
    if (type === 'password') {
      showToast('Si olvidaste tu contraseña, solicita una clave temporal al Administrador o escríbenos por WhatsApp.', 'info');
    }
  }

  function lockSession() {
    isSessionLocked = true;
    Store.clearActiveSession();
    const lockScreen = document.getElementById('authLockScreen');
    const pwdInput = document.getElementById('portalLoginPassword');
    const errorMsg = document.getElementById('portalLoginError');

    if (pwdInput) {
      pwdInput.value = '';
      pwdInput.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/50');
    }
    if (errorMsg) errorMsg.classList.add('hidden');

    if (lockScreen) {
      lockScreen.classList.remove('hidden');
      lockScreen.classList.add('flex');
      lockScreen.style.display = '';
    }
    switchAuthPortalTab('login');
    showToast('Sesión cerrada de forma segura', 'info');
    const idInput = document.getElementById('portalLoginIdentifier');
    if (idInput) setTimeout(() => idInput.focus(), 150);
  }

  // --- USER PROFILE & AVATAR CUSTOMIZER ---
  const AVATAR_CATALOG = {
    autos: ['🚗', '🏎️', '🚙', '🛵', '🏍️', '🚀', '✈️', '🚢', '🚜', '🚁'],
    animales: ['🐶', '🐱', '🦁', '🦊', '🐼', '🐯', '🐻', '🐨', '🐵', '🦄', '🦅', '🐬'],
    paisajes: ['🏔️', '🏖️', '🌴', '🌅', '🌌', '🌋', '🌲', '🌸', '🌊', '🪐'],
    estilos: ['👑', '💼', '🧑‍💻', '💎', '🎯', '🔥', '⚡', '🍀', '🎨', '🏆']
  };

  let currentAvatarCat = 'autos';

  function openProfileModal() {
    const user = Store.getCurrentUser();
    if (!user) return;

    const settings = Store.getSettings();
    const modal = document.getElementById('userProfileModal');
    const nameInput = document.getElementById('profileEditName');
    const emailInput = document.getElementById('profileEditEmail');
    const budgetInput = document.getElementById('profileEditBudget');
    const currencySelect = document.getElementById('profileEditCurrency');
    const previewAvatar = document.getElementById('profilePreviewAvatar');
    const previewName = document.getElementById('profilePreviewName');
    const previewRole = document.getElementById('profilePreviewRole');
    const hiddenAvatar = document.getElementById('profileSelectedAvatar');

    if (nameInput) nameInput.value = user.name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (budgetInput) budgetInput.value = user.budget || settings.monthlyBudget || 3500;

    const activeCurrency = user.currency || settings.currency || 'USD';
    if (currencySelect) {
      currencySelect.value = CURRENCY_MAP[activeCurrency] ? activeCurrency : 'USD';
      currencySelect.onchange = function () {
        const previewSym = CURRENCY_MAP[this.value] || '$';
        if (modal) {
          modal.querySelectorAll('.currency-symbol-prefix').forEach(el => {
            el.textContent = previewSym;
          });
        }
      };
    }

    if (previewName) previewName.textContent = user.name || '';
    if (previewRole) previewRole.textContent = (user.role || 'cliente').toUpperCase();

    const avatar = user.avatar || (user.role === 'admin' ? '👑' : (user.role === 'visita' ? '👁️' : '🚗'));
    if (previewAvatar) previewAvatar.textContent = avatar;
    if (hiddenAvatar) hiddenAvatar.value = avatar;

    // Reset password change fields & collapse section
    ['profileCurrentPassword', 'profileNewPassword', 'profileConfirmPassword'].forEach(id => {
      const inp = document.getElementById(id);
      if (inp) {
        inp.value = '';
        inp.type = 'password';
        inp.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/50');
      }
    });
    const pwdErr = document.getElementById('profilePasswordError');
    if (pwdErr) pwdErr.classList.add('hidden');
    toggleProfilePasswordSection(false);

    setupCurrency();
    filterAvatarCategory('autos');

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  function toggleProfilePasswordSection(forceOpen = null) {
    const section = document.getElementById('profilePasswordSection');
    const chevron = document.getElementById('profilePasswordChevron');
    if (!section) return;

    const shouldOpen = forceOpen !== null ? !!forceOpen : section.classList.contains('hidden');
    if (shouldOpen) {
      section.classList.remove('hidden');
      if (chevron) chevron.classList.add('rotate-180');
      if (forceOpen === null) {
        const currInput = document.getElementById('profileCurrentPassword');
        if (currInput) setTimeout(() => currInput.focus(), 100);
      }
    } else {
      section.classList.add('hidden');
      if (chevron) chevron.classList.remove('rotate-180');
    }
  }

  function closeProfileModal() {
    const modal = document.getElementById('userProfileModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function filterAvatarCategory(cat) {
    currentAvatarCat = cat;
    ['autos', 'animales', 'paisajes', 'estilos'].forEach(c => {
      const btn = document.getElementById(`avatarTab${c.charAt(0).toUpperCase() + c.slice(1)}`);
      if (btn) {
        if (c === cat) {
          btn.className = 'avatar-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-sm shrink-0';
        } else {
          btn.className = 'avatar-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 shrink-0';
        }
      }
    });

    renderAvatarGrid();
  }

  function renderAvatarGrid() {
    const container = document.getElementById('avatarGridContainer');
    if (!container) return;

    const list = AVATAR_CATALOG[currentAvatarCat] || AVATAR_CATALOG.autos;
    const current = document.getElementById('profileSelectedAvatar')?.value || '🚗';

    container.innerHTML = list.map(emoji => {
      const isSelected = emoji === current;
      const borderClass = isSelected ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 scale-105 ring-2 ring-blue-500/30' : 'border-transparent bg-white dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700';
      return `
        <button 
          type="button" 
          onclick="App.selectProfileAvatar('${emoji}')"
          class="w-10 h-10 rounded-xl border-2 ${borderClass} text-xl flex items-center justify-center transition-all cursor-pointer"
        >
          ${emoji}
        </button>
      `;
    }).join('');
  }

  function selectProfileAvatar(emoji) {
    const hidden = document.getElementById('profileSelectedAvatar');
    const preview = document.getElementById('profilePreviewAvatar');
    if (hidden) hidden.value = emoji;
    if (preview) preview.textContent = emoji;
    renderAvatarGrid();
  }

  function saveUserProfile(e) {
    if (e && e.preventDefault) e.preventDefault();
    const user = Store.getCurrentUser();
    if (!user) return;

    if (Store.getActiveRole() === 'visita' || user.role === 'visita') {
      showToast('Modo Demo: Las modificaciones de perfil y seguridad están deshabilitadas en vista previa.', 'warning');
      return;
    }

    const name = document.getElementById('profileEditName')?.value.trim();
    const email = document.getElementById('profileEditEmail')?.value.trim();
    const avatar = document.getElementById('profileSelectedAvatar')?.value || '🚗';
    const budgetVal = parseFloat(document.getElementById('profileEditBudget')?.value);
    const currencyRaw = document.getElementById('profileEditCurrency')?.value || Store.getSettings().currency || 'USD';
    const currency = CURRENCY_MAP[currencyRaw] ? currencyRaw : 'USD';
    const currencySymbol = CURRENCY_MAP[currency] || '$';

    if (!name) {
      showToast('El nombre completo no puede estar vacío', 'warning');
      return;
    }

    if (!email || !email.includes('@')) {
      showToast('Ingresa un correo electrónico válido', 'warning');
      return;
    }

    if (isNaN(budgetVal) || budgetVal <= 0) {
      showToast('Ingresa un presupuesto mensual válido mayor a 0', 'warning');
      return;
    }

    // Optional Password Change Validation
    const currPwdInput = document.getElementById('profileCurrentPassword');
    const newPwdInput = document.getElementById('profileNewPassword');
    const confPwdInput = document.getElementById('profileConfirmPassword');
    const pwdErr = document.getElementById('profilePasswordError');

    const currPwd = currPwdInput ? currPwdInput.value.trim() : '';
    const newPwd = newPwdInput ? newPwdInput.value.trim() : '';
    const confPwd = confPwdInput ? confPwdInput.value.trim() : '';
    const wantsPasswordChange = !!(currPwd || newPwd || confPwd);

    const showPwdError = (msg, targetInput) => {
      toggleProfilePasswordSection(true);
      if (pwdErr) {
        pwdErr.innerHTML = `<i class="fa-solid fa-circle-exclamation mr-1"></i> ${msg}`;
        pwdErr.classList.remove('hidden');
      }
      [currPwdInput, newPwdInput, confPwdInput].forEach(inp => {
        if (inp) inp.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/50');
      });
      if (targetInput) {
        targetInput.classList.add('border-rose-500', 'ring-2', 'ring-rose-500/50');
        targetInput.focus();
      }
    };

    if (wantsPasswordChange) {
      if (!currPwd) {
        showPwdError('Ingresa tu contraseña actual para autorizar el cambio.', currPwdInput);
        return;
      }
      if (!Store.verifyPassword(user.id, currPwd)) {
        showPwdError('La contraseña actual es incorrecta. Verifícala e inténtalo de nuevo.', currPwdInput);
        return;
      }
      if (!newPwd || newPwd.length < 4) {
        showPwdError('La nueva contraseña debe tener al menos 4 caracteres.', newPwdInput);
        return;
      }
      if (newPwd !== confPwd) {
        showPwdError('La nueva contraseña y su confirmación no coinciden.', confPwdInput);
        return;
      }
    }

    if (pwdErr) pwdErr.classList.add('hidden');

    Store.updateUserProfile(user.id, {
      name,
      email,
      avatar,
      budget: budgetVal,
      currency,
      currencySymbol,
      newPassword: wantsPasswordChange ? newPwd : undefined
    });

    closeProfileModal();
    setupCurrency();
    setupRoleUI();
    refreshAllUI();
    AIAssistant.init();

    if (wantsPasswordChange) {
      showToast('¡Perfil, presupuesto, moneda y nueva contraseña actualizados con éxito!', 'success');
    } else {
      showToast('¡Configuración de perfil actualizada con éxito!', 'success');
    }
  }

  // --- SIDEBAR MODE (FIJA VS DESPLEGABLE) ---
  function setSidebarMode(mode) {
    Store.setSidebarMode(mode);
    applySidebarMode(mode);
  }

  function applySidebarMode(mode) {
    const sidebar = document.getElementById('mainSidebar');
    const fixedBtn = document.getElementById('sidebarModeFixedBtn');
    const collapseBtn = document.getElementById('sidebarModeCollapseBtn');

    if (!sidebar) return;

    if (mode === 'collapsed') {
      sidebar.classList.add('sidebar-collapsed');
      if (fixedBtn) fixedBtn.className = 'flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200';
      if (collapseBtn) collapseBtn.className = 'flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm';
    } else {
      sidebar.classList.remove('sidebar-collapsed');
      if (fixedBtn) fixedBtn.className = 'flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm';
      if (collapseBtn) collapseBtn.className = 'flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200';
    }
  }

  // --- USER ACCOUNT SWITCHING WITH PASSWORD CHECK ---
  function switchUserAccount(targetUserId, bypassAuth = false) {
    const currentUserId = Store.getCurrentUserId();
    if (targetUserId === currentUserId) return;

    const users = Store.getUsers();
    const user = users.find(u => u.id === targetUserId);
    if (!user) {
      showToast('No se encontró el usuario seleccionado.', 'danger');
      return;
    }

    if (user.status === 'Inactivo') {
      showToast(`El usuario "${user.name}" está suspendido/inactivo. Actívalo en el Panel Admin antes de ingresar.`, 'warning');
      setupRoleUI();
      return;
    }

    if (bypassAuth) {
      Store.switchUser(targetUserId);
      const hadPersistent = !!(typeof localStorage !== 'undefined' && localStorage.getItem('finstack_persistent_session_v5'));
      Store.saveActiveSession(targetUserId, user.role === 'visita' ? false : hadPersistent);
      setupCurrency();
      setupRoleUI();
      refreshAllUI();
      AIAssistant.init();
      showToast(`Sesión activa: ${user.name} (${user.role.toUpperCase()})`, 'success');

      if (currentView === 'usuarios' && user.role !== 'admin') {
        switchView('dashboard');
      }

      // Automatic background cloud synchronization for any user
      if (Store.isCloudConfigured()) {
        Store.syncCloud().then(() => {
          refreshAllUI();
        });
      }
      return;
    }

    // Open User Switch Password Modal
    openSwitchModal(targetUserId);
  }

  function openSwitchModal(targetUserId) {
    pendingSwitchUserId = targetUserId;
    const user = Store.getUsers().find(u => u.id === targetUserId);
    if (!user) return;

    const modal = document.getElementById('userSwitchModal');
    const avatarEl = document.getElementById('switchTargetAvatar');
    const nameEl = document.getElementById('switchTargetName');
    const badgeEl = document.getElementById('switchTargetBadge');
    const pwdInput = document.getElementById('switchPasswordInput');
    const errorMsg = document.getElementById('switchErrorMsg');

    if (avatarEl) {
      const initials = (user.name || 'US').trim().split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase();
      avatarEl.textContent = initials;
      avatarEl.className = `w-14 h-14 mx-auto rounded-full bg-gradient-to-tr ${
        user.role === 'admin' 
          ? 'from-purple-600 to-indigo-600' 
          : (user.role === 'visita' ? 'from-amber-500 to-orange-500' : 'from-blue-600 to-cyan-600')
      } text-white font-bold text-lg flex items-center justify-center shadow-md`;
    }
    if (nameEl) nameEl.textContent = user.name;
    if (badgeEl) badgeEl.textContent = user.role.toUpperCase();
    if (pwdInput) {
      pwdInput.value = '';
      pwdInput.classList.remove('border-rose-500', 'ring-2', 'ring-rose-500/50');
    }
    if (errorMsg) errorMsg.classList.add('hidden');

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      if (pwdInput) setTimeout(() => pwdInput.focus(), 150);
    }
  }

  function closeSwitchModal() {
    const modal = document.getElementById('userSwitchModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    pendingSwitchUserId = null;
    setupRoleUI(); // Revert selector dropdown
  }

  function submitSwitchPassword(e) {
    e.preventDefault();
    if (!pendingSwitchUserId) return;

    const input = document.getElementById('switchPasswordInput');
    const errorMsg = document.getElementById('switchErrorMsg');
    const password = input ? input.value.trim() : '';

    const isValid = Store.verifyPassword(pendingSwitchUserId, password);
    if (!isValid) {
      if (errorMsg) errorMsg.classList.remove('hidden');
      if (input) {
        input.classList.add('border-rose-500', 'ring-2', 'ring-rose-500/50');
        input.focus();
      }
      return;
    }

    const targetId = pendingSwitchUserId;
    const targetUser = Store.getUsers().find(u => u.id === targetId);
    closeSwitchModal();

    if (targetUser && targetUser.mustChangePassword) {
      openForceChangePasswordModal(targetId);
      return;
    }

    switchUserAccount(targetId, true);
  }

  // Switch by role name (finds matching user)
  function switchUserRole(newRole) {
    const users = Store.getUsers();
    const targetUser = users.find(u => u.role === newRole && u.status === 'Activo') || users.find(u => u.role === newRole);
    if (targetUser) {
      switchUserAccount(targetUser.id);
    }
  }

  // --- MANDATORY PASSWORD UPDATE MODAL (PRIMER INGRESO CON CLAVE TEMPORAL) ---
  let pendingForcedChangeUserId = null;

  function openForceChangePasswordModal(userId) {
    pendingForcedChangeUserId = userId;
    const user = Store.getUsers().find(u => u.id === userId);
    if (!user) return;

    const modal = document.getElementById('forceChangePasswordModal');
    const welcomeEl = document.getElementById('forceChangeUserWelcome');
    const p1 = document.getElementById('forceNewPasswordInput');
    const p2 = document.getElementById('forceConfirmPasswordInput');
    const err = document.getElementById('forceChangeErrorMsg');

    if (welcomeEl) {
      welcomeEl.textContent = `Hola ${user.name}, tu acceso fue restablecido con una clave temporal por el Administrador. Por tu privacidad y seguridad, define tu propia contraseña personal para acceder a tus finanzas.`;
    }
    if (p1) p1.value = '';
    if (p2) p2.value = '';
    if (err) err.classList.add('hidden');

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      if (p1) setTimeout(() => p1.focus(), 150);
    }
  }

  function submitForceChangePassword(e) {
    e.preventDefault();
    if (!pendingForcedChangeUserId) return;

    const p1 = document.getElementById('forceNewPasswordInput');
    const p2 = document.getElementById('forceConfirmPasswordInput');
    const err = document.getElementById('forceChangeErrorMsg');

    const pass1 = p1 ? p1.value.trim() : '';
    const pass2 = p2 ? p2.value.trim() : '';

    if (!pass1 || pass1.length < 4) {
      showToast('La nueva contraseña debe tener al menos 4 caracteres', 'warning');
      return;
    }

    if (pass1 !== pass2) {
      if (err) {
        err.textContent = 'Las contraseñas no coinciden. Inténtalo de nuevo.';
        err.classList.remove('hidden');
      }
      if (p2) p2.focus();
      return;
    }

    const updatedUser = Store.changePersonalPassword(pendingForcedChangeUserId, pass1);
    const modal = document.getElementById('forceChangePasswordModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    const targetUserId = pendingForcedChangeUserId;
    pendingForcedChangeUserId = null;

    Store.switchUser(targetUserId);
    Store.saveActiveSession(targetUserId, true);
    isSessionLocked = false;
    setupCurrency();
    setupRoleUI();
    refreshAllUI();
    AIAssistant.init();
    showToast(`¡Contraseña establecida con éxito! Bienvenido, ${updatedUser.name}.`, 'success');

    // Automatic background cloud synchronization
    if (Store.isCloudConfigured()) {
      Store.syncCloud().then(() => {
        refreshAllUI();
      });
    }
  }

  // --- PASSWORD RESET MODAL (ADMIN EXCLUSIVO) ---
  let lastGeneratedTempPassword = '';

  function openResetPasswordModal(userId) {
    pendingResetUserId = userId;
    const user = Store.getUsers().find(u => u.id === userId);
    if (!user) return;

    const modal = document.getElementById('resetPasswordModal');
    const userNameEl = document.getElementById('resetModalUserName');
    if (userNameEl) userNameEl.textContent = `Usuario: ${user.name} (${user.email})`;

    showResetOptions();

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  function showResetOptions() {
    const optCont = document.getElementById('resetOptionsContainer');
    const resCont = document.getElementById('resetResultContainer');
    const manForm = document.getElementById('resetManualForm');
    if (optCont) optCont.classList.remove('hidden');
    if (resCont) resCont.classList.add('hidden');
    if (manForm) manForm.classList.add('hidden');
  }

  function showManualPasswordForm() {
    const optCont = document.getElementById('resetOptionsContainer');
    const resCont = document.getElementById('resetResultContainer');
    const manForm = document.getElementById('resetManualForm');
    const input = document.getElementById('resetNewPasswordInput');
    if (optCont) optCont.classList.add('hidden');
    if (resCont) resCont.classList.add('hidden');
    if (manForm) manForm.classList.remove('hidden');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 150);
    }
  }

  function generateTempPasswordForUser() {
    if (!pendingResetUserId) return;
    const result = Store.generateTemporaryPassword(pendingResetUserId);
    if (!result) return;

    lastGeneratedTempPassword = result.tempPassword;

    const optCont = document.getElementById('resetOptionsContainer');
    const resCont = document.getElementById('resetResultContainer');
    const codeEl = document.getElementById('generatedTempPasswordText');

    if (codeEl) codeEl.textContent = result.tempPassword;
    if (optCont) optCont.classList.add('hidden');
    if (resCont) resCont.classList.remove('hidden');

    showToast(`Clave temporal generada: ${result.tempPassword}`, 'info');
  }

  function copyTempPassword() {
    if (!lastGeneratedTempPassword) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastGeneratedTempPassword).then(() => {
        showToast('¡Clave temporal copiada al portapapeles!', 'success');
      }).catch(() => {
        showToast(`Código: ${lastGeneratedTempPassword}`, 'info');
      });
    } else {
      showToast(`Código: ${lastGeneratedTempPassword}`, 'info');
    }
  }

  function closeResetPasswordModal() {
    const modal = document.getElementById('resetPasswordModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    pendingResetUserId = null;
    lastGeneratedTempPassword = '';
  }

  function submitResetPassword(e) {
    e.preventDefault();
    if (!pendingResetUserId) return;

    const input = document.getElementById('resetNewPasswordInput');
    const newPassword = input ? input.value.trim() : '';
    if (!newPassword || newPassword.length < 3) {
      showToast('La nueva contraseña debe tener al menos 3 caracteres', 'warning');
      return;
    }

    const user = Store.resetUserPassword(pendingResetUserId, newPassword, false);
    if (user) {
      showToast(`¡Contraseña de ${user.name} actualizada con éxito!`, 'success');
    }
    closeResetPasswordModal();
    renderUsersTable();
  }

  // --- SUPABASE CLOUD SYNC UI HANDLERS ---
  function openCloudSyncModal() {
    if (Store.getActiveRole() !== 'admin') {
      showToast('Solo el Administrador puede gestionar la infraestructura de la Nube.', 'warning');
      return;
    }

    const modal = document.getElementById('cloudSyncModal');
    const urlInput = document.getElementById('supabaseUrlInput');
    const keyInput = document.getElementById('supabaseKeyInput');
    const config = Store.getCloudConfig();

    if (urlInput) urlInput.value = config.url || '';
    if (keyInput) keyInput.value = config.key || '';

    updateCloudSyncUI();

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  function closeCloudSyncModal() {
    const modal = document.getElementById('cloudSyncModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function updateCloudSyncUI() {
    const isConfigured = Store.isCloudConfigured();
    const config = Store.getCloudConfig();
    const activeRole = Store.getActiveRole();
    const isAdmin = activeRole === 'admin';

    const dot = document.getElementById('cloudStatusDot');
    const title = document.getElementById('cloudStatusTitle');
    const sub = document.getElementById('cloudStatusSubtitle');
    const btnSync = document.getElementById('btnManualSync');
    const btnDisconnect = document.getElementById('btnDisconnectCloud');
    const headerBtn = document.getElementById('cloudSyncHeaderBtn');
    const headerLabel = document.getElementById('cloudSyncHeaderLabel');
    const sidebarBtn = document.getElementById('adminOnlyNavCloud');
    const sidebarBadge = document.getElementById('cloudSidebarBadge');

    // ONLY the Admin sees and manages the cloud infrastructure buttons
    if (headerBtn) {
      if (isAdmin) {
        headerBtn.classList.remove('hidden');
      } else {
        headerBtn.classList.add('hidden');
      }
    }

    if (sidebarBtn) {
      if (isAdmin) {
        sidebarBtn.classList.remove('hidden');
      } else {
        sidebarBtn.classList.add('hidden');
      }
    }

    if (isConfigured) {
      if (dot) dot.className = 'w-3 h-3 rounded-full bg-emerald-500 animate-pulse';
      if (title) title.textContent = '🟢 Conectado a Supabase Cloud';
      if (sub) {
        const last = config.lastSync ? new Date(config.lastSync).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Reciente';
        sub.textContent = `Sincronización multi-dispositivo activa. Última sincronización: ${last}`;
      }
      if (btnSync) btnSync.classList.remove('hidden');
      if (btnDisconnect) btnDisconnect.classList.remove('hidden');
      if (headerBtn) {
        headerBtn.className = `${isAdmin ? 'inline-flex' : 'hidden'} items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-sm`;
      }
      if (headerLabel) headerLabel.textContent = 'En la Nube (Admin)';
      if (sidebarBadge) {
        sidebarBadge.className = 'ml-auto text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300';
        sidebarBadge.textContent = 'CLOUD';
      }
    } else {
      if (dot) dot.className = 'w-3 h-3 rounded-full bg-slate-400';
      if (title) title.textContent = 'Modo Local (Sin sincronizar)';
      if (sub) sub.textContent = 'Tus datos solo viven en este dispositivo. Conecta Supabase para sincronizar con tu celular y laptop.';
      if (btnSync) btnSync.classList.add('hidden');
      if (btnDisconnect) btnDisconnect.classList.add('hidden');
      if (headerBtn) {
        headerBtn.className = `${isAdmin ? 'inline-flex' : 'hidden'} items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-400`;
      }
      if (headerLabel) headerLabel.textContent = 'Nube (Admin)';
      if (sidebarBadge) {
        sidebarBadge.className = 'ml-auto text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
        sidebarBadge.textContent = 'ADMIN';
      }
    }
  }

  async function saveCloudSyncSettings(e) {
    e.preventDefault();
    const urlInput = document.getElementById('supabaseUrlInput');
    const keyInput = document.getElementById('supabaseKeyInput');
    const url = urlInput ? urlInput.value.trim() : '';
    const key = keyInput ? keyInput.value.trim() : '';

    if (!url || !key) {
      showToast('Por favor ingresa la URL y la Anon Key de Supabase', 'warning');
      return;
    }

    showToast('Conectando con Supabase...', 'info');
    Store.setCloudConfig(url, key);

    const result = await Store.syncCloud();
    if (result.success) {
      showToast(`¡Conexión exitosa! Sincronizadas ${result.transactionsCount || 0} transacciones`, 'success');
      Store.initRealtime(() => {
        refreshAllUI();
        showToast('Actualización en tiempo real recibida desde otro dispositivo', 'info');
      });
      updateCloudSyncUI();
      refreshAllUI();
      closeCloudSyncModal();
    } else {
      showToast(`Error al conectar: ${result.message}`, 'danger');
      updateCloudSyncUI();
    }
  }

  async function triggerCloudSync() {
    showToast('Sincronizando con la nube...', 'info');
    const result = await Store.syncCloud();
    if (result.success) {
      refreshAllUI();
      updateCloudSyncUI();
      showToast('¡Datos sincronizados con éxito!', 'success');
    } else {
      showToast(`Error: ${result.message}`, 'danger');
    }
  }

  function disconnectCloudSync() {
    Store.disconnectCloud();
    updateCloudSyncUI();
    showToast('Sincronización en la nube desactivada. Operando en modo local.', 'info');
  }

  function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    const btn = input.parentElement ? input.parentElement.querySelector('button i') : null;
    if (btn) {
      btn.className = isPassword ? 'fa-regular fa-eye-slash text-sm' : 'fa-regular fa-eye text-sm';
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
            <div class="flex items-center justify-center gap-1.5">
              ${isCurrent ? `
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-700">
                  <i class="fa-solid fa-circle-check text-xs"></i> Activo
                </span>
              ` : `
                <button 
                  onclick="App.switchUserAccount('${user.id}')" 
                  title="Iniciar sesión como este usuario" 
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-blue-900/40 dark:hover:bg-blue-600 dark:text-blue-300 text-xs font-bold transition-all shadow-xs border border-blue-200 dark:border-blue-800"
                >
                  <i class="fa-solid fa-right-to-bracket text-xs"></i>
                  <span>Ingresar</span>
                </button>
              `}
              <button 
                onclick="App.openResetPasswordModal('${user.id}')" 
                title="Restablecer contraseña del usuario" 
                class="w-7 h-7 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              >
                <i class="fa-solid fa-key text-xs"></i>
              </button>
              <button 
                onclick="App.toggleUserStatus('${user.id}')" 
                title="${user.status === 'Activo' ? 'Suspender usuario' : 'Activar usuario'}" 
                class="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
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
    const pwdAsterisk = document.getElementById('userPasswordReqAsterisk');
    const pwdInput = document.getElementById('userPasswordInput');
    const pwdHint = document.getElementById('userPasswordHint');
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
        if (pwdInput) {
          pwdInput.value = '';
          pwdInput.required = false;
          pwdInput.placeholder = 'Dejar en blanco para conservar contraseña actual';
        }
        if (pwdAsterisk) pwdAsterisk.classList.add('hidden');
        if (pwdHint) pwdHint.textContent = 'Escribe una nueva contraseña solo si deseas cambiarla.';
      }
    } else {
      title.textContent = 'Crear Nuevo Usuario';
      if (pwdInput) {
        pwdInput.value = '';
        pwdInput.required = true;
        pwdInput.placeholder = 'Contraseña de la cuenta (mín. 4 caracteres)';
      }
      if (pwdAsterisk) pwdAsterisk.classList.remove('hidden');
      if (pwdHint) pwdHint.textContent = 'El usuario usará esta clave para ingresar a sus finanzas.';
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

    if (Store.getActiveRole() !== 'admin') {
      showToast('Solo el Administrador tiene permisos para gestionar usuarios', 'warning');
      return;
    }

    const name = document.getElementById('userNameInput').value.trim();
    const email = document.getElementById('userEmailInput').value.trim();
    const role = document.getElementById('userRoleSelect').value;
    const budget = parseFloat(document.getElementById('userBudgetInput').value) || 3000;
    const password = document.getElementById('userPasswordInput') ? document.getElementById('userPasswordInput').value.trim() : '';

    if (!name || !email) {
      showToast('Por favor completa el nombre y el correo', 'warning');
      return;
    }

    if (editingUserId) {
      const updateData = { name, email, role, budget };
      if (password) updateData.password = password;
      Store.updateUser(editingUserId, updateData);
      showToast('Usuario actualizado con éxito', 'success');
    } else {
      if (!password || password.length < 3) {
        showToast('Por favor asigna una contraseña de al menos 3 caracteres', 'warning');
        return;
      }
      const newUser = Store.addUser({ name, email, role, budget, password });
      showToast(`Usuario "${newUser.name}" creado con éxito`, 'success');
    }

    closeUserModal();
    setupRoleUI();
    renderUsersTable();
  }

  function deleteUser(id) {
    if (Store.getActiveRole() !== 'admin') {
      showToast('Solo el Administrador tiene permisos para eliminar usuarios', 'warning');
      return;
    }
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
    if (Store.getActiveRole() !== 'admin') {
      showToast('Solo el Administrador tiene permisos para modificar el estado de usuarios', 'warning');
      return;
    }
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
    } else if (viewName === 'suscripciones') {
      renderSubscriptionsView();
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

    if (Store.getActiveRole() === 'visita') {
      showToast('Modo Demo: Estás en vista previa de sólo lectura. No es posible crear ni modificar transacciones.', 'warning');
      closeTransactionModal();
      return;
    }

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
    if (Store.getActiveRole() === 'visita') {
      showToast('Modo Demo: No es posible eliminar transacciones en vista previa.', 'warning');
      closeDeleteModal();
      return;
    }
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
    refreshSubscriptionsWidgets();
    ChartsManager.refreshAll();
    CalendarManager.refresh();

    if (currentView === 'gastos') renderExpenseView();
    if (currentView === 'ingresos') renderIncomeView();
    if (currentView === 'suscripciones') renderSubscriptionsView();
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

  // ==========================================================
  // GASTOS FIJOS, SUSCRIPCIONES RECURRENTES & ALERTAS
  // ==========================================================
  function formatDateDisplay(isoStr) {
    if (!isoStr || !isoStr.includes('-')) return isoStr || '-';
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  }

  function getFrequencyLabel(freq) {
    const map = {
      semanal: 'Semanal',
      quincenal: 'Quincenal',
      mensual: 'Mensual',
      trimestral: 'Trimestral',
      anual: 'Anual'
    };
    return map[freq] || 'Mensual';
  }

  function refreshSubscriptionsWidgets() {
    renderNotificationsCenter();
    renderDashboardUpcomingBills();
    renderSubscriptionsView();
  }

  function toggleNotificationsDropdown(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const dropdown = document.getElementById('notificationsDropdown');
    if (!dropdown) return;
    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
      renderNotificationsCenter();
      dropdown.classList.remove('hidden');
    } else {
      dropdown.classList.add('hidden');
    }
  }

  function closeNotificationsDropdown() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) dropdown.classList.add('hidden');
  }

  function renderNotificationsCenter() {
    const alerts = Store.getSubscriptionAlerts();
    const bellBadge = document.getElementById('bellAlertBadge');
    const sidebarBadge = document.getElementById('sidebarSubsAlertBadge');
    const listEl = document.getElementById('notificationsDropdownList');

    // Update header bell badge
    if (bellBadge) {
      if (alerts.length > 0) {
        bellBadge.textContent = alerts.length > 9 ? '9+' : String(alerts.length);
        bellBadge.classList.remove('hidden');
        bellBadge.classList.add('flex');
      } else {
        bellBadge.classList.add('hidden');
        bellBadge.classList.remove('flex');
      }
    }

    // Update sidebar nav badge
    if (sidebarBadge) {
      if (alerts.length > 0) {
        sidebarBadge.textContent = String(alerts.length);
        sidebarBadge.classList.remove('hidden');
      } else {
        sidebarBadge.classList.add('hidden');
      }
    }

    // Populate bell dropdown items
    if (!listEl) return;

    if (alerts.length === 0) {
      listEl.innerHTML = `
        <div class="p-6 text-center">
          <div class="w-11 h-11 mx-auto mb-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center text-lg">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <p class="text-xs font-bold text-slate-800 dark:text-slate-200">¡Todo al día!</p>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">No tienes gastos fijos vencidos ni próximos a vencer.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = alerts.map(sub => {
      const isUrgent = sub.urgency === 'vencido' || sub.urgency === 'hoy';
      const pillClass = isUrgent
        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300';

      return `
        <div class="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-2.5">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">
              ${escapeHtml(sub.icon || '🔄')}
            </div>
            <div class="min-w-0">
              <p class="text-xs font-bold text-slate-900 dark:text-white truncate">${escapeHtml(sub.name)}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pillClass}">${escapeHtml(sub.statusLabel)}</span>
                <span class="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">${formatMoney(sub.amount)}</span>
              </div>
            </div>
          </div>
          <button 
            type="button"
            onclick="App.paySubscription('${sub.id}')" 
            class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 shadow-xs transition-colors"
            title="Registrar pago de hoy y avanzar al próximo ciclo"
          >
            Pagar
          </button>
        </div>
      `;
    }).join('');
  }

  function renderDashboardUpcomingBills() {
    const banner = document.getElementById('dashboardUpcomingBillsBanner');
    if (!banner) return;

    const alerts = Store.getSubscriptionAlerts();
    if (alerts.length === 0) {
      banner.classList.add('hidden');
      banner.innerHTML = '';
      return;
    }

    const hasOverdue = alerts.some(a => a.urgency === 'vencido' || a.urgency === 'hoy');
    const borderTone = hasOverdue
      ? 'border-rose-200 dark:border-rose-900/60 bg-gradient-to-r from-rose-50/90 via-white to-amber-50/60 dark:from-rose-950/30 dark:via-[#1E293B] dark:to-slate-900'
      : 'border-amber-200 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/90 via-white to-blue-50/50 dark:from-amber-950/30 dark:via-[#1E293B] dark:to-slate-900';

    const topAlerts = alerts.slice(0, 3);

    banner.classList.remove('hidden');
    banner.innerHTML = `
      <div class="p-4 md:p-5 rounded-2xl border ${borderTone} shadow-xs space-y-3">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl ${hasOverdue ? 'bg-rose-500' : 'bg-amber-500'} text-white flex items-center justify-center text-sm shadow-sm shrink-0">
              <i class="fa-solid fa-bell"></i>
            </div>
            <div>
              <h3 class="text-xs md:text-sm font-extrabold text-slate-900 dark:text-white">
                Tienes ${alerts.length} ${alerts.length === 1 ? 'pago fijo pendiente de atención' : 'pagos fijos pendientes de atención'}
              </h3>
              <p class="text-[11px] text-slate-600 dark:text-slate-300">
                Registra el pago en 1 clic para descontarlo de tu mes y avanzar la próxima fecha de corte.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onclick="App.switchView('suscripciones')" 
            class="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors shrink-0"
          >
            Ver Gastos Fijos <i class="fa-solid fa-arrow-right text-[10px] ml-1"></i>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          ${topAlerts.map(sub => {
            const urgent = sub.urgency === 'vencido' || sub.urgency === 'hoy';
            return `
              <div class="p-3 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/70 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="text-xl shrink-0">${escapeHtml(sub.icon || '🔄')}</span>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-slate-900 dark:text-white truncate">${escapeHtml(sub.name)}</p>
                    <p class="text-[11px] font-semibold ${urgent ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}">
                      ${escapeHtml(sub.statusLabel)} • <strong>${formatMoney(sub.amount)}</strong>
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onclick="App.paySubscription('${sub.id}')" 
                  class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 transition-colors"
                >
                  <i class="fa-solid fa-check mr-1"></i>Pagar
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function setSubscriptionFilter(filter) {
    activeSubscriptionFilter = filter || 'todas';
    document.querySelectorAll('.sub-filter-btn').forEach(btn => {
      const f = btn.getAttribute('data-sub-filter');
      if (f === activeSubscriptionFilter) {
        btn.classList.add('bg-blue-600', 'text-white');
        btn.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:text-slate-900');
      } else {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:text-slate-900');
      }
    });
    renderSubscriptionsView();
  }

  function renderSubscriptionsView() {
    const summary = Store.getSubscriptionsSummary();
    const settings = Store.getSettings();
    const budget = settings.monthlyBudget || 3500;
    const budgetShare = budget > 0 ? Math.round((summary.monthlyTotal / budget) * 100) : 0;

    // Update KPIs
    const elMonthly = document.getElementById('subKpiMonthlyTotal');
    const elShare = document.getElementById('subKpiBudgetShare');
    const elAlerts = document.getElementById('subKpiAlertsCount');
    const elAlertsSub = document.getElementById('subKpiAlertsSubtitle');
    const elNext7 = document.getElementById('subKpiNext7Days');
    const elActive = document.getElementById('subKpiActiveCount');
    const elAnnual = document.getElementById('subKpiAnnualTotal');

    if (elMonthly) elMonthly.textContent = formatMoney(summary.monthlyTotal);
    if (elShare) elShare.textContent = `${budgetShare}%`;
    if (elAlerts) {
      elAlerts.textContent = String(summary.alertsCount);
      elAlerts.className = `text-2xl font-black mt-1.5 ${
        summary.alertsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
      }`;
    }
    if (elAlertsSub) {
      if (summary.overdueCount > 0) {
        elAlertsSub.innerHTML = `<span class="text-rose-600 dark:text-rose-400 font-bold">${summary.overdueCount} vencido(s)</span> y ${summary.upcomingCount} próximo(s)`;
      } else if (summary.upcomingCount > 0) {
        elAlertsSub.innerHTML = `<span class="text-amber-600 dark:text-amber-400 font-bold">${summary.upcomingCount} pago(s) próximo(s)</span> a vencer`;
      } else {
        elAlertsSub.textContent = 'Sin cobros vencidos ni urgentes';
      }
    }
    if (elNext7) elNext7.textContent = formatMoney(summary.dueNext7DaysTotal);
    if (elActive) elActive.textContent = String(summary.activeCount);
    if (elAnnual) elAnnual.textContent = formatMoney(summary.annualProjected);

    // Render list
    const listContainer = document.getElementById('subscriptionsListContainer');
    const emptyState = document.getElementById('subscriptionsEmptyState');
    if (!listContainer) return;

    let subs = Store.getSubscriptions();
    if (activeSubscriptionFilter === 'alertas') {
      subs = subs.filter(s => s.isAlert);
    } else if (activeSubscriptionFilter === 'activas') {
      subs = subs.filter(s => s.status !== 'Pausada');
    } else if (activeSubscriptionFilter === 'pausadas') {
      subs = subs.filter(s => s.status === 'Pausada');
    }

    if (subs.length === 0) {
      listContainer.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    listContainer.innerHTML = subs.map(sub => {
      const isPaused = sub.status === 'Pausada';
      let badgeClasses = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400';
      let badgeIcon = 'fa-calendar-check';

      if (isPaused) {
        badgeClasses = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
        badgeIcon = 'fa-pause';
      } else if (sub.urgency === 'vencido' || sub.urgency === 'hoy') {
        badgeClasses = 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 ring-1 ring-rose-500/30';
        badgeIcon = 'fa-circle-exclamation';
      } else if (sub.urgency === 'proximo') {
        badgeClasses = 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 ring-1 ring-amber-500/30';
        badgeIcon = 'fa-clock';
      }

      return `
        <div class="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${isPaused ? 'opacity-65' : ''}">
          <!-- Left: Icon + Info -->
          <div class="flex items-start sm:items-center gap-3.5 min-w-0">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-gray-200/70 dark:border-slate-700 flex items-center justify-center text-2xl shrink-0 shadow-xs">
              ${escapeHtml(sub.icon || '🔄')}
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-sm md:text-base font-extrabold text-slate-900 dark:text-white">${escapeHtml(sub.name)}</h4>
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badgeClasses}">
                  <i class="fa-solid ${badgeIcon} text-[10px]"></i>
                  ${escapeHtml(sub.statusLabel)}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300 mt-1">
                <span><i class="fa-solid fa-tag text-[10px] opacity-60 mr-1"></i>${escapeHtml(sub.category)}</span>
                <span>•</span>
                <span><i class="fa-solid fa-repeat text-[10px] opacity-60 mr-1"></i>${getFrequencyLabel(sub.frequency)}</span>
                <span>•</span>
                <span><i class="fa-regular fa-calendar text-[10px] opacity-60 mr-1"></i>Próximo corte: <strong>${formatDateDisplay(sub.nextDueDate)}</strong></span>
                <span>•</span>
                <span><i class="fa-regular fa-credit-card text-[10px] opacity-60 mr-1"></i>${escapeHtml(sub.paymentMethod)}</span>
              </div>
              ${sub.notes ? `<p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(sub.notes)}</p>` : ''}
              ${sub.lastPaidDate ? `<p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1"><i class="fa-solid fa-check-double mr-1"></i>Último pago registrado: ${formatDateDisplay(sub.lastPaidDate)}</p>` : ''}
            </div>
          </div>

          <!-- Right: Amount + Actions -->
          <div class="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-slate-800 shrink-0">
            <div class="text-left lg:text-right mr-1">
              <span class="text-base md:text-lg font-black text-slate-900 dark:text-white block">${formatMoney(sub.amount)}</span>
              <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Alerta ${sub.alertDaysBefore || 3}d antes</span>
            </div>

            <div class="flex items-center gap-1.5">
              ${!isPaused ? `
                <button 
                  type="button"
                  onclick="App.paySubscription('${sub.id}')" 
                  class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                  title="Registrar el gasto hoy y programar el próximo vencimiento"
                >
                  <i class="fa-solid fa-check"></i>
                  <span>Registrar Pago</span>
                </button>
              ` : ''}

              <button 
                type="button"
                onclick="App.toggleSubscriptionStatus('${sub.id}')" 
                title="${isPaused ? 'Reanudar alertas y cobro' : 'Pausar temporalmente'}"
                class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition-colors"
              >
                <i class="fa-solid ${isPaused ? 'fa-play text-emerald-500' : 'fa-pause'}"></i>
              </button>

              <button 
                type="button"
                onclick="App.openSubscriptionModal('${sub.id}')" 
                title="Editar gasto fijo"
                class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/40 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 flex items-center justify-center text-xs transition-colors"
              >
                <i class="fa-solid fa-pen"></i>
              </button>

              <button 
                type="button"
                onclick="App.deleteSubscription('${sub.id}')" 
                title="Eliminar gasto fijo"
                class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-900/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 flex items-center justify-center text-xs transition-colors"
              >
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function selectSubIcon(btn, emoji) {
    const hidden = document.getElementById('subIconInput');
    if (hidden) hidden.value = emoji;
    document.querySelectorAll('.sub-icon-btn').forEach(b => {
      b.className = 'sub-icon-btn w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent text-base flex items-center justify-center shrink-0 transition-transform';
    });
    if (btn) {
      btn.className = 'sub-icon-btn w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500 text-base flex items-center justify-center shrink-0 scale-105';
    } else {
      // Match by emoji text
      document.querySelectorAll('.sub-icon-btn').forEach(b => {
        if (b.textContent.trim() === emoji) {
          b.className = 'sub-icon-btn w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500 text-base flex items-center justify-center shrink-0 scale-105';
        }
      });
    }
  }

  function openSubscriptionModal(editId = null) {
    if (Store.getActiveRole() === 'visita') {
      showToast('Modo Demo: Vista previa de solo lectura. Crea tu cuenta para programar tus gastos fijos.', 'warning');
      return;
    }

    editingSubId = editId || null;
    const modal = document.getElementById('subscriptionModal');
    const titleEl = document.getElementById('subModalTitle');
    const nameEl = document.getElementById('subName');
    const amountEl = document.getElementById('subAmount');
    const freqEl = document.getElementById('subFrequency');
    const dueEl = document.getElementById('subNextDueDate');
    const alertEl = document.getElementById('subAlertDays');
    const catEl = document.getElementById('subCategory');
    const methodEl = document.getElementById('subPaymentMethod');
    const notesEl = document.getElementById('subNotes');

    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (editingSubId) {
      const sub = Store.getSubscriptionById(editingSubId);
      if (!sub) return;
      if (titleEl) titleEl.textContent = 'Editar Gasto Fijo';
      if (nameEl) nameEl.value = sub.name || '';
      if (amountEl) amountEl.value = sub.amount || '';
      if (freqEl) freqEl.value = sub.frequency || 'mensual';
      if (dueEl) dueEl.value = sub.nextDueDate || todayISO;
      if (alertEl) alertEl.value = String(sub.alertDaysBefore !== undefined ? sub.alertDaysBefore : 3);
      if (catEl) catEl.value = sub.category || 'Servicios';
      if (methodEl) methodEl.value = sub.paymentMethod || 'Tarjeta Crédito';
      if (notesEl) notesEl.value = sub.notes || '';
      selectSubIcon(null, sub.icon || '🔄');
    } else {
      if (titleEl) titleEl.textContent = 'Nuevo Gasto Fijo';
      if (nameEl) nameEl.value = '';
      if (amountEl) amountEl.value = '';
      if (freqEl) freqEl.value = 'mensual';
      if (dueEl) dueEl.value = todayISO;
      if (alertEl) alertEl.value = '3';
      if (catEl) catEl.value = 'Servicios';
      if (methodEl) methodEl.value = 'Tarjeta Crédito';
      if (notesEl) notesEl.value = '';
      selectSubIcon(null, '🔄');
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      setTimeout(() => nameEl && nameEl.focus(), 100);
    }
  }

  function openSubscriptionFromPreset(name, icon, category, paymentMethod) {
    if (Store.getActiveRole() === 'visita') {
      showToast('Modo Demo: Vista previa de solo lectura. Crea tu cuenta para agregar gastos fijos.', 'warning');
      return;
    }
    openSubscriptionModal(null);
    const nameEl = document.getElementById('subName');
    const catEl = document.getElementById('subCategory');
    const methodEl = document.getElementById('subPaymentMethod');
    const amountEl = document.getElementById('subAmount');

    if (nameEl) nameEl.value = name;
    if (catEl) catEl.value = category;
    if (methodEl) methodEl.value = paymentMethod;
    selectSubIcon(null, icon);

    setTimeout(() => amountEl && amountEl.focus(), 120);
  }

  function closeSubscriptionModal() {
    editingSubId = null;
    const modal = document.getElementById('subscriptionModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function handleSubscriptionSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    if (Store.getActiveRole() === 'visita') {
      showToast('Modo Demo: No es posible guardar cambios en vista previa.', 'warning');
      closeSubscriptionModal();
      return false;
    }

    const name = (document.getElementById('subName')?.value || '').trim();
    const amount = parseFloat(document.getElementById('subAmount')?.value || '0');
    const frequency = document.getElementById('subFrequency')?.value || 'mensual';
    const nextDueDate = document.getElementById('subNextDueDate')?.value || '';
    const alertDaysBefore = parseInt(document.getElementById('subAlertDays')?.value || '3', 10);
    const category = document.getElementById('subCategory')?.value || 'Servicios';
    const paymentMethod = document.getElementById('subPaymentMethod')?.value || 'Tarjeta Crédito';
    const icon = document.getElementById('subIconInput')?.value || '🔄';
    const notes = (document.getElementById('subNotes')?.value || '').trim();

    if (!name || amount <= 0 || !nextDueDate) {
      showToast('Por favor completa el nombre, un monto válido y la fecha de vencimiento.', 'warning');
      return false;
    }

    const payload = {
      name,
      amount,
      frequency,
      nextDueDate,
      alertDaysBefore,
      category,
      paymentMethod,
      icon,
      notes
    };

    if (editingSubId) {
      Store.updateSubscription(editingSubId, payload);
      showToast(`Gasto fijo "${name}" actualizado correctamente`, 'success');
    } else {
      Store.addSubscription(payload);
      showToast(`Gasto fijo "${name}" programado con alertas activas`, 'success');
    }

    closeSubscriptionModal();
    refreshAllUI();
    return false;
  }

  function paySubscription(id) {
    if (Store.getActiveRole() === 'visita') {
      showToast('Modo Demo: En tu cuenta real, este botón registra el gasto hoy y avanza la fecha al próximo mes.', 'info');
      return;
    }

    const result = Store.paySubscription(id);
    if (!result) return;

    closeNotificationsDropdown();
    refreshAllUI();
    showToast(
      `¡Pago de "${result.subscription.name}" registrado! Próximo vencimiento: ${formatDateDisplay(result.subscription.nextDueDate)}`,
      'success'
    );
  }

  function toggleSubscriptionStatus(id) {
    if (Store.getActiveRole() === 'visita') {
      showToast('Modo Demo: No es posible modificar estados en vista previa.', 'warning');
      return;
    }
    const updated = Store.toggleSubscriptionStatus(id);
    if (updated) {
      refreshAllUI();
      showToast(
        updated.status === 'Pausada'
          ? `"${updated.name}" en pausa (sin alertas)`
          : `"${updated.name}" reactivada`,
        'info'
      );
    }
  }

  function deleteSubscription(id) {
    if (Store.getActiveRole() === 'visita') {
      showToast('Modo Demo: No es posible eliminar gastos fijos en vista previa.', 'warning');
      return;
    }
    const sub = Store.getSubscriptionById(id);
    if (!sub) return;
    if (confirm(`¿Deseas eliminar el gasto fijo "${sub.name}" de tus cobros recurrentes?`)) {
      Store.deleteSubscription(id);
      refreshAllUI();
      showToast(`"${sub.name}" eliminado de tus gastos fijos`, 'success');
    }
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

    // Close notifications dropdown when clicking outside
    document.addEventListener('click', e => {
      const container = document.getElementById('notificationsBellContainer');
      if (container && typeof container.contains === 'function' && !container.contains(e.target)) {
        closeNotificationsDropdown();
      }
    });
  }

  // Public API
  return {
    init,
    refreshAllUI,
    switchView,
    toggleTheme,
    changeCurrency,
    switchUserAccount,
    switchUserRole,
    setupRoleUI,
    lockSession,
    initLockScreen,
    switchAuthPortalTab,
    selectRegisterAvatar,
    submitPortalLogin,
    submitPortalRegister,
    loginAsDemo,
    openSupportHelp,
    openProfileModal,
    closeProfileModal,
    toggleProfilePasswordSection,
    filterAvatarCategory,
    selectProfileAvatar,
    saveUserProfile,
    setSidebarMode,
    applySidebarMode,
    submitSwitchPassword,
    closeSwitchModal,
    openForceChangePasswordModal,
    submitForceChangePassword,
    openResetPasswordModal,
    closeResetPasswordModal,
    submitResetPassword,
    generateTempPasswordForUser,
    copyTempPassword,
    showResetOptions,
    showManualPasswordForm,
    openCloudSyncModal,
    closeCloudSyncModal,
    saveCloudSyncSettings,
    triggerCloudSync,
    disconnectCloudSync,
    updateCloudSyncUI,
    togglePasswordVisibility,
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
    toggleNotificationsDropdown,
    closeNotificationsDropdown,
    renderSubscriptionsView,
    setSubscriptionFilter,
    openSubscriptionModal,
    openSubscriptionFromPreset,
    closeSubscriptionModal,
    selectSubIcon,
    handleSubscriptionSubmit,
    paySubscription,
    toggleSubscriptionStatus,
    deleteSubscription,
    exportCSV,
    exportJSON,
    triggerImportJSON,
    handleFileImport,
    resetDemoData,
    showToast
  };
})();

// Global browser window export
if (typeof window !== 'undefined') {
  window.App = App;
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
