# API: GET /business-gestion/task/metrics/upcoming/ — Tareas próximas a vencer

## Descripción
Devuelve tareas cuyo `end_date` esté dentro de `days` desde `now`. Paginado y limitado por defecto (por ejemplo `limit=10`).

## Endpoint
`GET /business-gestion/task/metrics/upcoming/`

## Query params
- `days` (int, default=7)
- `limit` (int, default=10)
- `page` (int, opcional)
- `timezone` (string, opcional)

## Respuesta (200)
```json
{
  "count": 5,
  "results": [
    { "id": 1, "task_name": "T1", "task_code": "T-1", "end_date":"2025-12-28T10:00:00Z", "days_left":3 }
  ]
}
```

## Criterios de aceptación
- Retorna solo tareas con `0 <= days_left <= days`.
- Soporta `limit` y `page`.
- `days_left` calculado con `now` del servidor (UTC).
- Tests de límites y timezone.
