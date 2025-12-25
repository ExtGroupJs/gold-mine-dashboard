/* Dashboard-only script
   This file contains only code related to the dashboard (board) UI: fetching metrics and rendering charts/tables.
*/

const API_URL = "/business-gestion/task/";

function showError(title, text = "", timer = 3000) {
  if (window.Swal) {
    Swal.fire({ icon: "error", title, text, showConfirmButton: false, timer });
  } else {
    console.error(title, text);
  }
}

function formatDateTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch (e) {
    return iso;
  }
}

// Fetch all tasks pages (small batches) - used to compute dashboard metrics client-side
function fetchAllTasks() {
  const pageSize = 200;
  let page = 1;
  let results = [];

  function fetchPage() {
    return axios.get(API_URL, { params: { page_size: pageSize, page } }).then((res) => {
      results = results.concat(res.data.results || []);
      if (res.data.next) {
        page += 1;
        return fetchPage();
      }
      return results;
    });
  }

  return fetchPage();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (s) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
  });
}

let lastPieChart = null;
function renderPieChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !window.Chart) return;
  if (lastPieChart) lastPieChart.destroy();
  lastPieChart = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data, backgroundColor: ['#f8d7da', '#fff3cd', '#d4edda'] }] },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

let lastBarChart = null;
function renderBarChart(canvasId, labels, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !window.Chart) return;
  if (lastBarChart) lastBarChart.destroy();
  lastBarChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Tareas', data, backgroundColor: '#007bff' }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { yAxes: [{ ticks: { beginAtZero: true } }] } },
  });
}

// Render dashboard: counters, charts, upcoming and overdue lists
function renderDashboard() {
  fetchAllTasks()
    .then((tasks) => {
      const now = new Date();
      const total = tasks.length;
      let notStarted = 0;
      let started = 0;
      let completed = 0;
      const statusCounts = {};
      const upcoming = [];
      const overdue = [];

      tasks.forEach((t) => {
        const hasStart = !!t.start_date;
        const hasEnd = !!t.end_date;
        const endDt = t.end_date ? new Date(t.end_date) : null;

        if (!hasStart && !hasEnd) notStarted++;
        else if (hasStart && !hasEnd) started++;
        else if (hasStart && hasEnd && endDt && endDt <= now) completed++;

        const st = t.status_code || 'unknown';
        statusCounts[st] = (statusCounts[st] || 0) + 1;

        if (endDt) {
          const diffDays = Math.ceil((endDt - now) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 7) upcoming.push(t);
          if (endDt < now) overdue.push(t);
        }
      });

      // Update counters
      const el = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
      el('total-tasks', total);
      el('notstarted-tasks', notStarted);
      el('started-tasks', started);
      el('completed-tasks', completed);

      // Charts
      renderPieChart('tasks-pie-chart', ['No iniciadas', 'En progreso', 'Completadas'], [notStarted, started, completed]);
      const barLabels = Object.keys(statusCounts);
      renderBarChart('tasks-bar-chart', barLabels, barLabels.map((k) => statusCounts[k]));

      // Tables
      const $up = document.querySelector('#table-upcoming tbody'); if ($up) { $up.innerHTML = ''; upcoming.slice(0,10).forEach(t => { $up.insertAdjacentHTML('beforeend', `<tr><td>${escapeHtml(t.task_name || t.task_code || '')}</td><td>${formatDateTime(t.end_date)}</td></tr>`); }); }
      const $ov = document.querySelector('#table-overdue tbody'); if ($ov) { $ov.innerHTML = ''; overdue.slice(0,10).forEach(t => { $ov.insertAdjacentHTML('beforeend', `<tr><td>${escapeHtml(t.task_name || t.task_code || '')}</td><td>${formatDateTime(t.end_date)}</td></tr>`); }); }

    })
    .catch((err) => showError('Error cargando dashboard', err.message || ''));
}

// Init
document.addEventListener('DOMContentLoaded', function() {
  const btn = document.getElementById('btn-refresh-dashboard');
  if (btn) btn.addEventListener('click', () => renderDashboard());
  renderDashboard();
});


