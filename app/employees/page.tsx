import { EmployeeManager } from "@/components/employee-manager";
import { SetupNotice } from "@/components/setup-notice";
import { getEmployees } from "@/lib/data";
import { hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const employees = await getEmployees();

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Trabajadores</p>
          <h1>Equipo y horas semanales</h1>
          <p>Una vista muy simple para mantener el equipo activo y listo para el cuadrante.</p>
        </div>
      </section>
      {!hasDatabase ? <SetupNotice /> : null}
      <EmployeeManager databaseReady={hasDatabase} initialEmployees={employees} />
    </div>
  );
}
