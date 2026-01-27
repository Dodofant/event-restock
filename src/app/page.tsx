export default function HomePage() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Nachschub App</h1>
      <p style={{ opacity: 0.8 }}>
        Startseite. Öffne eine Location über /l/&lt;publicId&gt; oder später /runner und /admin.
      </p>
    </div>
  );
}