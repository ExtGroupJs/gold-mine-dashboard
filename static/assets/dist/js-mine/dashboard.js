/* Dashboard script - Task counters and metrics */

const TASK_COUNTERS_URL = "/business-gestion/task/counters/";
const ALERT_COUNTERS_URL = "/business-gestion/alert/counters/";

function showError(title, text = "", timer = 3000) {
  if (window.Swal) {
    Swal.fire({ icon: "error", title, text, showConfirmButton: false, timer });
  } else {
    console.error(title, text);
  }
}

// Fetch counters from endpoints
function fetchTaskCounters() {
  return axios.get(TASK_COUNTERS_URL);
}

function fetchAlertCounters() {
  return axios.get(ALERT_COUNTERS_URL);
}

// Render counters on dashboard
// Render task counters and charts (separated so updates can be independent)
function renderTaskCounters(taskInfo) {
  taskInfo = taskInfo || {};
  const updateElement = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value || 0;
  };

  updateElement('total-tasks', taskInfo.total || 0);
  updateElement('notstarted-tasks', taskInfo['Not started'] || 0);
  updateElement('inprogress-tasks', taskInfo['In progress'] || 0);
  updateElement('completed-tasks', taskInfo['Completed'] || 0);
  updateElement('planned-tasks', taskInfo['Planned'] || 0);
  updateElement('hold-tasks', taskInfo['Hold'] || 0);

  // Task charts (pie + bar) — include all keys from taskInfo except 'total'
  const rawTaskKeys = Object.keys(taskInfo || {});
  const taskLabels = rawTaskKeys.filter(k => k.toLowerCase() !== 'total');
  const taskData = taskLabels.map(k => taskInfo[k] || 0);

  const taskColorMap = {
    'not started': '#dc3545',
    'in progress': '#ffc107',
    'completed': '#28a745',
    'planned': '#007bff',
    'hold': '#6c757d',
    'backlog': '#6c757d'
  };
  const taskPalette = ['#007bff', '#28a745', '#ffc107', '#6c757d', '#17a2b8', '#fd7e14', '#6610f2'];
  const taskColors = taskLabels.map((label, i) => taskColorMap[label.toLowerCase()] || taskPalette[i % taskPalette.length]);

  renderPieChart('pie-chart', taskLabels, taskData, taskColors);
  renderBarChart('bar-chart', taskLabels, taskData, taskColors);
}

// Render alert counters and charts (separated so updates can be independent)
function renderAlertCounters(alertInfo) {
  alertInfo = alertInfo || {};
  const updateElement = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value || 0;
  };

  const alertTotal = alertInfo && (alertInfo.total || alertInfo['total']) ? (alertInfo.total || alertInfo['total']) : 0;
  updateElement('alerts-total', alertTotal || 0);

  const getAlertValue = (name) => {
    if (!alertInfo) return 0;
    const k = Object.keys(alertInfo).find(key => key.toLowerCase() === name.toLowerCase());
    return k ? alertInfo[k] : 0;
  };
  updateElement('alerts-information', getAlertValue('Information'));
  updateElement('alerts-warning', getAlertValue('Warning'));
  updateElement('alerts-critical', getAlertValue('Critical'));

  const rawAlertKeys = Object.keys(alertInfo || {});
  const alertLabels = rawAlertKeys.filter(k => k.toLowerCase() !== 'total');
  const alertData = alertLabels.map(k => alertInfo[k] || 0);

  const severityColorMap = {
    'critical': '#dc3545',
    'warning': '#ffc107',
    'information': '#28a745',
    'info': '#28a745'
  };
  const defaultAlertColor = '#6c757d';
  const alertColors = alertLabels.map(l => severityColorMap[l.toLowerCase()] || defaultAlertColor);

  renderPieChart('alert-pie-chart', alertLabels, alertData, alertColors);
  renderBarChart('alert-bar-chart', alertLabels, alertData, alertColors);
}

// --- CORRECCIÓN AQUÍ ---
// Usamos un objeto para guardar múltiples instancias de gráficos
const chartInstances = {}; 

function renderPieChart(canvasId, labels, data, colors = null) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !window.Chart) return;

  // Si ya existe un gráfico con ESTE ID específico, lo destruimos
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const background = colors && Array.isArray(colors) && colors.length ? colors : ['#dc3545', '#ffc107', '#28a745'];
  
  // Guardamos la nueva instancia usando el ID del canvas como clave
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: background,
        borderColor: background.map(() => '#fff'),
        borderWidth: 2
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderBarChart(canvasId, labels, data, colors = null) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !window.Chart) return;

  // Si ya existe un gráfico con ESTE ID específico, lo destruimos
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const useArrayColors = colors && Array.isArray(colors) && colors.length;
  const background = useArrayColors ? colors : '#007bff';
  const border = useArrayColors ? colors.map(() => '#000') : '#0056b3';
  
  // Guardamos la nueva instancia usando el ID del canvas como clave
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Tareas',
        data,
        backgroundColor: background,
        borderColor: border,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        yAxes: [{ ticks: { beginAtZero: true } }] // Nota: Esto es sintaxis de Chart.js v2. Si usas v3+, esto podría fallar.
      }
    }
  });
}


// Render dashboard
function renderDashboard() {
  // Fetch and render task counters independently
  fetchTaskCounters()
    .then((res) => {
      // Endpoint may return object directly or under `task_info`
      const payload = res.data && res.data.task_info ? res.data.task_info : res.data;
      renderTaskCounters(payload);
    })
    .catch((err) => showError('Error cargando contadores de tareas', err.message || ''));

  // Fetch and render alert counters independently
  fetchAlertCounters()
    .then((res) => {
      const payload = res.data && res.data.alert_info ? res.data.alert_info : res.data;
      renderAlertCounters(payload);
    })
    .catch((err) => showError('Error cargando contadores de alertas', err.message || ''));
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('btn-refresh-dashboard');
  if (btn) btn.addEventListener('click', () => renderDashboard());
  renderDashboard();
  
  // Configuración de Pusher
  if (typeof pusherKey !== 'undefined' && typeof pusherCluster !== 'undefined') {
      var pusher = new Pusher(pusherKey, {
        cluster: pusherCluster
      });

      var dashboard_channel = pusher.subscribe('dashboard-channel');
      // The realtime update may contain task or alert data (or both).
      dashboard_channel.bind('update-task-event', function(data) {
        // If it's the combined structure with task_info/alert_info
          renderTaskCounters(data);
      }); 
      dashboard_channel.bind('update-alert-event', function(data) {
        // If it's the combined structure with task_info/alert_info
          renderAlertCounters(data);
      }); 
      
      var alert_channel = pusher.subscribe('alert-channel');
      
      // --- Configuración de Toast (No intrusivo) ---
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end', // Esquina superior derecha
        showConfirmButton: false,
        timer: 5000,         // Se cierra solo en 5 segundos
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer)
          toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
      });

      alert_channel.bind('deleted-alert-event', function(data) {
        // Validamos que existan los datos para evitar errores
        console.log("Alerta eliminada recibida:", data);
        if(data && data.task) {
            Toast.fire({ 
              icon: "info", 
              title: `Alerta ELIMINADA para: ${data.task}`, 
              text: `(${data.level.toUpperCase()}) ${data.alert_description}`
            });
        }
      });

      alert_channel.bind('new-alert-event', function(data) {

         // Validamos que existan los datos
        if(data && data.task) {
            Toast.fire({ 
              icon: "warning", 
              title: `¡NUEVA Alerta para: ${data.task}!`, 
              text: `(${data.level.toUpperCase()}) ${data.alert_description}`
            });
        }
      });
  } else {
      console.warn("Pusher keys no definidas. Las alertas en tiempo real no funcionarán.");
  }
});