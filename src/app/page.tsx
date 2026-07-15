export default function Home() {
  return (
    <main className="container rise" style={{ paddingBlock: "var(--sp-24)", textAlign: "center" }}>
      <p className="label label--accent">Скоро</p>
      <h1 style={{ fontSize: "var(--text-hero)", marginTop: "var(--sp-4)" }}>
        Новый Esque строится
      </h1>
      <p style={{ color: "var(--grey)", marginTop: "var(--sp-6)" }}>
        Мозаичная лента материалов появится здесь после подключения базы данных.
      </p>
    </main>
  );
}
