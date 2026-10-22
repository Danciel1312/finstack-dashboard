/**
 * DashFinance - Charts Integration with Chart.js
 * High-definition modern financial charts with gradients, custom tooltips, and Dark/Light theme adaptability.
 */

const ChartsManager = (function () {
  let cashFlowChartInstance = null;
  let categoryChartInstance = null;
  let monthlyChartInstance = null;

  // Modern DashStack Color Palette
  const colors = {
    income: '#00B69B',
    incomeFill: 'rgba(0, 182, 155, 0.12)',
    expense: '#EF3826',
    expenseFill: 'rgba(239, 56, 38, 0.12)',
    primary: '#4880FF',
    primaryFill: 'rgba(72, 128, 255, 0.15)',
    categoryPalette: [
      '#4880FF', // Blue
      '#00B69B', // Green
      '#EF3826', // Red
      '#FFA756', // Orange
      '#884DFF', // Purple
      '#00C5FF', // Cyan
      '#FF6B8B', // Pink
      '#6366F1', // Indigo
      '#14B8A6', // Teal
      '#84CC16', // Lime
      '#94A3B8'  // Gray
    ]
  };

  function isDarkMode() {
    return document.documentElement.classList.contains('dark');
  }

  function getThemeColors() {
    const dark = isDarkMode();
    return {
      textColor: dark ? '#94A3B8' : '#64748B',
      gridColor: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      tooltipBg: dark ? '#1E293B' : '#FFFFFF',
      tooltipTitle: dark ? '#F8FAFC' : '#0F172A',
      tooltipBody: dark ? '#CBD5E1' : '#334155',
      tooltipBorder: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'
    };
  }

  // Currency Formatter helper
  function formatMoney(amount) {
    const settings = Store.getSettings();
    return `${settings.currencySymbol || '$'}${Number(amount).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Initialize or update the Main Cash Flow Line/Area Chart
   */
  function initCashFlowChart(days = 30) {
    const canvas = document.getElementById('cashFlowChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const chartData = Store.getCashFlowChartData(days);
    const theme = getThemeColors();

    // Gradients
    const gradientIncome = ctx.createLinearGradient(0, 0, 0, 320);
    gradientIncome.addColorStop(0, 'rgba(0, 182, 155, 0.28)');
    gradientIncome.addColorStop(1, 'rgba(0, 182, 155, 0.0)');

    const gradientExpense = ctx.createLinearGradient(0, 0, 0, 320);
    gradientExpense.addColorStop(0, 'rgba(239, 56, 38, 0.24)');
    gradientExpense.addColorStop(1, 'rgba(239, 56, 38, 0.0)');

    const config = {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Ingresos',
            data: chartData.incomeData,
            borderColor: colors.income,
            backgroundColor: gradientIncome,
            fill: true,
            tension: 0.38,
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: colors.income,
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5
          },
          {
            label: 'Gastos',
            data: chartData.expenseData,
            borderColor: colors.expense,
            backgroundColor: gradientExpense,
            fill: true,
            tension: 0.38,
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: colors.expense,
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false // We use custom styled HTML badges matching DashStack
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipTitle,
            bodyColor: theme.tooltipBody,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true,
            callbacks: {
              label: function (context) {
                return ` ${context.dataset.label}: ${formatMoney(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'transparent',
              drawBorder: false
            },
            ticks: {
              color: theme.textColor,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
              maxTicksLimit: days > 14 ? 10 : 7
            }
          },
          y: {
            grid: {
              color: theme.gridColor,
              drawBorder: false
            },
            ticks: {
              color: theme.textColor,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
              callback: function (value) {
                if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
                return `$${value}`;
              }
            }
          }
        }
      }
    };

    if (cashFlowChartInstance) {
      cashFlowChartInstance.destroy();
    }
    cashFlowChartInstance = new Chart(ctx, config);
  }

  /**
   * Initialize or update Category Expenses Donut Chart
   */
  function initCategoryChart() {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const categoryTotals = Store.getCategoryTotals('gasto');
    const theme = getThemeColors();

    const labels = Object.keys(categoryTotals);
    const dataValues = Object.values(categoryTotals);

    // Fallback if no expenses exist yet
    const finalLabels = labels.length ? labels : ['Sin Gastos'];
    const finalData = dataValues.length ? dataValues : [1];
    const finalColors = labels.length
      ? colors.categoryPalette.slice(0, labels.length)
      : ['#CBD5E1'];

    const config = {
      type: 'doughnut',
      data: {
        labels: finalLabels,
        datasets: [
          {
            data: finalData,
            backgroundColor: finalColors,
            borderColor: isDarkMode() ? '#1E293B' : '#FFFFFF',
            borderWidth: 3,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'circle',
              color: theme.textColor,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
              padding: 14
            }
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipTitle,
            bodyColor: theme.tooltipBody,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const val = context.raw;
                const percentage = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${formatMoney(val)} (${percentage}%)`;
              }
            }
          }
        }
      }
    };

    if (categoryChartInstance) {
      categoryChartInstance.destroy();
    }
    categoryChartInstance = new Chart(ctx, config);

    // Update center total label if present
    const centerTotalEl = document.getElementById('categoryChartTotal');
    if (centerTotalEl) {
      const sum = dataValues.reduce((a, b) => a + b, 0);
      centerTotalEl.textContent = formatMoney(sum);
    }
  }

  /**
   * Initialize Monthly Comparison Bar Chart for the Reports module
   */
  function initMonthlyComparisonChart() {
    const canvas = document.getElementById('monthlyBarChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const data = Store.getMonthlyComparisonData(6);
    const theme = getThemeColors();

    const config = {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Ingresos',
            data: data.incomes,
            backgroundColor: colors.income,
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.7
          },
          {
            label: 'Gastos',
            data: data.expenses,
            backgroundColor: colors.expense,
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              color: theme.textColor,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 }
            }
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.tooltipTitle,
            bodyColor: theme.tooltipBody,
            borderColor: theme.tooltipBorder,
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function (context) {
                return ` ${context.dataset.label}: ${formatMoney(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'transparent', drawBorder: false },
            ticks: {
              color: theme.textColor,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 }
            }
          },
          y: {
            grid: { color: theme.gridColor, drawBorder: false },
            ticks: {
              color: theme.textColor,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
              callback: function (val) {
                return `$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`;
              }
            }
          }
        }
      }
    };

    if (monthlyChartInstance) {
      monthlyChartInstance.destroy();
    }
    monthlyChartInstance = new Chart(ctx, config);
  }

  /**
   * Re-render all active charts when theme or transactions change
   */
  function refreshAll() {
    initCashFlowChart();
    initCategoryChart();
    initMonthlyComparisonChart();
  }

  return {
    initCashFlowChart,
    initCategoryChart,
    initMonthlyComparisonChart,
    refreshAll
  };
})();

if (typeof window !== 'undefined') {
  window.ChartsManager = ChartsManager;
}
