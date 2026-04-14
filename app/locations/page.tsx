import { LocationManager } from "@/components/location-manager";
import { SetupNotice } from "@/components/setup-notice";
import { getLocations } from "@/lib/data";
import { hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const locations = await getLocations();

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Porterías</p>
          <h1>Catálogo de porterías y parkings</h1>
          <p>Guarda dirección, horas por defecto e imagen de referencia para arrastrarlas al cuadrante.</p>
        </div>
      </section>
      {!hasDatabase ? <SetupNotice /> : null}
      <LocationManager databaseReady={hasDatabase} initialLocations={locations} />
    </div>
  );
}
