# 🚀 FinStack - Dashboard de Gestión Financiera Personal y Control de Gastos

Aplicación web profesional de administración de finanzas personales inspirada en el UI Kit moderno **DashStack**. Diseñada para ofrecer una experiencia fluida, estética limpia, visualizaciones interactivas con Chart.js, soporte para modo Oscuro/Claro y un **Módulo de Calendario Histórico** con desglose diario de ingresos y gastos.

---

## 📁 Estructura del Proyecto

```text
Pruebas/
├── index.html              # Estructura principal, componentes DashStack, vistas y modales
├── css/
│   └── styles.css          # Estilos adicionales, scrollbars modernos, animaciones y transiciones
├── js/
│   ├── store.js            # Base de datos local (localStorage), seed inicial y analítica financiera
│   ├── charts.js           # Integración con Chart.js (Cash Flow con gradientes y Donut de categorías)
│   ├── calendar.js         # Lógica del Calendario Interactivo y explorador detallado por fecha
│   └── app.js              # Controlador principal, vistas, filtros, buscador en vivo y CRUD
└── README.md               # Documentación y guía de ejecución
```

---

## ✨ Características Principales

### 1. Diseño y Estética UI/UX (DashStack Theme)
- **Dashboard Corporativo Moderno:** Tarjetas con bordes redondeados (`rounded-2xl`), sombras suaves y espaciado armónico.
- **Modo Claro / Oscuro (Dark & Light Mode):** Alternancia fluida con un solo clic y persistencia automática en el navegador. Las gráficas adaptan sus ejes, fuentes y cuadrículas en tiempo real.
- **Top Header Bar:** Barra superior con buscador en tiempo real, selector de divisas (USD, EUR, MXN), botón rápido de `+ Nueva Transacción`, campana de notificaciones y avatar de usuario.
- **Sidebar Responsiva:** Menú lateral de navegación con acceso a *Dashboard*, *Gastos*, *Ingresos*, *Calendario Histórico* y *Reportes*, además de una tarjeta de progreso del presupuesto mensual y menú colapsable para dispositivos móviles.

### 2. Tarjetas Métricas Superiores (KPIs)
- **Balance Total:** Patrimonio neto acumulado.
- **Ingresos Totales (Mes):** Con porcentaje de crecimiento respecto al mes anterior.
- **Gastos Totales (Mes):** Con indicador de ahorro/gasto respecto al mes anterior.
- **Ahorro Neto (Mes):** Capacidad de ahorro y cálculo de tasa porcentual.

### 3. Gestión Completa de Transacciones (CRUD)
- Modal rápido para crear y editar transacciones.
- Pestañas dinámicas para alternar entre **Gasto** e **Ingreso**, adaptando las categorías sugeridas en tiempo real.
- Registro de fecha, método de pago (Tarjeta Débito, Crédito, Transferencia, Efectivo) y notas opcionales.
- Modal de confirmación para eliminar transacciones de forma segura.
- Almacenamiento 100% persistente en `localStorage`.

### 4. Gráficas Interactivas (Chart.js)
- **Flujo de Fondos (Cash Flow):** Gráfica de líneas/área con curvas Bézier suaves, relleno con gradiente translúcido y selector de rango (7 días / 30 días).
- **Gastos por Categoría:** Gráfica Donut con porcentaje interactivo y cálculo central del gasto total.
- **Comparativa Semestral:** Gráfica de barras en el módulo de Reportes que compara ingresos y gastos de los últimos 6 meses.

### 5. Módulo de Calendario Histórico (Feature Clave)
- Vista de cuadrícula mensual completa con navegación de meses y acceso rápido a "Hoy".
- **Micro-indicadores diarios:** Muestra chips visuales con el total de ingresos (verde) y gastos (rojo) en cada celda del día.
- **Panel Histórico Diario:** Al hacer clic en cualquier día, se despliega en tiempo real el desglose exacto de movimientos realizados en esa fecha, con opciones para editar, borrar o agregar una transacción para ese día específico.

### 6. Herramientas de Backup y Exportación
- **Exportación a CSV:** Compatible con Excel y Google Sheets.
- **Copia de Seguridad JSON:** Exporta o importa todos los registros con un clic.
- **Botón de Reset Demo:** Genera transacciones realistas de muestra adaptadas a la fecha actual para pruebas inmediatas.

---

## 🚀 Cómo Ejecutar la Aplicación

La aplicación es **100% autocontenida** y no requiere compilación previa (`npm install` o `webpack`).

### Opción 1: Abrir directamente en el navegador
1. Haz doble clic en el archivo `index.html` o arrástralo a tu navegador preferido (Chrome, Edge, Firefox, Safari).

### Opción 2: Usar un servidor local ligero (Recomendado)
Puedes servirla con cualquier servidor estático:

- **Con Python:**
  ```bash
  python3 -m http.server 8080
  ```
  Luego abre `http://localhost:8080` en tu navegador.

- **Con Node.js (npx serve):**
  ```bash
  npx serve .
  ```

- **Con VS Code:**
  Haz clic derecho en `index.html` y selecciona **"Open with Live Server"**.
