import { useEffect, useMemo, useState } from "react";
import { api, photoUrl } from "../api.js";

const emptyForm = { name: "", category: "", color: "", season: "all-season", formality: "casual" };

export default function Wardrobe() {
  const [meta, setMeta] = useState(null);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.meta(), api.listWardrobe()])
      .then(([m, list]) => {
        setMeta(m);
        setForm((f) => ({ ...f, category: m.categories[0] }));
        setItems(list);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const visibleItems = useMemo(
    () => (filter ? items.filter((i) => i.category === filter) : items),
    [items, filter]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Choose a photo of the item first.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      const item = await api.createWardrobeItem(fd);
      setItems((prev) => [item, ...prev]);
      setForm((f) => ({ ...emptyForm, category: f.category }));
      setFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    await api.deleteWardrobeItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  if (loading) return <p className="page-loading">Loading your wardrobe…</p>;

  return (
    <div className="wardrobe-page">
      <header className="page-header">
        <h1>Your wardrobe</h1>
        <p>Photograph what you own so trips can pull real outfits from your own closet.</p>
      </header>

      <form className="wardrobe-form" onSubmit={handleSubmit}>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
        <input
          type="text"
          placeholder="Item name (e.g. Blue linen shirt)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {meta.categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Color (optional)"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />
        <select value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })}>
          {meta.seasons.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={form.formality} onChange={(e) => setForm({ ...form, formality: e.target.value })}>
          {meta.formality.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <button type="submit" disabled={busy}>{busy ? "Adding…" : "Add to wardrobe"}</button>
      </form>

      {error && <p className="form-error">{error}</p>}

      <div className="filters">
        <button className={filter === "" ? "chip chip--active" : "chip"} onClick={() => setFilter("")}>All</button>
        {meta.categories.map((c) => (
          <button key={c} className={filter === c ? "chip chip--active" : "chip"} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <p className="empty">
          {items.length === 0 ? "No items yet — add your first piece above." : "No items in this category yet."}
        </p>
      ) : (
        <div className="wardrobe-grid">
          {visibleItems.map((item) => (
            <article className="wardrobe-card" key={item.id}>
              <img src={photoUrl(item.photo_path)} alt={item.name} />
              <div className="wardrobe-card__body">
                <h3>{item.name}</h3>
                <p className="wardrobe-card__tags">
                  {item.category} · {item.color || "no color"} · {item.season} · {item.formality}
                </p>
                <button type="button" className="link-button" onClick={() => handleDelete(item.id)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
