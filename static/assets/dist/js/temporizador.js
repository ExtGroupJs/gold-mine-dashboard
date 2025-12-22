// Establece el tiempo inicial en segundos
let tiempoRestante = 120;
// Establece el número de intentos 
let intentos = 1;
// Variable para almacenar el intervalo
let intervalId;
// Convierte el tiempo en minutos y segundos
function calcularTiempo(tiempo) {
    let minutos = Math.floor(tiempo / 60);
    let segundos = tiempo % 60;
    return { minutos, segundos };
}

// Actualiza el temporizador cada segundo
function actualizarTemporizador() {
    // Actualiza el tiempo restante
    tiempoRestante--;

    // Calcula el tiempo restante en minutos y segundos

    const { minutos, segundos } = calcularTiempo(tiempoRestante);



    // Muestra el tiempo restante en la consola o en la página
    // // console.log(`Tiempo restante: ${minutos}:${segundos}`);
    document.getElementById("temporizador").textContent = `${minutos}:${segundos}`;

    // Si el tiempo restante es cero, detén el temporizador
    if (tiempoRestante === 0 && intentos === 0) {
        detenerTemporizador();
        window.location = "../";
    } else {
        if (tiempoRestante === 0 && intentos !== 0) {
            intentos--;
            reiniciarTemporizador();
            document.getElementById("intento").textContent = "por favor confirme el código, este es el ultimo intento";
        }

    }
}

// Inicia el temporizador
function iniciarTemporizador() {
    // Actualiza el temporizador cada segundo
    intervalId = setInterval(actualizarTemporizador, 1000);
}

// Detiene el temporizador
function detenerTemporizador() {
    clearInterval(intervalId);
}

// Inicia el temporizador
iniciarTemporizador();

function reiniciarTemporizador() {
    detenerTemporizador();
    tiempoRestante = 120;
    iniciarTemporizador();
}