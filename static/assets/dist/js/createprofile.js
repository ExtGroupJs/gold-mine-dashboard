let credencial;
let checkcredencial;

var showSpinner = function () {
    document.querySelector('.spinner-overlay').style.display = 'flex';
}

var hideSpinner = function () {
    document.querySelector('.spinner-overlay').style.display = 'none';
}
// hideSpinner();

// crear usuario
let form = document.getElementById("form-create-profile");
// form.addEventListener('submit', function (event) {

var createprofile = function () {

    // event.preventDefault();

    const csrfToken = document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='))?.split('=')[1];
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


    if (document.getElementById("password").value != "" && document.getElementById("inputPasswordValidate").value != "" && document.getElementById("password").value === document.getElementById("inputPasswordValidate").value) {
        data.append("password", document.getElementById("password").value);
        localStorage.setItem("password", document.getElementById("password").value);
    } else {
        if (checkcredencial.checked && document.getElementById("password").value == "" || document.getElementById("password").value != document.getElementById("inputPasswordValidate").value) {
            event.preventDefault();
            return;
        }

    }
    if (document.getElementById('customFile').files[0] != null) {
        data.append('photo', document.getElementById('customFile').files[0]);
    }

    const url = '../user-gestion/users/';
    let rowNode;
    showSpinner();
    axios
        .post(url, data)
        .then((response) => {
            if (response.status === 201) {
                localStorage.setItem("user", response.data.username);
                localStorage.setItem("avatar", response.data.photo);
                localStorage.setItem("email", response.data.email);
                localStorage.setItem("code", response.data.confirmation_code);
                hideSpinner();
                window.location = "../checkcode/";
            }
        })
        .catch((error) => {
            hideSpinner();
            let dict = error.response.data;
            let textError = "Revise los siguientes campos: ";
            for (const key in dict) {
                textError = textError + ":" + key;
            }

            if (error.response.status === 406) {
                hideSpinner();
                Swal.fire({
                    icon: "error",
                    title: "Error al enviar el correo de verificación ",
                    text: "El correo de verificación no se puede en enviar en este momento, revise su dirección de correo o inténtelo mas tarde.",
                    showConfirmButton: false,
                    timer: 5000
                });
            } else {

                Swal.fire({
                    icon: "error",
                    title: "Error al crear usuario",
                    text: textError,
                    showConfirmButton: false,
                    timer: 1500
                });
            }
        });
}
// });


$(function () {
    bsCustomFileInput.init();
    $('.select2').select2({ theme: 'bootstrap4' })
    poblarListas();

});

$(function () {
    $.validator.setDefaults({
        language: 'es',
        submitHandler: function () {
            // alert("Form successful submitted!");
        }
    });

    $('#form-create-profile').validate({
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
            createprofile();


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

function poblarListas() {
    var $country = document.getElementById("country");
    axios.get("../../user-gestion/countries/get-all/").then(function (response) {
        response.data.results.forEach(function (element) {
            var option = new Option(element.name, element.id);
            $country.add(option);
        });
    });

}






