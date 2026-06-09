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
  try { return localStorage.getItem('taximetro-theme'); } catch { return null; }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';

  // Actualizar meta theme-color para que la barra del navegador combine
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'light' ? '#f2f2f7' : '#1a1a2e');
  }

  try { localStorage.setItem('taximetro-theme', theme); } catch {}
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
inputMonto.addEventListener('input', calcular);

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

  // Animación pop
  resultAmount.classList.remove('pop');
  void resultAmount.offsetWidth; // reflow
  resultAmount.classList.add('pop');
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

/* ===== HISTORIAL DE VIAJES ===== */
const HISTORY_KEY = 'taximetro-historial';
const historyCard   = document.getElementById('historyCard');
const historyHeader = document.getElementById('historyHeader');
const historyBody   = document.getElementById('historyBody');
const historyList   = document.getElementById('historyList');
const historyEmpty  = document.getElementById('historyEmpty');
const historyBadge  = document.getElementById('historyBadge');
const historySummary = document.getElementById('historySummary');
const summaryTrips  = document.getElementById('summaryTrips');
const summaryTotal  = document.getElementById('summaryTotal');
const btnClearHist  = document.getElementById('btnClearHistory');

function getHistorial() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch { return []; }
}

function saveHistorial(trips) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(trips)); } catch {}
}

function registrarYLimpiar() {
  const raw = parseFloat(inputMonto.value);
  if (!inputMonto.value || isNaN(raw) || raw <= 0) {
    // Si no hay monto, solo limpiar
    limpiar();
    return;
  }

  const cobrar = raw * (1 - DESCUENTO);
  const ahora = new Date();

  const trip = {
    id: Date.now(),
    montoTickeadora: raw,
    montoCobrado: cobrar,
    fecha: ahora.toISOString()
  };

  const trips = getHistorial();
  trips.unshift(trip); // Más reciente primero
  saveHistorial(trips);

  limpiar();
  renderHistorial();
  mostrarToast('✅ Viaje registrado');

  // Abrir el historial si estaba cerrado para que se vea
  if (!historyCard.classList.contains('open')) {
    historyCard.classList.add('open');
  }
}

function renderHistorial() {
  const trips = getHistorial();
  const total = trips.length;

  historyBadge.textContent = total;

  if (total === 0) {
    historyEmpty.style.display = '';
    historySummary.style.display = 'none';
    btnClearHist.style.display = 'none';
    // Limpiar items previos (dejar solo el empty)
    historyList.querySelectorAll('.history-item').forEach(el => el.remove());
    return;
  }

  historyEmpty.style.display = 'none';
  historySummary.style.display = '';
  btnClearHist.style.display = '';

  // Resumen del día
  const hoy = new Date().toDateString();
  const tripsHoy = trips.filter(t => new Date(t.fecha).toDateString() === hoy);
  const totalCobradoHoy = tripsHoy.reduce((sum, t) => sum + t.montoCobrado, 0);

  summaryTrips.textContent = tripsHoy.length;
  summaryTotal.textContent = '$' + formatearPesos(totalCobradoHoy);

  // Renderizar lista
  historyList.querySelectorAll('.history-item').forEach(el => el.remove());

  trips.forEach((trip, i) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.style.animationDelay = `${Math.min(i * 0.04, 0.3)}s`;

    const fecha = new Date(trip.fecha);
    const hora = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const fechaCorta = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    const esHoy = fecha.toDateString() === hoy;

    li.innerHTML = `
      <div class="trip-number">${total - i}</div>
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
