import { NextRequest, NextResponse } from "next/server";

import { buildGoogleMapsLink, buildStreetViewLink } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Indica una dirección para buscar." }, { status: 400 });
  }

  const endpoint = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        "Accept-Language": "es",
        "User-Agent": "cuadrante-minimal/1.0"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json({ error: "El servicio de mapas no respondió correctamente." }, { status: 502 });
    }

    const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!results[0]) {
      return NextResponse.json({ error: "No se ha encontrado ninguna coincidencia." }, { status: 404 });
    }

    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);

    return NextResponse.json({
      latitude,
      longitude,
      display_name: results[0].display_name,
      maps_url: buildGoogleMapsLink(latitude, longitude),
      street_view_url: buildStreetViewLink(latitude, longitude)
    });
  } catch {
    return NextResponse.json({ error: "No se ha podido consultar el servicio de mapas." }, { status: 500 });
  }
}
