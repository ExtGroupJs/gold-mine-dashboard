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
  const updateElement = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value || 0;
  };

  updateElement('total-tasks', countersData.total || 0);
  updateElement('notstarted-tasks', countersData['Not started'] || 0);
  updateElement('inprogress-tasks', countersData['In progress'] || 0);
  updateElement('completed-tasks', countersData['Completed'] || 0);
  updateElement('planned-tasks', countersData['Planned'] || 0);
  updateElement('hold-tasks', countersData['Hold'] || 0);

  // Data for pie chart
  const pieLabels = ['No iniciadas', 'En progreso', 'Completadas'];
  const pieData = [
    countersData['Not started'] || 0,
    countersData['In progress'] || 0,
    countersData['Completed'] || 0
  ];

  // Data for bar chart (all statuses)
  const barLabels = Object.keys(countersData).filter(k => k !== 'total');
  const barData = barLabels.map(k => countersData[k]);

  renderPieChart('pie-chart', pieLabels, pieData);
  renderBarChart('bar-chart', barLabels, barData);
}

let lastPieChart = null;
function renderPieChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !window.Chart) return;
  if (lastPieChart) lastPieChart.destroy();
  lastPieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#dc3545', '#ffc107', '#28a745'],
        borderColor: ['#fff', '#fff', '#fff'],
        borderWidth: 2
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

let lastBarChart = null;
function renderBarChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !window.Chart) return;
  if (lastBarChart) lastBarChart.destroy();
  lastBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Tareas',
        data,
        backgroundColor: '#007bff',
        borderColor: '#0056b3',
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
});
