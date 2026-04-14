import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/auto-refresh";
import { PrintButton } from "@/components/print-button";
import { getWorkerSchedule } from "@/lib/data";
import { addDays, formatDayLabel, formatHours, formatWeekRange, getWeekStart, weekDates } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WorkerPage({
  params,
  searchParams
}: {
  params: { token: string };
  searchParams?: { week?: string };
}) {
  const weekStart = getWeekStart(searchParams?.week);
  const currentWeek = getWeekStart();
  const { employee, shifts } = await getWorkerSchedule(params.token, weekStart);

  if (!employee) {
    notFound();
  }

  const dates = weekDates(weekStart);
  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  return (
    <div className="worker-shell">
      <AutoRefresh intervalMs={5000} />

      <header className="worker-header">
        <div>
          <p className="eyebrow">Portal trabajador</p>
          <h1>{employee.name}</h1>
          <p>{formatWeekRange(weekStart)}</p>
          <p>
            Jornada semanal: <strong>{formatHours(employee.weekly_hours)} h</strong>
          </p>
        </div>
        <div className="hero-actions no-print">
          <Link className="button button-secondary" href={`/worker/${params.token}?week=${currentWeek}`}>
            Esta semana
          </Link>
          <Link className="button button-secondary" href={`/worker/${params.token}?week=${previousWeek}`}>
            Semana anterior
          </Link>
          <Link className="button button-secondary" href={`/worker/${params.token}?week=${nextWeek}`}>
            Semana siguiente
          </Link>
          <PrintButton label="Imprimir mi semana" />
        </div>
      </header>

      <section className="worker-grid">
        {dates.map((date) => {
          const dayShifts = shifts.filter((shift) => shift.shift_date === date);
          return (
            <article className="panel" key={date}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">{formatDayLabel(date)}</p>
                  <h2>{date}</h2>
                </div>
              </div>
              {dayShifts.length === 0 ? (
                <p className="empty-state">Sin servicio asignado.</p>
              ) : (
                <div className="list">
                  {dayShifts.map((shift) => (
                    <article className="list-card" key={shift.id}>
                      <strong>{shift.location_name}</strong>
                      <p>
                        {shift.start_time} - {shift.end_time} · {formatHours(shift.hours)} h
                      </p>
                      <p>{shift.kind}</p>
                      {shift.notes ? <p>{shift.notes}</p> : null}
                    </article>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
