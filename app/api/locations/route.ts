import { NextRequest, NextResponse } from "next/server";

import { getLocations } from "@/lib/data";
import { ensureSchema, hasDatabase, recordAudit, sql } from "@/lib/db";
import { addressLabel, buildGoogleMapsLink, buildStreetViewLink, safeNumber } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const locations = await getLocations();
  return NextResponse.json({ locations });
}

export async function POST(request: NextRequest) {
  if (!hasDatabase || !sql) {
    return NextResponse.json({ error: "Falta configurar DATABASE_URL." }, { status: 500 });
  }

  await ensureSchema();
  const body = (await request.json()) as Record<string, unknown>;
  const id = body.id ? Number(body.id) : null;
  const name = String(body.name ?? "").trim();
  const type = String(body.type ?? "Portería");
  const street = String(body.street ?? "").trim() || null;
  const city = String(body.city ?? "").trim() || null;
  const postalCode = String(body.postal_code ?? "").trim() || null;
  const latitude = body.latitude == null || body.latitude === "" ? null : safeNumber(body.latitude);
  const longitude = body.longitude == null || body.longitude === "" ? null : safeNumber(body.longitude);
  const imageUrl = String(body.image_url ?? "").trim() || null;
  const mapsUrl = String(body.maps_url ?? "").trim() || buildGoogleMapsLink(latitude, longitude) || null;
  const streetViewUrl = String(body.street_view_url ?? "").trim() || buildStreetViewLink(latitude, longitude) || null;
  const defaultHours = safeNumber(body.default_hours, 2);
  const defaultStartTime = String(body.default_start_time ?? "08:00").slice(0, 5) || "08:00";
  const notes = String(body.notes ?? "").trim() || null;

  if (!name) {
    return NextResponse.json({ error: "El nombre de la portería es obligatorio." }, { status: 400 });
  }

  if (id) {
    await sql`
      UPDATE locations
      SET
        name = ${name},
        type = ${type},
        street = ${street},
        city = ${city},
        postal_code = ${postalCode},
        latitude = ${latitude},
        longitude = ${longitude},
        image_url = ${imageUrl},
        maps_url = ${mapsUrl},
        street_view_url = ${streetViewUrl},
        default_hours = ${defaultHours},
        default_start_time = ${defaultStartTime},
        notes = ${notes},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    await recordAudit("Ubicación", id, "actualizada", `${name} · ${addressLabel({ street, city, postal_code: postalCode }) || "sin dirección"}`);
    return NextResponse.json({ ok: true });
  }

  const inserted = await sql`
    INSERT INTO locations (
      name, type, street, city, postal_code, latitude, longitude, image_url, maps_url, street_view_url,
      default_hours, default_start_time, notes
    )
    VALUES (
      ${name}, ${type}, ${street}, ${city}, ${postalCode}, ${latitude}, ${longitude}, ${imageUrl}, ${mapsUrl}, ${streetViewUrl},
      ${defaultHours}, ${defaultStartTime}, ${notes}
    )
    RETURNING id
  `;

  await recordAudit("Ubicación", Number(inserted[0].id), "creada", `${name} · ${addressLabel({ street, city, postal_code: postalCode }) || "sin dirección"}`);
  return NextResponse.json({ ok: true });
}
