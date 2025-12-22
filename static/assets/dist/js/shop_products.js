// Variable con el token
const csrfToken = document.cookie
  .split(";")
  .find((c) => c.trim().startsWith("csrftoken="))
  ?.split("=")[1];
axios.defaults.headers.common["X-CSRFToken"] = csrfToken;
// url del endpoint principal
const url = "/business-gestion/shop-products/";

$(function () {
  bsCustomFileInput.init();
  poblarListas();
});

$(document).ready(function () {
  $("table")
    .addClass("table table-hover")
    .DataTable({
      dom: '<"top"l>Bfrtip',
      buttons: [
        {
          text: "Crear",
          className: "btn btn-primary btn-info",
          action: function (e, dt, node, config) {
            $("#modal-crear-shop-products").modal("show");
          },
        },
        {
          extend: "excel",
          text: "Excel",
        },
        {
          extend: "pdf",
          text: "PDF",
        },
        {
          extend: "print",
          text: "Print",
        },
      ],
      // Adding server-side processing
      serverSide: true,
      search: {
        return: true,
      },
      processing: true,
      ajax: function (data, callback, settings) {
        dir = "";

        if (data.order[0].dir == "desc") {
          dir = "-";
        }

        axios
          .get(`${url}`, {
            params: {
              page_size: data.length,
              page: data.start / data.length + 1,
              search: data.search.value,
              ordering: dir + data.columns[data.order[0].column].data,
            },
          })
          .then((res) => {
            callback({
              recordsTotal: res.data.count,
              recordsFiltered: res.data.count,
              data: res.data.results,
            });
          })
          .catch((error) => {
            alert(error);
          });
      },
      columns: [
        { data: "shop.name", title: "Tienda" },
        { data: "product.name", title: "Producto" },
        { data: "quantity", title: "Cantidad" },
        { data: "cost_price", title: "Precio de Costo" },
        { data: "sell_price", title: "Precio de Venta" },
        { data: "extra_info", title: "Información Extra" },
        {
          data: "",
          title: "Acciones",
          render: (data, type, row) => {
            return `<div class="btn-group">
                        <button type="button" title="edit" class="btn bg-olive active" data-toggle="modal" data-target="#modal-crear-shop-products" data-id="${row.id}" data-type="edit" data-name="${row.product}" id="${row.id}">
                          <i class="fas fa-edit"></i>
                        </button>  
                        <button type="button" title="delete" class="btn bg-olive" onclick="function_delete('${row.id}','${row.product}')" >
                          <i class="fas fa-trash"></i>
                        </button>                                          
                      </div>`;
          },
        },
      ],
      //  esto es para truncar el texto de las celdas
      columnDefs: [],
    });
});

let selected_id;

$("#modal-crear-shop-products").on("hide.bs.modal", (event) => {
  const form = event.currentTarget.querySelector("form");
  form.reset();
  edit_shopProducts = false;
  const elements = [...form.elements];
  elements.forEach((elem) => elem.classList.remove("is-invalid"));
});

let edit_shopProducts = false;
$("#modal-crear-shop-products").on("show.bs.modal", function (event) {
  var button = $(event.relatedTarget); // Button that triggered the modal

  var modal = $(this);
  if (button.data("type") == "edit") {
    var dataName = button.data("name"); // Extract info from data-* attributes
    selected_id = button.data("id"); // Extract info from data-* attributes
    edit_shopProducts = true;

    modal.find(".modal-title").text("Editar Entrada de Producto " + dataName);

    // Realizar la petición con Axios
    axios
      .get(`${url}` + selected_id + "/")
      .then(function (response) {
        // Recibir la respuesta
        const shopProduct = response.data;
        form.elements.quantity.value = shopProduct.quantity;
        form.elements.cost_price.value = shopProduct.cost_price;
        form.elements.sell_price.value = shopProduct.sell_price;
        form.elements.extra_info.value = shopProduct.extra_info;
        form.elements.shop.value = shopProduct.shop;
        form.elements.product.value = shopProduct.product;
      })
      .catch(function (error) {});
  } else {
    modal.find(".modal-title").text("Crear Entrada de Producto");
  }
});

// form validator
// form validator
$(function () {
  $.validator.setDefaults({
    language: "es",
    submitHandler: function () {
      // alert("Form successful submitted!");
    },
  });

  $("#form-create-shop-products").validate({
    rules: {
      quantity: {
        required: true,
        digits: true, // Solo números
      },
      cost_price: {
        required: true,
        number: true, // Solo números
      },
      sell_price: {
        required: true,
        number: true, // Solo números
        greaterThan: "#cost_price", // El precio de venta debe ser mayor que el precio de costo
      },
      extra_info: {
        required: false, // Campo no obligatorio
      },
    },
    messages: {
      quantity: {
        required: "Este campo es obligatorio.",
        digits: "Por favor, introduzca solo números.",
      },
      cost_price: {
        required: "Este campo es obligatorio.",
        number: "Por favor, introduzca un número válido.",
      },
      sell_price: {
        required: "Este campo es obligatorio.",
        number: "Por favor, introduzca un número válido.",
        greaterThan:
          "El precio de venta debe ser mayor que el precio de costo.",
      },
    },
    submitHandler: function (form) {},

    errorElement: "span",
    errorPlacement: function (error, element) {
      error.addClass("invalid-feedback");
      element.closest(".form-group").append(error);
    },
    highlight: function (element, errorClass, validClass) {
      $(element).addClass("is-invalid");
    },
    unhighlight: function (element, errorClass, validClass) {
      $(element).removeClass("is-invalid");
    },
  });
});

// Método para validar que el precio de venta sea mayor que el precio de costo
$.validator.addMethod(
  "greaterThan",
  function (value, element, param) {
    return this.optional(element) || Number(value) > Number($(param).val());
  },
  "El precio de venta debe ser mayor que el precio de costo."
);

// crear Entrada de Producto

let form = document.getElementById("form-create-shop-products");
form.addEventListener("submit", function (event) {
  event.preventDefault();
  var table = $("#tabla-de-Datos").DataTable();
  const csrfToken = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("csrftoken="))
    ?.split("=")[1];
  axios.defaults.headers.common["X-CSRFToken"] = csrfToken;
  let data = new FormData();
  data.append("shop", document.getElementById("shop").value);
  data.append("product", document.getElementById("product").value);
  data.append("quantity", document.getElementById("quantity").value);
  data.append("cost_price", document.getElementById("cost_price").value);
  data.append("sell_price", document.getElementById("sell_price").value);
  data.append("extra_info", document.getElementById("extra_info").value);

  if (edit_shopProducts) {
    axios
      .patch(`${url}` + selected_id + "/", data)
      .then((response) => {
        if (response.status === 200) {
          $("#modal-crear-shop-products").modal("hide");
          Swal.fire({
            icon: "success",
            title: "Entrada de Producto actualizada con éxito",
            showConfirmButton: false,
            timer: 1500,
          });
          table.ajax.reload();

          edit_shopProducts = false;
        }
      })
      .catch((error) => {
        let dict = error.response.data;
        let textError = "Revise los siguientes campos: ";
        for (const key in dict) {
          textError = textError + ", " + key;
        }

        Swal.fire({
          icon: "error",
          title: "Error al crear la Entrada de Producto",
          text: textError,
          showConfirmButton: false,
          timer: 1500,
        });
      });
  } else {
    axios
      .post(`${url}`, data)
      .then((response) => {
        if (response.status === 201) {
          Swal.fire({
            icon: "success",
            title: "Entrada de Producto creada con éxito",
            showConfirmButton: false,
            timer: 1500,
          });
          table.ajax.reload();
          $("#modal-crear-shop-products").modal("hide");
        }
      })
      .catch((error) => {
        let dict = error.response.data;
        let textError = "Revise los siguientes campos: ";
        for (const key in dict) {
          textError = textError + ", " + key;
        }

        Swal.fire({
          icon: "error",
          title: "Error al crear la Entrada de Producto",
          text: textError,
          showConfirmButton: false,
          timer: 1500,
        });
      });
  }
});

function poblarListas() {
  // Poblar la lista de tiendas
  var $shop = document.getElementById("shop");
  axios.get("/business-gestion/shops/").then(function (response) {
    response.data.results.forEach(function (element) {
      var option = new Option(element.name, element.id);
      $shop.add(option);
    });
  });

  // Poblar la lista de productos
  var $product = document.getElementById("product");
  axios.get("/business-gestion/products/").then(function (response) {
    response.data.results.forEach(function (element) {
      var option = new Option(element.name, element.id);
      $product.add(option);
    });
  });
}

function function_delete(id, name) {
  const table = $("#tabla-de-Datos").DataTable();
  Swal.fire({
    title: "Eliminar",
    text: `¿Está seguro que desea eliminar el elemento ${name}?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Sí, Eliminar",
  }).then((result) => {
    if (result.isConfirmed) {
      axios.defaults.headers.common["X-CSRFToken"] = csrfToken;
      axios
        .delete(`${url}${id}/`)
        .then((response) => {
          if (response.status === 204) {
            table.row(`#${id}`).remove().draw();
            Swal.fire({
              icon: "success",
              title: "Eliminar Elemento",
              text: "Elemento eliminado satisfactoriamente",
              showConfirmButton: false,
              timer: 1500,
            });
          }
        })
        .catch((error) => {
          Swal.fire({
            icon: "error",
            title: "Error eliminando elemento",
            text: error.response.data.detail,
            showConfirmButton: false,
            timer: 3000,
          });
        });
    }
  });
}
