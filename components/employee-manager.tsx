"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Employee } from "@/lib/types";
import { formatHours } from "@/lib/utils";

type Props = {
  initialEmployees: Employee[];
  databaseReady: boolean;
};

type EmployeeForm = {
  id: string;
  name: string;
  phone: string;
  weekly_hours: string;
  color: string;
  notes: string;
  active: boolean;
};

const EMPTY_FORM: EmployeeForm = {
  id: "",
  name: "",
  phone: "",
  weekly_hours: "40",
  color: "#21544b",
  notes: "",
  active: true
};

function toForm(employee?: Employee): EmployeeForm {
  if (!employee) {
    return EMPTY_FORM;
  }

  return {
    id: String(employee.id),
    name: employee.name,
    phone: employee.phone ?? "",
    weekly_hours: String(employee.weekly_hours),
    color: employee.color,
    notes: employee.notes ?? "",
    active: employee.active
  };
}

export function EmployeeManager({ initialEmployees, databaseReady }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          weekly_hours: Number(form.weekly_hours)
        })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "No se ha podido guardar el trabajador.");
      }

      setForm(EMPTY_FORM);
      setMessage("Trabajador guardado.");
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se ha podido guardar el trabajador.");
    }
  }

  async function copyPortal(token: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/worker/${token}`);
    setMessage("Enlace del trabajador copiado.");
  }

  return (
    <section className="content-grid">
      <article className="panel no-print">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Equipo</p>
            <h2>{form.id ? "Editar trabajador" : "Nuevo trabajador"}</h2>
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
            Teléfono
            <input disabled={!databaseReady || isPending} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </label>

          <label>
            Horas semanales
            <input disabled={!databaseReady || isPending} min="0" required step="0.5" type="number" value={form.weekly_hours} onChange={(event) => setForm((current) => ({ ...current, weekly_hours: event.target.value }))} />
          </label>

          <label>
            Color
            <input className="color-input" disabled={!databaseReady || isPending} type="color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} />
          </label>

          <label className="span-2">
            Observaciones
            <textarea disabled={!databaseReady || isPending} rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </label>

          <label className="checkbox-field span-2">
            <input checked={form.active} disabled={!databaseReady || isPending} type="checkbox" onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
            Activo en el cuadrante
          </label>

          <div className="form-actions span-2">
            <button className="button" disabled={!databaseReady || isPending} type="submit">
              Guardar
            </button>
            {message ? <p className="form-message">{message}</p> : null}
          </div>
        </form>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Listado</p>
            <h2>{initialEmployees.length} trabajadores</h2>
          </div>
        </div>

        <div className="cards-grid">
          {initialEmployees.length === 0 ? (
            <p className="empty-state">Añade trabajadores para empezar a repartir porterías.</p>
          ) : (
            initialEmployees.map((employee) => (
              <article className="resource-card" key={employee.id}>
                <div className="resource-card-top">
                  <span className="chip">{employee.active ? "Activo" : "Inactivo"}</span>
                  <span>{formatHours(employee.weekly_hours)} h</span>
                </div>
                <h3>{employee.name}</h3>
                <p>{employee.phone ?? "Sin teléfono"}</p>
                {employee.notes ? <p>{employee.notes}</p> : null}
                <div className="resource-actions no-print">
                  <button className="text-button" type="button" onClick={() => setForm(toForm(employee))}>
                    Editar
                  </button>
                  <a className="text-button" href={`/worker/${employee.worker_token}`} rel="noreferrer" target="_blank">
                    Portal
                  </a>
                  <button className="text-button" type="button" onClick={() => copyPortal(employee.worker_token)}>
                    Copiar enlace
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
