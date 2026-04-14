"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AutoRefresh } from "@/components/auto-refresh";
import { PrintButton } from "@/components/print-button";
import type { AuditLog, Employee, Location, Shift } from "@/lib/types";
import { addDays, addressLabel, formatDayLabel, formatHours, formatWeekRange, weekDates } from "@/lib/utils";

type Props = {
  initialEmployees: Employee[];
  initialLocations: Location[];
  initialShifts: Shift[];
  audit: AuditLog[];
  weekStart: string;
  selectedDate: string;
  databaseReady: boolean;
};

type DragPayload =
  | { kind: "location"; locationId: number }
  | { kind: "assignment"; assignmentId: number };

type AssignmentEditor = {
  shift_id: number;
  start_time: string;
  end_time: string;
  hours: string;
  kind: string;
  notes: string;
};

export function QuadrantBoard({
  initialEmployees,
  initialLocations,
  initialShifts,
  audit,
  weekStart,
  selectedDate,
  databaseReady
}: Props) {
  const router = useRouter();
  const [shifts, setShifts] = useState(initialShifts);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [editor, setEditor] = useState<AssignmentEditor | null>(null);
  const activeEmployees = initialEmployees.filter((employee) => employee.active);

  useEffect(() => {
    setShifts(initialShifts);
  }, [initialShifts]);

  const dates = weekDates(weekStart);
  const selectedIndex = Math.max(0, dates.indexOf(selectedDate));
  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);
  const previousDay = addDays(previousWeek, selectedIndex);
  const nextDay = addDays(nextWeek, selectedIndex);

  const shiftsForDay = useMemo(
    () => shifts.filter((shift) => shift.shift_date === selectedDate),
    [selectedDate, shifts]
  );

  const selectedAssignment = shifts.find((shift) => shift.id === selectedShiftId) ?? null;

  useEffect(() => {
    if (!selectedAssignment) {
      setEditor(null);
      return;
    }

    setEditor({
      shift_id: selectedAssignment.id,
      start_time: selectedAssignment.start_time,
      end_time: selectedAssignment.end_time,
      hours: String(selectedAssignment.hours),
      kind: selectedAssignment.kind,
      notes: selectedAssignment.notes ?? ""
    });
  }, [selectedAssignment]);

  const assignedLocationIds = new Set(shiftsForDay.map((shift) => shift.location_id));
  const unassignedLocations = initialLocations.filter((location) => !assignedLocationIds.has(location.id));

  const weeklyTotals = new Map<number, number>();
  for (const shift of shifts) {
    weeklyTotals.set(shift.employee_id, (weeklyTotals.get(shift.employee_id) ?? 0) + shift.hours);
  }

  function saveDragPayload(event: React.DragEvent, payload: DragPayload) {
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "move";
  }

  function readDragPayload(event: React.DragEvent) {
    try {
      const raw = event.dataTransfer.getData("application/json");
      return raw ? (JSON.parse(raw) as DragPayload) : null;
    } catch {
      return null;
    }
  }

  async function sendAction(payload: Record<string, unknown>) {
    setBusy(true);
    setStatus("");

    try {
      const response = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { error?: string; assignment?: Shift; removedId?: number };
      if (!response.ok) {
        throw new Error(data.error ?? "No se ha podido guardar el cambio.");
      }

      if (data.assignment) {
        setShifts((current) => {
          const next = current.filter((shift) => shift.id !== data.assignment!.id);
          next.push(data.assignment!);
          return next;
        });
        setSelectedShiftId(data.assignment.id);
      }

      if (data.removedId) {
        setShifts((current) => current.filter((shift) => shift.id !== data.removedId));
        if (selectedShiftId === data.removedId) {
          setSelectedShiftId(null);
        }
      }

      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se ha podido guardar el cambio.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDropOnEmployee(employeeId: number, payload: DragPayload | null) {
    if (!databaseReady || !payload) {
      return;
    }

    if (payload.kind === "location") {
      if (assignedLocationIds.has(payload.locationId)) {
        setStatus("Esa portería ya está asignada hoy.");
        return;
      }

      await sendAction({
        action: "assign",
        employee_id: employeeId,
        location_id: payload.locationId,
        shift_date: selectedDate
      });
      return;
    }

    await sendAction({
      action: "move",
      shift_id: payload.assignmentId,
      employee_id: employeeId
    });
  }

  async function handleDropToPool(payload: DragPayload | null) {
    if (!databaseReady || !payload || payload.kind !== "assignment") {
      return;
    }

    await sendAction({ action: "unassign", shift_id: payload.assignmentId });
  }

  async function handleSaveEditor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) {
      return;
    }

    await sendAction({
      action: "update",
      shift_id: editor.shift_id,
      start_time: editor.start_time,
      end_time: editor.end_time,
      hours: Number(editor.hours),
      kind: editor.kind,
      notes: editor.notes
    });
  }

  return (
    <div className="page-stack">
      <AutoRefresh intervalMs={5000} />

      <section className="board-hero">
        <div>
          <p className="eyebrow">Cuadrante semanal</p>
          <h1>Arrastra cada portería al trabajador adecuado</h1>
          <p className="hero-copy">
            Pantalla directa al cuadrante, sin pasos intermedios. Lo libre queda a la izquierda y lo
            asignado desaparece del listado para evitar duplicados ese mismo día.
          </p>
        </div>
        <div className="hero-actions no-print">
          <Link className="button button-secondary" href={`/schedule?week=${previousWeek}&day=${previousDay}`}>
            Semana anterior
          </Link>
          <Link className="button button-secondary" href={`/schedule?week=${nextWeek}&day=${nextDay}`}>
            Semana siguiente
          </Link>
          <PrintButton />
        </div>
      </section>

      <section className="board-toolbar">
        <div>
          <p className="eyebrow">Semana activa</p>
          <strong>{formatWeekRange(weekStart)}</strong>
        </div>

        <div className="day-tabs no-print">
          {dates.map((date) => (
            <Link key={date} className={date === selectedDate ? "day-tab active" : "day-tab"} href={`/schedule?week=${weekStart}&day=${date}`}>
              <span>{formatDayLabel(date)}</span>
              <strong>{date.slice(8, 10)}</strong>
            </Link>
          ))}
        </div>
      </section>

      {status ? <p className="inline-status">{status}</p> : null}

      <section className="board-layout">
        <aside className="pool-panel no-print" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
          event.preventDefault();
          void handleDropToPool(readDragPayload(event));
        }}>
          <div className="pool-header">
            <div>
              <p className="eyebrow">Sin asignar</p>
              <h2>{unassignedLocations.length} libres</h2>
            </div>
            <span className="helper-pill">Suelta aquí para liberar</span>
          </div>

          <div className="pool-list">
            {unassignedLocations.length === 0 ? (
              <p className="empty-state">Todo asignado para este día.</p>
            ) : (
              unassignedLocations.map((location) => (
                <article className="location-pill" draggable={databaseReady} key={location.id} onDragStart={(event) => saveDragPayload(event, { kind: "location", locationId: location.id })}>
                  <div>
                    <strong>{location.name}</strong>
                    <p>{addressLabel(location) || location.type}</p>
                  </div>
                  <span>
                    {location.default_start_time} · {formatHours(location.default_hours)} h
                  </span>
                </article>
              ))
            )}
          </div>
        </aside>

        <div className="lanes-panel">
          <div className="lane-list">
            {activeEmployees.map((employee) => {
              const employeeAssignments = shiftsForDay.filter((shift) => shift.employee_id === employee.id);
              return (
                <section className="worker-lane" key={employee.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                  event.preventDefault();
                  void handleDropOnEmployee(employee.id, readDragPayload(event));
                }}>
                  <header className="worker-lane-header">
                    <div>
                      <h2>{employee.name}</h2>
                      <p>
                        Semana: {formatHours(weeklyTotals.get(employee.id) ?? 0)} / {formatHours(employee.weekly_hours)} h
                      </p>
                    </div>
                    <span className="worker-color" style={{ background: employee.color }} />
                  </header>

                  <div className="assignment-stack">
                    {employeeAssignments.length === 0 ? (
                      <div className="assignment-empty">Suelta una portería aquí</div>
                    ) : (
                      employeeAssignments.map((shift) => (
                        <article className={selectedShiftId === shift.id ? "assignment-card active" : "assignment-card"} draggable={databaseReady} key={shift.id} onClick={() => setSelectedShiftId(shift.id)} onDragStart={(event) => saveDragPayload(event, { kind: "assignment", assignmentId: shift.id })}>
                          <div className="assignment-top">
                            <strong>{shift.location_name}</strong>
                            <button className="icon-button no-print" type="button" onClick={(event) => {
                              event.stopPropagation();
                              void sendAction({ action: "unassign", shift_id: shift.id });
                            }}>
                              x
                            </button>
                          </div>
                          <p>
                            {shift.start_time} - {shift.end_time} · {formatHours(shift.hours)} h
                          </p>
                          <p>{shift.kind}</p>
                        </article>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <aside className="details-panel">
          <div className="pool-header">
            <div>
              <p className="eyebrow">Detalle</p>
              <h2>{selectedAssignment ? selectedAssignment.location_name : "Selecciona una asignación"}</h2>
            </div>
          </div>

          {!selectedAssignment || !editor ? (
            <p className="empty-state">Haz clic en una asignación para editar horario y observaciones.</p>
          ) : (
            <form className="form-grid details-form" onSubmit={handleSaveEditor}>
              <label className="span-2">
                Trabajador
                <input disabled value={selectedAssignment.employee_name} />
              </label>

              <label>
                Inicio
                <input disabled={busy} type="time" value={editor.start_time} onChange={(event) => setEditor((current) => current ? { ...current, start_time: event.target.value } : current)} />
              </label>

              <label>
                Fin
                <input disabled={busy} type="time" value={editor.end_time} onChange={(event) => setEditor((current) => current ? { ...current, end_time: event.target.value } : current)} />
              </label>

              <label>
                Horas
                <input disabled={busy} min="0" step="0.5" type="number" value={editor.hours} onChange={(event) => setEditor((current) => current ? { ...current, hours: event.target.value } : current)} />
              </label>

              <label>
                Servicio
                <input disabled={busy} value={editor.kind} onChange={(event) => setEditor((current) => current ? { ...current, kind: event.target.value } : current)} />
              </label>

              <label className="span-2">
                Observaciones
                <textarea disabled={busy} rows={5} value={editor.notes} onChange={(event) => setEditor((current) => current ? { ...current, notes: event.target.value } : current)} />
              </label>

              <div className="form-actions span-2">
                <button className="button" disabled={busy || !databaseReady} type="submit">
                  Guardar detalle
                </button>
              </div>
            </form>
          )}

          <div className="audit-stream">
            <div className="pool-header">
              <div>
                <p className="eyebrow">Actividad</p>
                <h2>Cambios recientes</h2>
              </div>
            </div>
            <div className="list">
              {audit.map((entry) => (
                <article className="list-card" key={entry.id}>
                  <strong>{entry.description}</strong>
                  <p>{entry.action}</p>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
