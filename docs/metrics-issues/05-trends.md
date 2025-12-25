# API: GET /business-gestion/task/metrics/trends/ — Series temporales de métricas

## Descripción
Devuelve series temporales (por día/semana/mes) para métricas como tareas **iniciadas**, **completadas** o **creadas** dentro de un rango.

## Endpoint
`GET /business-gestion/task/metrics/trends/`

## Query params
- `start_date` (required)
- `end_date` (required)
- `interval` (day|week|month, default=day)
- `metric` (started|completed|created, default=started)
- `timezone` (optional)

## Respuesta (200)
```json
{
  "labels": ["2025-12-01","2025-12-02", "..."],
  "data": [3, 7, ...]
}
```

## Criterios de aceptación
- Devuelve serie completa (incluye 0s).
- `metric` correctamente interpretado (ej. `started` → cuenta por `start_date` en bucket).
- Tests para intervalos y timezone.
- Considerar materialized view para rangos grandes.
