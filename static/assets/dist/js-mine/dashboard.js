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
function renderTaskCounters(taskInfo, internal_status_filter="") {
  taskInfo = taskInfo || {};
  const updateElement = (id, value, internal_value="") => {
    const node = document.getElementById(id);
    if (node) node.textContent = value || 0;
    node.addEventListener("mouseclick", Swal.stopTimer);
  };
  // toast.addEventListener("mouseenter", Swal.stopTimer);

  updateElement("total-tasks", taskInfo.total || 0);
  updateElement("notstarted-tasks", taskInfo["Not started"] || 0);
  updateElement("inprogress-tasks", taskInfo["In progress"] || 0);
  updateElement("warning-tasks", taskInfo["Warning"] || 0);
  updateElement("completed-tasks", taskInfo["Completed"] || 0);
  updateElement("planned-tasks", taskInfo["Planned"] || 0);
  updateElement("hold-tasks", taskInfo["Hold"] || 0);

  // Task charts (pie + bar) — use percentages for charts
  const rawTaskKeys = Object.keys(taskInfo || {});
  const taskLabels = rawTaskKeys.filter(
    (k) => k.toLowerCase() !== "total" && !k.includes("_percent")
  );
  const taskData = taskLabels.map((k) => taskInfo[k + "_percent"] || 0);

  const taskColorMap = {
    "not started": "#dc3545",
    "in progress": "#f2f1eeff",
    warning: "#ffc107",
    completed: "#28a745",
    planned: "#007bff",
    hold: "#6c757d",
    backlog: "#6c757d",
  };
  const taskPalette = [
    "#f2f1eeff",
    "#007bff",
    "#28a745",
    "#ffc107",
    "#6c757d",
    "#17a2b8",
    "#fd7e14",
    "#6610f2",
  ];
  const taskColors = taskLabels.map(
    (label, i) =>
      taskColorMap[label.toLowerCase()] || taskPalette[i % taskPalette.length]
  );

  renderPieChart("pie-chart", taskLabels, taskData, taskColors);
  renderBarChart("bar-chart", taskLabels, taskData, taskColors);
  paintTaskTable(internal_status_filter);

}

// Render alert counters and charts (separated so updates can be independent)
function renderAlertCounters(alertInfo, kind_filter="") {
  alertInfo = alertInfo || {};
  const updateElement = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value || 0;
  };

  const alertTotal =
    alertInfo && (alertInfo.total || alertInfo["total"])
      ? alertInfo.total || alertInfo["total"]
      : 0;
  updateElement("alerts-total", alertTotal || 0);

  const getAlertValue = (name) => {
    if (!alertInfo) return 0;
    const k = Object.keys(alertInfo).find(
      (key) => key.toLowerCase() === name.toLowerCase()
    );
    return k ? alertInfo[k] : 0;
  };
  updateElement("alerts-information", getAlertValue("Information"));
  updateElement("alerts-warning", getAlertValue("Warning"));
  updateElement("alerts-critical", getAlertValue("Critical"));

  const rawAlertKeys = Object.keys(alertInfo || {});
  const alertLabels = rawAlertKeys.filter(
    (k) => k.toLowerCase() !== "total" && !k.includes("_percent")
  );
  const alertData = alertLabels.map((k) => alertInfo[k + "_percent"] || 0);

  const severityColorMap = {
    critical: "#dc3545",
    warning: "#ffc107",
    information: "#28a745",
    info: "#28a745",
  };
  const defaultAlertColor = "#6c757d";
  const alertColors = alertLabels.map(
    (l) => severityColorMap[l.toLowerCase()] || defaultAlertColor
  );

  renderPieChart("alert-pie-chart", alertLabels, alertData, alertColors);
  renderBarChart("alert-bar-chart", alertLabels, alertData, alertColors);
  paintTaskTableAlerts(kind_filter);
}

const chartInstances = {};

function renderPieChart(
  canvasId,
  labels,
  data,
  colors = null,
  legendLabels = []
) {
  for (let i = 0; i < labels.length; i++) {
    legendLabels[i] = labels[i] + " " + data[i] + "%";
  }
  const ctx = document.getElementById(canvasId);
  if (!ctx || !window.Chart) return;

  // Destruir gráfico existente
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const background =
    colors && Array.isArray(colors) && colors.length
      ? colors
      : ["#dc3545", "#ffc107", "#28a745"];

  chartInstances[canvasId] = new Chart(ctx, {
    type: "pie",
    data: {
      labels: legendLabels,
      datasets: [
        {
          data,
          backgroundColor: background,
          borderColor: background.map(() => "#fff"),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      
    },
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
  const background = useArrayColors ? colors : "#007bff";
  const border = useArrayColors ? colors.map(() => "#000") : "#0056b3";

  // Guardamos la nueva instancia usando el ID del canvas como clave
  chartInstances[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Tareas",
          data,
          backgroundColor: background,
          borderColor: border,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        yAxes: [{ ticks: { beginAtZero: true } }], // Nota: Esto es sintaxis de Chart.js v2. Si usas v3+, esto podría fallar.
      },
    },
  });
}

// Render dashboard
function renderDashboard() {
  // Fetch and render task counters independently
  fetchTaskCounters()
    .then((res) => {
      // Endpoint may return object directly or under `task_info`
      const payload =
        res.data && res.data.task_info ? res.data.task_info : res.data;
      renderTaskCounters(payload);
    })
    .catch((err) =>
      showError("Error cargando contadores de tareas", err.message || "")
    );

  // Fetch and render alert counters independently
  fetchAlertCounters()
    .then((res) => {
      const payload =
        res.data && res.data.alert_info ? res.data.alert_info : res.data;
      renderAlertCounters(payload);
    })
    .catch((err) =>
      showError("Error cargando contadores de alertas", err.message || "")
    );
}

// Initialize
document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("btn-refresh-dashboard");
  if (btn) btn.addEventListener("click", () => renderDashboard());
  renderDashboard();

  // Configuración de Pusher
  if (
    typeof pusherKey !== "undefined" &&
    typeof pusherCluster !== "undefined"
  ) {
    var pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    var dashboard_channel = pusher.subscribe("dashboard-channel");
    // The realtime update may contain task or alert data (or both).
    dashboard_channel.bind("update-task-event", function (data) {
      // If it's the combined structure with task_info/alert_info
      renderTaskCounters(data);
      $("#tabla-de-Datos").DataTable().ajax.reload(null, false);
      $("#tabla-de-Datos-alerts").DataTable().ajax.reload(null, false);
    });
    dashboard_channel.bind("update-alert-event", function (data) {
      // If it's the combined structure with task_info/alert_info
      renderAlertCounters(data);
    });

    var alert_channel = pusher.subscribe("alert-channel");

    // --- Configuración de Toast (No intrusivo) ---
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end", // Esquina superior derecha
      showConfirmButton: false,
      timer: 5000, // Se cierra solo en 5 segundos
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      },
    });

    alert_channel.bind("deleted-alert-event", function (data) {
      // Validamos que existan los datos para evitar errores
      console.log("Alerta eliminada recibida:", data);
      if (data && data.task) {
        Toast.fire({
          icon: "info",
          title: `Alerta ELIMINADA para: ${data.task}`,
          text: `(${data.level.toUpperCase()}) ${data.alert_description}`,
        });
      }
    });

    alert_channel.bind("new-alert-event", function (data) {
      // Validamos que existan los datos
      if (data && data.task) {
        Toast.fire({
          icon: "warning",
          title: `¡NUEVA Alerta para: ${data.task}!`,
          text: `(${data.level.toUpperCase()}) ${data.alert_description}`,
        });
      }
    });
  } else {
    console.warn(
      "Pusher keys no definidas. Las alertas en tiempo real no funcionarán."
    );
  }
});

function paintTaskTable(internal_status="") {
  $("#tabla-de-Datos").addClass("table table-hover");

  $("#tabla-de-Datos").DataTable({
    dom: '<"row"<"col-sm-6"l><"col-sm-6"f>> t i p',
    
    // 1. Configuración de paginación compacta (solo números)
    pagingType: "numbers", 
    
    responsive: true,
    serverSide: true,
    processing: true,
   
    search: { return: true },
    ajax: function (data, callback, settings) {
      let dir = "";
      if (data.order && data.order[0].dir === "desc") dir = "-";
      const orderCol = data.columns && data.columns[data.order[0].column].data;

      // include date filters when present
      const params = {
        page_size: data.length,
        page: data.start / data.length + 1,
        search: data.search.value,
        ordering: dir + orderCol,
        internal_status:internal_status
      };

      const API_URL = "/business-gestion/task/";
      axios
        .get(API_URL, { params })
        .then((res) => {
          callback({
            recordsTotal: res.data.count,
            recordsFiltered: res.data.count,
            data: res.data.results,
          });
        })
        .catch((err) => {
          showError("Error cargando datos", err.message || "");
        });
    },
    columns: [
      { data: "wbs", title: "WBS" },
      { data: "alerts", title: "Alertas<br>(Alerts)" , render: (data) => getAlert(data),},
      { data: "task_code", title: "Código<br>(Code)" },
      { data: "task_name", title: "Nombre de tarea<br>(Task Name)" },
      {
        data: "internal_status",
        className: "dt-body-center",
        title: "Estado<br>(Status)",
        render: (data) => getStatusIcon(data),
      },
      { data: "complete_pct", title: "% Completado<br>(% Completed)" },
    ],
    columnDefs: [],
    
    // 2. Añadir clase 'pagination-sm' de Bootstrap para reducir el tamaño visual
    initComplete: function () {
      const api = this.api();
      $('.dataTables_paginate', api.table().container()).addClass('pagination-sm');
    }
  });

  // Color rows based on start/end dates after table draw
  const table = $("#tabla-de-Datos").DataTable();

  table.on("draw", function () {
    const rows = table.rows({ page: "current" }).nodes();
    table
      .rows({ page: "current" })
      .data()
      .each(function (d, i) {
        const rowNode = rows[i];

        $(rowNode).removeClass(
          "task-status-started task-status-completed task-status-notstarted"
        );
        // now using actual dates returned by the API
        const status = d.internal_status;

        if (status == "H") {
          $(rowNode).addClass("bg-gray");
        } else if (status == "C") {
          $(rowNode).addClass("bg-success");
        } else if (status=='N') {          
            $(rowNode).addClass("bg-orange");        
        }else if (status=='W') {          
            $(rowNode).addClass("bg-warning");        
        }else if (status=='P') {          
            $(rowNode).addClass("bg-primary");        
        }
      });
  });
}


function paintTaskTableAlerts(kind="") {
  $("#tabla-de-Datos-alerts").addClass("table table-hover");

  $("#tabla-de-Datos-alerts").DataTable({
    dom: '<"row"<"col-sm-6"l><"col-sm-6"f>> t i p',
    pagingType: "numbers",
    responsive: true,
    serverSide: true,
    processing: true,
    kind:kind,
    search: { return: true },
    ajax: function (data, callback, settings) {
      let dir = "";
      if (data.order && data.order[0].dir === "desc") dir = "-";
      const orderCol = data.columns && data.columns[data.order[0].column].data;

      // include date filters when present
      const params = {
        page_size: data.length,
        page: data.start / data.length + 1,
        search: data.search.value,
        ordering: dir + orderCol,
      };

      const API_URL = "/business-gestion/alert/";
      axios
        .get(API_URL, { params })
        .then((res) => {
          callback({
            recordsTotal: res.data.count,
            recordsFiltered: res.data.count,
            data: res.data.results,
          });
        })
        .catch((err) => {
          showError("Error cargando datos", err.message || "");
        });
    },
    columns: [
      { data: "task_name", title: "Nombre de tarea<br>(Task name)" },
      { data: "short_description", title: "Observación<br>(Observation)" },
      { data: "motive_alert_status_name", title: "Motivo<br>(Motive)" },
      { data: "kind_name", title: "Tipo<br>(Kind)" },
    ],
    columnDefs: [],
     initComplete: function () {
      const api = this.api();
      $('.dataTables_paginate', api.table().container()).addClass('pagination-sm');
    }
  });

  // Color rows based on start/end dates after table draw
  const table = $("#tabla-de-Datos-alerts").DataTable();

  table.on("draw", function () {
    const rows = table.rows({ page: "current" }).nodes();
    table
      .rows({ page: "current" })
      .data()
      .each(function (d, i) {
        const rowNode = rows[i];

        $(rowNode).removeClass(
          "task-status-started task-status-completed task-status-notstarted"
        );
        // now using actual dates returned by the API

        if (d.kind == "C") {
          $(rowNode).addClass("bg-danger");
        } else if (d.kind == "W") {
          $(rowNode).addClass("bg-warning");
        } else if (d.kind == "I") {
          $(rowNode).addClass("bg-success");
        }
      });
  });
}

function getStatusIcon(statusCode) {
  const statusMap = {
    N: { icon: "fa-circle", color: "#6c757d", label: "(Not started)", labelespañol: "No iniciada" }, // Gris
    C: { icon: "fa-check-circle", color: "#28a745", label: "(Completed)", labelespañol: "Completada" }, // Verde
    I: { icon: "fa-circle-notch", color: "#007bff", label: "(In progress)", labelespañol: "En progreso" }, // Azul
    H: { icon: "fa-pause-circle", color: "#ff0707ff", label: "(Backlog)", labelespañol: "Pausa" }, // Amarillo
    P: { icon: "fa-hourglass-start", color: "#17a2b8", label: "(New)", labelespañol: "Nueva" }, // Cian
  };

  const status = statusMap[statusCode] || statusMap["N"];
  // return ``;
  return `<span class="info-box-icon"><i class="fas ${status.icon}"  style="font-size: x-large;" title="${status.label}"></i></span><span class="info-box-text" style="vertical-align: inherit; display: block; text-align: center;">
    ${status.labelespañol} <br> ${status.label}
</span> `;
}
function getAlert(alerts) {
  if(alerts.length>0){
 return `<span class="info-box-icon"><i class="fas fa-exclamation-triangle "  style="font-size: x-large;" ></i></span>`;
  }else{return '';}

}
