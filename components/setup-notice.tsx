export function SetupNotice() {
  return (
    <section className="setup-notice">
      <div>
        <p className="eyebrow">Configuración pendiente</p>
        <h2>Falta conectar PostgreSQL</h2>
        <p>
          Esta app necesita la variable <code>DATABASE_URL</code> para guardar trabajadores, porterías y
          asignaciones.
        </p>
      </div>
    </section>
  );
}
