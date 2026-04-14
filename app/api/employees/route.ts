import { randomUUID } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { getEmployees } from "@/lib/data";
import { ensureSchema, hasDatabase, recordAudit, sql } from "@/lib/db";
import { safeNumber } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const employees = await getEmployees();
  return NextResponse.json({ employees });
}

export async function POST(request: NextRequest) {
  if (!hasDatabase || !sql) {
    return NextResponse.json({ error: "Falta configurar DATABASE_URL." }, { status: 500 });
  }

  await ensureSchema();
  const body = (await request.json()) as Record<string, unknown>;
  const id = body.id ? Number(body.id) : null;
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim() || null;
  const weeklyHours = safeNumber(body.weekly_hours, 0);
  const color = String(body.color ?? "#21544b");
  const notes = String(body.notes ?? "").trim() || null;
  const active = Boolean(body.active);

  if (!name) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  if (id) {
    await sql`
      UPDATE employees
      SET
        name = ${name},
        phone = ${phone},
        weekly_hours = ${weeklyHours},
        color = ${color},
        notes = ${notes},
        active = ${active},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    await recordAudit("Trabajador", id, "actualizado", `${name} · ${weeklyHours} h/semana`);
    return NextResponse.json({ ok: true });
  }

  const workerToken = randomUUID().replaceAll("-", "");
  const inserted = await sql`
    INSERT INTO employees (name, phone, weekly_hours, color, notes, active, worker_token)
    VALUES (${name}, ${phone}, ${weeklyHours}, ${color}, ${notes}, ${active}, ${workerToken})
    RETURNING id
  `;

  await recordAudit("Trabajador", Number(inserted[0].id), "creado", `${name} · ${weeklyHours} h/semana`);
  return NextResponse.json({ ok: true });
}
