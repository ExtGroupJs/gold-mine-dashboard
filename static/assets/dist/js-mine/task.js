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
      {
        text: "Crear",
        className: " btn btn-primary btn-info",
        action: function () {
          $("#modal-crear-task").modal("show");
        },
      },
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
      { data: "wbs", title: "WBS" },
      { data: "task_code", title: "Código" },
      { data: "task_name", title: "Tarea" },
      { data: "status_code", title: "Estado" },
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
          const hasStart = !!row.start_date;
          const hasEnd = !!row.end_date;
          let actionButtons = `<div class="btn-group" role="group">`;
          // Edit
          actionButtons += `<button type="button" title="edit" class="btn bg-olive active btn-edit" data-id="${row.id}" data-name="${row.task_name}"><i class="fas fa-edit"></i></button>`;
          // Start / Stop buttons logic
          if (!hasStart) {
            actionButtons += `<button type="button" title="iniciar" class="btn btn-warning btn-start" data-id="${row.id}" data-name="${row.task_name}"><i class="fas fa-play"></i></button>`;
          } else if (hasStart && !hasEnd) {
            actionButtons += `<button type="button" title="terminar" class="btn btn-success btn-stop" data-id="${row.id}" data-name="${row.task_name}"><i class="fas fa-stop"></i></button>`;
          }
          // Delete
          actionButtons += `<button type="button" title="delete" class="btn bg-olive btn-delete" data-id="${row.id}" data-name="${row.task_name}"><i class="fas fa-trash"></i></button>`;
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
      const hasStart = !!d.start_date;
      const hasEnd = !!d.end_date;
      if (hasStart && !hasEnd) {
        $(rowNode).addClass('task-status-started');
      } else if (!hasStart && !hasEnd) {
        $(rowNode).addClass('task-status-notstarted');
      } else if (hasStart && hasEnd) {
        // if end date already passed -> green
        const endDt = new Date(d.end_date);
        const now = new Date();
        if (endDt <= now) {
          $(rowNode).addClass('task-status-completed');
        }
      }
    });
  });

  // Delegate edit/delete button clicks
  $("table").on("click", ".btn-edit", function () {
    const id = $(this).data("id");
    openEditModal(id);
  });
  $("table").on("click", ".btn-delete", function () {
    const id = $(this).data("id");
    const name = $(this).data("name");
    function_delete(id, name);
  });
  // Start / Stop handlers
  $("table").on("click", ".btn-start", function () {
    const id = $(this).data("id");
    const $btn = $(this);
    $btn.prop('disabled', true);
    const now = new Date().toISOString();
    axios.patch(API_URL + id + '/', { start_date: now })
      .then(() => {
        showSuccess('Tarea iniciada');
        table.ajax.reload(null, false);
      })
      .catch((err) => {
        showError('Error iniciando tarea', err.message || '');
      })
      .finally(() => $btn.prop('disabled', false));
  });

  $("table").on("click", ".btn-stop", function () {
    const id = $(this).data("id");
    const $btn = $(this);
    $btn.prop('disabled', true);
    const now = new Date().toISOString();
    axios.patch(API_URL + id + '/', { end_date: now })
      .then(() => {
        showSuccess('Tarea terminada');
        table.ajax.reload(null, false);
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

// Modal show/hide handlers
$("#modal-crear-task").on("hide.bs.modal", (event) => {
  const form = event.currentTarget.querySelector("form");
  form.reset();
  isEditing = false;
  selected_id = null;
  const elements = [...form.elements];
  elements.forEach((elem) => elem.classList.remove("is-invalid"));
  $("#modal-crear-task .modal-title").text("Crear Tarea");
  // reset select2 resources if present
  if ($.fn.select2) {
    $("#resources").val(null).trigger("change");
  }
});

function openEditModal(id) {
  selected_id = id;
  isEditing = true;
  $("#modal-crear-task .modal-title").text("Editar tarea");
  axios
    .get(API_URL + id + "/")
    .then((res) => {
      const t = res.data;
      const form = document.getElementById("form-create-task");
      form.elements.wbs.value = t.wbs || "";
      form.elements.task_code.value = t.task_code || "";
      form.elements.task_name.value = t.task_name || "";
      form.elements.status_code.value = t.status_code || "";
      // populate select2 resources if present, otherwise fallback to comma string
      if ($.fn.select2) {
        const $res = $("#resources");
        $res.val(null).trigger("change");
        if (Array.isArray(t.resources)) {
          t.resources.forEach(function (r) {
            const value = typeof r === 'object' ? (r.name || r.id) : r;
            if ($res.find("option[value='" + value + "']").length === 0) {
              const newOption = new Option(value, value, true, true);
              $res.append(newOption).trigger('change');
            } else {
              $res.find("option[value='" + value + "']").prop('selected', true);
            }
          });
          $res.trigger('change');
        }
      } else {
        form.elements.resources.value = Array.isArray(t.resources) ? t.resources.join(", ") : t.resources || "";
      }
      form.elements.target_drtn_hr_cnt.value = t.target_drtn_hr_cnt ?? "";
      form.elements.remain_drtn_hr_cnt.value = t.remain_drtn_hr_cnt ?? "";
      form.elements.total_float_hr_cnt.value = t.total_float_hr_cnt ?? "";
      form.elements.target_cost.value = t.target_cost ?? "";
      // convert to input datetime-local format yyyy-MM-ddTHH:mm
      if (t.start_date) form.elements.start_date.value = new Date(t.start_date).toISOString().slice(0, 16);
      if (t.end_date) form.elements.end_date.value = new Date(t.end_date).toISOString().slice(0, 16);
      form.elements.delete_record_flag.checked = !!t.delete_record_flag;
      $("#modal-crear-task").modal("show");
    })
    .catch((err) => showError("Error al cargar tarea", err.message || ""));
}

// Validation
$(function () {
  $.validator.setDefaults({ language: "es" });
  $("#form-create-task").validate({
    rules: { wbs: { required: true }, task_name: { required: true } },
    errorElement: "span",
    errorPlacement: function (error, element) {
      error.addClass("invalid-feedback");
      element.closest(".form-group").append(error);
    },
    highlight: function (element) { $(element).addClass("is-invalid"); },
    unhighlight: function (element) { $(element).removeClass("is-invalid"); },
  });
});

// Initialize Select2 for resources with AJAX and tags
function initResourcesSelect2() {
  if (!$.fn.select2) return;
  $("#resources").select2({
    tags: true,
    tokenSeparators: [","],
    placeholder: $("#resources").data('placeholder') || 'Buscar o agregar recursos',
    ajax: {
      url: '/business-gestion/resources/',
      dataType: 'json',
      delay: 250,
      data: function (params) {
        return { search: params.term };
      },
      processResults: function (data) {
        let items = [];
        if (Array.isArray(data.results)) {
          items = data.results.map(function (it) {
            if (typeof it === 'string') return { id: it, text: it };
            return { id: it.name || it.id, text: it.name || it.id };
          });
        } else if (Array.isArray(data)) {
          items = data.map(function (it) { return { id: it, text: it }; });
        }
        return { results: items };
      },
      error: function () {
        // ignore errors; tags mode still allows free entries
      }
    },
    width: '100%'
  });
}

// Run Select2 init after DOM ready
$(function () { initResourcesSelect2(); });

// Submit handler
document.getElementById("form-create-task").addEventListener("submit", function (event) {
  event.preventDefault();
  if (!$(this).valid()) return;
  const table = $("#tabla-de-Datos").DataTable();
  const form = event.currentTarget;

  const payload = {
    wbs: form.elements.wbs.value || "",
    task_code: form.elements.task_code.value || "",
    task_name: form.elements.task_name.value || "",
    status_code: form.elements.status_code.value || "",
    resources: ($.fn.select2 ? ($('#resources').val() || []) : (form.elements.resources.value ? form.elements.resources.value.split(",").map((s) => s.trim()).filter(Boolean) : [])),
    target_drtn_hr_cnt: form.elements.target_drtn_hr_cnt.value ? Number(form.elements.target_drtn_hr_cnt.value) : null,
    remain_drtn_hr_cnt: form.elements.remain_drtn_hr_cnt.value ? Number(form.elements.remain_drtn_hr_cnt.value) : null,
    total_float_hr_cnt: form.elements.total_float_hr_cnt.value ? Number(form.elements.total_float_hr_cnt.value) : null,
    target_cost: form.elements.target_cost.value || "",
    start_date: form.elements.start_date.value ? new Date(form.elements.start_date.value).toISOString() : null,
    end_date: form.elements.end_date.value ? new Date(form.elements.end_date.value).toISOString() : null,
    delete_record_flag: !!form.elements.delete_record_flag.checked,
  };

  if (isEditing && selected_id) {
    axios
      .patch(API_URL + selected_id + "/", payload)
      .then((response) => {
        showSuccess("Tarea actualizada");
        $("#modal-crear-task").modal("hide");
        table.ajax.reload(null, false);
        isEditing = false;
        selected_id = null;
      })
      .catch((error) => {
        const dict = error.response?.data || {};
        let textError = "Revise los siguientes campos: ";
        for (const key in dict) textError += ", " + key;
        showError("Error al actualizar tarea", textError);
      });
  } else {
    axios
      .post(API_URL, payload)
      .then((response) => {
        showSuccess("Tarea creada con éxito");
        $("#modal-crear-task").modal("hide");
        table.ajax.reload(null, false);
      })
      .catch((error) => {
        const dict = error.response?.data || {};
        let textError = "Revise los siguientes campos: ";
        for (const key in dict) textError += ", " + key;
        showError("Error al crear tarea", textError);
      });
  }
});

function function_delete(id, name) {
  const table = $("#tabla-de-Datos").DataTable();
  Swal.fire({
    title: "Eliminar",
    text: `Esta seguro que desea eliminar la tarea ${name}?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Si, Eliminar",
  }).then((result) => {
    if (result.isConfirmed) {
      axios
        .delete(API_URL + id + "/")
        .then((response) => {
          if (response.status === 204) {
            // reload table
            table.ajax.reload(null, false);
            showSuccess("Eliminar Tarea", "Tarea eliminada satisfactoriamente");
          }
        })
        .catch((error) => {
          showError("Error eliminando tarea", error.response?.data?.detail || error.message || "");
        });
    }
  });
}
