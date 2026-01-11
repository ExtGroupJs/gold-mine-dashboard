// --- Variables Globales ---
const MANAGEMENT_COUNTERS_URL = "/business-gestion/task/management_counters/";
const ALERT_COUNTERS_URL = "/business-gestion/alert/counters/";

let chartInstances = {};
let mgmtTableInstance = null;

// --- Utilidades ---

// Redondeo dinámico: Máximo 3 decimales. Si hay menos, se muestra tal cual.
function formatNumber(value) {
  if (value === null || value === undefined) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3, // Máximo 3 decimales, pero no fuerza a 3 si hay menos
  }).format(value);
}

function formatCurrency(value) {
  if (value === null || value === undefined) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 3,
  }).format(value);
}

function showError(title, text = "", timer = 3000) {
  if (window.Swal) {
    Swal.fire({ icon: "error", title, text, showConfirmButton: false, timer });
  } else {
    console.error(title, text);
  }
}

// --- Inicialización ---
document.addEventListener("DOMContentLoaded", function () {
  initCharts();
  initMgmtTable();
  loadManagementData();
  fetchAlertCounters();
  initPusher();
});

// --- Carga de Datos ---
function fetchAlertCounters() {
  axios
    .get(ALERT_COUNTERS_URL)
    .then((res) => {
      updateAlertKPI(res.data);
    })
    .catch((err) => console.warn("No se pudieron cargar alertas", err));
}

function loadManagementData() {
  axios
    .get(MANAGEMENT_COUNTERS_URL)
    .then((res) => {
      processManagementData(res.data);
    })
    .catch((err) => {
      showError("Error cargando datos gerenciales", err.message || "");
    });
}

function updateAlertKPI(data) {
  const alertInfo = data && data.alert_info ? data.alert_info : data;
  const total = alertInfo.total || 0;
  document.getElementById("alerts-total-mgmt").textContent = total;
}

function processManagementData(data) {
  if (!data || typeof data !== "object") return;

  const sortedDates = Object.keys(data).sort();

  const hoursData = sortedDates.map((date) => data[date].hours);
  const fuelData = sortedDates.map((date) => data[date].fuel_spent);
  const costData = sortedDates.map((date) => data[date].rental_cost);
  const tasksTotal = sortedDates.map((date) => data[date].tasks);
  const tasksDone = sortedDates.map((date) => data[date].completed_tasks);
  const tasksPending = sortedDates.map(
    (date) => data[date].tasks - data[date].completed_tasks
  );
  const volumeData = sortedDates.map((date) => data[date].processed_volume);
  const areaData = sortedDates.map((date) => data[date].processed_area);

  const efficiencyData = sortedDates.map((date) => {
    const t = data[date].tasks;
    const c = data[date].completed_tasks;
    return t > 0 ? (c / t) * 100 : 0;
  });

  const unitCostData = sortedDates.map((date) => {
    const totalCost = data[date].rental_cost + data[date].fuel_spent;
    const vol = data[date].processed_volume;
    return vol > 0 ? totalCost / vol : 0;
  });

  // Totales
  const totalHours = hoursData.reduce((a, b) => a + b, 0);
  const totalFuel = fuelData.reduce((a, b) => a + b, 0);
  const totalCost = costData.reduce((a, b) => a + b, 0);
  const totalVolume = volumeData.reduce((a, b) => a + b, 0);

  const totalTasksAssigned = tasksTotal.reduce((a, b) => a + b, 0);
  const totalTasksCompleted = tasksDone.reduce((a, b) => a + b, 0);
  const efficiency =
    totalTasksAssigned > 0
      ? (totalTasksCompleted / totalTasksAssigned) * 100
      : 0;

  // Actualizar DOM (usando formatNumber para lógica dinámica de decimales)
  document.getElementById("mgmt-total-hours").innerText =
    formatNumber(totalHours);
  document.getElementById("mgmt-total-fuel").innerText =
    formatNumber(totalFuel);
  document.getElementById("mgmt-total-cost").innerText =
    formatCurrency(totalCost);
  document.getElementById("mgmt-total-volume").innerText =
    formatNumber(totalVolume);

  // Para la eficiencia en el DOM, usamos formatNumber y le agregamos %
  document.getElementById("mgmt-efficiency").innerText =
    formatNumber(efficiency) + "%";

  updateCharts(
    sortedDates,
    hoursData,
    fuelData,
    costData,
    tasksTotal,
    tasksDone,
    tasksPending,
    volumeData,
    efficiencyData,
    unitCostData
  );
  updateTable(sortedDates, data, efficiencyData, unitCostData);
}

// --- Gráficas ---
function initCharts() {
  // 1. Productividad
  const ctxProd = document.getElementById("mgmt-productivity-chart");
  if (ctxProd) {
    chartInstances["productivity"] = new Chart(ctxProd, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Volumen Procesado",
            data: [],
            backgroundColor: "rgba(0, 123, 255, 0.6)",
            borderColor: "rgba(0, 123, 255, 1)",
            borderWidth: 1,
            yAxisID: "y-volume",
            order: 2,
          },
          {
            label: "Costo Alquiler ($)",
            data: [],
            backgroundColor: "rgba(220, 53, 69, 0.6)",
            borderColor: "rgba(220, 53, 69, 1)",
            borderWidth: 1,
            yAxisID: "y-cost",
            order: 3,
          },
          {
            type: "line",
            label: "Horas Trabajadas",
            data: [],
            borderColor: "#6610f2",
            backgroundColor: "#6610f2",
            borderWidth: 2,
            pointRadius: 3,
            fill: false,
            yAxisID: "y-volume",
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          yAxes: [
            {
              id: "y-volume",
              type: "linear",
              position: "left",
              gridLines: { display: true },
              ticks: {
                callback: function (value) {
                  return formatNumber(value);
                },
              },
            },
            {
              id: "y-cost",
              type: "linear",
              position: "right",
              gridLines: { display: false },
              ticks: {
                callback: function (value) {
                  return "$" + formatNumber(value);
                },
              },
            },
          ],
          xAxes: [{ gridLines: { display: false } }],
        },
      },
    });
  }

  // 2. Tareas (Stacked)
  const ctxTasks = document.getElementById("mgmt-tasks-chart");
  if (ctxTasks) {
    chartInstances["tasks"] = new Chart(ctxTasks, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Completadas",
            data: [],
            backgroundColor: "rgba(40, 167, 69, 0.7)",
            borderColor: "rgba(40, 167, 69, 1)",
            borderWidth: 1,
          },
          {
            label: "Pendientes",
            data: [],
            backgroundColor: "rgba(253, 126, 20, 0.7)",
            borderColor: "rgba(253, 126, 20, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          xAxes: [{ stacked: true, gridLines: { display: false } }],
          yAxes: [
            {
              stacked: true,
              ticks: {
                beginAtZero: true,
                stepSize: 1,
                callback: function (value) {
                  return formatNumber(value);
                },
              },
            },
          ],
        },
      },
    });
  }

  // 3. Eficiencia
  const ctxEff = document.getElementById("mgmt-efficiency-chart");
  if (ctxEff) {
    chartInstances["efficiency"] = new Chart(ctxEff, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "% Tareas Completadas",
            data: [],
            borderColor: "#ffc107",
            backgroundColor: "rgba(255, 193, 7, 0.2)",
            borderWidth: 2,
            pointRadius: 4,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          yAxes: [
            {
              ticks: {
                callback: function (value) {
                  return formatNumber(value) + "%";
                },
                beginAtZero: true,
                max: 100,
              },
            },
          ],
        },
      },
    });
  }

  // 4. Costo por Unidad
  const ctxUnitCost = document.getElementById("mgmt-unitcost-chart");
  if (ctxUnitCost) {
    chartInstances["unitcost"] = new Chart(ctxUnitCost, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "$ por Unidad",
            data: [],
            backgroundColor: "rgba(0,0,0,0.6)",
            borderColor: "#000",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          yAxes: [
            {
              ticks: {
                callback: function (value) {
                  return "$" + formatNumber(value);
                },
                beginAtZero: true,
              },
            },
          ],
        },
      },
    });
  }
}

function updateCharts(
  labels,
  hours,
  fuel,
  cost,
  totalTasks,
  doneTasks,
  pendingTasks,
  volume,
  efficiency,
  unitCost
) {
  if (chartInstances["productivity"]) {
    chartInstances["productivity"].data.labels = labels;
    chartInstances["productivity"].data.datasets[0].data = volume;
    chartInstances["productivity"].data.datasets[1].data = cost;
    chartInstances["productivity"].data.datasets[2].data = hours;
    chartInstances["productivity"].update();
  }

  if (chartInstances["tasks"]) {
    chartInstances["tasks"].data.labels = labels;
    chartInstances["tasks"].data.datasets[0].data = doneTasks;
    chartInstances["tasks"].data.datasets[1].data = pendingTasks;
    chartInstances["tasks"].update();
  }

  if (chartInstances["efficiency"]) {
    chartInstances["efficiency"].data.labels = labels;
    chartInstances["efficiency"].data.datasets[0].data = efficiency;
    chartInstances["efficiency"].update();
  }

  if (chartInstances["unitcost"]) {
    chartInstances["unitcost"].data.labels = labels;
    chartInstances["unitcost"].data.datasets[0].data = unitCost;
    chartInstances["unitcost"].update();
  }
}

// --- Tabla ---
function initMgmtTable() {
  mgmtTableInstance = $("#tabla-gestion").DataTable({
    dom: '<"row"<"col-sm-6"l><"col-sm-6"f>> t i p',
    pagingType: "numbers",
    responsive: true,
    language: {
      url: "//cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json",
    },
    order: [[0, "desc"]],
    columnDefs: [
      {
        targets: 4, // Eficiencia
        render: function (data, type, row) {
          const percent = parseFloat(data);
          let color = "secondary";
          if (percent >= 80) color = "success";
          else if (percent > 50) color = "warning";
          else if (percent > 0) color = "danger";
          // Usamos formatNumber para aplicar lógica de decimales
          return `<span class="badge badge-${color}">${formatNumber(
            percent
          )}%</span>`;
        },
      },
      // Reemplazamos los renderers estáticos por funciones personalizadas que usan formatNumber
      {
        targets: 1,
        render: function (data) {
          return formatNumber(data);
        },
      }, // Horas
      {
        targets: 2,
        render: function (data) {
          return formatNumber(data);
        },
      }, // Tareas
      {
        targets: 3,
        render: function (data) {
          return formatNumber(data);
        },
      }, // Completadas
      {
        targets: 5,
        render: function (data) {
          return formatNumber(data);
        },
      }, // Volumen
      {
        targets: 6,
        render: function (data) {
          return formatNumber(data);
        },
      }, // Area
      {
        targets: 7,
        render: function (data) {
          return formatNumber(data);
        },
      }, // Fuel
      {
        targets: 8,
        render: function (data) {
          return "$" + formatNumber(data);
        },
      }, // Costo
    ],
    initComplete: function () {
      const api = this.api();
      $(".dataTables_paginate", api.table().container()).addClass(
        "pagination-sm"
      );
    },
  });
}

function updateTable(dates, dataObj, effData, unitCostData) {
  const tableData = dates.map((date, index) => {
    const info = dataObj[date];
    return [
      date,
      info.hours,
      info.tasks,
      info.completed_tasks,
      effData[index],
      info.processed_volume,
      info.processed_area,
      info.fuel_spent,
      info.rental_cost,
    ];
  });

  mgmtTableInstance.clear();
  mgmtTableInstance.rows.add(tableData);
  mgmtTableInstance.draw();
}

// --- Configuración de Pusher ---
function initPusher() {
  if (
    typeof pusherKey !== "undefined" &&
    typeof pusherCluster !== "undefined"
  ) {
    var pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    // --- CANAL Y EVENTO ESPECIFICADOS ---
    var mgmt_channel = pusher.subscribe("management-dashboard-channel");

    mgmt_channel.bind("update-task-event", function (data) {
      console.log("Pusher: update-task-event recibido", data);
      // Si el evento trae los datos completos, se procesan inmediatamente
      if (data && typeof data === "object") {
        processManagementData(data);
      } else {
        // Si no, forzamos recarga del API
        loadManagementData();
      }
    });

    // Lógica de Alertas (si se mantiene)
    var alert_channel = pusher.subscribe("alert-channel");

    alert_channel.bind("new-alert-event", function (data) {
      console.log("Pusher: new-alert-event recibido", data);
      if (window.Swal) {
        const Toast = Swal.mixin({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true,
          didOpen: (toast) => {
            toast.addEventListener("mouseenter", Swal.stopTimer);
            toast.addEventListener("mouseleave", Swal.resumeTimer);
          },
        });
        if (data && data.task) {
          Toast.fire({
            icon: "warning",
            title: `¡NUEVA Alerta para: ${data.task}!`,
            text: `(${data.level.toUpperCase()}) ${data.alert_description}`,
          });
        }
      }
      fetchAlertCounters();
    });

    alert_channel.bind("deleted-alert-event", function (data) {
      console.log("Pusher: deleted-alert-event recibido", data);
      fetchAlertCounters();
    });
  } else {
    console.warn(
      "Pusher keys no definidas. Las actualizaciones en tiempo real no funcionarán."
    );
  }
}
