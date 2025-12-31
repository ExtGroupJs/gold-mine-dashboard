/* Dashboard script - Task counters and metrics */

const COUNTERS_URL = "/business-gestion/task/counters/";

function showError(title, text = "", timer = 3000) {
  if (window.Swal) {
    Swal.fire({ icon: "error", title, text, showConfirmButton: false, timer });
  } else {
    console.error(title, text);
  }
}

// Fetch counters from endpoint
function fetchCounters() {
  return axios.get(COUNTERS_URL);
}

// Render counters on dashboard
function renderCounters(countersData) {
  // countersData expected shape: { task_info: {...}, alert_info: {...} }
  const taskInfo = (countersData && countersData.task_info) || {};
  const alertInfo = (countersData && countersData.alert_info) || {};

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

  // Task charts (pie + bar)
  const pieLabels = ['No iniciadas', 'En progreso', 'Completadas'];
  const pieData = [
    taskInfo['Not started'] || 0,
    taskInfo['In progress'] || 0,
    taskInfo['Completed'] || 0
  ];

  const barLabels = Object.keys(taskInfo).filter(k => k !== 'total');
  const barData = barLabels.map(k => taskInfo[k]);

  renderPieChart('pie-chart', pieLabels, pieData);
  renderBarChart('bar-chart', barLabels, barData);

  // Alert charts (pie + bar) with severity colors
  // show total in KPI but exclude it from the charts (total is aggregate)
  const alertTotal = alertInfo && (alertInfo.total || alertInfo['total']) ? (alertInfo.total || alertInfo['total']) : 0;
  updateElement('alerts-total', alertTotal || 0);
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

let lastPieChart = null;
function renderPieChart(canvasId, labels, data, colors = null) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !window.Chart) return;
  if (lastPieChart) lastPieChart.destroy();
  const background = colors && Array.isArray(colors) && colors.length ? colors : ['#dc3545', '#ffc107', '#28a745'];
  lastPieChart = new Chart(ctx, {
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

let lastBarChart = null;
function renderBarChart(canvasId, labels, data, colors = null) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !window.Chart) return;
  if (lastBarChart) lastBarChart.destroy();
  const useArrayColors = colors && Array.isArray(colors) && colors.length;
  const background = useArrayColors ? colors : '#007bff';
  const border = useArrayColors ? colors.map(() => '#000') : '#0056b3';
  lastBarChart = new Chart(ctx, {
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
        yAxes: [{ ticks: { beginAtZero: true } }]
      }
    }
  });
}


// Render dashboard
function renderDashboard() {
  fetchCounters()
    .then((res) => {
      renderCounters(res.data);
    })
    .catch((err) => showError('Error cargando dashboard', err.message || ''));
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('btn-refresh-dashboard');
  if (btn) btn.addEventListener('click', () => renderDashboard());
  renderDashboard();
  var pusher = new Pusher(pusherKey, {
    cluster: pusherCluster
  });

  var dashboard_channel = pusher.subscribe('dashboard-channel');
  dashboard_channel.bind('update-event', function(data) {
    renderCounters(data);
  }); 
  var alert_channel = pusher.subscribe('alert-channel');
    alert_channel.bind('deleted-alert-event', function(data) {
    Swal.fire({ icon: "info", title: `Alerta ELIMINADA en tarea ${data.task}`, text: `${data.alert_description}, LEVEL: ${data.level}`, showConfirmButton: true, timer: 10000 });
  });
  alert_channel.bind('new-alert-event', function(data) {
    Swal.fire({ icon: "warning", title: `Alerta CREADA en tarea ${data.task}`, text: `${data.alert_description}, LEVEL: ${data.level}`, showConfirmButton: true, timer: 10000 });
  }); 
});
