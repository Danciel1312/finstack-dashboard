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
   * Natural Language Intent Detection and Local/Cloud AI logic
   */
  async function processUserQuery(query) {
    const lower = query.toLowerCase();
    const stats = Store.getKPIStats();
    const settings = Store.getSettings();
    const currency = settings.currencySymbol || '$';
    const categories = Store.getCategoryTotals('gasto');

    // 1. Natural language transaction registration (Regex parsing)
    // Examples: "anota 45 en combustible", "gasté 20 en uber", "registra gasto 50 cena"
    const txMatch = query.match(/(?:gast[eé]|anota|registr[ao]|compr[eé]|ingres[eo]|pago)\s+(?:un\s+)?(?:gasto\s+|ingreso\s+)?(?:de\s+)?(?:\$)?(\d+(?:\.\d+)?)\s*(?:en|de|por)?\s*(.+)/i);
    
    if (txMatch) {
      const amount = parseFloat(txMatch[1]);
      const rawConcept = txMatch[2].trim();
      const isIncome = lower.includes('ingreso') || lower.includes('ganancia') || lower.includes('cobro');

      // Guess category based on concept
      let category = isIncome ? 'Salario' : 'Otros';
      if (/gasolina|combustible|uber|taxi|metro|gas/i.test(rawConcept)) category = 'Transporte';
      else if (/comida|cena|almuerzo|super|despensa|restaurante|pizza|cafe/i.test(rawConcept)) category = 'Alimentación';
      else if (/renta|alquiler|casa|luz|agua|internet/i.test(rawConcept)) category = 'Vivienda';
      else if (/netflix|spotify|cine|juego|salida/i.test(rawConcept)) category = 'Entretenimiento';
      else if (/farmacia|medico|doctor|gimnasio|medicina/i.test(rawConcept)) category = 'Salud';
      else if (/freelance|proyecto|cliente/i.test(rawConcept)) category = 'Freelance';

      const pendingTx = {
        type: isIncome ? 'ingreso' : 'gasto',
        concept: rawConcept.charAt(0).toUpperCase() + rawConcept.slice(1),
        amount: amount,
        category: category,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Tarjeta Débito',
        notes: 'Registrado con FinStack AI'
      };

      return {
        sender: 'ai',
        text: `He analizado tu mensaje y estructurado la siguiente transacción. ¿Deseas que la guarde en tu base de datos?`,
        pendingTransaction: pendingTx
      };
    }

    // 2. Health & Balance query
    if (lower.includes('salud') || lower.includes('balance') || lower.includes('como voy') || lower.includes('estado')) {
      const statusText = stats.netSavings >= 0 
        ? `🟢 **Salud Financiera Excelente**: Tienes un margen neto positivo de **${currency}${stats.netSavings.toLocaleString('es-ES', { minimumFractionDigits: 2 })}** este mes.`
        : `🔴 **Atención**: Tus gastos superan a tus ingresos este mes por **${currency}${Math.abs(stats.netSavings).toLocaleString('es-ES', { minimumFractionDigits: 2 })}**.`;

      return {
        sender: 'ai',
        text: `${statusText}\n\n- **Ingresos del mes:** ${currency}${stats.totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n- **Gastos del mes:** ${currency}${stats.totalExpense.toLocaleString('es-ES', { minimumFractionDigits: 2 })}\n- **Tasa de Ahorro:** ${stats.savingsRate}%\n- **Presupuesto Consumido:** ${Math.min(100, Math.round((stats.totalExpense / (settings.monthlyBudget || 3500)) * 100))}%\n\nTe recomiendo mantener tu tasa de ahorro por encima del 20% para contingencias e inversiones.`,
        actions: ['¿En qué categoría gasto más?', 'Dame 3 consejos de ahorro']
      };
    }

    // 3. Category Breakdown query
    if (lower.includes('categoria') || lower.includes('mas gasto') || lower.includes('fuga') || lower.includes('donde se va')) {
      const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);
      if (!sortedCats.length) {
        return { sender: 'ai', text: 'Aún no tienes gastos suficientes registrados este mes para calcular la categoría líder.' };
      }

      const [topCat, topVal] = sortedCats[0];
      const percent = stats.totalExpense > 0 ? ((topVal / stats.totalExpense) * 100).toFixed(1) : 0;

      let listText = sortedCats.slice(0, 4).map(([cat, val], i) => `${i + 1}. **${cat}:** ${currency}${val.toLocaleString('es-ES', { minimumFractionDigits: 2 })} (${((val / stats.totalExpense) * 100).toFixed(1)}%)`).join('\n');

      return {
        sender: 'ai',
        text: `Tu mayor gasto este mes está concentrado en **${topCat}**, representando el **${percent}%** de todos tus egresos (${currency}${topVal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}).\n\n**Top Categorías:**\n${listText}\n\n💡 *Tip de IA:* Si logras reducir un 10% en **${topCat}**, ahorrarías aproximadamente **${currency}${(topVal * 0.10).toFixed(2)}** extra este mes.`,
        actions: ['Dame 3 consejos de ahorro', '¿Cómo está mi salud financiera?']
      };
    }

    // 4. Savings advice query
    if (lower.includes('consejo') || lower.includes('ahorrar') || lower.includes('ahorro') || lower.includes('recomienda')) {
      return {
        sender: 'ai',
        text: `Aquí tienes **3 estrategias personalizadas** para tu perfil actual:\n\n1. **Aplica la regla 50/30/20:** Destina el 50% de tus ingresos a necesidades básicas (vivienda, comida), 30% a estilo de vida y aparta automáticamente el **20% para ahorro o fondos indexados** al inicio de mes.\n2. **Audita micro-suscripciones:** Revisa servicios de streaming o apps que no uses a diario; suelen drenar entre $30 y $60 al mes sin que lo notes.\n3. **Regla de las 72 horas para compras impulsivas:** Cuando quieras comprar algo que no sea de primera necesidad, espera 3 días. El 60% del impulso desaparece solo.`,
        actions: ['¿Cómo está mi salud financiera?', '¿En qué categoría gasto más?']
      };
    }

    // 5. Check if user configured a Google Gemini API Key for open chat
    if (settings.geminiApiKey) {
      return await callGeminiAPI(query, settings.geminiApiKey, stats, categories, currency);
    }

    // Default intelligent response
    return {
      sender: 'ai',
      text: `Entendido. He registrado tu pregunta. Como copiloto financiero, puedo analizar tus balances, indicarte tus mayores gastos por categoría o registrar compras en lenguaje natural (ej. *"Anota $30 en gasolina"*).\n\n*(Nota: Puedes vincular tu clave de Google Gemini API en Ajustes para habilitar conversaciones libres avanzadas).*`,
      actions: ['¿Cómo está mi salud financiera?', '¿En qué categoría gasto más?', 'Dame 3 consejos de ahorro']
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

    Store.add(msg.pendingTransaction);
    App.showToast('¡Transacción registrada por FinStack AI!', 'success');

    // Update UI
    msg.text += `\n\n✅ *Transacción de ${msg.pendingTransaction.amount.toFixed(2)} en ${msg.pendingTransaction.concept} agregada exitosamente.*`;
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
