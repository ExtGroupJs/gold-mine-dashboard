// --- Variables Globales ---
const MANAGEMENT_COUNTERS_URL = "/business-gestion/task/management-counters/";
const ALERT_COUNTERS_URL = "/business-gestion/alert/counters/";

let chartInstances = {};
let ownerColors = {
  UNIVOL: { bg: "rgba(23, 162, 184, 0.7)", border: "rgba(23, 162, 184, 1)" },
  WOOMY: { bg: "rgba(220, 53, 69, 0.7)", border: "rgba(220, 53, 69, 1)" },
};

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
  loadManagementData();
  initPusher();
});

// --- Carga de Datos ---
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

function processManagementData(data) {
  if (!data || typeof data !== "object") return;

  const sortedDates = Object.keys(data).sort();

  // Datos reales
  const hoursData = sortedDates.map((date) => data[date].hours);
  const fuelData = sortedDates.map((date) => data[date].fuel_spent);
  const costData = sortedDates.map((date) => data[date].rental_cost);
  const tasksTotal = sortedDates.map((date) => data[date].tasks);
  const tasksDone = sortedDates.map((date) => data[date].completed_tasks);
  const volumeData = sortedDates.map((date) => data[date].processed_volume);
  const areaData = sortedDates.map((date) => data[date].processed_area);

  // Datos de línea base
  const baseFuel = sortedDates.map((date) => data[date].base_info?.fuel_spent || 0);
  const baseCost = sortedDates.map((date) => data[date].base_info?.rental_cost || 0);
  const baseVolume = sortedDates.map((date) => data[date].base_info?.processed_volume || 0);

  // Procesar datos por propietario
  const ownerData = processOwnerData(data, sortedDates);

  const efficiencyData = sortedDates.map((date) => {
    const t = data[date].tasks;
    const c = data[date].completed_tasks;
    return t > 0 ? (c / t) * 100 : 0;
  });

  // Totales
  const totalHours = hoursData.reduce((a, b) => a + b, 0);
  const totalFuel = fuelData.reduce((a, b) => a + b, 0);
  const totalCost = costData.reduce((a, b) => a + b, 0);
  const totalVolume = volumeData.reduce((a, b) => a + b, 0);
  const totalArea = areaData.reduce((a, b) => a + b, 0);

  const totalTasksAssigned = tasksTotal.reduce((a, b) => a + b, 0);
  const totalTasksCompleted = tasksDone.reduce((a, b) => a + b, 0);
  const efficiency =
    totalTasksAssigned > 0
      ? (totalTasksCompleted / totalTasksAssigned) * 100
      : 0;

  // Calcular KPIs derivados
  const costPerVolume = totalVolume > 0 ? totalCost / totalVolume : 0;
  const volumePerHour = totalHours > 0 ? totalVolume / totalHours : 0;

  // Actualizar DOM
  document.getElementById("mgmt-total-fuel").innerText =
    formatNumber(totalFuel);
  document.getElementById("mgmt-total-cost").innerText =
    formatCurrency(totalCost);
  document.getElementById("mgmt-total-volume").innerText =
    formatNumber(totalVolume);
  document.getElementById("mgmt-total-area").innerText =
    formatNumber(totalArea);
  document.getElementById("mgmt-efficiency").innerText =
    formatNumber(efficiency) + "%";
  document.getElementById("mgmt-cost-per-volume").innerText =
    formatCurrency(costPerVolume);
  document.getElementById("mgmt-volume-per-hour").innerText =
    formatNumber(volumePerHour);

  // Actualizar KPIs por propietario
  updateOwnerKPIs(ownerData);

  updateCharts(
    sortedDates,
    fuelData,
    costData,
    volumeData,
    efficiencyData,
    baseFuel,
    baseCost,
    baseVolume,
    ownerData
  );
}

// Procesar datos por propietario
function processOwnerData(data, dates) {
  const owners = {};
  
  dates.forEach(date => {
    const ownerInfo = data[date].owner_info || {};
    Object.keys(ownerInfo).forEach(ownerName => {
      if (!owners[ownerName]) {
        owners[ownerName] = {
          volume: [],
          fuel: [],
          cost: [],
          dates: []
        };
      }
      owners[ownerName].volume.push(ownerInfo[ownerName].processed_volume || 0);
      owners[ownerName].fuel.push(ownerInfo[ownerName].fuel_spent || 0);
      owners[ownerName].cost.push(ownerInfo[ownerName].rental_cost || 0);
    });
  });

  // Calcular totales por propietario
  Object.keys(owners).forEach(owner => {
    owners[owner].totalVolume = owners[owner].volume.reduce((a, b) => a + b, 0);
    owners[owner].totalFuel = owners[owner].fuel.reduce((a, b) => a + b, 0);
    owners[owner].totalCost = owners[owner].cost.reduce((a, b) => a + b, 0);
  });

  return owners;
}

// Actualizar KPIs por propietario
function updateOwnerKPIs(ownerData) {
  const container = document.getElementById("owner-kpis-container");
  if (!container) return;

  container.innerHTML = "";

  const colorMap = {
    UNIVOL: { card: "info", icon: "fas fa-building", iconBg: "bg-info" },
    WOOMY: { card: "danger", icon: "fas fa-industry", iconBg: "bg-danger" }
  };

  Object.keys(ownerData).forEach(owner => {
    const colors = colorMap[owner] || { card: "secondary", icon: "fas fa-user", iconBg: "bg-secondary" };
    const data = ownerData[owner];

    const col = document.createElement("div");
    col.className = "col-lg-6 col-md-6 col-sm-12";
    col.innerHTML = `
      <div class="card card-${colors.card} card-outline">
        <div class="card-header">
          <h3 class="card-title">
            <i class="${colors.icon}"></i> <strong>${owner}</strong>
          </h3>
          <div class="card-tools">
            <span class="badge badge-${colors.card}">Propietario / Owner</span>
          </div>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6 col-sm-6 col-12">
              <div class="info-box ${colors.iconBg}">
                <span class="info-box-icon"><i class="fas fa-boxes"></i></span>
                <div class="info-box-content">
                  <span class="info-box-text">Volumen</span>
                  <span class="info-box-number">${formatNumber(data.totalVolume)}</span>
                  <span class="info-box-text" style="font-size: 0.85rem;">m³</span>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-sm-6 col-12">
              <div class="info-box ${colors.iconBg}">
                <span class="info-box-icon"><i class="fas fa-gas-pump"></i></span>
                <div class="info-box-content">
                  <span class="info-box-text">Combustible</span>
                  <span class="info-box-number">${formatNumber(data.totalFuel)}</span>
                  <span class="info-box-text" style="font-size: 0.85rem;">Litros</span>
                </div>
              </div>
            </div>
            <div class="col-md-6 col-sm-12 col-12">
              <div class="info-box ${colors.iconBg}">
                <span class="info-box-icon"><i class="fas fa-dollar-sign"></i></span>
                <div class="info-box-content">
                  <span class="info-box-text">Costo Total</span>
                  <span class="info-box-number">${formatCurrency(data.totalCost)}</span>
                  <span class="info-box-text" style="font-size: 0.85rem;">USD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(col);
  });
}

// --- Gráficas ---
function initCharts() {
  // 1. Volumen Real vs Base
  const ctxProd = document.getElementById("mgmt-productivity-chart");
  if (ctxProd) {
    chartInstances["productivity"] = new Chart(ctxProd, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Volumen Real",
            data: [],
            backgroundColor: "rgba(0, 123, 255, 0.7)",
            borderColor: "rgba(0, 123, 255, 1)",
            borderWidth: 2,
            order: 1,
          },
          {
            label: "Volumen Base (Referencia)",
            data: [],
            backgroundColor: "rgba(0, 123, 255, 0.2)",
            borderColor: "rgba(0, 123, 255, 0.5)",
            borderWidth: 2,
            borderDash: [5, 5],
            order: 2,
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
                  return formatNumber(value);
                },
                beginAtZero: true,
              },
            },
          ],
          xAxes: [{ gridLines: { display: false } }],
        },
        tooltips: {
          callbacks: {
            label: function(tooltipItem, data) {
              const label = data.datasets[tooltipItem.datasetIndex].label || '';
              return label + ': ' + formatNumber(tooltipItem.value) + ' m³';
            }
          }
        }
      },
    });
  }

  // 2. Costo Real vs Base
  const ctxCost = document.getElementById("mgmt-cost-chart");
  if (ctxCost) {
    chartInstances["cost"] = new Chart(ctxCost, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            label: "Costo Real",
            data: [],
            backgroundColor: "rgba(220, 53, 69, 0.7)",
            borderColor: "rgba(220, 53, 69, 1)",
            borderWidth: 2,
            order: 1,
          },
          {
            label: "Costo Base (Referencia)",
            data: [],
            backgroundColor: "rgba(220, 53, 69, 0.2)",
            borderColor: "rgba(220, 53, 69, 0.5)",
            borderWidth: 2,
            borderDash: [5, 5],
            order: 2,
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
          xAxes: [{ gridLines: { display: false } }],
        },
        tooltips: {
          callbacks: {
            label: function(tooltipItem, data) {
              const label = data.datasets[tooltipItem.datasetIndex].label || '';
              return label + ': $' + formatNumber(tooltipItem.value);
            }
          }
        }
      },
    });
  }

  // 3. Volumen por Propietario
  const ctxOwnerVol = document.getElementById("mgmt-owner-volume-chart");
  if (ctxOwnerVol) {
    chartInstances["ownervolume"] = new Chart(ctxOwnerVol, {
      type: "bar",
      data: {
        labels: [],
        datasets: [],
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
                callback: function (value) {
                  return formatNumber(value);
                },
                beginAtZero: true,
              },
            },
          ],
        },
        tooltips: {
          callbacks: {
            label: function(tooltipItem, data) {
              const label = data.datasets[tooltipItem.datasetIndex].label || '';
              return label + ': ' + formatNumber(tooltipItem.value) + ' m³';
            }
          }
        }
      },
    });
  }

  // 4. Combustible por Propietario
  const ctxOwnerFuel = document.getElementById("mgmt-owner-fuel-chart");
  if (ctxOwnerFuel) {
    chartInstances["ownerfuel"] = new Chart(ctxOwnerFuel, {
      type: "bar",
      data: {
        labels: [],
        datasets: [],
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
                callback: function (value) {
                  return formatNumber(value);
                },
                beginAtZero: true,
              },
            },
          ],
        },
        tooltips: {
          callbacks: {
            label: function(tooltipItem, data) {
              const label = data.datasets[tooltipItem.datasetIndex].label || '';
              return label + ': ' + formatNumber(tooltipItem.value) + ' L';
            }
          }
        }
      },
    });
  }

  // 5. Eficiencia
  const ctxEff = document.getElementById("mgmt-efficiency-chart");
  if (ctxEff) {
    chartInstances["efficiency"] = new Chart(ctxEff, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "% Eficiencia",
            data: [],
            borderColor: "#28a745",
            backgroundColor: "rgba(40, 167, 69, 0.2)",
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

  // 6. Costo por Propietario
  const ctxOwnerCost = document.getElementById("mgmt-owner-cost-chart");
  if (ctxOwnerCost) {
    chartInstances["ownercost"] = new Chart(ctxOwnerCost, {
      type: "bar",
      data: {
        labels: [],
        datasets: [],
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
                callback: function (value) {
                  return "$" + formatNumber(value);
                },
                beginAtZero: true,
              },
            },
          ],
        },
        tooltips: {
          callbacks: {
            label: function(tooltipItem, data) {
              const label = data.datasets[tooltipItem.datasetIndex].label || '';
              return label + ': $' + formatNumber(tooltipItem.value);
            }
          }
        }
      },
    });
  }
}

function updateCharts(
  labels,
  fuel,
  cost,
  volume,
  efficiency,
  baseFuel,
  baseCost,
  baseVolume,
  ownerData
) {
  // Volumen Real vs Base
  if (chartInstances["productivity"]) {
    chartInstances["productivity"].data.labels = labels;
    chartInstances["productivity"].data.datasets[0].data = volume;
    chartInstances["productivity"].data.datasets[1].data = baseVolume;
    chartInstances["productivity"].update();
  }

  // Costo Real vs Base
  if (chartInstances["cost"]) {
    chartInstances["cost"].data.labels = labels;
    chartInstances["cost"].data.datasets[0].data = cost;
    chartInstances["cost"].data.datasets[1].data = baseCost;
    chartInstances["cost"].update();
  }

  // Eficiencia
  if (chartInstances["efficiency"]) {
    chartInstances["efficiency"].data.labels = labels;
    chartInstances["efficiency"].data.datasets[0].data = efficiency;
    chartInstances["efficiency"].update();
  }

  // Gráficas por propietario
  updateOwnerCharts(labels, ownerData);
}

// Actualizar gráficas por propietario
function updateOwnerCharts(labels, ownerData) {
  const owners = Object.keys(ownerData);
  
  // Volumen por propietario
  if (chartInstances["ownervolume"]) {
    chartInstances["ownervolume"].data.labels = labels;
    chartInstances["ownervolume"].data.datasets = owners.map((owner, idx) => ({
      label: owner,
      data: ownerData[owner].volume,
      backgroundColor: ownerColors[owner]?.bg || `rgba(${idx * 50}, ${100 + idx * 30}, 200, 0.7)`,
      borderColor: ownerColors[owner]?.border || `rgba(${idx * 50}, ${100 + idx * 30}, 200, 1)`,
      borderWidth: 1,
    }));
    chartInstances["ownervolume"].update();
  }

  // Combustible por propietario
  if (chartInstances["ownerfuel"]) {
    chartInstances["ownerfuel"].data.labels = labels;
    chartInstances["ownerfuel"].data.datasets = owners.map((owner, idx) => ({
      label: owner,
      data: ownerData[owner].fuel,
      backgroundColor: ownerColors[owner]?.bg || `rgba(${idx * 50}, ${100 + idx * 30}, 200, 0.7)`,
      borderColor: ownerColors[owner]?.border || `rgba(${idx * 50}, ${100 + idx * 30}, 200, 1)`,
      borderWidth: 1,
    }));
    chartInstances["ownerfuel"].update();
  }

  // Costo por propietario
  if (chartInstances["ownercost"]) {
    chartInstances["ownercost"].data.labels = labels;
    chartInstances["ownercost"].data.datasets = owners.map((owner, idx) => ({
      label: owner,
      data: ownerData[owner].cost,
      backgroundColor: ownerColors[owner]?.bg || `rgba(${idx * 50}, ${100 + idx * 30}, 200, 0.7)`,
      borderColor: ownerColors[owner]?.border || `rgba(${idx * 50}, ${100 + idx * 30}, 200, 1)`,
      borderWidth: 1,
    }));
    chartInstances["ownercost"].update();
  }
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
  } else {
    console.warn(
      "Pusher keys no definidas. Las actualizaciones en tiempo real no funcionarán."
    );
  }
}
