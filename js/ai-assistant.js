/**
 * DashFinance - AI Financial Assistant Module (FinStack AI)
 * Provides context-aware financial diagnostics, savings advice,
 * natural-language transaction registration, and optional Google Gemini API integration.
 */

const AIAssistant = (function () {
  let isChatOpen = false;
  let chatHistory = [];

  function init() {
    renderInitialMessage();
  }

  function toggleChat(forceOpen = null) {
    const modal = document.getElementById('aiChatDrawer');
    if (!modal) return;

    if (forceOpen !== null) isChatOpen = forceOpen;
    else isChatOpen = !isChatOpen;

    if (isChatOpen) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.getElementById('aiChatInput').focus();
    } else {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function renderInitialMessage() {
    const messagesContainer = document.getElementById('aiChatMessages');
    if (!messagesContainer) return;

    const stats = Store.getKPIStats();
    const settings = Store.getSettings();
    const currency = settings.currencySymbol || '$';

    chatHistory = [
      {
        sender: 'ai',
        text: `¡Hola ${settings.userName || 'Dany'}! Soy **FinStack AI**, tu copiloto financiero inteligente. 
He analizado tus finanzas actuales: tienes un **Balance Total de ${currency}${Number(stats.allTimeBalance).toLocaleString('es-ES', { minimumFractionDigits: 2 })}** y una tasa de ahorro del **${stats.savingsRate}%** este mes.

¿En qué puedo ayudarte hoy?`,
        actions: [
          '¿Cómo está mi salud financiera?',
          '¿En qué categoría gasto más?',
          'Registrar: $45 en combustible',
          'Dame 3 consejos de ahorro'
        ]
      }
    ];

    renderMessages();
  }

  function renderMessages() {
    const container = document.getElementById('aiChatMessages');
    if (!container) return;

    container.innerHTML = chatHistory.map((msg, index) => {
      const isAI = msg.sender === 'ai';
      return `
        <div class="flex items-start gap-2.5 ${isAI ? '' : 'flex-row-reverse'} mb-4 animate-in fade-in duration-200">
          <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs shadow-sm ${
            isAI 
              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white' 
              : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold'
          }">
            ${isAI ? '<i class="fa-solid fa-wand-magic-sparkles text-[11px]"></i>' : 'TÚ'}
          </div>

          <div class="max-w-[85%] space-y-2">
            <div class="p-3.5 rounded-2xl text-xs leading-relaxed ${
              isAI 
                ? 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-xs' 
                : 'bg-blue-600 text-white rounded-tr-xs'
            }">
              ${formatMarkdownText(msg.text)}
              
              ${msg.pendingTransaction ? `
                <div class="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-blue-200 dark:border-blue-900/50 space-y-2">
                  <div class="flex items-center justify-between font-bold text-[11px] text-blue-600 dark:text-blue-400">
                    <span><i class="fa-solid fa-bolt mr-1"></i> Transacción Detectada</span>
                    <span class="uppercase">${msg.pendingTransaction.type}</span>
                  </div>
                  <div class="text-[11px] text-slate-700 dark:text-slate-200">
                    <div><strong>Concepto:</strong> ${escapeHtml(msg.pendingTransaction.concept)}</div>
                    <div><strong>Monto:</strong> $${msg.pendingTransaction.amount.toFixed(2)}</div>
                    <div><strong>Categoría:</strong> ${escapeHtml(msg.pendingTransaction.category)}</div>
                  </div>
                  <button 
                    onclick="AIAssistant.confirmPendingTransaction(${index})" 
                    class="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <i class="fa-solid fa-check"></i> Confirmar y Registrar en FinStack
                  </button>
                </div>
              ` : ''}
            </div>

            ${msg.actions && msg.actions.length ? `
              <div class="flex flex-wrap gap-1.5 pt-1">
                ${msg.actions.map(act => `
                  <button 
                    onclick="AIAssistant.handleQuickAction('${escapeHtml(act)}')" 
                    class="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/40 transition-colors"
                  >
                    ${escapeHtml(act)}
                  </button>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  function handleQuickAction(actionText) {
    const input = document.getElementById('aiChatInput');
    if (input) {
      input.value = actionText;
      sendMessage();
    }
  }

  async function sendMessage() {
    const input = document.getElementById('aiChatInput');
    const text = input.value.trim();
    if (!text) return;

    // Add user message
    chatHistory.push({ sender: 'user', text: text });
    input.value = '';
    renderMessages();

    // Show typing state
    showTypingIndicator();

    try {
      const response = await processUserQuery(text);
      removeTypingIndicator();
      chatHistory.push(response);
      renderMessages();
    } catch (e) {
      removeTypingIndicator();
      chatHistory.push({
        sender: 'ai',
        text: 'Lo siento, ocurrió un error procesando tu consulta. Por favor intenta de nuevo.'
      });
      renderMessages();
    }
  }

  function showTypingIndicator() {
    const container = document.getElementById('aiChatMessages');
    if (!container) return;
    const typing = document.createElement('div');
    typing.id = 'aiTypingIndicator';
    typing.className = 'flex items-center gap-2 mb-4 text-xs text-slate-400';
    typing.innerHTML = `
      <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
      </div>
      <div class="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse delay-100"></span>
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse delay-200"></span>
        <span class="text-[11px] text-slate-500 ml-1">FinStack AI analizando...</span>
      </div>
    `;
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('aiTypingIndicator');
    if (el) el.remove();
  }

  /**
   * Natural Language Transaction Parser
   * Extracts amount, type, concept and category from casual phrases like:
   * "100 supermercado", "compra de 100 super", "50 gasolina", "uber 25", "ingreso 400 freelance"
   */
  function parseNaturalTransaction(query) {
    const raw = query.trim();
    const lower = raw.toLowerCase();

    // Skip transaction parsing if it is clearly an exploratory question (unless it starts with an action verb)
    const isQuestion = /^(?:¿|\?|cu[aá]nto|c[oó]mo|qu[eé]|puedo|dame|recomienda|por qu[eé])/i.test(raw);
    const hasActionVerb = /^(?:anota|registra|guarda|ingresa|agrega|compr[eé]|gast[eé])/i.test(raw);
    if (isQuestion && !hasActionVerb) {
      return null;
    }

    // 1. Extract Number / Amount (anywhere in the phrase)
    // Matches "$100", "100.50", "100$", "100 usd", "100", etc.
    const numberRegex = /(?:\$|usd|pesos|eur|€)?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:\$|usd|pesos|eur|€|d[oó]lares)?/i;
    const match = raw.match(numberRegex);
    if (!match) return null;

    const amountStr = match[1].replace(',', '.');
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return null;

    // 2. Determine Type (Ingreso vs Gasto)
    const isIncome = /\b(?:ingreso|ingresos|ingres[eé]|ganancia|ganancias|gan[eé]|cobro|cobr[eé]|recib[ií]|sueldo|salario|n[oó]mina|quincena|dep[oó]sito|venta)\b/i.test(lower);
    const type = isIncome ? 'ingreso' : 'gasto';

    // 3. Extract Concept by removing amount and filler words
    let concept = raw
      .replace(match[0], ' ')
      .replace(/\b(?:gast[eé]|gasto|gastos|anota|anotar|registr[ao]|registrar|guarda|guardar|compr[eé]|compra|compras|pagu[eé]|pago|pagos|ingres[oeé]|ingreso|gan[eé]|ganancia|cobr[eé]|cobro|recib[ií])\b/gi, ' ')
      .replace(/\b(?:de|en|por|un|una|el|la|los|las|mi|mis|al|del|para|d[oó]lares|pesos|usd|euros)\b/gi, ' ')
      .replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!concept || concept.length < 2) {
      concept = isIncome ? 'Ingreso General' : 'Gasto General';
    } else {
      // Capitalize words
      concept = concept
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }

    // 4. Deduce Category based on rich financial keyword dictionary
    const searchContext = (concept + ' ' + lower).toLowerCase();
    let category = isIncome ? 'Salario' : 'Otros';

    const CATEGORY_MAP = [
      { cat: 'Alimentación', words: ['super', 'supermercado', 'despensa', 'comida', 'almuerzo', 'desayuno', 'cena', 'restaurante', 'pizza', 'hamburguesa', 'burger', 'tacos', 'sushi', 'cafe', 'café', 'starbucks', 'pan', 'panaderia', 'panadería', 'carne', 'carniceria', 'verdura', 'fruta', 'walmart', 'costco', 'oxxo', 'mercadona', 'carulla', 'tienda', 'abarrotes', 'alimento', 'snack'] },
      { cat: 'Transporte', words: ['gasolina', 'combustible', 'gas', 'diesel', 'uber', 'taxi', 'didi', 'cabify', 'metro', 'bus', 'autobus', 'autobús', 'pasaje', 'peaje', 'estacionamiento', 'parqueo', 'taller', 'mecanico', 'mecánico', 'llanta', 'lavado', 'moto', 'carro', 'auto'] },
      { cat: 'Vivienda', words: ['renta', 'alquiler', 'casa', 'departamento', 'depa', 'luz', 'cfe', 'agua', 'internet', 'wifi', 'telefono', 'teléfono', 'telmex', 'claro', 'cable', 'mantenimiento', 'condominio', 'limpieza', 'mueble'] },
      { cat: 'Entretenimiento', words: ['cine', 'pelicula', 'película', 'netflix', 'spotify', 'disney', 'hbo', 'prime', 'youtube', 'concierto', 'bar', 'cerveza', 'tragos', 'fiesta', 'juego', 'videojuego', 'steam', 'playstation', 'xbox', 'viaje', 'hotel', 'vuelo', 'diversion'] },
      { cat: 'Salud', words: ['farmacia', 'medicina', 'medicamento', 'pastillas', 'doctor', 'medico', 'médico', 'dentista', 'consulta', 'hospital', 'clinica', 'clínica', 'gimnasio', 'gym', 'psicologo', 'psicólogo', 'lentes', 'analisis', 'terapia'] },
      { cat: 'Educación', words: ['curso', 'libro', 'universidad', 'escuela', 'colegio', 'colegiatura', 'udemy', 'capacitacion', 'capacitación', 'certificacion', 'clase'] },
      { cat: 'Ropa', words: ['ropa', 'zapatos', 'zapatillas', 'camisa', 'pantalon', 'pantalón', 'vestido', 'chamarra', 'abrigo', 'zara', 'h&m'] },
      { cat: 'Freelance', words: ['freelance', 'cliente', 'proyecto', 'diseño', 'desarrollo', 'programacion', 'programación', 'asesoria', 'asesoría', 'consultoria', 'venta', 'factura', 'honorarios'] },
      { cat: 'Salario', words: ['salario', 'sueldo', 'nomina', 'nómina', 'quincena', 'pago quincenal', 'empresa', 'trabajo', 'bono', 'aguinaldo', 'comision', 'comisión'] }
    ];

    for (const item of CATEGORY_MAP) {
      if (item.words.some(w => searchContext.includes(w))) {
        category = item.cat;
        break;
      }
    }

    return {
      type,
      concept,
      amount,
      category,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: type === 'ingreso' ? 'Transferencia' : 'Tarjeta Débito',
      notes: 'Registrado con FinStack AI'
    };
  }

  /**
   * Natural Language Intent Detection and Local/Cloud AI logic
   */
  async function processUserQuery(query) {
    const lower = query.toLowerCase().trim();
    const stats = Store.getKPIStats();
    const settings = Store.getSettings();
    const currency = settings.currencySymbol || '$';
    const categories = Store.getCategoryTotals('gasto');

    // 1. Natural Language Transaction Registration (Any casual format)
    // E.g. "100 supermercado", "compra de 100 super", "50 gasolina", "uber 25", "ingreso 500 quincena"
    const parsedTx = parseNaturalTransaction(query);
    if (parsedTx) {
      return {
        sender: 'ai',
        text: `⚡ **Transacción Detectada:** He interpretado tu mensaje como un **${parsedTx.type.toUpperCase()}** de **${currency}${parsedTx.amount.toFixed(2)}** en **${parsedTx.concept}** (${parsedTx.category}).\n\nPresiona el botón de abajo para guardarla en tus registros:`,
        pendingTransaction: parsedTx
      };
    }

    // 2. Greetings & Capabilities
    if (/^(?:hola|buen[ao]s|hey|saludos|qu[eé]\s+haces|ayuda|inicio)\b/i.test(lower)) {
      return {
        sender: 'ai',
        text: `¡Hola ${settings.userName || 'Dany'}! Soy tu copiloto **FinStack AI**. Puedo ayudarte a:
- **Registrar compras y pagos al vuelo:** Solo escribe algo como *"100 supermercado"*, *"25 gasolina"* o *"ingreso 500 freelance"*.
- **Consultar tu dinero:** Pregúntame *"¿cuánto dinero tengo?"* o *"¿cuánto he gastado?"*.
- **Evaluar compras:** Pregúntame *"¿puedo gastar 80?"* y evaluaré tu presupuesto restante.
- **Analizar tus finanzas:** Pídeme consejos de ahorro o tus mayores fugas de dinero.

¿Qué movimiento deseas registrar o qué te gustaría consultar?`,
        actions: ['¿Cuánto dinero tengo?', '¿En qué categoría gasto más?', '100 supermercado', 'Dame 3 consejos de ahorro']
      };
    }

    // 3. Purchase Feasibility Evaluator (e.g. "¿puedo gastar 80?", "me alcanza para 150?", "quiero comprar algo de 200")
    if (/(?:puedo\s+(?:gastar|comprar)|me\s+alcanza|quiero\s+comprar)/i.test(lower)) {
      const numMatch = lower.match(/\b(\d+(?:[.,]\d{1,2})?)\b/);
      if (numMatch) {
        const askAmount = parseFloat(numMatch[1].replace(',', '.'));
        const budget = settings.monthlyBudget || 3500;
        const remainingBudget = Math.max(0, budget - stats.totalExpense);

        if (askAmount <= remainingBudget) {
          const afterSpend = remainingBudget - askAmount;
          return {
            sender: 'ai',
            text: `🟢 **¡Sí, puedes permitírtelo!**\n\n- **Monto consultado:** ${currency}${askAmount.toFixed(2)}\n- **Presupuesto disponible este mes:** ${currency}${remainingBudget.toFixed(2)}\n- **Margen restante después del gasto:** ${currency}${afterSpend.toFixed(2)}\n\nTu saldo y presupuesto tienen suficiente holgura para realizar esta compra de forma segura.`,
            actions: [`Registrar: $${askAmount.toFixed(2)} en Compra`, '¿Cómo está mi salud financiera?']
          };
        } else {
          const deficit = askAmount - remainingBudget;
          return {
            sender: 'ai',
            text: `🔴 **Atención - Riesgo Presupuestario:**\n\n- **Monto consultado:** ${currency}${askAmount.toFixed(2)}\n- **Presupuesto restante:** ${currency}${remainingBudget.toFixed(2)}\n- **Excedente sobre el límite:** ${currency}${deficit.toFixed(2)}\n\nSi realizas esta compra, superarás tu presupuesto mensual fijado en ${currency}${budget.toFixed(2)}. Te recomiendo postergarla al próximo mes o compensar reduciendo gastos en otra categoría.`,
            actions: ['¿En qué categoría gasto más?', 'Dame 3 consejos de ahorro']
          };
        }
      }
    }

    // 4. Current Balance & Money Summary
    if (/(?:cu[aá]nto\s+(?:dinero\s+)?tengo|saldo|balance|mi\s+dinero|total\s+disponible)/i.test(lower)) {
      const balance = stats.allTimeBalance;
      return {
        sender: 'ai',
        text: `💰 **Resumen de tu Dinero:**\n\n- **Balance Total:** **${currency}${Number(balance).toLocaleString('es-ES', { minimumFractionDigits: 2 })}**\n- **Ingresos del Mes:** ${currency}${Number(stats.totalIncome).toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n- **Gastos del Mes:** ${currency}${Number(stats.totalExpense).toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n- **Ahorro Neto del Mes:** ${currency}${Number(stats.netSavings).toLocaleString('es-ES', { minimumFractionDigits: 2 })} (Tasa: ${stats.savingsRate}%)\n\n${stats.transactionCount === 0 ? '💡 *Tu cuenta personal está lista y limpia. Puedes anotar tus gastos escribiendo por ejemplo: "35 supermercado".*' : ''}`,
        actions: ['¿En qué categoría gasto más?', '¿Cuánto he gastado?', 'Dame 3 consejos de ahorro']
      };
    }

    // 5. Total Spent Query
    if (/(?:cu[aá]nto\s+he\s+gastado|mis\s+gastos|total\s+gastos|gastos\s+del\s+mes)/i.test(lower)) {
      const budget = settings.monthlyBudget || 3500;
      const percent = Math.min(100, Math.round((stats.totalExpense / budget) * 100));
      return {
        sender: 'ai',
        text: `📉 **Control de Gastos del Mes:**\n\n- **Total Gastado:** **${currency}${Number(stats.totalExpense).toLocaleString('es-ES', { minimumFractionDigits: 2 })}**\n- **Presupuesto Mensual:** ${currency}${budget.toLocaleString('es-ES')}\n- **Consumo del Presupuesto:** **${percent}%** consumido\n- **Disponible restante:** ${currency}${Math.max(0, budget - stats.totalExpense).toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n\n${stats.totalExpense === 0 ? '✨ *Aún no tienes gastos registrados este mes. ¡Excelente momento para empezar desde cero!*' : ''}`,
        actions: ['¿En qué categoría gasto más?', '¿Cuánto dinero tengo?']
      };
    }

    // 6. Total Income Query
    if (/(?:cu[aá]nto\s+(?:he\s+)?ganado|mis\s+ingresos|total\s+ingresos|ingresos\s+del\s+mes)/i.test(lower)) {
      return {
        sender: 'ai',
        text: `📈 **Resumen de Ingresos:**\n\n- **Ingresos de este mes:** **${currency}${Number(stats.totalIncome).toLocaleString('es-ES', { minimumFractionDigits: 2 })}**\n- **Margen de Ahorro Neto:** ${currency}${Number(stats.netSavings).toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n\nPuedes registrar nuevos ingresos en cualquier momento escribiendo por ejemplo: *"ingreso 1200 salario"* o *"cobré 300 freelance"*.`,
        actions: ['¿Cuánto dinero tengo?', '¿Cómo está mi salud financiera?']
      };
    }

    // 7. Budget & Limits Query
    if (/(?:presupuesto|l[ií]mite|cu[aá]nto\s+me\s+queda|disponible)/i.test(lower)) {
      const budget = settings.monthlyBudget || 3500;
      const spent = stats.totalExpense;
      const remaining = Math.max(0, budget - spent);
      const percent = Math.min(100, Math.round((spent / budget) * 100));

      return {
        sender: 'ai',
        text: `🎯 **Estado de tu Presupuesto Mensual:**\n\n- **Presupuesto Asignado:** ${currency}${budget.toLocaleString('es-ES')}\n- **Has gastado:** ${currency}${Number(spent).toLocaleString('es-ES', { minimumFractionDigits: 2 })} (${percent}%)\n- **Te quedan disponibles:** **${currency}${Number(remaining).toLocaleString('es-ES', { minimumFractionDigits: 2 })}**\n\n${percent > 85 ? '⚠️ *¡Atención! Has consumido más del 85% de tu presupuesto. Modera gastos no esenciales.*' : '🟢 *Vas a buen ritmo este mes.*'}`,
        actions: ['¿En qué categoría gasto más?', 'Dame 3 consejos de ahorro']
      };
    }

    // 8. Health & Diagnostics
    if (/(?:salud|diagn[oó]stico|c[oó]mo\s+voy|estado)/i.test(lower)) {
      const statusText = stats.netSavings >= 0 
        ? `🟢 **Salud Financiera Positiva**: Tienes un margen neto a favor de **${currency}${stats.netSavings.toLocaleString('es-ES', { minimumFractionDigits: 2 })}** este mes.`
        : `🔴 **Atención**: Tus gastos superan a tus ingresos este mes por **${currency}${Math.abs(stats.netSavings).toLocaleString('es-ES', { minimumFractionDigits: 2 })}**.`;

      return {
        sender: 'ai',
        text: `${statusText}\n\n- **Ingresos del mes:** ${currency}${stats.totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n- **Gastos del mes:** ${currency}${stats.totalExpense.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n- **Tasa de Ahorro:** ${stats.savingsRate}%\n- **Presupuesto Consumido:** ${Math.min(100, Math.round((stats.totalExpense / (settings.monthlyBudget || 3500)) * 100))}%\n\nTe recomiendo mantener tu tasa de ahorro por encima del 20% para contingencias e inversiones.`,
        actions: ['¿En qué categoría gasto más?', 'Dame 3 consejos de ahorro']
      };
    }

    // 9. Category Breakdown query
    if (/(?:categor[ií]a|m[aá]s\s+gasto|fuga|en\s+qu[eé]\s+se\s+va)/i.test(lower)) {
      const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);
      if (!sortedCats.length) {
        return { 
          sender: 'ai', 
          text: `Aún no tienes gastos registrados para desglosar por categoría.\n\nPuedes agregar tu primer gasto escribiendo algo como: *"45 supermercado"* o *"20 uber"*.`,
          actions: ['¿Cuánto dinero tengo?', 'Dame 3 consejos de ahorro']
        };
      }

      const [topCat, topVal] = sortedCats[0];
      const percent = stats.totalExpense > 0 ? ((topVal / stats.totalExpense) * 100).toFixed(1) : 0;

      let listText = sortedCats.slice(0, 4).map(([cat, val], i) => `${i + 1}. **${cat}:** ${currency}${val.toLocaleString('es-ES', { minimumFractionDigits: 2 })} (${((val / stats.totalExpense) * 100).toFixed(1)}%)`).join('\n');

      return {
        sender: 'ai',
        text: `Tu mayor gasto está concentrado en **${topCat}**, representando el **${percent}%** de tus egresos (${currency}${topVal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}).\n\n**Top Categorías:**\n${listText}\n\n💡 *Tip de IA:* Si logras reducir un 10% en **${topCat}**, ahorrarías aproximadamente **${currency}${(topVal * 0.10).toFixed(2)}** extra este mes.`,
        actions: ['Dame 3 consejos de ahorro', '¿Cómo está mi salud financiera?']
      };
    }

    // 10. Savings Advice Query
    if (/(?:consejo|ahorrar|ahorro|recomienda)/i.test(lower)) {
      return {
        sender: 'ai',
        text: `Aquí tienes **3 estrategias personalizadas** para tu perfil:\n\n1. **Aplica la regla 50/30/20:** Destina el 50% de tus ingresos a necesidades básicas (vivienda, comida), 30% a estilo de vida y aparta automáticamente el **20% para ahorro o inversión** al inicio de mes.\n2. **Audita micro-suscripciones:** Revisa servicios de streaming o apps que no uses a diario; suelen drenar entre $30 y $60 al mes sin que lo notes.\n3. **Regla de las 72 horas para compras impulsivas:** Cuando quieras comprar algo que no sea de primera necesidad, espera 3 días. El 60% del impulso desaparece solo.`,
        actions: ['¿Cómo está mi salud financiera?', '¿En qué categoría gasto más?']
      };
    }

    // 11. Polite expressions
    if (/(?:gracias|muchas\s+gracias|excelente|genial|perfecto)/i.test(lower)) {
      return {
        sender: 'ai',
        text: `¡Con mucho gusto! 😊 Estoy aquí para cuidar tu bolsillo. Si tienes otro movimiento o consulta financiera, solo dímelo.`,
        actions: ['¿Cuánto dinero tengo?', '¿En qué categoría gasto más?']
      };
    }

    // 12. Check if user configured a Google Gemini API Key for open chat
    if (settings.geminiApiKey) {
      return await callGeminiAPI(query, settings.geminiApiKey, stats, categories, currency);
    }

    // 13. Helpful Educational Fallback
    return {
      sender: 'ai',
      text: `Entendido. No identifiqué con exactitud si es una consulta o una transacción.\n\n💡 **Puedes probar escribiendo:**\n- **Para registrar gastos:** *"100 supermercado"*, *"compra de 45 farmacia"* o *"25 gasolina"*.\n- **Para registrar ingresos:** *"ingreso 1200 salario"* o *"cobré 300 freelance"*.\n- **O hazme preguntas como:** *"¿cuánto dinero tengo?"* o *"¿puedo gastar 50?"*.\n\n*(También puedes conectar tu API Key gratuita de Google Gemini en Ajustes para conversaciones abiertas sobre cualquier tema).*`,
      actions: ['¿Cuánto dinero tengo?', '¿En qué categoría gasto más?', 'Dame 3 consejos de ahorro']
    };
  }

  /**
   * Google Gemini API Integration via official REST Endpoint
   */
  async function callGeminiAPI(prompt, apiKey, stats, categories, currency) {
    const systemContext = `Eres FinStack AI, un asesor financiero personal experto, analítico, conciso y motivador.
Datos del usuario:
- Balance Total: ${currency}${stats.allTimeBalance}
- Ingresos del mes: ${currency}${stats.totalIncome}
- Gastos del mes: ${currency}${stats.totalExpense}
- Ahorro neto: ${currency}${stats.netSavings} (Tasa: ${stats.savingsRate}%)
- Desglose de gastos: ${JSON.stringify(categories)}
Responde en español de forma amigable, estructurada con viñetas y formato Markdown.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemContext}\n\nPregunta del usuario: ${prompt}` }]
        }
      ]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      return {
        sender: 'ai',
        text: data.candidates[0].content.parts[0].text
      };
    }
    throw new Error('Respuesta inválida de Gemini');
  }

  function confirmPendingTransaction(messageIndex) {
    const msg = chatHistory[messageIndex];
    if (!msg || !msg.pendingTransaction) return;

    const tx = msg.pendingTransaction;
    Store.add(tx);

    if (window.App && typeof App.refreshAllUI === 'function') {
      App.refreshAllUI();
    }
    App.showToast(`¡${tx.type === 'ingreso' ? 'Ingreso' : 'Gasto'} registrado por FinStack AI!`, 'success');

    const stats = Store.getKPIStats();
    const currency = Store.getSettings().currencySymbol || '$';

    // Update UI
    msg.text += `\n\n✅ **¡Transacción guardada exitosamente!**\n- **Concepto:** ${escapeHtml(tx.concept)} (${tx.category})\n- **Monto:** ${currency}${tx.amount.toFixed(2)}\n- **Balance Total:** ${currency}${Number(stats.allTimeBalance).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`;
    delete msg.pendingTransaction;
    renderMessages();
  }

  function formatMarkdownText(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
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
    init,
    toggleChat,
    sendMessage,
    handleQuickAction,
    confirmPendingTransaction
  };
})();

if (typeof window !== 'undefined') {
  window.AIAssistant = AIAssistant;
}
