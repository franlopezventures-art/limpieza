import Link from "next/link";

export default function NotFound() {
  return (
    <div className="worker-shell">
      <section className="worker-header">
        <div>
          <p className="eyebrow">No encontrado</p>
          <h1>Esta página no existe</h1>
          <p>Puede que el enlace sea incorrecto o que todavía no haya datos cargados.</p>
        </div>
        <div className="hero-actions">
          <Link className="button" href="/schedule">
            Volver al cuadrante
          </Link>
        </div>
      </section>
    </div>
  );
}
