# API: GET /business-gestion/task/metrics/by_status/ — Conteos agrupados por status_code

## Descripción
Devuelve conteos agrupados por `status_code` para alimentar gráficas.

## Endpoint
`GET /business-gestion/task/metrics/by_status/`

## Query params (opcionales)
- `start_date`, `end_date`, `timezone`

## Respuesta (200)
```json
{
  "status_counts": [
    { "status_code": "OPEN", "count": 12 },
    { "status_code": "INPROG", "count": 30 }
  ]
}
```

## Criterios de aceptación
- Incluye todos los `status_code` del filtro.
- Rendimiento apropiado (uso de agregación en DB).
- Tests unitarios.
