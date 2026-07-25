import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api, photoUrl } from "../api.js";

export default function TripDetail() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [meta, setMeta] = useState(null);
  const [weather, setWeather] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [outfits, setOutfits] = useState(null);
  const [packing, setPacking] = useState([]);
  const [customName, setCustomName] = useState("");
  const [inspiration, setInspiration] = useState([]);
  const [inspoUrl, setInspoUrl] = useState("");
  const [inspoCaption, setInspoCaption] = useState("");
  const [inspoFile, setInspoFile] = useState(null);
  const [inspoError, setInspoError] = useState("");
  const [inspoBusy, setInspoBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reloadPacking = useCallback(() => {
    return api.listPacking(id).then(setPacking);
  }, [id]);

  const reloadInspiration = useCallback(() => {
    return api.listInspiration(id).then(setInspiration);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([api.meta(), api.getTrip(id), reloadPacking(), reloadInspiration()])
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
    api
      .getOutfits(id)
      .then((o) => !cancelled && setOutfits(o))
      .catch(() => !cancelled && setOutfits({ targetSeason: null, pairings: [], dresses: [] }));

    return () => {
      cancelled = true;
    };
  }, [id, reloadPacking, reloadInspiration]);

  async function addFromWardrobe(itemId) {
    await api.addPacking(id, { wardrobe_item_id: itemId });
    await reloadPacking();
  }

  async function addOutfitPair(top, bottom) {
    const toAdd = [top, bottom].filter((item) => !packedIds.has(item.id));
    await Promise.all(toAdd.map((item) => api.addPacking(id, { wardrobe_item_id: item.id })));
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

  async function addInspiration(e) {
    e.preventDefault();
    setInspoError("");
    if (!inspoFile && !inspoUrl.trim()) {
      setInspoError("Paste an image URL or choose a photo to upload.");
      return;
    }
    setInspoBusy(true);
    try {
      if (inspoFile) {
        const fd = new FormData();
        fd.append("photo", inspoFile);
        if (inspoCaption.trim()) fd.append("caption", inspoCaption.trim());
        await api.addInspiration(id, fd);
      } else {
        await api.addInspiration(id, { image_url: inspoUrl.trim(), caption: inspoCaption.trim() });
      }
      setInspoUrl("");
      setInspoCaption("");
      setInspoFile(null);
      e.target.reset();
      await reloadInspiration();
    } catch (err) {
      setInspoError(err.message);
    } finally {
      setInspoBusy(false);
    }
  }

  async function removeInspiration(item) {
    setInspiration((prev) => prev.filter((i) => i.id !== item.id));
    await api.deleteInspiration(item.id);
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
        <h2>Inspiration</h2>
        <p className="card__subtitle">
          Save looks you like for this trip — paste an image link (e.g. from Pinterest) or upload a photo.
        </p>

        <form className="inspiration-form" onSubmit={addInspiration}>
          <input
            type="url"
            placeholder="Paste an image URL"
            value={inspoUrl}
            disabled={Boolean(inspoFile)}
            onChange={(e) => setInspoUrl(e.target.value)}
          />
          <span className="inspiration-form__or">or</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setInspoFile(e.target.files?.[0] || null)}
          />
          <input
            type="text"
            placeholder="Caption (optional)"
            value={inspoCaption}
            onChange={(e) => setInspoCaption(e.target.value)}
          />
          <button type="submit" disabled={inspoBusy}>{inspoBusy ? "Saving…" : "Save to trip"}</button>
        </form>
        {inspoError && <p className="form-error">{inspoError}</p>}

        {inspiration.length === 0 ? (
          <p className="empty">No inspiration saved yet.</p>
        ) : (
          <div className="inspiration-grid">
            {inspiration.map((item) => (
              <figure className="inspiration-card" key={item.id}>
                <img src={item.image_path ? photoUrl(item.image_path) : item.image_url} alt={item.caption || "Inspiration"} />
                {item.caption && <figcaption>{item.caption}</figcaption>}
                <button type="button" className="link-button inspiration-card__remove" onClick={() => removeInspiration(item)}>
                  Remove
                </button>
              </figure>
            ))}
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
        <h2>Outfit ideas</h2>
        <p className="card__subtitle">
          Mix-and-match combinations from your wardrobe — pack fewer pieces, get more looks.
        </p>
        {!outfits ? (
          <p>Building outfit ideas…</p>
        ) : outfits.pairings.length === 0 && outfits.dresses.length === 0 ? (
          <p className="empty">Add matching tops, bottoms, or dresses to your wardrobe to see outfit ideas.</p>
        ) : (
          <>
            {outfits.pairings.map((pairing) => (
              <div className="outfit-pairing" key={pairing.top.id}>
                <div className="outfit-pairing__top">
                  <img src={photoUrl(pairing.top.photo_path)} alt={pairing.top.name} />
                  <div>
                    <h3>{pairing.top.name}</h3>
                    <p className="outfit-pairing__count">
                      pairs with {pairing.bottoms.length} {pairing.bottoms.length === 1 ? "bottom" : "bottoms"} for {pairing.bottoms.length} {pairing.bottoms.length === 1 ? "look" : "looks"}
                    </p>
                  </div>
                </div>
                <div className="outfit-pairing__bottoms">
                  {pairing.bottoms.map((bottom) => {
                    const inList = packedIds.has(pairing.top.id) && packedIds.has(bottom.id);
                    return (
                      <button
                        key={bottom.id}
                        type="button"
                        className="outfit-pairing__bottom"
                        disabled={inList}
                        onClick={() => addOutfitPair(pairing.top, bottom)}
                        title={inList ? "Both pieces are already in your packing list" : "Add this pairing to your packing list"}
                      >
                        <img src={photoUrl(bottom.photo_path)} alt={bottom.name} />
                        <span>{bottom.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {outfits.dresses.length > 0 && (
              <div className="outfit-dresses">
                <h3>Ready-to-wear</h3>
                <div className="wardrobe-grid wardrobe-grid--compact">
                  {outfits.dresses.map((dress) => (
                    <article className="wardrobe-card" key={dress.id}>
                      <img src={photoUrl(dress.photo_path)} alt={dress.name} />
                      <div className="wardrobe-card__body">
                        <h3>{dress.name}</h3>
                        <button
                          type="button"
                          disabled={packedIds.has(dress.id)}
                          onClick={() => addFromWardrobe(dress.id)}
                        >
                          {packedIds.has(dress.id) ? "In packing list" : "Add to packing list"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </>
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
