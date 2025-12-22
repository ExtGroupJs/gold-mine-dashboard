
  // Función para graficar
  function graficar(url) {
    load.hidden = false;
    let pdbUri = url;
  
    fetch(pdbUri)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Failed to load PDB " + pdbUri + ": " + response.statusText
          );
        }
        return response.text();
      })
      .then((data) => {
        viewer.removeAllModels();
        viewer.render();
        models[cont] = viewer.addModel(data, "pdb", { assignBonds: false });
        cont++;
        viewer.setClickable({}, true, function (atom, viewer, event, container) {
          showInfo(atom);
        });
        //viewer.setZoomLimits(100,200);
        // Crear los objetos de línea para los ejes de coordenadas
        viewer.setCameraParameters({ fov: 8 });
        // Ajustar automáticamente la separación entre los ojos
        child();
        viewer.render();
        viewer.zoomTo();
        viewer.spin(new $3Dmol.Vector3(1, 0, 0), 0.02); // Girar alrededor del eje X a una velocidad de 0.01 radianes por cuadro
        viewer.spin(false);
      })
      .catch((error) => {
        console.error(error);
      });
  }
  
  // Función para iniciar la animación del atomo
  function playStop(button) {
    if (spinState) {
      viewer.spin(false);
      spinState = false;
    } else {
      viewer.spin(new $3Dmol.Vector3(1, 0, 0), 0.08);
      spinState = true;
    }
    togglePauseButton(button);
  }
  
  // Función para pausar la animación del atomo
  function togglePauseButton(button) {
    var icon = button.querySelector(".nav-icon");
  
    if (icon.classList.contains("fa-play")) {
      icon.classList.remove("fa-play");
      icon.classList.add("fa-pause");
    } else if (icon.classList.contains("fa-pause")) {
      icon.classList.remove("fa-pause");
      icon.classList.add("fa-play");
    }
  }
  var a, b, c;
  // funcion para mostrar las coordenadas
  function coordenadas() {
    // Eje X
    var startX = -1000;
    var endX = 1000;
    a = viewer.addLine({
      start: { x: startX, y: 0, z: 0 },
      end: { x: endX, y: 0, z: 0 },
      color: 'red',
      hidden: true,
    });
  
  
  
    // Eje Y
    var startY = -1000;
    var endY = 1000;
    b = viewer.addLine({
      start: { x: 0, y: startY, z: 0 },
      end: { x: 0, y: endY, z: 0 },
      color: 'green',
      hidden: true,
    });
  
  
    // Eje Z
    var startZ = -1000;
    var endZ = 1000;
    c = viewer.addLine({
      start: { x: 0, y: 0, z: startZ },
      end: { x: 0, y: 0, z: endZ },
      color: 'blue',
      hidden: true,
    });
  
    viewer.render();
  }
  
  var labelX, labelY, labelZ
  function XYZLabels(state) {
    if (state) {
      labelX = viewer.addLabel('X', { position: { x: 1000, y: 0, z: 0 } }); // Etiqueta del eje X
      labelY = viewer.addLabel('Y', { position: { x: 0, y: 1000, z: 0 } }); // Etiqueta del eje Y
      labelZ = viewer.addLabel('Z', { position: { x: 0, y: 0, z: 1000 } }); // Etiqueta del eje Z 
    } else {
      viewer.removeLabel(labelX);
      viewer.removeLabel(labelY);
      viewer.removeLabel(labelZ);
    }
  }
  
  
  
  
  
  // Array global para almacenar las líneas
  var lineas = [];
  function crearMatriz() {
    var startX = -1000;
    var endX = 1000;
    var startY = -1000;
    var endY = 1000;
    var startZ = -1000;
    var endZ = 1000;
    var numLineas = 20; // Número de líneas en cada eje
  
    // Plano XY
    for (var i = 0; i <= numLineas; i++) {
      var x = startX + (endX - startX) * (i / numLineas);
      var lineObject = viewer.addLine({
        start: { x: x, y: startY, z: 0 },
        end: { x: x, y: endY, z: 0 },
        color: 'rgba(15, 191, 88, 0)',
        lineWidth: 8,
        hidden: true
  
      });
      lineas.push(lineObject); // Agregar la línea al array global
    }
  
    for (var j = 0; j <= numLineas; j++) {
      var y = startY + (endY - startY) * (j / numLineas);
      var lineObject = viewer.addLine({
        start: { x: startX, y: y, z: 0 },
        end: { x: endX, y: y, z: 0 },
        color: 'rgba(15, 191, 88, 0)',
        lineWidth: 8,
        hidden: true
      });
      lineas.push(lineObject); // Agregar la línea al array global
    }
  
    // Plano XZ
    for (var k = 0; k <= numLineas; k++) {
      var x = startX + (endX - startX) * (k / numLineas);
      var lineObject = viewer.addLine({
        start: { x: x, y: 0, z: startZ },
        end: { x: x, y: 0, z: endZ },
        color: 'rgba(255, 0, 255, 0)',
        lineWidth: 8,
        hidden: true
      });
      lineas.push(lineObject); // Agregar la línea al array global
    }
  
    for (var l = 0; l <= numLineas; l++) {
      var z = startZ + (endZ - startZ) * (l / numLineas);
      var lineObject = viewer.addLine({
        start: { x: startX, y: 0, z: z },
        end: { x: endX, y: 0, z: z },
        color: 'rgba(255, 0, 255, 0)',
        lineWidth: 8,
        hidden: true
      });
      lineas.push(lineObject); // Agregar la línea al array global
    }
    // Plano YZ
    for (var m = 0; m <= numLineas; m++) {
      var y = startY + (endY - startY) * (m / numLineas);
      var lineObject = viewer.addLine({
        start: { x: 0, y: y, z: startZ },
        end: { x: 0, y: y, z: endZ },
        color: 'rgba(0, 255, 255, 0)',
        lineWidth: 8,
        hidden: true
      });
      lineas.push(lineObject); // Agregar la línea al array
    }
  
    for (var n = 0; n <= numLineas; n++) {
      var z = startZ + (endZ - startZ) * (n / numLineas);
      var lineObject = viewer.addLine({
        start: { x: 0, y: startY, z: z },
        end: { x: 0, y: endY, z: z },
        color: 'rgba(0, 255, 255, 0)',
        lineWidth: 8,
        hidden: true
      });
      lineas.push(lineObject); // Agregar la línea al array
    }
  
  }
  
  function mostrarOcultarPlanos(mostrar) {
    lineas.forEach(function (lineObject) {
      lineObject.hidden = mostrar;
    });
  }
  
  
  function marcar(xcord, ycord, zcord) {
  
    viewer.addArrow({
      start: { x: xcord + 100, y: ycord + 100, z: zcord + 100 },
      end: { x: xcord, y: ycord, z: zcord },
      radius: 8.0,
      radiusRadio: 8.0,
      // wireframe:true,
      mid: 8.0,
      clickable: true,
      color: getRandomColor(),
      callback: function () {
  
  
        viewer.render();
      }
    });
    viewer.render();
  }
  function checkInternalStatus() {
    // Verificar si 'internal_status' existe en localStorage
    if (localStorage.getItem('internal_status') !== null) {
        // Obtener el valor de 'internal_status'
        const status = localStorage.getItem('internal_status');
        
        // Verificar si el valor es 'p'
        if (status === 'P') {
            console.log("El valor de internal_status es 'p'.");
            ExpandModalShowBotton.hidden=false;
            snpModalShowBotton.hidden=false;
            // Aquí puedes agregar más lógica si es necesario
        } else {
            console.log("El valor de internal_status no es 'p'.");
        }
    } else {
        console.log("internal_status no existe en localStorage.");
    }
}




