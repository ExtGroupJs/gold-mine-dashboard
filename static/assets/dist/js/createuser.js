let credencial;
let checkcredencial;


$(document).ready(function () {
    $('table')
        .addClass('table table-hover')
        .DataTable({
            dom: '<"top"l>Bfrtip',
            buttons: [
                {
                    text: ' Add',
                    className: ' btn btn-primary btn-info',
                    action: function (e, dt, node, config) {
                        $('#modal-crear-usuario').modal('show');
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
                    text: 'Print'
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
                console.log('✌️data --->', data);
                if (data.order[0].dir == "desc") {
                    dir = "-"
                }

                axios.get('../user-gestion/users/', {
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
            },
            columns: [
                { data: "username", "title": "User" },
                { data: "get_full_name", "title": "Name" },
                { data: "email", "title": "Mail" },

                {
                    data: 'internal_status', "title": "Acciones",
                    render: (data, type, row) => {
                        if (data == 'R') {
                            return `<div class="btn-group">
                        <button type="button" title="edit" class="btn bg-olive active" data-toggle="modal" data-target="#modal-crear-usuario" data-id="${row.id}" data-type="edit" data-name="${row.get_full_name}" id="${row.id}"  >
                          <i class="fas fa-edit"></i>
                        </button>                       
                                             
                        <button type="button" title="delete" class="btn bg-olive" data-toggle="modal" data-target="#modal-eliminar-usuario" data-id="${row.id}" data-name="${row.get_full_name}" id="${row.id}">
                          <i class="fas fa-trash"></i>
                        </button>
                        <button type="button" title="Add Premium" class="btn bg-navy"  data-id="${row.id}" data-name="${row.get_full_name}" id="${row.id}"  onclick="premium(${row.id},true)">
                        <i class="fas fa-gem"></i>
                            </button>                    
                      </div>`;
                        } else {
                            return `<div class="btn-group">
                            <button type="button" title="edit" class="btn bg-olive active" data-toggle="modal" data-target="#modal-crear-usuario" data-id="${row.id}" data-type="edit" data-name="${row.get_full_name}" id="${row.id}"  >
                              <i class="fas fa-edit"></i>
                            </button>                       
                                                 
                            <button type="button" title="delete" class="btn bg-olive" data-toggle="modal" data-target="#modal-eliminar-usuario" data-id="${row.id}" data-name="${row.get_full_name}" id="${row.id}">
                              <i class="fas fa-trash"></i>
                            </button>
                            <button type="button" title="Eliminate Premium" class="btn bg-orange"  data-id="${row.id}" data-name="${row.get_full_name}" id="${row.id}"  onclick="premium(${row.id},false)">
                              <i class="fas fa-gem"></i>
                                </button>
                          </div>`;
                        }
                    }
                },

            ],
            //  esto es para truncar el texto de las celdas
            "columnDefs": []
        });
    // aqui se llama la funcion para poblar las listas del formulario   
    // poblarListas();
    credencial = document.getElementById('credencial');
    checkcredencial = document.getElementById('checkcredencial');
    checkcredencial.addEventListener('change', () => {
        // Si el checkbox está marcado, habilitar los inputs, de lo contrario, deshabilitarlos
        if (checkcredencial.checked) {
            document.getElementById("password").disabled = false;
            document.getElementById("inputPasswordValidate").disabled = false;

        } else {
            document.getElementById("password").disabled = true;
            document.getElementById("inputPasswordValidate").disabled = true;

        }
    });
});

function premium(selected_id, premium_status) {
    var table = $('#tabla-de-Datos').DataTable();
    const csrfToken = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='))?.split('=')[1];
    axios.defaults.headers.common['X-CSRFToken'] = csrfToken;

    let data = new FormData();
    if (premium_status) {
        data.append('internal_status', "P");
    } else {
        data.append('internal_status', "R");
    }

    const url = '../user-gestion/users/';
    axios
        .patch(url + selected_id + '/', data)
        .then((response) => {

            if (response.status == 200) {
                if (premium_status) {
                    Swal.fire({
                        icon: "success",
                        title: "Premium account activated",
                        showConfirmButton: false,
                        timer: 1500
                    });
                } else {
                    Swal.fire({
                        icon: "success",
                        title: "Premium account disabled",
                        showConfirmButton: false,
                        timer: 1500
                    });
                }

                table.ajax.reload();
            }
        })
        .catch((error) => {
            // Verifica si hay una respuesta y maneja el error adecuadamente
            if (error.response) {
                let dict = error.response.data || {}; // Asegúrate de acceder correctamente
                let textError = "Review the following fields: ";
                for (const key in dict) {
                    textError += ", " + key; // Concatenar errores
                }

                Swal.fire({
                    icon: "error",
                    title: "Error activating premium account",
                    text: textError,
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                // Manejo de errores sin respuesta
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "An unexpected error occurred.",
                    showConfirmButton: false,
                    timer: 1500
                });
            }
        });
}




let selected_id;

$('#modal-eliminar-usuario').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget) // Button that triggered the modal
    var dataName = button.data('name') // Extract info from data-* attributes
    var dataId = button.data('id') // Extract info from data-* attributes
    selected_id = button.data('id') // Extract info from data-* attributes
    var modal = $(this)
    modal.find('.modal-body').text('¿Desea eliminar al usuario ' + dataName + '?')

})

// funcion para eliminar usuario
function function_delete(selected_id) {
    const table = $('#tabla-de-Datos').DataTable();
    const csrfToken = document.cookie.split(';')
        .find(c => c.trim().startsWith('csrftoken='))
        ?.split('=')[1];
    axios.defaults.headers.common['X-CSRFToken'] = csrfToken;
    axios.delete(`../user-gestion/users/${selected_id}/`)
        .then((response) => {
            Toast.fire({
                icon: 'success',
                title: 'El usuario se eliminó correctamente'
            })
            table.row(`#${selected_id}`).remove().draw(); // use id selector to remove the row
        })
        .catch((error) => {
            Toast.fire({
                icon: 'error',
                title: 'El usuario no se eliminó'
            })
        });
}



$('#modal-crear-usuario').on('hide.bs.modal', (event) => {
    // The form element is selected from the event trigger and its value is reset.
    const form = event.currentTarget.querySelector('form');
    form.reset();
    // The 'edit_user' flag is set to false.
    edit_user = false;
    // An array 'elements' is created containing all the HTML elements found inside the form element.
    const elements = [...form.elements];
    // A forEach loop is used to iterate through each element in the array.
    elements.forEach(elem => elem.classList.remove('is-invalid'));

});


let edit_user = false;
$('#modal-crear-usuario').on('show.bs.modal', function (event) {
    console.log(credencial)
    document.getElementById("password").disabled = false;//para deshabilitar los input de password
    document.getElementById("inputPasswordValidate").disabled = false;

    var button = $(event.relatedTarget) // Button that triggered the modal

    var modal = $(this)
    if (button.data('type') == "edit") {
        var dataName = button.data('name') // Extract info from data-* attributes
        var dataId = button.data('id') // Extract info from data-* attributes
        selected_id = button.data('id') // Extract info from data-* attributes
        edit_user = true;
        credencial.hidden=false;
        // document.getElementById("username").disabled = true;//para deshabilitar los input de password
        document.getElementById("password").disabled = true;//para deshabilitar los input de password
        document.getElementById("inputPasswordValidate").disabled = true;
        modal.find('.modal-title').text('Editar al usuario ' + dataName)
        // Definir la URL
        const url = '../user-gestion/users/' + selected_id + '/';
        // Realizar la petición con Axios
        axios.get(url)
            .then(function (response) {
                // Recibir la respuesta
                const user = response.data;
                console.log(user.username);
                // Llenar el formulario con los datos del usuario
                form.elements.username2.value = user.username;
                form.elements.email.value = user.email;
                form.elements.first_name.value = user.first_name;
                form.elements.last_name.value = user.last_name;
                form.elements.ci.value = user.identification_number;
                form.elements.gender.value = user.gender;
                $('#country').val(user.country).trigger('change.select2');

            })
            .catch(function (error) {

            });

    } else {
        modal.find('.modal-title').text('Crear usuario')
    }

})


$(function () {
    bsCustomFileInput.init();
    $('.select2').select2({ dropdownParent: $('#modal-crear-usuario'), theme: 'bootstrap4' })
}

);

// form validator
$(function () {
    $.validator.setDefaults({
        language: 'es',
        submitHandler: function () {
            // alert("Form successful submitted!");
        }
    });

    $('#form-create-user').validate({
        rules: {
            first_name: {
                required: true,

            },
            last_name: {
                required: true,

            },

            email: {
                required: true,
                email: true,
            },
            username2: {
                required: true,
            },
            password: {
                required: true,
                minlength: 5
            },
            inputPasswordValidate: {
                required: true,
                minlength: 5,
                equalTo: '#password'
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

let form = document.getElementById("form-create-user");
form.addEventListener('submit', function (event) {
    event.preventDefault();
    var table = $('#tabla-de-Datos').DataTable();
    const csrfToken = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='))?.split('=')[1];
    axios.defaults.headers.common['X-CSRFToken'] = csrfToken;
    let data = new FormData();
    data.append("username", document.getElementById("username2").value);
    data.append("email", document.getElementById("email").value);
    data.append("first_name", document.getElementById("first_name").value);
    data.append("last_name", document.getElementById("last_name").value);




    if (document.getElementById("password").value != "" && document.getElementById("inputPasswordValidate").value != "" && document.getElementById("password").value === document.getElementById("inputPasswordValidate").value) {
        data.append("password", document.getElementById("password").value);
    } else {
        if (checkcredencial.checked && document.getElementById("password").value == "" || document.getElementById("password").value != document.getElementById("inputPasswordValidate").value) {
            // alert("se jidio");
            event.preventDefault();
            return;
        }

    }




    const url = '../user-gestion/users/';

    if (edit_user) {
        axios
            .patch(url + selected_id + '/', data)
            .then((response) => {
                if (response.status === 200) {
                    $('#modal-crear-usuario').modal('hide');
                    Swal.fire({
                        icon: "success",
                        title: "Usuario actualizado con éxito  ",
                        showConfirmButton: false,
                        timer: 1500
                    });
                    table.ajax.reload();

                    edit_user = false;
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
                        title: "Usuario creado con exito",
                        showConfirmButton: false,
                        timer: 1500
                    });
                    table.ajax.reload();
                    $('#modal-crear-usuario').modal('hide');
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
    }
});





// function poblarListas() {
//     var $country = document.getElementById("country");
//     axios.get("../../user-gestion/countries/get-all/").then(function (response) {
//         response.data.results.forEach(function (element) {
//             var option = new Option(element.name, element.id);
//             $country.add(option);
//         });
//     });

// }