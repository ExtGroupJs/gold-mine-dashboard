// variable para gestionar los elementos seleccionados
let selected_id;

// Variable con el token 
const csrfToken = document.cookie.split(';')
    .find(c => c.trim().startsWith('csrftoken='))
    ?.split('=')[1];
// url del endpoint principal 
axios.defaults.headers.common['X-CSRFToken'] = csrfToken;

const url = '../user-gestion/users/' + localStorage.getItem('id') + '/';



$('#modal-edit-profile').on('show.bs.modal', function (event) {
    var modal = $(this)
    const form = event.currentTarget.querySelector('form');
    // Realizar la petición con Axios
    axios.get(`${url}`)
        .then(function (response) {
            // Recibir la respuesta
            const elemento = response.data;
            console.log(elemento)
            // Llenar el formulario con los datos del usuario
            form.elements.username2.value = elemento.username;
            form.elements.email.value = elemento.email;
            form.elements.first_name.value = elemento.first_name;
            form.elements.last_name.value = elemento.last_name;
            form.elements.ci.value = elemento.identification_number;
            form.elements.gender.value = elemento.gender;
            $('#country').select2({ dropdownParent: $('#modal-edit-profile'), theme: 'bootstrap4' });
            $('#country').val(elemento.country).trigger('change.select2');
        })
        .catch(function (error) {

        });



})



$(function () {
    bsCustomFileInput.init();
    getmodalitys();
    poblarListasCountry();
    loadUser()
});

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
            ci: {
                required: true,

            },
            email: {
                required: true,
                email: true,
            },
            username2: {
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
let form = document.getElementById("form-edit-profile");
form.addEventListener('submit', function (event) {
    event.preventDefault();
    var table = $('#tabla-de-Datos').DataTable();
    axios.defaults.headers.common['X-CSRFToken'] = csrfToken;
    let data = new FormData();
    data.append("username", document.getElementById("username2").value);
    data.append("email", document.getElementById("email").value);
    data.append("first_name", document.getElementById("first_name").value);
    data.append("last_name", document.getElementById("last_name").value);
    data.append("is_staff", true);
    data.append("identification_number", document.getElementById("ci").value);
    data.append("gender", document.getElementById("gender").value);
    data.append("country", document.getElementById("country").value);
    if (document.getElementById('customFile').files[0] != null) {
        data.append('photo', document.getElementById('customFile').files[0]);
    }


    axios
        .patch(`${url}`, data)
        .then((response) => {
            if (response.status === 200) {

                Swal.fire({
                    icon: "success",
                    title: "Elemento creado con exito",
                    showConfirmButton: false,
                    timer: 3000
                });
                localStorage.setItem('avatar', response.data.photo)
                var avatarurl = localStorage.getItem("avatar");
                if (avatarurl != "null") {
                    var imagen = document.getElementById("avatar");
                    var imagen1 = document.getElementById("profileavatar");
                    imagen.src = avatarurl;
                    imagen1.src = avatarurl;
                }
                $('#modal-edit-profile').modal('hide');

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

});


function overmodality(cuota) {
    // Seleccionar todos los elementos con la clase 'overlay'
    const overlays = document.querySelectorAll('.overlay');
    // Recorrer la lista de elementos y establecer hidden en false
    overlays.forEach(function (overlay) {
        overlay.hidden = true;
    });
    document.getElementById(cuota).hidden = false;
}

// para seleccionar la modalidad

function selectModality(id) {
    let datamodality = new FormData();
    datamodality.append("participation_modality", id)
    axios
        .patch(`${url}`, datamodality)
        .then((response) => {
            if (response.status === 200) {
                overmodality("cuota" + id);
            }
        })
        .catch((error) => {

        });

}

function getmodalityid(name) {
    let url = '../event-gestion/participation-modality-language/?page_size=1&language__lang_code=' + localStorage.getItem("django_language") + '&search=' + name;
    axios
        .get(`${url}`)
        .then((response) => {
            if (response.status === 200) {
                // console.log(response.data.results[0].id); 
                selectModality(response.data.results[0].id);
            }
        })
        .catch((error) => {
            alert("revisa el nombre que estas pasando en la creación de la modalidad contra la función");

        });

}
const url2 = '../event-gestion/participation-modality-language/?language__lang_code='+localStorage.getItem("django_language");
function getmodalitys() {
    var div1 = document.getElementById("contenedor");
    axios
        .get(`${url2}`)
        .then((response) => {
            if (response.status === 200) {
                // console.log(response.data.results);
                var div = document.createElement("div");
                div.className = "new";
                response.data.results.forEach(element => {
                    var dat = element['details'];

                    div1.innerHTML += dat;
                });


                loadUser();
            }
        })
        .catch((error) => {

        });

}

function poblarListasCountry() {
    var $country = document.getElementById("country");
    axios.get("../../user-gestion/countries/get-all/").then(function (response) {
        response.data.results.forEach(function (element) {
            var option = new Option(element.name, element.id);
            $country.add(option);
        });
    });

}

function loadUser() {

    axios.get(`${url}`)
        .then(function (response) {
            // Recibir la respuesta
            const elemento = response.data;
            let cuota = "cuota" + elemento.participation_modality;
            overmodality(cuota);
        })
        .catch(function (error) {
        });
}