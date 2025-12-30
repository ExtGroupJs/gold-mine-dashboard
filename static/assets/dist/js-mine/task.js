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

// Initialize helpers on DOM ready
$(function () {
  bsCustomFileInput.init();
});

// DataTable
$(document).ready(function () {
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
        const COLVIS_STORAGE_KEY = 'tasks_table_colvis_v1';
        const saved = JSON.parse(localStorage.getItem(COLVIS_STORAGE_KEY) || 'null');
        const dt = this.api();
        if (saved && typeof saved === 'object') {
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

      axios.get(API_URL, { params })
        .then((res) => {
          callback({ recordsTotal: res.data.count, recordsFiltered: res.data.count, data: res.data.results });
        })
        .catch((err) => {
          showError("Error cargando datos", err.message || "");
        });
    },
    columns: [
      // { data: "wbs", title: "WBS" },
      // { data: "task_code", title: "Código" },
      { data: "task_name", title: "Tarea" },
      // { data: "status_code", title: "Estado" },
      {
        data: "resources",
        title: "Recursos",
        render: (data) => (Array.isArray(data) ? data.join(", ") : data || ""),
      },
      { data: "start_date", title: "Inicio", render: (d) => formatDateTime(d) },
      { data: "end_date", title: "Fin", render: (d) => formatDateTime(d) },
      { data: "target_drtn_hr_cnt", title: "Duración (hrs)" },
      { data: "remain_drtn_hr_cnt", title: "Horas restantes" },
      { data: "target_cost", title: "Costo" },
      { data: "total_float_hr_cnt", title: "Total float" },
      {
        data: "",
        title: "Acciones",
        orderable: false,
        render: (data, type, row) => {
          // use actual dates returned by API to decide which actions to show
          const hasStart = !!row.act_start_date;
          const hasEnd = !!row.act_end_date;
          let actionButtons = `<div class="btn-group" role="group">`;
           // Start / Stop buttons logic
          if (!hasStart) {
            actionButtons += `<button type="button" title="iniciar" class="btn btn-warning btn-start" data-id="${row.id}" data-name="${row.task_name}"><i class="fas fa-play"></i></button>`;
          } else if (hasStart && !hasEnd) {
            actionButtons += `<button type="button" title="terminar" class="btn btn-success btn-stop" data-id="${row.id}" data-name="${row.task_name}"><i class="fas fa-stop"></i></button>`;
          }
          // Delete
          // Assign (nuevo)
          actionButtons += `<button type="button" title="asignar" class="btn btn-info btn-assign" data-id="${row.id}" data-name="${row.task_name}"><i class="fas fa-user-plus"></i></button>`;
          // Delete
          actionButtons += `</div>`;
          return actionButtons;
        },
      },
    ],
    columnDefs: [],
  });

  // Color rows based on start/end dates after table draw
  const table = $("table").DataTable();
  // persist column visibility when changed
  table.on('column-visibility.dt', function (e, settings, column, state) {
    try {
      const COLVIS_STORAGE_KEY = 'tasks_table_colvis_v1';
      const prev = JSON.parse(localStorage.getItem(COLVIS_STORAGE_KEY) || '{}');
      prev[column] = !!state;
      localStorage.setItem(COLVIS_STORAGE_KEY, JSON.stringify(prev));
    } catch (err) {
      // ignore
    }
  });
  table.on('draw', function () {
    const rows = table.rows({ page: 'current' }).nodes();
    table.rows({ page: 'current' }).data().each(function (d, i) {
      const rowNode = rows[i];
      $(rowNode).removeClass('task-status-started task-status-completed task-status-notstarted');
      // now using actual dates returned by the API
      const hasStart = !!d.act_start_date;
      const hasEnd = !!d.act_end_date;
      if (hasStart && !hasEnd) {
        $(rowNode).addClass('task-status-started');
      } else if (!hasStart && !hasEnd) {
        $(rowNode).addClass('task-status-notstarted');
      } else if (hasStart && hasEnd) {
        // if actual end date already passed -> green
        const endDt = new Date(d.act_end_date || d.end_date);
        const now = new Date();
        if (endDt <= now) {
          $(rowNode).addClass('task-status-completed');
        }
      }
    });
  });



  // Assign button -> open assign modal
  $("table").on("click", ".btn-assign", function () {
    const id = $(this).data("id");
    const name = $(this).data("name");
    openAssignModal(id, name);
  });
  // Start / Stop handlers
  $("table").on("click", ".btn-start", function () {
    const id = $(this).data("id");
    const $btn = $(this);
    const $row = $(this).closest('tr');
    const rowApi = table.row($row);
    const rowData = rowApi.data() || {};
    $btn.prop('disabled', true);
    const now = new Date().toISOString();
    // set actual start date field on the backend
    axios.patch(API_URL + id + '/', { act_start_date: now })
      .then(() => {
        showSuccess('Tarea iniciada');
        // update row data locally and redraw table minimally
        rowData.act_start_date = now;
        rowApi.data(rowData);
        table.draw(false);
      })
      .catch((err) => {
        showError('Error iniciando tarea', err.message || '');
      })
      .finally(() => $btn.prop('disabled', false));
  });

  $("table").on("click", ".btn-stop", function () {
    const id = $(this).data("id");
    const $btn = $(this);
    const $row = $(this).closest('tr');
    const rowApi = table.row($row);
    const rowData = rowApi.data() || {};
    $btn.prop('disabled', true);
    const now = new Date().toISOString();
    // set actual end date field on the backend
    axios.patch(API_URL + id + '/', { act_end_date: now })
      .then(() => {
        showSuccess('Tarea terminada');
        // update row data locally and redraw table minimally
        rowData.act_end_date = now;
        rowApi.data(rowData);
        table.draw(false);
      })
      .catch((err) => {
        showError('Error terminando tarea', err.message || '');
      })
      .finally(() => $btn.prop('disabled', false));
  });

  // Filters buttons
  $("#btn-filter-dates").on('click', function () {
    $("table").DataTable().ajax.reload();
  });
  $("#btn-clear-filters").on('click', function () {
    $("#start_from, #start_to, #end_from, #end_to").val('');
    $("table").DataTable().ajax.reload();
  });
});

let selected_id = null;
let isEditing = false;
let selected_assign_id = null;





// Open Assign modal and init select2 for roles
function openAssignModal(id, name) {
  selected_assign_id = id;
  // clear previous values
  $('#assign_roles').val(null).trigger('change');
  $('#assign_start_date').val('');
  // initialize select2 for roles if not already
  if ($.fn.select2 && $('#assign_roles').data('select2') === undefined) {
    $('#assign_roles').select2({
      placeholder: $('#assign_roles').data('placeholder') || 'Selecciona roles',
      ajax: {
        url: '/business-gestion/roles/',
        dataType: 'json',
        delay: 250,
        data: function (params) { return { search: params.term }; },
        processResults: function (data) {
          const items = (Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : [])).map(function (it) {
            if (typeof it === 'object') return { id: it.id, text: it.name || it.label || it.id };
            return { id: it, text: it };
          });
          return { results: items };
        }
      },
      width: '100%'
    });
  }
  // show modal
  $('#modal-assign-task .modal-title').text('Asignar: ' + (name || ''));
  $('#modal-assign-task').modal('show');
}

// Handle assign form submit
$('#form-assign-task').on('submit', function (e) {
  e.preventDefault();
  if (!selected_assign_id) return showError('Selecciona una tarea');
  const selectedRoles = $('#assign_roles').val() || [];
  const startVal = $('#assign_start_date').val();
  const payload = {};
  if (startVal) {
    try { payload.act_start_date = new Date(startVal).toISOString(); } catch (err) { /* ignore */ }
  }
  // convert to integers where possible
  payload.internal_responsibles = selectedRoles.map((v) => { const n = Number(v); return Number.isNaN(n) ? v : n; });

  axios.patch(API_URL + selected_assign_id + '/', payload)
    .then((res) => {
      showSuccess('Asignado e iniciado');
      $('#modal-assign-task').modal('hide');
      // reload table
      try { $('#tabla-de-Datos').DataTable().ajax.reload(null, false); } catch (err) { }
    })
    .catch((err) => {
      showError('Error asignando', err.response?.data?.detail || err.message || '');
    });
});

