# Cuadrante Minimal

Aplicación Next.js pensada para empresas de limpieza que quieren entrar directamente al cuadrante semanal.

## Qué incluye

- Pantalla inicial directa al cuadrante
- Asignación drag-and-drop de porterías a trabajadores
- Bloqueo automático para que una portería no se pueda asignar dos veces el mismo día
- Edición rápida de horario, horas y observaciones
- Portal individual de trabajador con refresco automático
- Impresión A4 apaisada
- PostgreSQL mediante `DATABASE_URL`

## Despliegue en Vercel

1. Sube el proyecto a GitHub.
2. Importa el repositorio en Vercel.
3. Añade `DATABASE_URL` en `Settings -> Environment Variables`.
4. Haz deploy.

## Variables de entorno

```bash
DATABASE_URL="postgres://usuario:password@host:5432/base_de_datos"
```

## Desarrollo local

```bash
npm install
npm run dev
```

## Estructura

- `app/schedule`: tablero principal
- `app/employees`: gestión de trabajadores
- `app/locations`: gestión de porterías
- `app/api/board`: asignaciones drag-and-drop
- `lib/db.ts`: esquema y conexión PostgreSQL

## Nota

La actualización en vivo entre usuarios se resuelve con refresco automático cada pocos segundos y actualización inmediata local al arrastrar. Si luego quieres tiempo real total con sockets, se puede montar encima de esta base.
