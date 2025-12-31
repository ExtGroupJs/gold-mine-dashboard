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
    'N': { icon: 'fa-circle', color: '#6c757d', label: 'Not started' },           // Gris
    'C': { icon: 'fa-check-circle', color: '#28a745', label: 'Completed' },        // Verde
    'I': { icon: 'fa-circle-notch', color: '#007bff', label: 'In progress' },      // Azul
    'H': { icon: 'fa-pause-circle', color: '#ffc107', label: 'Hold' },             // Amarillo
    'P': { icon: 'fa-hourglass-start', color: '#17a2b8', label: 'Planned' }        // Cian
  };
  
  const status = statusMap[statusCode] || statusMap['N'];
  return `<i class="fas ${status.icon}" style="color: ${status.color};" title="${status.label}"></i>`;
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
      // { data: "id", title: "ID" , visible: false},
       // { data: "internal_percent_complete", title: "% Interno" },
       // { data: "internal_planned_date", title: "Fecha planificada", render: (d) => formatDateTime(d) },
        // { data: "delete_record_flag", title: "Eliminado", render: (d) => (d ? 'Sí' : 'No') },

      { data: "wbs", title: "WBS" },
      { data: "task_code", title: "Código" },
      { data: "task_name", title: "Tarea" },
      { data: "internal_status", title: "Estado", render: (data) => getStatusIcon(data) },     
      { data: "complete_pct", title: "% Completo" },
      { data: "resources", title: "Recursos", render: (data) => (Array.isArray(data) ? data.join(", ") : data || "") },
      { data: "internal_responsibles", title: "Responsables", render: (data) => (Array.isArray(data) ? data.join(", ") : (data || "")) },
      { data: "end_date", title: "Fin", render: (d) => formatDateTime(d) },      
      { data: "act_end_date", title: "Fin real", render: (d) => formatDateTime(d) },
      { data: "internal_planned_date", title: "Inicio real", render: (d) => formatDateTime(d) },  
         
      {
        data: "",
        title: "Acciones",
        orderable: false,
        render: (data, type, row) => {
          // use actual dates returned by API to decide which actions to show
          const hasStart = !!row.internal_planned_date;
          const hasEnd = !!row.act_end_date;
          const hasInternal_status = row.internal_status;
          let actionButtons = `<div class="btn-group" role="group">`;               
          if(hasInternal_status=='N'){
          actionButtons += `<button type="button" title="asignar" class="btn btn-info btn-assign" data-id="${row.id}" data-name="${row.task_name}"><i class="fas fa-user-plus"></i></button>`;
          }
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


  // Filters buttons
  $("#btn-filter-dates").on('click', function () {
    $("table").DataTable().ajax.reload();
  });
  $("#btn-clear-filters").on('click', function () {
    $("#start_from, #start_to, #end_from, #end_to").val('');
    $("table").DataTable().ajax.reload();
  });
});

// Assign Modal Logic
let selected_assign_id = null;


function openAssignModal(id, name) {
  selected_assign_id = id;
  
  // Limpiar valores previos
  $('#assign_roles').val(null).trigger('change');
  $('#assign_start_date').val('');

  // 1. Si ya estaba inicializado, destrúyelo
  if ($('#assign_roles').hasClass('select2-hidden-accessible')) {
      $('#assign_roles').select2('destroy');
  }

  // 2. Inicializa Select2 con dropdownParent
  $('#assign_roles').select2({
    placeholder: $('#assign_roles').data('placeholder') || 'Selecciona rol',
    dropdownParent: $('#modal-assign-task'),
    theme: 'bootstrap4',
    width: '100%',
    ajax: {
      url: '/user-gestion/roles/roles-for-tasks/',
      dataType: 'json',
      delay: 250,
      data: function (params) { return { search: params.term }; },
      processResults: function (data) {
        const list = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
        const items = list.map(function (it) {
          return { id: it.id, text: it.name || String(it.id) };
        });
        return { results: items };
      }
    }
  });

  // 3. Cargar metadata de roles y datos de la tarea para mostrar nombres
  Promise.all([
    axios.get('/user-gestion/roles/roles-for-tasks/'),
    axios.get(API_URL + id + '/')
  ])
    .then(([rolesRes, taskRes]) => {
      load.hidden = false;
      const roles = Array.isArray(rolesRes.data.results) ? rolesRes.data.results : (Array.isArray(rolesRes.data) ? rolesRes.data : []);
      const rolesMap = {};
      roles.forEach(r => { rolesMap[r.id] = r.name || String(r.id); });

      const t = taskRes.data || {};
      const current = Array.isArray(t.internal_responsibles) ? t.internal_responsibles : [];
      
      if (current.length > 0) {
        const val = current[0];
        const roleName = rolesMap[val] || String(val);
        const opt = new Option(roleName, String(val), true, true);
        $('#assign_roles').append(opt);
        $('#assign_roles').val(String(val)).trigger('change');
      }
      
      if (t.internal_planned_date) {
        try { $('#assign_start_date').val(new Date(t.internal_planned_date).toISOString().slice(0,16)); } catch (e) { }
      }
       load.hidden = true;
    })
     
    .catch(() => {
      load.hidden = true;
      // ignorar errores
    });

  $('#modal-assign-task .modal-title').text('Asignar: ' + (name || ''));
  $('#modal-assign-task').modal('show');
}

// Handle assign form submit
$('#form-assign-task').on('submit', function (e) {
   load.hidden = false;
  e.preventDefault();
  if (!selected_assign_id) return showError('Selecciona una tarea');
  const selectedRole = $('#assign_roles').val() || null;
  const startVal = $('#assign_start_date').val();
  const payload = {};
  if (startVal) {
    try { payload.internal_planned_date = new Date(startVal).toISOString(); } catch (err) { /* ignore */ }
  }
  // internal_responsibles expects an array of ids; use single selected role
  if (selectedRole) {
    const n = Number(selectedRole);
    payload.internal_responsibles = [ Number.isNaN(n) ? selectedRole : n ];
  } else {
    payload.internal_responsibles = [];
  }

  axios.patch(API_URL + selected_assign_id + '/', payload)
    .then((res) => {
      showSuccess('Asignado e iniciado');
      $('#modal-assign-task').modal('hide');
      // reload table
      try { $('#tabla-de-Datos').DataTable().ajax.reload(null, false); } catch (err) { }
        load.hidden = true;
    })
    .catch((err) => {
       load.hidden = true;
      showError('Error asignando', err.response?.data?.detail || err.message || '');
    });
});

