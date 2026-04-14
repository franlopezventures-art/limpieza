"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Location } from "@/lib/types";
import { addressLabel } from "@/lib/utils";

type Props = {
  initialLocations: Location[];
  databaseReady: boolean;
};

type LocationForm = {
  id: string;
  name: string;
  type: string;
  street: string;
  city: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  image_url: string;
  maps_url: string;
  street_view_url: string;
  default_hours: string;
  default_start_time: string;
  notes: string;
};

const EMPTY_FORM: LocationForm = {
  id: "",
  name: "",
  type: "Portería",
  street: "",
  city: "",
  postal_code: "",
  latitude: "",
  longitude: "",
  image_url: "",
  maps_url: "",
  street_view_url: "",
  default_hours: "2",
  default_start_time: "08:00",
  notes: ""
};

function toForm(location?: Location): LocationForm {
  if (!location) {
    return EMPTY_FORM;
  }

  return {
    id: String(location.id),
    name: location.name,
    type: location.type,
    street: location.street ?? "",
    city: location.city ?? "",
    postal_code: location.postal_code ?? "",
    latitude: location.latitude == null ? "" : String(location.latitude),
    longitude: location.longitude == null ? "" : String(location.longitude),
    image_url: location.image_url ?? "",
    maps_url: location.maps_url ?? "",
    street_view_url: location.street_view_url ?? "",
    default_hours: String(location.default_hours),
    default_start_time: location.default_start_time,
    notes: location.notes ?? ""
  };
}

function buildMapEmbed(latitude?: string, longitude?: string) {
  if (!latitude || !longitude) {
    return "";
  }

  return `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${latitude},${longitude}`;
}

export function LocationManager({ initialLocations, databaseReady }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<LocationForm>(EMPTY_FORM);
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isLocating, setIsLocating] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          default_hours: Number(form.default_hours || 2)
        })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se ha podido guardar la portería.");
      }

      setForm(EMPTY_FORM);
      setStatus("Portería guardada.");
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se ha podido guardar la portería.");
    }
  }

  async function locateAddress() {
    const query = [form.street, form.postal_code, form.city].filter(Boolean).join(", ");
    if (!query) {
      setStatus("Escribe primero la dirección.");
      return;
    }

    setIsLocating(true);
    setStatus("Buscando ubicación...");

    try {
      const response = await fetch(`/api/geocode?query=${encodeURIComponent(query)}`);
      const payload = (await response.json()) as {
        error?: string;
        latitude?: number;
        longitude?: number;
        maps_url?: string;
        street_view_url?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se ha encontrado la ubicación.");
      }

      setForm((current) => ({
        ...current,
        latitude: payload.latitude ? String(payload.latitude) : current.latitude,
        longitude: payload.longitude ? String(payload.longitude) : current.longitude,
        maps_url: payload.maps_url ?? current.maps_url,
        street_view_url: payload.street_view_url ?? current.street_view_url
      }));

      setStatus("Ubicación actualizada.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se ha podido localizar la dirección.");
    } finally {
      setIsLocating(false);
    }
  }

  const mapEmbed = buildMapEmbed(form.latitude, form.longitude);

  return (
    <section className="content-grid">
      <article className="panel no-print">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Porterías</p>
            <h2>{form.id ? "Editar portería" : "Nueva portería"}</h2>
          </div>
          {form.id ? (
            <button className="text-button" type="button" onClick={() => setForm(EMPTY_FORM)}>
              Limpiar
            </button>
          ) : null}
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Nombre
            <input disabled={!databaseReady || isPending} required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>

          <label>
            Tipo
            <select disabled={!databaseReady || isPending} value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
              <option value="Portería">Portería</option>
              <option value="Parking">Parking</option>
              <option value="Otro">Otro</option>
            </select>
          </label>

          <label className="span-2">
            Calle y número
            <input disabled={!databaseReady || isPending} value={form.street} onChange={(event) => setForm((current) => ({ ...current, street: event.target.value }))} />
          </label>

          <label>
            Ciudad
            <input disabled={!databaseReady || isPending} value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
          </label>

          <label>
            Código postal
            <input disabled={!databaseReady || isPending} value={form.postal_code} onChange={(event) => setForm((current) => ({ ...current, postal_code: event.target.value }))} />
          </label>

          <label>
            Horas por defecto
            <input disabled={!databaseReady || isPending} min="0" step="0.5" type="number" value={form.default_hours} onChange={(event) => setForm((current) => ({ ...current, default_hours: event.target.value }))} />
          </label>

          <label>
            Hora de inicio
            <input disabled={!databaseReady || isPending} type="time" value={form.default_start_time} onChange={(event) => setForm((current) => ({ ...current, default_start_time: event.target.value }))} />
          </label>

          <label>
            Latitud
            <input disabled={!databaseReady || isPending} value={form.latitude} onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))} />
          </label>

          <label>
            Longitud
            <input disabled={!databaseReady || isPending} value={form.longitude} onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))} />
          </label>

          <label className="span-2">
            URL de imagen
            <input disabled={!databaseReady || isPending} value={form.image_url} onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))} />
          </label>

          <label className="span-2">
            Observaciones
            <textarea disabled={!databaseReady || isPending} rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </label>

          <div className="form-actions span-2">
            <button className="button" disabled={!databaseReady || isPending} type="submit">
              Guardar
            </button>
            <button className="button button-secondary" disabled={!databaseReady || isLocating} onClick={locateAddress} type="button">
              {isLocating ? "Buscando..." : "Localizar"}
            </button>
            {status ? <p className="form-message">{status}</p> : null}
          </div>
        </form>

        {mapEmbed ? (
          <div className="map-preview">
            <iframe src={mapEmbed} title="Mapa" />
          </div>
        ) : null}
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Listado</p>
            <h2>{initialLocations.length} porterías</h2>
          </div>
        </div>

        <div className="cards-grid">
          {initialLocations.length === 0 ? (
            <p className="empty-state">Añade porterías para poder arrastrarlas al cuadrante.</p>
          ) : (
            initialLocations.map((location) => (
              <article className="resource-card" key={location.id}>
                {location.image_url ? <img alt={location.name} className="location-image" src={location.image_url} /> : null}
                <div className="resource-card-top">
                  <span className="chip">{location.type}</span>
                  <span>{location.default_start_time} · {location.default_hours} h</span>
                </div>
                <h3>{location.name}</h3>
                <p>{addressLabel(location) || "Sin dirección"}</p>
                {location.notes ? <p>{location.notes}</p> : null}
                <div className="resource-actions">
                  <button className="text-button no-print" type="button" onClick={() => setForm(toForm(location))}>
                    Editar
                  </button>
                  {location.maps_url ? <a className="text-button" href={location.maps_url} rel="noreferrer" target="_blank">Mapa</a> : null}
                  {location.street_view_url ? <a className="text-button" href={location.street_view_url} rel="noreferrer" target="_blank">Street View</a> : null}
                </div>
              </article>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
