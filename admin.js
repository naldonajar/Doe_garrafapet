import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);

  const [cities, setCities] = useState([]);
  const [collectors, setCollectors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("cities"); // cities | collectors
  const [q, setQ] = useState("");

  // Criar cidade
  const [newCityName, setNewCityName] = useState("");
  const [newCityState, setNewCityState] = useState("");
  const [newCityActive, setNewCityActive] = useState(true);
  const [creatingCity, setCreatingCity] = useState(false);

  const isAdmin = me?.role === "admin";

  const filteredCities = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return cities;
    return cities.filter((c) => `${c.name} ${c.state}`.toLowerCase().includes(s));
  }, [cities, q]);

  const filteredCollectors = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return collectors;
    return collectors.filter((p) =>
      `${p.name || ""} ${p.phone || ""} ${p.collector_status} ${p.city?.name || ""}`.toLowerCase().includes(s)
    );
  }, [collectors, q]);

  async function loadAll() {
    setLoading(true);

    const { data: sess } = await supabase.auth.getSession();
    setSession(sess.session || null);

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: myProfile, error: myErr } = await supabase
      .from("profiles")
      .select("id,role")
      .eq("id", user.id)
      .single();

    if (myErr) {
      console.error(myErr);
      setLoading(false);
      return;
    }
    setMe(myProfile);

    const { data: cts, error: cErr } = await supabase
      .from("cities")
      .select("id,name,state,active,created_at")
      .order("state", { ascending: true })
      .order("name", { ascending: true });

    if (cErr) console.error(cErr);
    setCities(cts || []);

    const { data: cols, error: colErr } = await supabase
      .from("profiles")
      .select("id,name,phone,role,collector_status,city_id,created_at, cities:city_id (id,name,state,active)")
      .in("role", ["collector"])
      .order("created_at", { ascending: false });

    if (colErr) console.error(colErr);

    const normalized = (cols || []).map((p) => ({ ...p, city: p.cities || null }));
    setCollectors(normalized);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function toggleCityActive(city) {
    const next = !city.active;
    const { error } = await supabase.from("cities").update({ active: next }).eq("id", city.id);
    if (error) return alert(error.message);
    setCities((prev) => prev.map((c) => (c.id === city.id ? { ...c, active: next } : c)));
  }

  async function setCollectorStatus(profileId, status) {
    const { error } = await supabase.from("profiles").update({ collector_status: status }).eq("id", profileId);
    if (error) return alert(error.message);
    setCollectors((prev) => prev.map((p) => (p.id === profileId ? { ...p, collector_status: status } : p)));
  }

  async function createCity() {
    const name = newCityName.trim();
    const state = newCityState.trim().toUpperCase();

    if (!name) return alert("Digite o nome da cidade.");
    if (!state || state.length !== 2) return alert("Digite o UF com 2 letras (ex: SP, RJ, MG).");

    try {
      setCreatingCity(true);

      const { data, error } = await supabase
        .from("cities")
        .insert({ name, state, active: !!newCityActive })
        .select("id,name,state,active,created_at")
        .single();

      if (error) throw error;

      setCities((prev) => [data, ...prev]);
      setNewCityName("");
      setNewCityState("");
      setNewCityActive(true);

      alert("Cidade criada com sucesso!");
    } catch (e) {
      alert(e.message);
    } finally {
      setCreatingCity(false);
    }
  }

  if (loading) return <div style={styles.center}>Carregando painel…</div>;

  if (!session) {
    return (
      <div style={styles.center}>
        <h2>Você não está logado.</h2>
        <a href="/" style={styles.link}>Voltar para Login</a>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={styles.center}>
        <h2>Acesso negado.</h2>
        <p>Essa conta não é admin.</p>
        <button style={styles.btnOutline} onClick={signOut}>Sair</button>
      </div>
    );
  }

  return (
    <div style={{ ...styles.page }}>
      <header style={styles.header}>
        <h2 style={{ margin: 0 }}>Painel Admin</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={tab === "cities" ? styles.btn : styles.btnOutline} onClick={() => setTab("cities")}>Cidades</button>
          <button style={tab === "collectors" ? styles.btn : styles.btnOutline} onClick={() => setTab("collectors")}>Coletores</button>
          <button style={styles.btnOutline} onClick={signOut}>Sair</button>
        </div>
      </header>

      <div style={styles.toolbar}>
        <input
          style={styles.input}
          placeholder={tab === "cities" ? "Buscar cidade/estado…" : "Buscar coletor (nome/telefone/status/cidade)…"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button style={styles.btnOutline} onClick={loadAll}>Atualizar</button>
      </div>

      {tab === "cities" ? (
        <div style={styles.grid}>
          <div style={{ ...styles.card, borderStyle: "dashed" }}>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Nova cidade</div>

              <input
                style={styles.input}
                placeholder="Nome da cidade (ex: Campinas)"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
              />

              <input
                style={styles.input}
                placeholder="UF (ex: SP)"
                value={newCityState}
                maxLength={2}
                onChange={(e) => setNewCityState(e.target.value.toUpperCase())}
              />

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={newCityActive}
                  onChange={(e) => setNewCityActive(e.target.checked)}
                />
                Criar já ativa
              </label>

              <button
                style={styles.btn}
                onClick={createCity}
                disabled={creatingCity}
                title="Criar cidade"
              >
                {creatingCity ? "Criando..." : "Criar cidade"}
              </button>
            </div>
          </div>

          {filteredCities.map((c) => (
            <div key={c.id} style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name} - {c.state}</div>
                  <div style={{ opacity: 0.75 }}>Ativa: {c.active ? "Sim" : "Não"}</div>
                </div>
                <button style={c.active ? styles.btnOutline : styles.btn} onClick={() => toggleCityActive(c)}>
                  {c.active ? "Desativar" : "Ativar"}
                </button>
              </div>
            </div>
          ))}
          {filteredCities.length === 0 ? <p>Nenhuma cidade encontrada.</p> : null}
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredCollectors.map((p) => (
            <div key={p.id} style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.name || "(sem nome)"} • {p.phone || "(sem telefone)"}</div>
                  <div style={{ opacity: 0.75 }}>
                    Status: <b>{p.collector_status}</b> • Cidade: {p.city ? `${p.city.name}-${p.city.state}` : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button style={styles.btn} onClick={() => setCollectorStatus(p.id, "approved")}>Aprovar</button>
                  <button style={styles.btnOutline} onClick={() => setCollectorStatus(p.id, "rejected")}>Reprovar</button>
                  <button style={styles.btnOutline} onClick={() => setCollectorStatus(p.id, "suspended")}>Suspender</button>
                </div>
              </div>
            </div>
          ))}
          {filteredCollectors.length === 0 ? <p>Nenhum coletor encontrado.</p> : null}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { fontFamily: "system-ui", padding: 16, maxWidth: 1100, margin: "0 auto" },
  center: { minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui", padding: 16 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingBottom: 12, borderBottom: "1px solid #eee" },
  toolbar: { display: "flex", gap: 10, padding: "12px 0" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12, paddingTop: 8 },
  card: { border: "1px solid #ddd", borderRadius: 12, padding: 14, background: "#fff" },
  input: { flex: 1, padding: 12, borderRadius: 10, border: "1px solid #ccc" },
  btn: { padding: "10px 12px", borderRadius: 10, border: "none", background: "#111", color: "#fff", cursor: "pointer" },
  btnOutline: { padding: "10px 12px", borderRadius: 10, border: "1px solid #111", background: "#fff", color: "#111", cursor: "pointer" },
  link: { padding: 12, borderRadius: 10, border: "1px solid #111", textDecoration: "none", color: "#111" },
};
