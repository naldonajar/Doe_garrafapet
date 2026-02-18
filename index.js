import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(e) {
    e.preventDefault();
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErrorMsg(error.message);
  }

  if (loading) return <div style={styles.center}>Carregando…</div>;

  if (session) {
    return (
      <div style={styles.center}>
        <h2>Logado ✅</h2>
        <p>Agora vá para o painel:</p>
        <a href="/admin" style={styles.link}>Abrir Painel Admin</a>
      </div>
    );
  }

  return (
    <div style={styles.center}>
      <h1>Painel Admin • Doação PET</h1>
      <form onSubmit={signIn} style={styles.card}>
        <input style={styles.input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={styles.input} placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button style={styles.btn} type="submit">Entrar</button>
        {errorMsg ? <p style={{ color: "crimson" }}>{errorMsg}</p> : null}
      </form>
    </div>
  );
}

const styles = {
  center: { minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui", padding: 16 },
  card: { display: "grid", gap: 10, width: 360, padding: 16, border: "1px solid #ddd", borderRadius: 12 },
  input: { padding: 12, borderRadius: 10, border: "1px solid #ccc" },
  btn: { padding: 12, borderRadius: 10, border: "none", background: "#111", color: "#fff", cursor: "pointer" },
  link: { padding: 12, borderRadius: 10, border: "1px solid #111", textDecoration: "none", color: "#111" },
};
