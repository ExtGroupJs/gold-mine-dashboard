// variable para gestionar los elementos seleccionados
let selected_id;

// Variable con el token 
const csrfToken = document.cookie.split(';')
    .find(c => c.trim().startsWith('csrftoken='))
    ?.split('=')[1];
// url del endpoint principal 
const url = '../product-gestion/entity/'



$(document).ready(function () {
    // var texto = prompt('Entra algo:');

    $('table')
        .addClass('table table-hover')
        .DataTable({
            dom: '<"top"l>Bfrtip',
            buttons: [
                {
                    text: ' Agregar',
                    className: ' btn btn-primary btn-info',
                    action: function (e, dt, node, config) {
                        $('#modal-crear-elemento').modal('show');
                    },

                }, {
                    extend: 'excel',
                    text: 'Excel'
                },
                {
                    extend: 'pdf',
                    text: 'PDF'
                },
                {
                    extend: 'print',
                    text: 'Imprimir'
                }
            ],
            //Adding server-side processing
            serverSide: true,
            search: {
                return: true,
            },
            processing: true,
            ajax: function (data, callback, settings) {
                dir = "";
                if (data.order[0].dir == "desc") {
                    dir = "-"
                }
                console.log(data.length)
                axios.get(url, {
                    params: {
                        page_size: data.length,
                        page: (data.start / data.length) + 1,
                        search: data.search.value,
                        ordering: dir + data.columns[data.order[0].column].data,
                    }

                }).then(res => {
                    callback({

                        recordsTotal: res.data.count,
                        recordsFiltered: res.data.count,
                        data: res.data.results

                    });
                }).catch(error => {
                    alert(error)
                })
                console.log(data)
            },
            columns: [

                { data: "name", "title": "Nombre" },
                { data: "email", "title": "Email" },
                {
                    data: "enabled", "title": "Estado",
                    render: (data, type, row) => {

                        if (row.enabled) {
                            return '<p class="text nav-icon far fa-circle text-success" >  Activo</p>';
                        } else {
                            return '<p class="text nav-icon far fa-circle text-danger " >  Inactivo</p>';
                        }
                    }
                },
                { data: "phone_1", "title": "Teléfono" },
                { data: "phone_2", "title": "Celular" },
                {
                    data: '', "title": "Acciones",
                    render: (data, type, row) => {
                        return `<div class="btn-group">
                        <button type="button" title="edit" class="btn bg-olive active" data-toggle="modal" data-target="#modal-crear-elemento" data-id="${row.id}" data-type="edit" data-name="${row.name}" id="${row.id}"  >
                          <i class="fas fa-edit"></i></button>                       
                        <button type="button" title="delete" class="btn bg-olive" data-toggle="modal" data-target="#modal-eliminar-elemento" data-id="${row.id}" data-name="${row.name}" id="${row.id}">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>`;
                    }
                },

            ],
            //  esto es para truncar el texto de las celdas
            "columnDefs": [

            ]
        });

});





$('#modal-eliminar-elemento').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget) // Button that triggered the modal
    var dataName = button.data('name') // Extract info from data-* attributes
    selected_id = button.data('id') // Extract info from data-* attributes
    var modal = $(this)
    modal.find('.modal-body').text('¿Desea eliminar a ' + dataName + '?')

})

// funcion para eliminar usuario
function function_delete(selected_id) {
    const table = $('#tabla-de-Datos').DataTable();
    axios.defaults.headers.common['X-CSRFToken'] = csrfToken;
    axios.delete(`${url}${selected_id}/`)
        .then((response) => {
            Toast.fire({
                icon: 'success',
                title: 'El elemento se eliminó correctamente'
            })
            table.row(`#${selected_id}`).remove().draw(); // use id selector to remove the row
        })
        .catch((error) => {
            Toast.fire({
                icon: 'error',
                title: 'El elemento no se eliminó'
            })
        });
}



$('#modal-crear-elemento').on('hide.bs.modal', (event) => {
    // The form element is selected from the event trigger and its value is reset.
    const form = event.currentTarget.querySelector('form');
    form.reset();
    // The 'edit_elemento' flag is set to false.
    edit_elemento = false;
    // An array 'elements' is created containing all the HTML elements found inside the form element.
    const elements = [...form.elements];
    // A forEach loop is used to iterate through each element in the array.
    elements.forEach(elem => elem.classList.remove('is-invalid'));

});


let edit_elemento = false;
$('#modal-crear-elemento').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget) // Button that triggered the modal
    var modal = $(this)
    if (button.data('type') == "edit") {
        var dataName = button.data('name') // Extract info from data-* attributes
        selected_id = button.data('id') // Extract info from data-* attributes
        edit_elemento = true
        modal.find('.modal-title').text('Editar ' + dataName)
        // Realizar la petición con Axios
        axios.get(`${url}${selected_id}/`)
            .then(function (response) {
                // Recibir la respuesta
                const elemento = response.data;
                // Llenar el formulario con los datos del usuario para actualizar
                form.elements.name.value = elemento.name;
                form.elements.email.value = elemento.email;
                form.elements.phone_1.value = elemento.phone_1;
                form.elements.phone_2.value = elemento.phone_2; form.elements.myenabled.value = elemento.enabled;
                if (elemento.enabled) {
                    form.elements.myenabled.checked = true;
                } else { form.elements.myenabled.checked = false; }

            })
            .catch(function (error) {

            });

    } else {
        modal.find('.modal-title').text('Crear entidad')
    }

})



$(function () {
    bsCustomFileInput.init();
});

// form validator
$(function () {
    $.validator.setDefaults({
        language: 'es',
        submitHandler: function () {
            // alert("Form successful submitted!");
        }
    });
    $('#form-create-elemento').validate({
        rules: {
            name: {
                required: true,
            },
            email: {
                required: true,
            },


        },
        submitHandler: function (form) {

        },

        messages: {
            email: {
                required: "Por favor debe ingresar una dirección de correo",
                email: "Por favor debe ingresar una dirección de correo válida"
            }
        },
        errorElement: 'span',
        errorPlacement: function (error, element) {
            error.addClass('invalid-feedback');
            element.closest('.form-group').append(error);
        },
        highlight: function (element, errorClass, validClass) {
            $(element).addClass('is-invalid');
        },
        unhighlight: function (element, errorClass, validClass) {
            $(element).removeClass('is-invalid');
        }
    });
});



// crear usuario
let form = document.getElementById("form-create-elemento");
form.addEventListener('submit', function (event) {
    event.preventDefault();
    var table = $('#tabla-de-Datos').DataTable();
    axios.defaults.headers.common['X-CSRFToken'] = csrfToken;
    let data = new FormData();
    data.append("name", document.getElementById("name").value);
    data.append("email", document.getElementById("email").value);
    data.append("phone_1", document.getElementById("phone_1").value);
    data.append("phone_2", document.getElementById("phone_2").value);
    data.append("enabled", document.getElementById("myenabled").value);



    if (edit_elemento) {
        axios
            .put(`${url}${selected_id}/`, data)
            .then((response) => {
                if (response.status === 200) {

                    Swal.fire({
                        icon: "success",
                        title: "Elemento creado con exito",
                        showConfirmButton: false,
                        timer: 1500
                    });

                    table.ajax.reload();
                    $('#modal-crear-elemento').modal('hide');
                    edit_elemento = false;
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
                    title: "Error al crear usuario",
                    text: textError,
                    showConfirmButton: false,
                    timer: 1500
                });
            });
    } else {
        axios
            .post(url, data)
            .then((response) => {
                if (response.status === 201) {

                    Swal.fire({
                        icon: "success",
                        title: "Elemento creado con exito",
                        showConfirmButton: false,
                        timer: 1500
                    });

                    table.ajax.reload();
                    $('#modal-crear-elemento').modal('hide');
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
                    title: "Error al crear elemento",
                    text: textError,
                    showConfirmButton: false,
                    timer: 1500
                });
            });
    }
});

function changeCheckboxValue(id) {
    // Get the checkbox element by ID
    const checkboxElement = document.getElementById(id);

    if (checkboxElement.checked) {
        // If the checkbox is already checked, set its value to true
        checkboxElement.value = true;
    } else {
        // Otherwise, set its value to false
        checkboxElement.value = false;
    }
}
