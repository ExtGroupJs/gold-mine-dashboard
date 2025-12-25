# API: GET /business-gestion/task/metrics/summary/ — Resumen de métricas de tareas

## Descripción
Endpoint que devuelve los contadores principales para el dashboard: total de tareas, no iniciadas, en progreso, completadas y conteos por `status_code`. Evita tener que descargar todas las tareas desde el frontend.

## Endpoint
`GET /business-gestion/task/metrics/summary/`

## Query params (opcionales)
- `start_date` (YYYY-MM-DD o ISO) — filtro por fecha inicio mínima
- `end_date` (YYYY-MM-DD o ISO) — filtro por fecha fin máxima
- `timezone` (ej. `UTC`, `America/Bogota`) — opcional para interpretar límites

## Respuesta (200)
```json
{
  "total": 123,
  "not_started": 12,
  "in_progress": 34,
  "completed": 77,
  "status_counts": { "OPEN": 10, "INPROG": 20, "DONE": 93 }
}
```

## Criterios de aceptación
- Devuelve `total`, `not_started`, `in_progress`, `completed`.
- `status_counts` contiene conteos por `status_code`.
- Acepta filtros `start_date`/`end_date`.
- Tiempo de respuesta razonable (<300ms en dataset esperado).
- Tests unitarios cubren límites de fecha.

## Notas técnicas
- Indexar `start_date`, `end_date`, `status_code`.
- Responder con fechas en ISO (UTC) si aplica.
- Retornar 400 para parámetros inválidos.
