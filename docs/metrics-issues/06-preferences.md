# API: GET/PUT /users/me/preferences/ — Persistencia de preferencias de usuario (opcional)

## Descripción
Permitir persistir preferencias UI (por ejemplo visibilidad de columnas `tasks_table_colvis_v1`) por usuario para sincronizar vista entre dispositivos.

## Endpoints
- `GET /users/me/preferences/?key=tasks_table_colvis_v1`
- `PUT /users/me/preferences/?key=tasks_table_colvis_v1`
  - Body: `{ "value": { "0": true, "1": false, ... } }`

## Criterios de aceptación
- GET devuelve valor almacenado para la clave.
- PUT actualiza el valor (y devuelve el nuevo estado).
- Permisos: solo el usuario propietario puede obtener/actualizar.
- Tests de seguridad y permisos.
