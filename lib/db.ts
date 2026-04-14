import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

declare global {
  var __quadrantSql: ReturnType<typeof postgres> | undefined;
  var __quadrantSchemaReady: Promise<void> | undefined;
}

export const hasDatabase = Boolean(connectionString);

export const sql =
  hasDatabase && connectionString
    ? globalThis.__quadrantSql ??
      postgres(connectionString, {
        max: 1,
        idle_timeout: 20,
        ssl: "require",
        prepare: false
      })
    : null;

if (process.env.NODE_ENV !== "production" && sql) {
  globalThis.__quadrantSql = sql;
}

export async function ensureSchema() {
  if (!sql) {
    return;
  }

  if (!globalThis.__quadrantSchemaReady) {
    globalThis.__quadrantSchemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS employees (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          weekly_hours NUMERIC(6,2) NOT NULL DEFAULT 40,
          color TEXT NOT NULL DEFAULT '#21544b',
          notes TEXT,
          worker_token TEXT NOT NULL UNIQUE,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS locations (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'Portería',
          street TEXT,
          city TEXT,
          postal_code TEXT,
          latitude DOUBLE PRECISION,
          longitude DOUBLE PRECISION,
          image_url TEXT,
          maps_url TEXT,
          street_view_url TEXT,
          default_hours NUMERIC(6,2) NOT NULL DEFAULT 2,
          default_start_time TIME NOT NULL DEFAULT '08:00',
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS shifts (
          id BIGSERIAL PRIMARY KEY,
          employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
          location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
          shift_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          hours NUMERIC(6,2) NOT NULL,
          kind TEXT NOT NULL DEFAULT 'Servicio',
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id BIGSERIAL PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id BIGINT,
          action TEXT NOT NULL,
          description TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS default_hours NUMERIC(6,2) NOT NULL DEFAULT 2`;
      await sql`ALTER TABLE locations ADD COLUMN IF NOT EXISTS default_start_time TIME NOT NULL DEFAULT '08:00'`;
      await sql`CREATE INDEX IF NOT EXISTS shifts_week_idx ON shifts(shift_date)`;
      await sql`CREATE INDEX IF NOT EXISTS shifts_employee_idx ON shifts(employee_id, shift_date)`;
      await sql`CREATE INDEX IF NOT EXISTS shifts_location_date_idx ON shifts(location_id, shift_date)`;
    })();
  }

  await globalThis.__quadrantSchemaReady;
}

export async function recordAudit(entityType: string, entityId: number | null, action: string, description: string) {
  if (!sql) {
    return;
  }

  await ensureSchema();
  await sql`
    INSERT INTO audit_logs (entity_type, entity_id, action, description)
    VALUES (${entityType}, ${entityId}, ${action}, ${description})
  `;
}
