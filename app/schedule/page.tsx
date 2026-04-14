import { QuadrantBoard } from "@/components/quadrant-board";
import { SetupNotice } from "@/components/setup-notice";
import { getAuditLogs, getEmployees, getLocations, getWeekShifts } from "@/lib/data";
import { hasDatabase } from "@/lib/db";
import { getWeekStart, weekDates } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }: { searchParams?: { week?: string; day?: string } }) {
  const weekStart = getWeekStart(searchParams?.week ?? searchParams?.day);
  const dates = weekDates(weekStart);
  const selectedDate = searchParams?.day && dates.includes(searchParams.day) ? searchParams.day : weekStart;
  const [employees, locations, shifts, audit] = await Promise.all([
    getEmployees(),
    getLocations(),
    getWeekShifts(weekStart),
    getAuditLogs(6)
  ]);

  return (
    <div className="page-stack">
      {!hasDatabase ? <SetupNotice /> : null}
      <QuadrantBoard
        audit={audit}
        databaseReady={hasDatabase}
        initialEmployees={employees}
        initialLocations={locations}
        initialShifts={shifts}
        selectedDate={selectedDate}
        weekStart={weekStart}
      />
    </div>
  );
}
