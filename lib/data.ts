import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import type { AuditLog, Employee, Location, Shift } from "@/lib/types";
import { addDays, getWeekStart, safeNumber } from "@/lib/utils";

function mapEmployee(row: Record<string, unknown>): Employee {
  return {
    id: Number(row.id),
    name: String(row.name),
    phone: row.phone ? String(row.phone) : null,
    weekly_hours: safeNumber(row.weekly_hours),
    color: String(row.color),
    notes: row.notes ? String(row.notes) : null,
    worker_token: String(row.worker_token),
    active: Boolean(row.active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapLocation(row: Record<string, unknown>): Location {
  return {
    id: Number(row.id),
    name: String(row.name),
    type: String(row.type),
    street: row.street ? String(row.street) : null,
    city: row.city ? String(row.city) : null,
    postal_code: row.postal_code ? String(row.postal_code) : null,
    latitude: row.latitude == null ? null : safeNumber(row.latitude),
    longitude: row.longitude == null ? null : safeNumber(row.longitude),
    image_url: row.image_url ? String(row.image_url) : null,
    maps_url: row.maps_url ? String(row.maps_url) : null,
    street_view_url: row.street_view_url ? String(row.street_view_url) : null,
    default_hours: safeNumber(row.default_hours, 2),
    default_start_time: String(row.default_start_time ?? "08:00").slice(0, 5),
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapShift(row: Record<string, unknown>): Shift {
  return {
    id: Number(row.id),
    employee_id: Number(row.employee_id),
    location_id: Number(row.location_id),
    shift_date: String(row.shift_date).slice(0, 10),
    start_time: String(row.start_time).slice(0, 5),
    end_time: String(row.end_time).slice(0, 5),
    hours: safeNumber(row.hours),
    kind: String(row.kind),
    notes: row.notes ? String(row.notes) : null,
    employee_name: String(row.employee_name),
    employee_color: String(row.employee_color),
    weekly_hours: safeNumber(row.weekly_hours),
    location_name: String(row.location_name),
    location_type: String(row.location_type),
    location_street: row.location_street ? String(row.location_street) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapAudit(row: Record<string, unknown>): AuditLog {
  return {
    id: Number(row.id),
    entity_type: String(row.entity_type),
    entity_id: row.entity_id == null ? null : Number(row.entity_id),
    action: String(row.action),
    description: String(row.description),
    created_at: String(row.created_at)
  };
}

export async function getEmployees() {
  if (!hasDatabase || !sql) {
    return [] as Employee[];
  }

  await ensureSchema();
  const rows = await sql`SELECT * FROM employees ORDER BY active DESC, name ASC`;
  return rows.map((row) => mapEmployee(row as Record<string, unknown>));
}

export async function getLocations() {
  if (!hasDatabase || !sql) {
    return [] as Location[];
  }

  await ensureSchema();
  const rows = await sql`SELECT * FROM locations ORDER BY name ASC`;
  return rows.map((row) => mapLocation(row as Record<string, unknown>));
}

export async function getWeekShifts(weekStartInput?: string) {
  if (!hasDatabase || !sql) {
    return [] as Shift[];
  }

  await ensureSchema();
  const weekStart = getWeekStart(weekStartInput);
  const weekEnd = addDays(weekStart, 6);
  const rows = await sql`
    SELECT
      shifts.*,
      employees.name AS employee_name,
      employees.color AS employee_color,
      employees.weekly_hours,
      locations.name AS location_name,
      locations.type AS location_type,
      locations.street AS location_street
    FROM shifts
    INNER JOIN employees ON employees.id = shifts.employee_id
    INNER JOIN locations ON locations.id = shifts.location_id
    WHERE shifts.shift_date BETWEEN ${weekStart} AND ${weekEnd}
    ORDER BY shifts.shift_date ASC, shifts.start_time ASC
  `;

  return rows.map((row) => mapShift(row as Record<string, unknown>));
}

export async function getWorkerSchedule(token: string, weekStartInput?: string) {
  if (!hasDatabase || !sql) {
    return { employee: null as Employee | null, shifts: [] as Shift[] };
  }

  await ensureSchema();
  const employeeRows = await sql`SELECT * FROM employees WHERE worker_token = ${token} LIMIT 1`;
  const employee = employeeRows[0] ? mapEmployee(employeeRows[0] as Record<string, unknown>) : null;

  if (!employee) {
    return { employee: null, shifts: [] as Shift[] };
  }

  const shifts = await getWeekShifts(weekStartInput);
  return {
    employee,
    shifts: shifts.filter((shift) => shift.employee_id === employee.id)
  };
}

export async function getAuditLogs(limit = 8) {
  if (!hasDatabase || !sql) {
    return [] as AuditLog[];
  }

  await ensureSchema();
  const rows = await sql`
    SELECT * FROM audit_logs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => mapAudit(row as Record<string, unknown>));
}
