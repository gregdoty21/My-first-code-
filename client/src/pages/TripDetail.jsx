import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api, photoUrl } from "../api.js";

export default function TripDetail() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [meta, setMeta] = useState(null);
  const [weather, setWeather] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [packing, setPacking] = useState([]);
  const [customName, setCustomName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reloadPacking = useCallback(() => {
    return api.listPacking(id).then(setPacking);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.meta(), api.getTrip(id), reloadPacking()])
      .then(([m, t]) => {
        if (cancelled) return;
        setMeta(m);
        setTrip(t);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    api
      .getWeather(id)
      .then((w) => !cancelled && setWeather(w))
      .catch((err) => !cancelled && setWeather({ available: false, reason: err.message }));
    api
      .getSuggestions(id)
      .then((s) => !cancelled && setSuggestions(s))
      .catch(() => !cancelled && setSuggestions({ targetSeason: null, suggested: [] }));

    return () => {
      cancelled = true;
    };
  }, [id, reloadPacking]);

  async function addFromWardrobe(itemId) {
    await api.addPacking(id, { wardrobe_item_id: itemId });
    await reloadPacking();
  }

  async function addCustom(e) {
    e.preventDefault();
    if (!customName.trim()) return;
    await api.addPacking(id, { custom_name: customName.trim() });
    setCustomName("");
    await reloadPacking();
  }

  async function togglePacked(item) {
    setPacking((prev) => prev.map((p) => (p.id === item.id ? { ...p, packed: !p.packed } : p)));
    await api.togglePacking(item.id, !item.packed);
  }

  async function removePacked(item) {
    setPacking((prev) => prev.filter((p) => p.id !== item.id));
    await api.deletePacking(item.id);
  }

  if (loading) return <p className="page-loading">Loading trip…</p>;
  if (error) return <p className="form-error">{error}</p>;
  if (!trip) return null;

  const packedIds = new Set(packing.filter((p) => p.wardrobe_item_id).map((p) => p.wardrobe_item_id));
  const suitcase = meta.suitcaseSizes.find((s) => s.id === trip.suitcase_size);
  const packedCount = packing.filter((p) => p.packed).length;

  return (
    <div className="trip-detail">
      <p><Link to="/trips">&larr; All trips</Link></p>

      <header className="page-header">
        <h1>{trip.name}</h1>
        <p>{trip.destination} · {trip.start_date} → {trip.end_date}</p>
        <p className="trip-detail__meta">
          {suitcase?.label} · {trip.activities.join(", ") || "No activities selected"}
        </p>
      </header>

      <section className="card">
        <h2>Weather</h2>
        {!weather ? (
          <p>Loading weather…</p>
        ) : !weather.available ? (
          <p>{weather.reason}</p>
        ) : (
          <div>
            <p>
              {weather.kind === "typical" ? "Typical weather (based on last year, since this trip is further out)" : "Forecast"}
              {" "}for {weather.location}: avg high {weather.avgHighF}°F, avg low {weather.avgLowF}°F
              {weather.maxPrecipChance != null && `, up to ${weather.maxPrecipChance}% chance of rain`}.
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Suggested from your wardrobe</h2>
        {!suggestions ? (
          <p>Finding matches…</p>
        ) : suggestions.suggested.length === 0 ? (
          <p className="empty">No matches yet — add more items to your wardrobe, or tag existing ones for this trip's activities.</p>
        ) : (
          <div className="wardrobe-grid wardrobe-grid--compact">
            {suggestions.suggested.map((item) => (
              <article className="wardrobe-card" key={item.id}>
                <img src={photoUrl(item.photo_path)} alt={item.name} />
                <div className="wardrobe-card__body">
                  <h3>{item.name}</h3>
                  <p className="wardrobe-card__tags">{item.category} · {item.formality}</p>
                  <button
                    type="button"
                    disabled={packedIds.has(item.id)}
                    onClick={() => addFromWardrobe(item.id)}
                  >
                    {packedIds.has(item.id) ? "In packing list" : "Add to packing list"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Packing list</h2>
        <p className="trip-detail__progress">
          {packedCount} / {packing.length} packed
          {suitcase && ` · guideline for a ${suitcase.label.toLowerCase()}: ~${suitcase.guideline} items`}
        </p>

        <form className="packing-add" onSubmit={addCustom}>
          <input
            type="text"
            placeholder="Add a custom item (e.g. passport, sunscreen)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <button type="submit">Add</button>
        </form>

        {packing.length === 0 ? (
          <p className="empty">Nothing on the list yet.</p>
        ) : (
          <ul className="packing-list">
            {packing.map((item) => (
              <li key={item.id} className={item.packed ? "packing-item packing-item--packed" : "packing-item"}>
                <label>
                  <input type="checkbox" checked={item.packed} onChange={() => togglePacked(item)} />
                  {item.name}
                  {item.category && <span className="packing-item__tag"> · {item.category}</span>}
                </label>
                <button type="button" className="link-button" onClick={() => removePacked(item)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
