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
