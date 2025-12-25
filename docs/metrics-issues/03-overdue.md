# API: GET /business-gestion/task/metrics/overdue/ — Tareas atrasadas

## Descripción
Lista tareas cuya `end_date` < `now`, ordenadas por antigüedad. Paginado.

## Endpoint
`GET /business-gestion/task/metrics/overdue/`

## Query params
- `limit` (int, default=10)
- `page` (int, opcional)

## Respuesta (200)
```json
{
  "count": 8,
  "results": [
    { "id": 3, "task_name": "T2", "end_date":"2025-12-20T12:00:00Z", "days_overdue":5 }
  ]
}
```

## Criterios de aceptación
- Devuelve solo tareas con `end_date` anterior a `now`.
- `days_overdue` correcto.
- Paginación y orden funcionan.
- Tests para casos borde.
