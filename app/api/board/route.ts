import { NextRequest, NextResponse } from "next/server";

import { ensureSchema, hasDatabase, recordAudit, sql } from "@/lib/db";
import { addHoursToTime, calculateHours, safeNumber } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getShiftRow(shiftId: number) {
  if (!sql) {
    return null;
  }

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
    WHERE shifts.id = ${shiftId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function POST(request: NextRequest) {
  if (!hasDatabase || !sql) {
    return NextResponse.json({ error: "Falta configurar DATABASE_URL." }, { status: 500 });
  }

  await ensureSchema();
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action ?? "");

  if (action === "assign") {
    const employeeId = Number(body.employee_id);
    const locationId = Number(body.location_id);
    const shiftDate = String(body.shift_date ?? "");

    if (!employeeId || !locationId || !shiftDate) {
      return NextResponse.json({ error: "Faltan datos para asignar." }, { status: 400 });
    }

    const existing = await sql`
      SELECT id FROM shifts
      WHERE location_id = ${locationId} AND shift_date = ${shiftDate}
      LIMIT 1
    `;

    if (existing[0]) {
      return NextResponse.json({ error: "Esa portería ya está asignada para ese día." }, { status: 409 });
    }

    const locationRows = await sql`
      SELECT name, default_hours, default_start_time
      FROM locations
      WHERE id = ${locationId}
      LIMIT 1
    `;

    const employeeRows = await sql`
      SELECT name
      FROM employees
      WHERE id = ${employeeId}
      LIMIT 1
    `;

    const defaultHours = safeNumber(locationRows[0]?.default_hours, 2);
    const defaultStartTime = String(locationRows[0]?.default_start_time ?? "08:00").slice(0, 5) || "08:00";
    const inserted = await sql`
      INSERT INTO shifts (employee_id, location_id, shift_date, start_time, end_time, hours, kind, notes)
      VALUES (
        ${employeeId},
        ${locationId},
        ${shiftDate},
        ${defaultStartTime},
        ${addHoursToTime(defaultStartTime, defaultHours)},
        ${defaultHours},
        ${"Servicio"},
        ${null}
      )
      RETURNING id
    `;

    const shiftId = Number(inserted[0].id);
    await recordAudit("Cuadrante", shiftId, "asignado", `${locationRows[0]?.name ?? "Portería"} -> ${employeeRows[0]?.name ?? "Trabajador"} · ${shiftDate}`);

    const assignment = await getShiftRow(shiftId);
    return NextResponse.json({ assignment });
  }

  if (action === "move") {
    const shiftId = Number(body.shift_id);
    const employeeId = Number(body.employee_id);

    if (!shiftId || !employeeId) {
      return NextResponse.json({ error: "Faltan datos para mover la asignación." }, { status: 400 });
    }

    await sql`UPDATE shifts SET employee_id = ${employeeId}, updated_at = NOW() WHERE id = ${shiftId}`;
    const assignment = await getShiftRow(shiftId);
    await recordAudit("Cuadrante", shiftId, "movido", `${assignment?.location_name ?? "Portería"} -> ${assignment?.employee_name ?? "Trabajador"}`);
    return NextResponse.json({ assignment });
  }

  if (action === "unassign") {
    const shiftId = Number(body.shift_id);

    if (!shiftId) {
      return NextResponse.json({ error: "Falta la asignación a liberar." }, { status: 400 });
    }

    const assignment = await getShiftRow(shiftId);
    await sql`DELETE FROM shifts WHERE id = ${shiftId}`;
    await recordAudit("Cuadrante", shiftId, "desasignado", `${assignment?.location_name ?? "Portería"} liberada`);
    return NextResponse.json({ removedId: shiftId });
  }

  if (action === "update") {
    const shiftId = Number(body.shift_id);
    const startTime = String(body.start_time ?? "");
    const endTime = String(body.end_time ?? "");
    const hours = safeNumber(body.hours, calculateHours(startTime, endTime));
    const kind = String(body.kind ?? "Servicio").trim() || "Servicio";
    const notes = String(body.notes ?? "").trim() || null;

    if (!shiftId || !startTime || !endTime) {
      return NextResponse.json({ error: "Faltan datos para actualizar el detalle." }, { status: 400 });
    }

    await sql`
      UPDATE shifts
      SET start_time = ${startTime}, end_time = ${endTime}, hours = ${hours}, kind = ${kind}, notes = ${notes}, updated_at = NOW()
      WHERE id = ${shiftId}
    `;

    const assignment = await getShiftRow(shiftId);
    await recordAudit("Cuadrante", shiftId, "editado", `${assignment?.location_name ?? "Portería"} · ${startTime}-${endTime}`);
    return NextResponse.json({ assignment });
  }

  return NextResponse.json({ error: "Acción no soportada." }, { status: 400 });
}
