window.onload = function () {
  console.log("✌️internal_status --->", localStorage.getItem("user"));
  
    // esta función llama a un endpoint para desloguear al usuario o a cualquier otro antes de un nuevo login
    axios
      .get("../user-gestion/users/logout/")
      .then(function (res) {
console.log('✌️function --->', );
       
      })
      .catch();
  
  clearLocalStorageItems()
};

function clearLocalStorageItems() {
  const items = [
    "internal_status",
    "user",
    "avatar",
    "code",
    "password",
    "email",
    "id",
  ];

  items.forEach((item) => {
    if (localStorage.getItem(item) !== null) {
      localStorage.setItem(item, null);
      console.log(`${item} se ha establecido en null.`);
    } else {
      console.log(`${item} no existe en localStorage.`);
    }
  });
}

// Llamar a la función para limpiar los elementos
clearLocalStorageItems();
