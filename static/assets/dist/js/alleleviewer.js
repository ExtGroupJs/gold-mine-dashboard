var zoomLevel = 1;
var stick_hidden = false;
var sphere_hidden = false;
var axes_hidden = false;
var plane_hidden = false;
let viewer;
let spinState = false;
var children;
var selectActual;
// variables para el graficador
let element = $("#container")[0];
let load = document.getElementById("load");
var models = [];
var cont = 0;
// en esta variable se guardan los datos despues que se cargan de los hijos
var datos;
var sphereRadiusFactor = 12;
var stickRadiusFactor = 0.003;

var snpModalShowBotton = document.getElementById("snpModalShowBotton");
var ExpandModalShowBotton = document.getElementById("ExpandModalShowBotton");
// Variable con el token
const csrfToken = document.cookie
  .split(";")
  .find((c) => c.trim().startsWith("csrftoken="))
  ?.split("=")[1];

// Bloque para mostrar las esferas
var checkboxsphere = document.getElementById("sphere_hidden");
checkboxsphere.addEventListener("change", function () {
  sphere_hidden = checkboxsphere.checked ? checkboxsphere.value : null;
});

// Bloque para mostrar las conexiones
var checkbox = document.getElementById("stick_hidden");
checkbox.addEventListener("change", function () {
  stick_hidden = checkbox.checked ? checkbox.value : null;
});

// Bloque para mostrar los ejes de coordenadas
var checkboxAxes = document.getElementById("show_axes");
checkboxAxes.addEventListener("change", function () {
  axes_hidden = checkboxAxes.checked ? checkboxAxes.value : null;
  if (axes_hidden == 0) {
    a.hidden = false;
    b.hidden = false;
    c.hidden = false;
    XYZLabels(true);
    viewer.render();
  } else {
    a.hidden = true;
    b.hidden = true;
    c.hidden = true;
    XYZLabels(false);
    viewer.render();
  }
});

var checkboxPlane = document.getElementById("show_plane");
checkboxPlane.addEventListener("change", function () {
  plane_hidden = checkboxPlane.checked ? checkboxPlane.value : null;
  if (plane_hidden == 0) {
    mostrarOcultarPlanos(false);
    viewer.render();
  } else {
    mostrarOcultarPlanos(true);
    viewer.render();
  }
});

// Inicializar las funciones
$(function () {
  checkInternalStatus();
  coordenadas();
  crearMatriz();
  poblarListasAllele();
});

// Función para poblar la lista desplegable del documento
function poblarListasAllele() {
  var $selectfile = document.getElementById("selectfile");
  axios.get("/business-gestion/uploaded-files/").then(function (response) {
    response.data.results.forEach(function (element) {
      var option = new Option(element.custom_name, element.id);
      $selectfile.add(option);
    });
     poblarListasPdb(response.data.results[0].pdb_files);
    console.log("✌️file --->");

    poblarListasCopy(response.data.results[0].id);
  });
}
// Función para poblar la lista desplegable de los pdb
function poblarListasPdb(versionAllele) {
console.log('✌️versionAllele --->', versionAllele);
  var $selectPdb = document.getElementById("selectPdb");

  $selectPdb.innerHTML = "";
  versionAllele.forEach(function (element) {
    var option = new Option(element.custom_name, element.id);
    $selectPdb.add(option);
  });
}

function poblarListasCopy(uploadFileId) {
  console.log('✌️localStorage.getItem("id") --->', localStorage.getItem("id"));
  if (localStorage.getItem("id") !== null) {

    var userId = localStorage.getItem("id");
    var url =
      "/business-gestion/working-copy-of-original-file-for-user/?system_user=" +
      userId +
      "&uploaded_file=" +
      uploadFileId;
    var $selectCopy = document.getElementById("selectCopy");
    var $inputGroup = document.getElementById("inputGroupCopy");
    $selectCopy.innerHTML = "";
    // Mostrar un mensaje de carga
    var loadingOption = new Option("Cargando...", "");
    $selectCopy.add(loadingOption);

    axios
      .get(url)
      .then(function (response) {
        // Limpiar opciones de carga
        $selectCopy.innerHTML = "";
        if (response.data.results.length > 0) {
          response.data.results.forEach(function (element) {
            var option = new Option(
              "Personal Copy # " + element.id,
              element.id
            );
            $selectCopy.add(option);
            // $inputGroup.style.display = "flex"; // Muestra el div si hay resultados
            $inputGroup.hidden = false;
          });
        } else {
          // var noResultsOption = new Option("Sin resultados", "");
          // $selectCopy.add(noResultsOption);
          // $inputGroup.style.display = "none"; // Oculta el div si no hay resultados
          $inputGroup.hidden = true;
        }
      })
      .catch(function (error) {
        console.error("Error al obtener los datos:", error);
        var errorOption = new Option("Error al cargar", "");
        $selectCopy.add(errorOption);
      });
  }
}

// creación e inicialización del objeto view
viewer = $3Dmol.createViewer(element, {
  defaultcolors: $3Dmol.rasmolElementColors,
  controls: "trackball orbit fps scroll dnd",
});

function getRandomColor() {
  // Genera valores aleatorios para los componentes rojo, verde y azul
  var r = Math.floor(Math.random() * 256);
  var g = Math.floor(Math.random() * 256);
  var b = Math.floor(Math.random() * 256);

  // Convierte los valores a formato hexadecimal
  var rHex = r.toString(16).padStart(2, "0");
  var gHex = g.toString(16).padStart(2, "0");
  var bHex = b.toString(16).padStart(2, "0");

  // Construye el valor hexadecimal del color
  var colorHex = "#" + rHex + gHex + bHex;

  return colorHex;
}

var data1;
function displaySNPData() {
  // Datos proporcionados
  load.hidden = false;
  axios
    .get(
      "/business-gestion/uploaded-files/" +
        localStorage.getItem("uploadFileId") +
        "/initial-file-data/"
    )
    .then(function (response) {
      data1 = response.data.results;
      console.log("✌️data1 --->", data1);
      var table = document.getElementById("snptable");
      if (!table.querySelector("thead") && !table.querySelector("tbody")) {
        // Crear el encabezado de la tabla
        var thead = document.createElement("thead");
        var headerRow = document.createElement("tr");

        var headers = ["Allele", "Marker", "Equalizer"];
        for (var i = 0; i < headers.length; i++) {
          var th = document.createElement("th");
          th.classList.add("col-3"); // Agregar la clase "col-3"
          th.textContent = headers[i];
          headerRow.appendChild(th);
        }

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Crear el cuerpo de la tabla
        var tbody = document.createElement("tbody");
        for (var i = 0; i < data1.length; i++) {
          var row = document.createElement("tr");

          var alleleCell = document.createElement("td");
          alleleCell.textContent = data1[i].allele;
          row.appendChild(alleleCell);

          var markerCell = document.createElement("td");
          markerCell.textContent = data1[i].marker;
          row.appendChild(markerCell);

          var controlCell = document.createElement("td");
          var input = document.createElement("input");
          input.type = "text";
          input.class = "rs_control";
          input.name = "rs_control" + i;
          input.id = "rs_control" + data1[i].id;
          input.value = data1[i].current_percent;
          controlCell.appendChild(input);
          row.appendChild(controlCell);

          tbody.appendChild(row);
        }
        table.appendChild(tbody);
      }
      for (var i = 0; i < data1.length; i++) {
        $(`#rs_control${data1[i].id}`).ionRangeSlider({
          min: 0,
          max: 100,
          type: "single",
          step: 0.001,
          postfix: "%",
          prettify: false,
          hasGrid: true,
        });
      }
      load.hidden = true;
    })
    .catch(function (error) {
      Toast.fire({
        icon: "error",
        title: `${error.response.data.detail}`,
      });
      load.hidden = true;
    });
  // Obtener la referencia de la tabla HTML
}

function sendRSControlValues() {
  var rsControlInputs = document.querySelectorAll(".irs-hidden-input");
  var values = [];

  for (var i = 0; i < rsControlInputs.length; i++) {
    var inputValue = rsControlInputs[i].value;
    var inputId = parseInt(rsControlInputs[i].id.replace("rs_control", ""), 10);
    values.push({
      initial_filedata_id: inputId,
      new_percent_value: inputValue,
    });
  }

  var fileId = localStorage.getItem("uploadFileId");

  var data = {
    values: values,
    file_id: fileId,
  };

  console.log(data);
  load.hidden = false;
  $("#modal-xl").modal("hide");
  axios.defaults.headers.common["X-CSRFToken"] = csrfToken;
   axios
    .post("/business-gestion/new-coordinate-processor/", data)
    .then(function (response) {
      console.log("mi data:", response.data.file);
      graficar(response.data.file);
      load.hidden = true;
    })
    .catch(function (error) {
      Toast.fire({
        icon: "error",
        title: `${error.response.data.detail}`,
      });
      load.hidden = true;
    });
}

function selectPdbContainer() {
  zoom.value = 0;
  var $selectfile = document.getElementById("selectfile");
  var idFile = $selectfile.value;
  axios
    .get("/business-gestion/uploaded-files/" + idFile + "/")
    .then(function (response) {
      const elemento = response.data;
      let versionAllele = elemento.pdb_files;
console.log('✌️versionAllele --->', versionAllele);
      poblarListasPdb(versionAllele);
      poblarListasCopy(elemento.id);
      
    })
    .catch(function (error) {
      Toast.fire({
        icon: "error",
        title: `${error.response.data.detail}`,
      });
    });
}

function selectUrl() {
  zoom.value = 0;
  var $selectfile = document.getElementById("selectfile");
  var $selectPdb = document.getElementById("selectPdb");
  var idFile = $selectfile.value;

  console.log(" idFile:", idFile);
  axios
    .get("/business-gestion/uploaded-files/" + idFile + "/")
    .then(function (response) {
      const elemento = response.data;
       let pos = findPosition(elemento.pdb_files, $selectPdb.value);
      let versionAllele = elemento.pdb_files[pos].file;

      console.log(" versionAllele:", elemento.pdb_files[0].id);
      console.log(" versionAllele2:", versionAllele);
      localStorage.setItem("uploadFileId", idFile);
      graficar(versionAllele);

      // To enable the button
      loadOriginalXYZ();
      snpModalShowBotton.disabled = false;
      ExpandModalShowBotton.disabled = false;
    })
    .catch(function (error) {
      Toast.fire({
        icon: "error",
        title: `${error.response.data.detail}`,
      });
    });
}

function selectUrlPersonal() {
  zoom.value = 0;
  var $selectCopy = document.getElementById("selectCopy");
  var idFile = $selectCopy.value;

  console.log(" idFile:", idFile);
  axios
    .get(
      "/business-gestion/working-copy-of-original-file-for-user/" + idFile + "/"
    )
    .then(function (response) {
      const elemento = response.data;
      console.log("✌️response.data --->", response.data);
      // let pos = findPosition(elemento.pdb_files, $selectPdb.value);
      let versionAllele = elemento.pdb_file_copy;

      // localStorage.setItem("uploadFileId", idFile);
      graficar(versionAllele);

      // To enable the button
      loadOriginalXYZ();
      snpModalShowBotton.disabled = false;
      ExpandModalShowBotton.disabled = false;
    })
    .catch(function (error) {
      Toast.fire({
        icon: "error",
        title: `${error.response.data.detail}`,
      });
    });
}

function findPosition(data, id) {
  for (var i = 0; i < data.length; i++) {
    if (data[i].id == id) {
      return i;
    }
  }
  return -1;
}

function showInfo(atom) {
  $(".toast").toast("hide");
  atomNumber = atom.serial;
  load.hidden = false;
  let toastClass = seleccionarEstiloAleatorio();
  axios
    .get(
      "/business-gestion/allele-nodes/" +
        localStorage.getItem("uploadFileId") +
        "-" +
        String(atomNumber) +
        "/"
    )
    .then(function (response) {
      const elemento = response.data;
      children = elemento.children;
      // console.log(children);

      if (elemento.children_qty == 0) {
        $(document).Toasts("create", {
          class: toastClass,
          title: elemento.custom_element_name,
          // title: elemento.serial,
          subtitle: elemento.children_qty,
          body:
            elemento.rs +
            '<button type="button" class="btn btn-block btn-secondary" onclick="marcar(' +
            atom.x +
            "," +
            atom.y +
            "," +
            atom.z +
            ')">Bookmark</button>' +
            "<hr> Data for control (temporary):<br> X " +
            atom.x +
            " | Y " +
            atom.y +
            " | Z " +
            atom.z +
            " #: " +
            elemento.number,
          position: "bottomRight",
        });
      } else {
        selectActual = elemento.number;
        $(document).Toasts("create", {
          class: toastClass,
          title: elemento.custom_element_name,
          // title: elemento.serial,
          subtitle:
            elemento.number +
            " " +
            '<span class="badge badge-danger ">Childs ' +
            elemento.children_qty +
            "</span>",
          body:
            elemento.rs +
            '<button type="button" class="btn btn-block btn-secondary" onclick="loadFamily(' +
            elemento.number +
            ')">Family</button>' +
            '<button type="button" class="btn btn-block btn-secondary" onclick="marcar(' +
            atom.x +
            "," +
            atom.y +
            "," +
            atom.z +
            ')">bookmark</button>' +
            '<button type="button" class="btn btn-block btn-primary" onclick="allelereg(' +elemento.number+')">Region</button>' +
            "<hr> Data Control(temp):<br> X: " +
            atom.x +
            " | Y " +
            atom.y +
            " | Z " +
            atom.z +
            " #: " +
            elemento.number,
          position: "bottomRight",
        });
      }
    })
    .catch(function (error) {
      Toast.fire({
        icon: "error",
        title: `${error.response.data.detail}`,
      });
    });

  load.hidden = true;
}

function seleccionarEstiloAleatorio() {
  const estilos = [
    "bg-info",
    "bg-success",
    "bg-warning",
    "bg-danger",
    "bg-maroon",
  ];
  const indiceAleatorio = Math.floor(Math.random() * estilos.length);
  return estilos[indiceAleatorio];
}

function callBuscar() {
  const inputValue = document.getElementById("buscar").value;
  buscar(inputValue);
}

function buscar(params) {
  load.hidden = false;
  var searchurl =
    "/business-gestion/uploaded-files/" +
    localStorage.getItem("uploadFileId") +
    "/allele-node-by-uploaded-file/?";

  if (params[0] === "=") {
    searchurl += "custom_element_name=" + params.substring(1);
  } else {
    searchurl += "search=" + params;
  }
  axios
    .get(searchurl)
    .then(function (response) {
      const elemento = response.data;
      let atomData = elemento.results;
      const highlightColor = "#ffaa02";
      datos.forEach((element) => {
        const stickRadius =
          element.children_qty === 0 ? 0.5 : 0.5 + element.children_qty * 0.005;
        const sphereRadius = stickRadius * 8 * zoomLevel;
        if (atomData.some((item) => item.number === element.number)) {
          viewer.setStyle(
            { serial: element.number },
            {
              sphere: { color: "#ff1414", radius: sphereRadius },
              stick: {
                color: "#fcfcfc",
                radius: stickRadius,
                showNonBonded: false,
              },
            }
          );
        } else {
          viewer.setStyle(
            { serial: element.number },
            {
              sphere: { color: "#fcfcfc", radius: sphereRadius },
              stick: {
                color: "#fcfcfc",
                radius: stickRadius,
                showNonBonded: false,
              },
            }
          );
        }
      });
      viewer.render();
      load.hidden = true;
    })
    .catch(function (error) {
      Toast.fire({
        icon: "error",
        title: `${error.response.data.detail}`,
      });
    });
}

function loadFamilyClean() {
  childFamily(selectActual);
}
function loadFamily(id) {
  childFamily(id);
}

function family(id) {
  const highlightColor = "#ffaa02";

  viewer.setStyle(
    {},
    {
      sphere: { color: "#eae8e8" },
      stick: { color: "#eae8e8", showNonBonded: false },
    }
  );

  viewer.setStyle(
    { serial: id },
    {
      sphere: { color: highlightColor },
      stick: { color: highlightColor, showNonBonded: false },
    }
  );

  for (let index = 0; index < children.length; index++) {
    const element = children[index].number;

    viewer.setStyle(
      { serial: element },
      {
        sphere: { color: highlightColor },
        stick: { color: highlightColor, showNonBonded: false },
      }
    );
  }

  viewer.render();
}

function getAtomBySerial(serial) {
  var atoms = viewer.getModel().selectedAtoms();

  for (var i = 0; i < atoms.length; i++) {
    if (atoms[i].serial === serial) {
      return atoms[i];
    }
  }

  return false; // Si no se encuentra el átomo con el serial especificado
}

function child() {
  // console.log("zoomLevel", zoomLevel);

  console.log("localStorage.getItem :", localStorage.getItem("uploadFileId"));
  axios
    .get(
      `/business-gestion/uploaded-files/${localStorage.getItem(
        "uploadFileId"
      )}/allele-node-by-uploaded-file/`
    )
    .then(function (response) {
      const elemento = response.data;
      let atomData = elemento.results;
      datos = atomData;
      // console.log("datos");
      // console.log(datos);

      atomData.forEach((element) => {
        const stickRadius =
          element.children_qty === 0
            ? 0.2
            : 0.5 + element.children_qty * stickRadiusFactor;
        const sphereRadius = stickRadius * sphereRadiusFactor;

        viewer.setStyle(
          { serial: element.number },
          {
            sphere: { radius: sphereRadius },
            stick: {
              color: "spectrum",
              radius: stickRadius,
              showNonBonded: false,
            },
          }
        );
        // console.log("stickRadius :", stickRadius);
        // console.log("sphereRadius :", sphereRadius);
      });

      viewer.render();
      load.hidden = true;
    })
    .catch(function (error) {
      Toast.fire({
        icon: "error",
        title: `${error.response.data.detail}`,
      });
    });
}

// function childFamily(id) {
//   datos.forEach((element) => {
//     const stickRadius =
//       element.children_qty === 0
//         ? 0.2
//         : 0.5 + element.children_qty * stickRadiusFactor;
//     const sphereRadius = stickRadius * sphereRadiusFactor * zoomLevel;

//     if (
//       children.some((item) => item.number === element.number) ||
//       element.number === id
//     ) {
//       viewer.setStyle(
//         { serial: element.number },
//         {
//           sphere: { color: "#FCCA02", radius: sphereRadius },
//           stick: {
//             color: "#FCCA02",
//             radius: stickRadius,
//             showNonBonded: false,
//           },
//         }
//       );
//     } else {
//       viewer.setStyle(
//         { serial: element.number },
//         {
//           sphere: {
//             color: "#fcfcfc",
//             radius: sphereRadius,
//             hidden: sphere_hidden,
//           },
//           stick: {
//             color: "#fcfcfc",
//             radius: stickRadius,
//             showNonBonded: false,
//             hidden: stick_hidden,
//           },
//         }
//       );
//     }
//   });
//   viewer.render();
// }

function childFamily(id) {
  datos.forEach((element) => {
    const stickRadius =
      element.children_qty === 0
        ? 0.2
        : 0.5 + element.children_qty * stickRadiusFactor;
    const sphereRadius = stickRadius * sphereRadiusFactor * zoomLevel;

    if (
      children.some((item) => item.number === element.number) ||
      element.number === id
    ) {
      // viewer.setStyle(
      //   { serial: element.number },
      //   {
      //     sphere: { color: "#FCCA02", radius: sphereRadius },
      //     stick: {
      //       color: "#FCCA02",
      //       radius: stickRadius,
      //       showNonBonded: false,
      //     },
      //   }
      // );
    } else {
      viewer.setStyle(
        { serial: element.number },
        {
          sphere: {
            color: "#fcfcfc",
            radius: sphereRadius,
            hidden: true, // Ocultar esfera
          },
          stick: {
            color: "#fcfcfc",
            radius: stickRadius,
            showNonBonded: false,
            hidden: true, // Ocultar stick
          },
        }
      );
    }
  });
  viewer.render();
}

function childZoom() {
  datos.forEach((element) => {
    const stickRadius =
      element.children_qty === 0
        ? 0.2
        : 0.5 + element.children_qty * stickRadiusFactor;
    const sphereRadius = stickRadius * sphereRadiusFactor * zoomLevel;
    viewer.setStyle(
      { serial: element.number },
      {
        sphere: { radius: sphereRadius },
        stick: { color: "spectrum", radius: stickRadius, showNonBonded: false },
      }
    );
    // console.log("stickRadius :", stickRadius);
    // console.log("sphereRadius :", sphereRadius);
  });

  // console.log("zoomLevel :", zoomLevel);
  viewer.render();
  load.hidden = true;
}

var zoom = document.getElementById("customRange1");
zoom.addEventListener("input", function () {
  let load = document.getElementById("load");
  zoomLevel = zoom.value;
  childZoom();
});
// displaySNPModal

snpModalShowBotton.addEventListener("click", function () {
  displaySNPData();
});

var addchangessnp = document.getElementById("addchangessnp");
addchangessnp.addEventListener("click", function () {
  sendRSControlValues();
});

function loadOriginalXYZ() {
  axios
    .get(
      "/business-gestion/xyz-expansion/" + localStorage.getItem("uploadFileId")
    )
    .then(function (response) {
      currX.innerText = response.data.x_value;
      currY.innerText = response.data.y_value;
      currZ.innerText = response.data.z_value;
      myRangeX.value = response.data.x_value;
      myRangeY.value = response.data.y_value;
      myRangeZ.value = response.data.z_value;
    });
}

var expandAplicate = document.getElementById("ExpandAplicateButton");
expandAplicate.addEventListener("click", function () {
  sendExpantionValues();
});

var currX = document.getElementById("currX");
var myRangeX = document.getElementById("myRangeX");
var currY = document.getElementById("currY");
var myRangeY = document.getElementById("myRangeY");
var currZ = document.getElementById("currZ");
var myRangeZ = document.getElementById("myRangeZ");

myRangeX.addEventListener("change", () => {
  currX.innerText = myRangeX.valueAsNumber;
});
myRangeY.addEventListener("change", () => {
  currY.innerText = myRangeY.valueAsNumber;
});
myRangeZ.addEventListener("change", () => {
  currZ.innerText = myRangeZ.valueAsNumber;
});

function sendExpantionValues() {
  var fileId = localStorage.getItem("uploadFileId");

  var data = {
    uploaded_file: fileId,
    x_value: myRangeX.valueAsNumber,
    y_value: myRangeY.valueAsNumber,
    z_value: myRangeZ.valueAsNumber,
  };

  console.log(data);
  load.hidden = false;
  $("#modal-xyz").modal("hide");
  axios.defaults.headers.common["X-CSRFToken"] = csrfToken;
  console.log("token", csrfToken);
  axios
    .post("/business-gestion/xyz-expansion/", data)
    .then(function (response) {
      console.log("mi data:", response.data.file);
      graficar(response.data.file);
      load.hidden = true;
    })
    .catch(function (error) {
      load.hidden = true;
      // Toast.fire({
      //     icon: 'error',
      //     title: `${error.response.data.detail}`
      // })
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: `${error.response.data.detail}`,
        footer:
          '<a class="nav-link" href="./login" role="button">Go to the login page</a>',
      });
    });
}
