// Helper utilities and configuration
const API_URL = "/business-gestion/task/";

function getCsrfToken() {
  return document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("csrftoken="))
    ?.split("=")[1];
}

axios.defaults.headers.common["X-CSRFToken"] = getCsrfToken();

function showSuccess(title, text = "", timer = 1500) {
  Swal.fire({ icon: "success", title, text, showConfirmButton: false, timer });
}

function showError(title, text = "", timer = 3000) {
  Swal.fire({ icon: "error", title, text, showConfirmButton: false, timer });
}

function formatDateTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    // toLocaleString keeps local timezone and readable format
    return d.toLocaleString();
  } catch (e) {
    return iso;
  }
}

function getStatusIcon(statusCode) {
  const statusMap = {
    N: {
      icon: "fa-circle",
      color: "#5faff6ff",
      label: "(Not started)",
      labelespañol: "No iniciada",
    }, // Gris
    B: {
      icon: "fa-stopwatch",
      color: "#6c757d",
      label: "(Backlog)",
      labelespañol: "Backlog ",
    }, // Gris
    C: {
      icon: "fa-check-circle",
      color: "#28a745",
      label: "(Completed)",
      labelespañol: "Completada",
    }, // Verde
    I: {
      icon: "fa-circle-notch",
      color: "#007bff",
      label: "(In progress)",
      labelespañol: "En progreso",
    }, // Azul
    H: {
      icon: "fa-pause-circle",
      color: "#ff0707ff",
      label: "(Pause)",
      labelespañol: "Pausa",
    }, // Amarillo
    P: {
      icon: "fa-hourglass-start",
      color: "#17a2b8",
      label: "(New)",
      labelespañol: "Nueva",
    }, // Cian
  };

  const status = statusMap[statusCode] || statusMap["N"];
  // return ``;
  return `<span class="info-box-icon"><i class="fas ${status.icon}"  style="font-size: x-large;" title="${status.label}"></i></span><span class="info-box-text" style="vertical-align: inherit; display: block; text-align: center;">
    ${status.labelespañol} <br> ${status.label}
</span> `;
}

// Initialize helpers on DOM ready
$(function () {
  bsCustomFileInput.init();
  // Referencia al elemento loader
  var load = document.getElementById("load");

  // --- NUEVO: INTERCEPTORES DE AXIOS PARA MANEJO GLOBAL DEL LOADER ---
  let pendingRequests = 0;

  // Interceptor de Request (antes de enviar)
  axios.interceptors.request.use(
    (config) => {
      pendingRequests++;
      if (load) load.hidden = false;
      return config;
    },
    (error) => {
      pendingRequests--;
      if (pendingRequests === 0 && load) load.hidden = true;
      return Promise.reject(error);
    }
  );

  // Interceptor de Response (al recibir respuesta)
  axios.interceptors.response.use(
    (response) => {
      pendingRequests--;
      // Solo ocultamos si no hay más peticiones pendientes
      if (pendingRequests === 0 && load) load.hidden = true;
      return response;
    },
    (error) => {
      pendingRequests--;
      if (pendingRequests === 0 && load) load.hidden = true;
      return Promise.reject(error);
    }
  );
  // ------------------------------------------------------------------
});

// DataTable
$(document).ready(function () {
  loadAlertEnums();
  $("table").addClass("table table-hover");

  $("table").DataTable({
    dom: '<"top"l>Bfrtip',
    buttons: [
      { extend: "colvis", text: "Columnas" },
      { extend: "excel", text: "Excel" },
      { extend: "pdf", text: "PDF" },
      { extend: "print", text: "Print" },
    ],
    // Apply saved column visibility in initComplete
    initComplete: function () {
      try {
        const COLVIS_STORAGE_KEY = "tasks_table_colvis_v1";
        const saved = JSON.parse(
          localStorage.getItem(COLVIS_STORAGE_KEY) || "null"
        );
        const dt = this.api();
        if (saved && typeof saved === "object") {
          dt.columns().every(function (i) {
            // saved can be object mapping index->bool
            if (saved.hasOwnProperty(i)) {
              this.visible(!!saved[i]);
            }
          });
        }
      } catch (e) {
        // ignore
      }
    },
    pagingType: "numbers",
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
      };
      const start_from = $("#start_from").val();
      const start_to = $("#start_to").val();
      const end_from = $("#end_from").val();
      const end_to = $("#end_to").val();
      if (start_from) params.start_date_from = start_from;
      if (start_to) params.start_date_to = start_to;
      if (end_from) params.end_date_from = end_from;
      if (end_to) params.end_date_to = end_to;

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
      {
        data: null,
        title: "",
        orderable: false,
        className: "details-control",
        render: function (data, type, row) {
          return Array.isArray(row.alerts) && row.alerts.length > 0
            ? '<i class="fas fa-plus-square" aria-hidden="true"></i>'
            : "";
        },
      },
      {
        data: "alerts",
        className: "column-text-center",
        title: "Alertas<br>(Alerts)",
        render: (data) => getAlert(data),
      },
      {
        data: "internal_status",
        title: "Estado",
        className: "column-text-center",
        render: (data) => getStatusIcon(data),
      },
      { data: "wbs", title: "WBS" },
      { data: "task_code", title: "Código" },
      { data: "task_name", title: "Tarea" },

      { data: "complete_pct", title: "% Completo" },
      {
        data: "resources",
        title: "Recursos",
        render: (data) => (Array.isArray(data) ? data.join(", ") : data || ""),
      },
      // { data: "start_date", title: "Inicio", render: (d) => formatDateTime(d) },
      // { data: "end_date", title: "Fin", render: (d) => formatDateTime(d) },
      {
        data: "act_start_date",
        title: "Inicio real",
        render: (d) => formatDateTime(d),
      },

      {
        data: "act_end_date",
        title: "Fin real",
        render: (d) => formatDateTime(d),
      },

      {
        data: "",
        className: "column-text-center",
        title: "Acciones",
        orderable: false,
        render: (data, type, row) => {
          // use actual dates returned by API to decide which actions to show
          const hasStart = !!row.internal_planned_date;
          const hasEnd = !!row.act_end_date;
          const hasInternal_status = row.internal_status;
          const hasAlert = !!row.alerts && row.alerts.length > 0;
          let actionButtons = `<div class="btn-group" role="group">`;
          // Alert button (abrir modal para crear alerta)
          if (!hasAlert && row.internal_status !== "C") {
            actionButtons += `<button type="button" title="alerta" class="btn btn-danger btn-alert" data-id="${row.id}" data-name="${row.task_name}"><i class="fas fa-bell"></i></button>`;
          } else if (hasAlert && row.internal_status !== "C") {
            actionButtons += `<button type="button" title="alerta" onclick="window.eliminarAlerta('${row.alerts[0]}')" class="btn btn-secondary" data-id="${row.id}" data-name="${row.task_name}"><i class="fas fa-bell-slash"></i></button>`;
          }
          if (row.internal_status !== "C" && (hasInternal_status == "N" || hasInternal_status == "B")) {
            actionButtons += `<button type="button" title="asignar" class="btn btn-info btn-assign" data-id="${row.id}" data-name="${row.task_name}"><i class="fas fa-user-plus"></i></button>`;
          }
          if (hasInternal_status != "B" && row.internal_status !== "C") {
          actionButtons += `<button type="button" title="Pasar a Backlog" class="btn bg-teal btn-assign-backlog" data-id="${row.id}" data-name="${row.task_name}"><i class="fas fa-stopwatch"></i></button>`;
           }
           
          actionButtons += `</div>`;
          return actionButtons;
        },
      },
    ],
    columnDefs: [],
    initComplete: function () {
      const api = this.api();
      $(".dataTables_paginate", api.table().container()).addClass(
        "pagination-sm"
      );
    },
  });

  // Color rows based on start/end dates after table draw
  const table = $("table").DataTable();
  // persist column visibility when changed
  table.on("column-visibility.dt", function (e, settings, column, state) {
    try {
      const COLVIS_STORAGE_KEY = "tasks_table_colvis_v1";
      const prev = JSON.parse(localStorage.getItem(COLVIS_STORAGE_KEY) || "{}");
      prev[column] = !!state;
      localStorage.setItem(COLVIS_STORAGE_KEY, JSON.stringify(prev));
    } catch (err) {
      // ignore
    }
  });

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
          $(rowNode).addClass("bg-danger");
        } else if (status == "C") {
          $(rowNode).addClass("bg-success");
        } else if (status == "N") {
          $(rowNode).addClass("bg-orange");
        } else if (status == "W") {
          $(rowNode).addClass("bg-warning");
        } else if (status == "P") {
          $(rowNode).addClass("bg-primary");
        }
      });
  });

  // Assign button -> open assign modal
  $("table").on("click", ".btn-assign", function () {
    const id = $(this).data("id");
    const name = $(this).data("name");
    openAssignModal(id, name);
  });
  $("table").on("click", ".btn-assign-backlog", function () {
    const id = $(this).data("id");
    asignarBacklog(id);
  });

  // Filters buttons
  $("#btn-filter-dates").on("click", function () {
    $("table").DataTable().ajax.reload();
  });
  $("#btn-clear-filters").on("click", function () {
    $("#start_from, #start_to, #end_from, #end_to").val("");
    $("table").DataTable().ajax.reload();
  });
});

// Assign Modal Logic
let selected_assign_id = null;

function openAssignModal(id, name) {
  selected_assign_id = id;

  // Limpiar valores previos
  $("#assign_roles").val(null).trigger("change");
  $("#assign_start_date").val("");

  // 1. Si ya estaba inicializado, destrúyelo
  if ($("#assign_roles").hasClass("select2-hidden-accessible")) {
    $("#assign_roles").select2("destroy");
  }

  // 2. Inicializa Select2 con dropdownParent
  $("#assign_roles").select2({
    placeholder: $("#assign_roles").data("placeholder"),
    dropdownParent: $("#modal-assign-task"),
    theme: "bootstrap4",
    width: "100%",
    ajax: {
      url: "/user-gestion/roles/roles-for-tasks/",
      dataType: "json",
      delay: 250,
      data: function (params) {
        return { search: params.term };
      },
      processResults: function (data) {
        const list = Array.isArray(data.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : [];
        const items = list.map(function (it) {
          return { id: it.id, text: it.name || String(it.id) };
        });
        return { results: items };
      },
    },
  });

  // 3. Cargar metadata de roles y datos de la tarea para mostrar nombres
  Promise.all([
    axios.get("/user-gestion/roles/roles-for-tasks/"),
    axios.get(API_URL + id + "/"),
  ])
    .then(([rolesRes, taskRes]) => {
      const roles = Array.isArray(rolesRes.data.results)
        ? rolesRes.data.results
        : Array.isArray(rolesRes.data)
        ? rolesRes.data
        : [];
      const rolesMap = {};
      roles.forEach((r) => {
        rolesMap[r.id] = r.name || String(r.id);
      });

      const t = taskRes.data || {};
      const current = Array.isArray(t.internal_responsibles)
        ? t.internal_responsibles
        : [];

      if (current.length > 0) {
        const val = current[0];
        const roleName = rolesMap[val] || String(val);
        const opt = new Option(roleName, String(val), true, true);
        $("#assign_roles").append(opt);
        $("#assign_roles").val(String(val)).trigger("change");
      }

      if (t.internal_planned_date) {
        try {
          $("#assign_start_date").val(
            new Date(t.internal_planned_date).toISOString().slice(0, 16)
          );
        } catch (e) {}
      }
    })

    .catch(() => {
      // ignorar errores
    });

  $("#modal-assign-task .modal-title").text("Asignar: " + (name || ""));
  $("#modal-assign-task").modal("show");

}

// Handle assign form submit
$("#form-assign-task").on("submit", function (e) {
  // load.hidden = false;  <-- ELIMINADO: El interceptor ahora maneja esto
  e.preventDefault();
  if (!selected_assign_id) return showError("Selecciona una tarea");

  const selectedRole = $("#assign_roles").val();
  const startVal = $("#assign_start_date").val();

  // --- INICIO VALIDACIÓN ---
  if (!startVal || !selectedRole) {
    showError("La fecha y el rol son obligatorios");
    return;
  }
  // --- FIN VALIDACIÓN ---

  const payload = {};
  if (startVal) {
    try {
      payload.internal_planned_date = new Date(startVal).toISOString();
    } catch (err) {
      /* ignore */
    }
  }

  // internal_responsibles expects an array of ids; use single selected role
  if (selectedRole) {
    const n = Number(selectedRole);
    payload.internal_responsibles = [Number.isNaN(n) ? selectedRole : n];
  } else {
    payload.internal_responsibles = [];
  }

  axios
    .patch(API_URL + selected_assign_id + "/", payload)
    .then((res) => {
      showSuccess("Asignado e iniciado");
      $("#modal-assign-task").modal("hide");
      // reload table
      try {
        $("#tabla-de-Datos").DataTable().ajax.reload(null, false);
      } catch (err) {}
    })
    .catch((err) => {
      showError(
        "Error asignando",
        err.response?.data?.detail || err.message || ""
      );
    });
});

// --- Alertas: uso del modal presente en el HTML y listado en child-row ---
function openAlertModal(taskId, taskName) {
  // usa el modal ya definido en templates/task/task.html
  $("#alert_task_id").val(taskId);
  $("#alert_kind").val("");
  $("#alert_Motive").val("");
  $("#alert_short_description").val("");
  $("#alert_description").val("");
  $("#modal-add-alert .modal-title").text(
    "Agregar alerta: " + (taskName || "")
  );
  console.log("openAlertModal", taskId, taskName);
  const $modal = $("#modal-add-alert");
  if ($modal.length === 0) {
    console.error("modal #modal-add-alert no encontrado en DOM");
    return;
  }
  if (typeof $modal.modal === "function") {
    $modal.modal("show");
  } else {
    console.error(
      "Bootstrap modal() no está disponible. Asegura que Bootstrap JS esté cargado."
    );
  }
}

// submit handler (delegado porque el modal se crea dinámicamente)
$(document).on("submit", "#form-add-alert", function (e) {
  e.preventDefault();
  const taskId = Number($("#alert_task_id").val());
  const kind = $("#alert_kind").val();
  const motive_alert_status = $("#alert_Motive").val();
  const shortDesc = ($("#alert_short_description").val() || "").trim();

  if (!taskId) return showError("Tarea inválida");
  if (!shortDesc) return showError("La descripción corta es obligatoria");

  const payload = {
    task: taskId,
    kind: kind,
    motive_alert_status: motive_alert_status,
    short_description: shortDesc,
  };

  console.log("posting alert", payload);

  axios
    .post("/business-gestion/alert/", payload)
    .then((res) => {
      showSuccess("Alerta creada");
      $("#modal-add-alert").modal("hide");
      try {
        $("table").DataTable().ajax.reload(null, false);
      } catch (err) {}
    })
    .catch((err) => {
      console.error("error creating alert", err);
      showError(
        "Error creando alerta",
        err.response?.data?.detail || err.message || ""
      );
    });
});

// abrir modal desde el botón de alerta
$("table").on("click", ".btn-alert", function () {
  const id = $(this).data("id");
  const name = $(this).data("name");
  console.log("btn-alert clicked", id, name);
  try {
    openAlertModal(id, name);
  } catch (err) {
    console.error("openAlertModal error", err);
  }
});

/**
 * Función global para manejar la eliminación de alertas usando Axios.
 */
window.eliminarAlerta = function (id) {
  // Usamos SweetAlert para la confirmación
  Swal.fire({
    title: "¿Estás seguro?",
    text: "No podrás revertir esto. La alerta será eliminada permanentemente.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
  }).then((result) => {
    if (result.isConfirmed) {
      // Realizamos la petición DELETE usando Axios
      axios
        .delete(`/business-gestion/alert/${id}/`)
        .then(function (response) {
          // Petición exitosa (código 2xx)
          Swal.fire(
            "¡Eliminado!",
            "La alerta ha sido eliminada.",
            "success"
          ).then(() => {
            // Recargamos la página para ver los cambios
            location.reload();
          });
        })
        .catch(function (error) {
          // Manejo de errores
          console.error("Error:", error);
          Swal.fire(
            "Error",
            "No se pudo eliminar la alerta. Verifica tu conexión o permisos.",
            "error"
          );
        });
    }
  });
};
/**
 * Función global para manejar la eliminación de alertas usando Axios.
 */
function asignarBacklog(selected_assign_id) {

const payload = {};
  payload.internal_status = "B";

axios
    .patch(API_URL + selected_assign_id + "/", payload)
    .then((res) => {
      showSuccess("Asignado a backlog");
      
      try {
        $("#tabla-de-Datos").DataTable().ajax.reload(null, false);
      } catch (err) {}
    })
    .catch((err) => {
      showError(
        "Error asignando",
        err.response?.data?.detail || err.message || ""
      );
    });
};

function formatAlertsHtml(alerts) {
  if (!Array.isArray(alerts) || alerts.length === 0)
    return '<div class="p-2">Sin alertas</div>';

  const kindMap = {
    W: {
      icon: "fa-exclamation-triangle",
      cls: "text-warning",
      label: "Warning",
    },
    C: { icon: "fa-bomb", cls: "text-danger", label: "Critical" },
  };

  const tmpl = document.getElementById("tmpl-alert-item");
  const container = document.createElement("div");
  container.className = "p-2";
  const ul = document.createElement("ul");
  ul.className = "list-group";

  alerts.forEach((a) => {
    const frag = tmpl.content.cloneNode(true);
    const li = frag.querySelector("li");
    const k = kindMap[a.kind] || {
      icon: "fa-info-circle",
      cls: "",
      label: a.kind,
      labelMotive: a.kind,
    };

    // --- NUEVA LÓGICA DE POSICIONAMIENTO (FLEX) ---

    // 1. Convertimos el <li> en un contenedor flexible horizontal
    li.classList.add("d-flex", "justify-content-between", "align-items-center");

    // 2. Creamos un contenedor auxiliar para meter todo el contenido de texto actual
    const contentWrapper = document.createElement("div");
    contentWrapper.className = "flex-grow-1"; // Hace que ocupe todo el ancho disponible empujando el botón a la derecha

    // 3. Movemos todos los hijos actuales del <li> dentro de este contenedor
    // Esto hace que querySelector siga funcionando porque los elementos siguen dentro de li
    while (li.firstChild) {
      contentWrapper.appendChild(li.firstChild);
    }

    // 4. Reinsertamos el contenedor dentro del li
    li.appendChild(contentWrapper);
    // ------------------------------------------------

    // --- Lógica existente (modificación de datos) ---
    // Nota: li.querySelector sigue funcionando porque busca dentro de todo el subárbol de li
    const iconEl = li.querySelector("[data-icon]");
    iconEl.className = `fas ${k.icon} ${k.cls}`;
    li.querySelector("[data-kind]").textContent = k.label;
    li.querySelector("[data-short]").textContent = a.short_description || "";
    li.querySelector("[data-motive]").textContent = a.motive_alert_status_name;
    li.querySelector("[data-created]").textContent = a.created
      ? new Date(a.created).toLocaleString()
      : "";
    li.querySelector("[data-desc]").textContent = a.description || "";

    // --- Lógica del Botón Eliminar ---
    const deleteBtn = document.createElement("button");
    // Eliminamos ml-auto porque justify-content-between ya lo coloca a la derecha
    deleteBtn.className = "btn btn-sm btn-outline-danger";
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = "Eliminar alerta";

    // Llamada a la función global que usa Axios
    deleteBtn.setAttribute("onclick", `window.eliminarAlerta('${a.id}')`);

    // Al agregarlo al li (fuera del wrapper), flexbox lo coloca a la extrema derecha
    li.appendChild(deleteBtn);
    // ------------------------------

    ul.appendChild(li);
  });

  container.appendChild(ul);
  return container.innerHTML;
}
// toggle child row to show alerts
$(document).on("click", "tbody td.details-control", function () {
  const table = $("table").DataTable();
  const tr = $(this).closest("tr");
  const row = table.row(tr);
  const data = row.data();

  if (!data || !Array.isArray(data.alerts) || data.alerts.length === 0) {
    // nothing to expand
    return;
  }
  if (row.child.isShown()) {
    row.child.hide();
    tr.removeClass("shown");
    $(this).find("i").removeClass("fa-minus-square").addClass("fa-plus-square");
  } else {
    console.log("alerts", data.alert_list);
    const html = formatAlertsHtml(data.alert_list);
    row.child(html).show();
    tr.addClass("shown");
    $(this).find("i").removeClass("fa-plus-square").addClass("fa-minus-square");
  }
});

// Cargar enums de alertas y rellenar selects alert_kind y alert_Motive
function loadAlertEnums() {
  axios
    .get("/business-gestion/alert-enums/")
    .then(function (res) {
      const data = res.data || {};
      const kinds = Array.isArray(data.alert_kinds) ? data.alert_kinds : [];
      const motives = Array.isArray(data.alert_motives)
        ? data.alert_motives
        : [];

      const kindSel = document.getElementById("alert_kind");
      const motiveSel = document.getElementById("alert_Motive"); // mantener nombre exacto del HTML

      if (kindSel) {
        kindSel.innerHTML = "";
        // Añadir opción vacía por si se quiere selección nula
        const emptyK = document.createElement("option");
        emptyK.value = "";
        emptyK.textContent = "-- Selecciona --";
        kindSel.appendChild(emptyK);
        kinds.forEach(function (k) {
          const opt = document.createElement("option");
          opt.value = k.id;
          opt.textContent = k.name;
          kindSel.appendChild(opt);
        });
      }

      if (motiveSel) {
        motiveSel.innerHTML = "";
        const emptyM = document.createElement("option");
        emptyM.value = "";
        emptyM.textContent = "-- Selecciona --";
        motiveSel.appendChild(emptyM);
        motives.forEach(function (m) {
          const opt = document.createElement("option");
          opt.value = m.id;
          opt.textContent = m.name;
          motiveSel.appendChild(opt);
        });
      }
    })
    .catch(function (err) {
      console.warn("No se pudo cargar alert-enums:", err);
    });
}

function getAlert(alerts) {
  if (alerts.length > 0) {
    return `<span class="info-box-icon-alert"><i class="fas fa-exclamation-triangle "  style="font-size: x-large;" ></i></span>`;
  } else {
    return "";
  }
}
