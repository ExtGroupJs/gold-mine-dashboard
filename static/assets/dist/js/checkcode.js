// Obtener referencias a los elementos del DOM
const inputElement = document.getElementById('codeinput');
const buttonElement = document.getElementById('codesend');

// Asignar un evento de clic al botón
buttonElement.addEventListener('click', function () {
    // Obtener el valor del input
    const inputValue = inputElement.value;

    // Obtener el valor de la variable 'code' almacenada en localStorage
    const storedCode = localStorage.getItem('code');
    console.log("code" + storedCode)
    console.log("input" + inputValue)
    // Comparar los valores
    if (inputValue === storedCode) {

        let data = new FormData();
        data.append("username", localStorage.getItem('user'))
        data.append("password", localStorage.getItem('password'))
        data.append("confirmed", true)
        // Envio de datos con axios al endpoint
        axios.post('../user-gestion/users/login/', data)
            .then(function (res) {
                if (res.status == 202) {
                    localStorage.setItem("user", res.data.username);
                    localStorage.setItem("avatar", res.data.photo);
                    localStorage.setItem("id", res.data.id);
                    localStorage.setItem("email", res.data.email);
                    window.location = "../profile/";
                }
            }).catch(function (err) {
                Toast.fire({
                    icon: 'error',
                    title: "Error de acceso",
                    title: 'Error de acceso revise sus credenciales, Usuario y Contraseña.',
                    timer: 1500
                })
            })


    } else {
        Swal.fire({
            icon: "error",
            title: "El código no coincide.",
            text: 'el código debe coincidir con el enviado por correo',
            showConfirmButton: false,
            timer: 1500
        });



    }
});