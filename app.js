/* ===== CONSTANTES ===== */
const DESCUENTO = 0.20; // 20%

/* ===== ELEMENTOS ===== */
const inputMonto   = document.getElementById('monto');
const resultCard   = document.getElementById('resultCard');
const resultAmount = document.getElementById('resultAmount');
const resultDetail = document.getElementById('resultDetail');
const btnCopy      = document.getElementById('btnCopy');
const toast        = document.getElementById('toast');
const btnTheme     = document.getElementById('btnTheme');
const themeIcon    = document.getElementById('themeIcon');
const metaTheme    = document.getElementById('metaThemeColor');

/* ===== TEMA CLARO / OSCURO ===== */
function getStoredTheme() {
  try { return localStorage.getItem('taximetro-theme'); } catch(e) { return null; }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';

  // Actualizar meta theme-color para que la barra del navegador combine
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'light' ? '#f2f2f7' : '#1a1a2e');
  }

  try { localStorage.setItem('taximetro-theme', theme); } catch(e) {}
}

// Inicializar tema: preferencia guardada → preferencia del sistema → oscuro
(function initTheme() {
  const stored = getStoredTheme();
  if (stored) {
    setTheme(stored);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    setTheme('light');
  } else {
    setTheme('dark');
  }
})();

btnTheme.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  setTheme(current === 'dark' ? 'light' : 'dark');
});

/* ===== LÓGICA PRINCIPAL ===== */
const btnConfirm = document.getElementById('btnConfirm');

btnConfirm.addEventListener('click', calcular);

inputMonto.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    calcular();
  }
});

function calcular() {
  const raw = parseFloat(inputMonto.value);

  if (!inputMonto.value || isNaN(raw) || raw <= 0) {
    resetResult();
    return;
  }

  const descuento  = raw * DESCUENTO;
  const cobrar     = raw - descuento;

  // Formateamos con separadores de miles y 2 decimales
  const cobrarFmt   = formatearPesos(cobrar);
  const descFmt     = formatearPesos(descuento);
  const rawFmt      = formatearPesos(raw);

  // Mostrar resultado
  resultAmount.innerHTML = `<span class="prefix">$</span>${cobrarFmt}`;
  resultDetail.textContent = `Tickeadora $${rawFmt} − $${descFmt} (20%)`;

  resultCard.classList.add('has-value');
  btnCopy.style.display = 'block';

  // Sonido de confirmación
  playRegistroSound();

  // Vibración corta si está disponible
  if (navigator.vibrate) navigator.vibrate(80);

  // Animación pop
  resultAmount.classList.remove('pop');
  void resultAmount.offsetWidth; // reflow
  resultAmount.classList.add('pop');

  // Registrar en el historial automáticamente
  registrarHistorialDirecto(raw, cobrar);
}

function resetResult() {
  resultAmount.textContent = '—';
  resultDetail.textContent = '';
  resultCard.classList.remove('has-value');
  btnCopy.style.display = 'none';
}

function limpiar() {
  inputMonto.value = '';
  resetResult();
  inputMonto.focus();
}

/* ===== SONIDO DE CONFIRMACIÓN ===== */
let audioCtx = null;

function playRegistroSound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;

    // Tono 1: nota aguda corta
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);       // A5
    osc1.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.08); // C#6
    gain1.gain.setValueAtTime(0.18, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);

    // Tono 2: nota más alta, con delay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.1); // E6
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.14, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.4);
  } catch(e) {
    // Audio API no disponible, seguir sin sonido
  }
}

/* ===== HISTORIAL DE VIAJES ===== */
const HISTORY_KEY = 'taximetro-historial';
const historyCard    = document.getElementById('historyCard');
const historyHeader  = document.getElementById('historyHeader');
const historyBody    = document.getElementById('historyBody');
const historyList    = document.getElementById('historyList');
const historyEmpty   = document.getElementById('historyEmpty');
const historyBadge   = document.getElementById('historyBadge');
const historySummary = document.getElementById('historySummary');
const summaryTrips   = document.getElementById('summaryTrips');
const summaryTotal   = document.getElementById('summaryTotal');
const btnClearHist   = document.getElementById('btnClearHistory');
const historyFilters = document.getElementById('historyFilters');
const filterDate     = document.getElementById('filterDate');
const filterPills    = document.querySelectorAll('.filter-pill');

let activeFilter = 'hoy';

function getHistorial() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch(e) { return []; }
}

function saveHistorial(trips) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(trips)); } catch(e) {}
}

/* --- Helpers de fecha --- */
function toDateStr(date) {
  // Devuelve YYYY-MM-DD en hora local
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getFilteredTrips(trips) {
  const hoy = new Date();
  const hoyStr = toDateStr(hoy);

  // Si hay fecha elegida en el input date, esa tiene prioridad
  if (filterDate.value) {
    return trips.filter(t => toDateStr(new Date(t.fecha)) === filterDate.value);
  }

  switch (activeFilter) {
    case 'hoy':
      return trips.filter(t => toDateStr(new Date(t.fecha)) === hoyStr);
    case 'ayer': {
      const ayer = new Date(hoy);
      ayer.setDate(ayer.getDate() - 1);
      const ayerStr = toDateStr(ayer);
      return trips.filter(t => toDateStr(new Date(t.fecha)) === ayerStr);
    }
    case 'semana': {
      const hace7 = new Date(hoy);
      hace7.setDate(hace7.getDate() - 7);
      return trips.filter(t => new Date(t.fecha) >= hace7);
    }
    case 'todos':
    default:
      return trips;
  }
}

function getFilterLabel() {
  if (filterDate.value) {
    const d = new Date(filterDate.value + 'T12:00:00');
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  }
  switch (activeFilter) {
    case 'hoy':    return 'hoy';
    case 'ayer':   return 'ayer';
    case 'semana': return 'esta semana';
    case 'todos':  return 'en total';
    default:       return '';
  }
}

function registrarHistorialDirecto(raw, cobrar) {
  const ahora = new Date();

  const trip = {
    id: Date.now(),
    montoTickeadora: raw,
    montoCobrado: cobrar,
    fecha: ahora.toISOString()
  };

  const trips = getHistorial();
  trips.unshift(trip);
  saveHistorial(trips);

  // Asegurar filtro en "Hoy" para que se vea el viaje nuevo
  activeFilter = 'hoy';
  filterDate.value = '';
  updatePillsUI();
  renderHistorial();

  mostrarToast('✅ Viaje registrado');

  if (!historyCard.classList.contains('open')) {
    historyCard.classList.add('open');
  }
}

function renderHistorial() {
  const allTrips = getHistorial();
  const totalAll = allTrips.length;
  const filtered = getFilteredTrips(allTrips);
  const totalFiltered = filtered.length;

  historyBadge.textContent = totalAll;

  if (totalAll === 0) {
    historyEmpty.style.display = '';
    historyEmpty.textContent = 'Sin viajes registrados aún';
    historySummary.style.display = 'none';
    historyFilters.style.display = 'none';
    btnClearHist.style.display = 'none';
    historyList.querySelectorAll('.history-item').forEach(el => el.remove());
    return;
  }

  historyFilters.style.display = '';
  historySummary.style.display = '';
  btnClearHist.style.display = '';

  // Resumen según filtro activo
  const totalCobrado = filtered.reduce((sum, t) => sum + t.montoCobrado, 0);
  const label = getFilterLabel();

  summaryTrips.textContent = totalFiltered;
  summaryTotal.textContent = '$' + formatearPesos(totalCobrado);

  // Actualizar etiquetas del resumen
  const summaryLabels = historySummary.querySelectorAll('.summary-label');
  if (summaryLabels[0]) summaryLabels[0].textContent = `Viajes ${label}`;
  if (summaryLabels[1]) summaryLabels[1].textContent = `Cobrado ${label}`;

  // Renderizar lista filtrada
  historyList.querySelectorAll('.history-item').forEach(el => el.remove());

  if (totalFiltered === 0) {
    historyEmpty.style.display = '';
    historyEmpty.textContent = 'Sin viajes en esta fecha';
    return;
  }

  historyEmpty.style.display = 'none';
  const hoyStr = new Date().toDateString();

  filtered.forEach((trip, i) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.style.animationDelay = `${Math.min(i * 0.04, 0.3)}s`;

    const fecha = new Date(trip.fecha);
    const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const fechaCorta = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    const esHoy = fecha.toDateString() === hoyStr;

    // Número global del viaje
    const globalIndex = allTrips.findIndex(t => t.id === trip.id);
    const tripNum = totalAll - globalIndex;

    li.innerHTML = `
      <div class="trip-number">${tripNum}</div>
      <div class="trip-info">
        <div class="trip-amount">$${formatearPesos(trip.montoCobrado)}</div>
        <div class="trip-detail">Tickeadora $${formatearPesos(trip.montoTickeadora)} − 20%</div>
      </div>
      <div class="trip-time">
        <span class="trip-time-hour">${hora}</span>
        ${esHoy ? 'Hoy' : fechaCorta}
      </div>
    `;

    historyList.appendChild(li);
  });
}

function limpiarHistorial() {
  if (!confirm('¿Borrar todo el historial de viajes?')) return;
  saveHistorial([]);
  renderHistorial();
  mostrarToast('🗑️ Historial borrado');
}

/* --- Filter pills --- */
function updatePillsUI() {
  filterPills.forEach(pill => {
    pill.classList.toggle('active', pill.dataset.filter === activeFilter && !filterDate.value);
  });
}

filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    activeFilter = pill.dataset.filter;
    filterDate.value = ''; // Limpiar fecha manual
    updatePillsUI();
    renderHistorial();
  });
});

filterDate.addEventListener('change', () => {
  // Quitar active de todos los pills cuando se elige fecha manual
  updatePillsUI();
  renderHistorial();
});

// Toggle del historial
historyHeader.addEventListener('click', () => {
  historyCard.classList.toggle('open');
});

// Cargar historial al iniciar
renderHistorial();

/* ===== COPIAR AL PORTAPAPELES ===== */
function copiarMonto() {
  const raw = parseFloat(inputMonto.value);
  if (isNaN(raw) || raw <= 0) return;
  const cobrar = (raw * (1 - DESCUENTO)).toFixed(2);

  navigator.clipboard.writeText(cobrar).then(() => {
    mostrarToast('¡Copiado!');
  }).catch(() => {
    // Fallback para navegadores sin clipboard API
    const el = document.createElement('textarea');
    el.value = cobrar;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    mostrarToast('¡Copiado!');
  });
}

/* ===== TOAST ===== */
let toastTimer = null;
function mostrarToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

/* ===== FORMATEO ===== */
function formatearPesos(num) {
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/* ===== SERVICE WORKER ===== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        // Forzar actualización si hay un SW nuevo
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'activated') {
              window.location.reload();
            }
          });
        });
      })
      .catch(() => {});
  });
}

/* ===== AUTO-FOCUS EN DESKTOP ===== */
window.addEventListener('load', () => {
  // En mobile no auto-foco para no abrir el teclado de golpe
  if (window.innerWidth > 600) {
    inputMonto.focus();
  }
});
