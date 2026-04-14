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
  | { kind: "location"; locationId: number; shiftDate: string }
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
  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const shiftsByEmployeeDay = useMemo(() => {
    const bucket = new Map<string, Shift[]>();

    for (const shift of shifts) {
      const key = `${shift.employee_id}-${shift.shift_date}`;
      const current = bucket.get(key) ?? [];
      current.push(shift);
      bucket.set(key, current);
    }

    for (const [key, value] of bucket.entries()) {
      bucket.set(
        key,
        value.sort((left, right) => {
          const timeCompare = left.start_time.localeCompare(right.start_time);
          if (timeCompare !== 0) {
            return timeCompare;
          }

          return left.location_name.localeCompare(right.location_name);
        })
      );
    }

    return bucket;
  }, [shifts]);

  const assignedLocationIdsByDate = useMemo(() => {
    const bucket = new Map<string, Set<number>>();

    for (const date of dates) {
      bucket.set(date, new Set<number>());
    }

    for (const shift of shifts) {
      const set = bucket.get(shift.shift_date) ?? new Set<number>();
      set.add(shift.location_id);
      bucket.set(shift.shift_date, set);
    }

    return bucket;
  }, [dates, shifts]);

  const unassignedByDate = useMemo(() => {
    const bucket = new Map<string, Location[]>();

    for (const date of dates) {
      const assignedIds = assignedLocationIdsByDate.get(date) ?? new Set<number>();
      bucket.set(
        date,
        initialLocations
          .filter((location) => !assignedIds.has(location.id))
          .sort((left, right) => left.name.localeCompare(right.name))
      );
    }

    return bucket;
  }, [assignedLocationIdsByDate, dates, initialLocations]);

  const weeklyTotals = useMemo(() => {
    const totals = new Map<number, number>();

    for (const shift of shifts) {
      totals.set(shift.employee_id, (totals.get(shift.employee_id) ?? 0) + shift.hours);
    }

    return totals;
  }, [shifts]);

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

  async function handleDropOnCell(employeeId: number, shiftDate: string, payload: DragPayload | null) {
    if (!databaseReady || !payload) {
      return;
    }

    if (payload.kind === "location") {
      if (payload.shiftDate !== shiftDate) {
        setStatus("Arrastra la portería dentro del día correspondiente.");
        return;
      }

      const assignedIds = assignedLocationIdsByDate.get(shiftDate) ?? new Set<number>();
      if (assignedIds.has(payload.locationId)) {
        setStatus("Esa portería ya está asignada ese día.");
        return;
      }

      await sendAction({
        action: "assign",
        employee_id: employeeId,
        location_id: payload.locationId,
        shift_date: shiftDate
      });
      return;
    }

    await sendAction({
      action: "move",
      shift_id: payload.assignmentId,
      employee_id: employeeId,
      shift_date: shiftDate
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
          <h1>Calendario semanal con control total de porterías</h1>
          <p className="hero-copy">
            Ahora cada trabajador ve exactamente qué porterías tiene cada día. Puedes arrastrar,
            mover entre días o trabajadores, y quitarlas cuando quieras.
          </p>
        </div>
        <div className="hero-actions no-print">
          <Link className="button button-secondary" href={`/schedule?week=${previousWeek}&day=${selectedDate}`}>
            Semana anterior
          </Link>
          <Link className="button button-secondary" href={`/schedule?week=${nextWeek}&day=${selectedDate}`}>
            Semana siguiente
          </Link>
          <PrintButton />
        </div>
      </section>

      {status ? <p className="inline-status">{status}</p> : null}

      <section className="board-layout board-layout-weekly">
        <aside className="pool-panel no-print" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
          event.preventDefault();
          void handleDropToPool(readDragPayload(event));
        }}>
          <div className="pool-header">
            <div>
              <p className="eyebrow">Porterías libres</p>
              <h2>Sin asignar por día</h2>
            </div>
            <span className="helper-pill">Suelta aquí para quitar</span>
          </div>

          <div className="weekly-pool-list">
            {dates.map((date) => {
              const dayLocations = unassignedByDate.get(date) ?? [];
              return (
                <section className={date === selectedDate ? "day-pool active" : "day-pool"} key={date}>
                  <div className="day-pool-header">
                    <div>
                      <strong>{formatDayLabel(date)}</strong>
                      <p>{date}</p>
                    </div>
                    <span className="chip">{dayLocations.length}</span>
                  </div>

                  <div className="day-pool-cards">
                    {dayLocations.length === 0 ? (
                      <p className="empty-state">Todo repartido.</p>
                    ) : (
                      dayLocations.map((location) => (
                        <article
                          className="location-pill"
                          draggable={databaseReady}
                          key={`${date}-${location.id}`}
                          onDragStart={(event) =>
                            saveDragPayload(event, {
                              kind: "location",
                              locationId: location.id,
                              shiftDate: date
                            })
                          }
                        >
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
                </section>
              );
            })}
          </div>
        </aside>

        <div className="lanes-panel weekly-board-panel">
          <div className="pool-header weekly-panel-header">
            <div>
              <p className="eyebrow">Calendario</p>
              <h2>{formatWeekRange(weekStart)}</h2>
            </div>
          </div>

          <div className="week-table-wrap">
            <table className="week-table">
              <thead>
                <tr>
                  <th className="worker-column">Trabajador</th>
                  {dates.map((date) => (
                    <th className={date === selectedDate ? "calendar-day-header active" : "calendar-day-header"} key={date}>
                      <span>{formatDayLabel(date)}</span>
                      <strong>{date}</strong>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <th className="calendar-worker-cell" scope="row">
                      <div>
                        <strong>{employee.name}</strong>
                        <p>
                          {formatHours(weeklyTotals.get(employee.id) ?? 0)} / {formatHours(employee.weekly_hours)} h
                        </p>
                      </div>
                      <span className="worker-color" style={{ background: employee.color }} />
                    </th>

                    {dates.map((date) => {
                      const assignments = shiftsByEmployeeDay.get(`${employee.id}-${date}`) ?? [];
                      return (
                        <td
                          className={date === selectedDate ? "calendar-drop-cell active" : "calendar-drop-cell"}
                          key={`${employee.id}-${date}`}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            void handleDropOnCell(employee.id, date, readDragPayload(event));
                          }}
                        >
                          <div className="calendar-cell-stack">
                            {assignments.length === 0 ? (
                              <div className="assignment-empty">Arrastra aquí</div>
                            ) : (
                              assignments.map((shift) => (
                                <article
                                  className={selectedShiftId === shift.id ? "assignment-card active" : "assignment-card"}
                                  draggable={databaseReady}
                                  key={shift.id}
                                  onClick={() => setSelectedShiftId(shift.id)}
                                  onDragStart={(event) =>
                                    saveDragPayload(event, {
                                      kind: "assignment",
                                      assignmentId: shift.id
                                    })
                                  }
                                >
                                  <div className="assignment-top">
                                    <strong>{shift.location_name}</strong>
                                    <button
                                      className="icon-button no-print"
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void sendAction({ action: "unassign", shift_id: shift.id });
                                      }}
                                    >
                                      x
                                    </button>
                                  </div>
                                  <p>{shift.location_street ?? shift.location_type}</p>
                                  <p>
                                    {shift.start_time} - {shift.end_time} · {formatHours(shift.hours)} h
                                  </p>
                                </article>
                              ))
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="details-panel">
          <div className="pool-header">
            <div>
              <p className="eyebrow">Detalle</p>
              <h2>{selectedAssignment ? selectedAssignment.location_name : "Selecciona una portería"}</h2>
            </div>
          </div>

          {!selectedAssignment || !editor ? (
            <p className="empty-state">
              Haz clic en una portería asignada para cambiar horario, horas y observaciones.
            </p>
          ) : (
            <form className="form-grid details-form" onSubmit={handleSaveEditor}>
              <label className="span-2">
                Trabajador
                <input disabled value={selectedAssignment.employee_name} />
              </label>

              <label className="span-2">
                Día
                <input disabled value={selectedAssignment.shift_date} />
              </label>

              <label>
                Inicio
                <input
                  disabled={busy}
                  type="time"
                  value={editor.start_time}
                  onChange={(event) =>
                    setEditor((current) => (current ? { ...current, start_time: event.target.value } : current))
                  }
                />
              </label>

              <label>
                Fin
                <input
                  disabled={busy}
                  type="time"
                  value={editor.end_time}
                  onChange={(event) =>
                    setEditor((current) => (current ? { ...current, end_time: event.target.value } : current))
                  }
                />
              </label>

              <label>
                Horas
                <input
                  disabled={busy}
                  min="0"
                  step="0.5"
                  type="number"
                  value={editor.hours}
                  onChange={(event) =>
                    setEditor((current) => (current ? { ...current, hours: event.target.value } : current))
                  }
                />
              </label>

              <label>
                Servicio
                <input
                  disabled={busy}
                  value={editor.kind}
                  onChange={(event) =>
                    setEditor((current) => (current ? { ...current, kind: event.target.value } : current))
                  }
                />
              </label>

              <label className="span-2">
                Observaciones
                <textarea
                  disabled={busy}
                  rows={5}
                  value={editor.notes}
                  onChange={(event) =>
                    setEditor((current) => (current ? { ...current, notes: event.target.value } : current))
                  }
                />
              </label>

              <div className="form-actions span-2">
                <button className="button" disabled={busy || !databaseReady} type="submit">
                  Guardar detalle
                </button>
                <button
                  className="button button-secondary"
                  disabled={busy || !databaseReady}
                  type="button"
                  onClick={() => void sendAction({ action: "unassign", shift_id: editor.shift_id })}
                >
                  Quitar portería
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
