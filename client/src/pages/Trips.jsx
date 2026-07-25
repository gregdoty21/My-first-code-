import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

const emptyForm = { name: "", destination: "", start_date: "", end_date: "", activities: [], suitcase_size: "" };

export default function Trips() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [trips, setTrips] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.meta(), api.listTrips()])
      .then(([m, list]) => {
        setMeta(m);
        setForm((f) => ({ ...f, suitcase_size: m.suitcaseSizes[0].id }));
        setTrips(list);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleActivity(activity) {
    setForm((f) => ({
      ...f,
      activities: f.activities.includes(activity)
        ? f.activities.filter((a) => a !== activity)
        : [...f.activities, activity],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const trip = await api.createTrip(form);
      navigate(`/trips/${trip.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="page-loading">Loading your trips…</p>;

  return (
    <div className="trips-page">
      <header className="page-header">
        <h1>Your trips</h1>
        <p>Plan a trip and we'll pull packing suggestions from your own wardrobe.</p>
      </header>

      <form className="trip-form" onSubmit={handleSubmit}>
        <div className="trip-form__row">
          <input
            type="text"
            placeholder="Trip name (e.g. Italy)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Destination (city, country)"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            required
          />
        </div>
        <div className="trip-form__row">
          <label>
            Start date
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
            />
          </label>
          <label>
            End date
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              required
            />
          </label>
          <label>
            Suitcase
            <select
              value={form.suitcase_size}
              onChange={(e) => setForm({ ...form, suitcase_size: e.target.value })}
            >
              {meta.suitcaseSizes.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="activities">
          <legend>Activities planned</legend>
          {meta.activities.map((a) => (
            <label key={a} className="activities__option">
              <input
                type="checkbox"
                checked={form.activities.includes(a)}
                onChange={() => toggleActivity(a)}
              />
              {a}
            </label>
          ))}
        </fieldset>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create trip"}</button>
      </form>

      {trips.length === 0 ? (
        <p className="empty">No trips yet — plan your first one above.</p>
      ) : (
        <ul className="trip-list">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link to={`/trips/${trip.id}`} className="trip-card">
                <h3>{trip.name}</h3>
                <p>{trip.destination}</p>
                <p className="trip-card__dates">{trip.start_date} → {trip.end_date}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
