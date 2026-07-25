import { useEffect, useState } from "react";
import { api, photoUrl } from "../api.js";

const emptyForm = { interests: [], style_vibe: [], favorite_colors: "", favorite_drink: "", bio: "" };

export default function FashionProfile() {
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState([]);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.meta(), api.getProfile()])
      .then(([m, profile]) => {
        setMeta(m);
        setForm({
          interests: profile.interests || [],
          style_vibe: profile.style_vibe || [],
          favorite_colors: profile.favorite_colors || "",
          favorite_drink: profile.favorite_drink || "",
          bio: profile.bio || "",
        });
        setPhotos(profile.photos || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function toggle(field, value) {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value],
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaveBusy(true);
    try {
      await api.updateProfile(form);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Choose a photo first.");
      return;
    }
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("caption", caption);
      const photo = await api.addProfilePhoto(fd);
      setPhotos((prev) => [photo, ...prev]);
      setFile(null);
      setCaption("");
      e.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleDeletePhoto(id) {
    await api.deleteProfilePhoto(id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) return <p className="page-loading">Loading your fashion profile…</p>;

  return (
    <div className="profile-page">
      <header className="page-header">
        <h1>My Fashion Profile</h1>
        <p>Tell us a bit about yourself so future outfit suggestions can reflect your personality, not just your closet.</p>
      </header>

      <form className="profile-form" onSubmit={handleSave}>
        <fieldset className="activities">
          <legend>What do you like doing?</legend>
          {meta.interests.map((i) => (
            <label key={i} className="activities__option">
              <input type="checkbox" checked={form.interests.includes(i)} onChange={() => toggle("interests", i)} />
              {i}
            </label>
          ))}
        </fieldset>

        <fieldset className="activities">
          <legend>What's your style vibe?</legend>
          {meta.styleVibes.map((s) => (
            <label key={s} className="activities__option">
              <input type="checkbox" checked={form.style_vibe.includes(s)} onChange={() => toggle("style_vibe", s)} />
              {s}
            </label>
          ))}
        </fieldset>

        <div className="profile-form__row">
          <label>
            Favorite colors
            <input
              type="text"
              placeholder="e.g. black, olive green, cream"
              value={form.favorite_colors}
              onChange={(e) => setForm({ ...form, favorite_colors: e.target.value })}
            />
          </label>
          <label>
            Favorite drink
            <input
              type="text"
              placeholder="e.g. iced oat milk latte"
              value={form.favorite_drink}
              onChange={(e) => setForm({ ...form, favorite_drink: e.target.value })}
            />
          </label>
        </div>

        <label className="profile-form__bio">
          A little about you
          <textarea
            rows={3}
            placeholder="Anything else that helps describe your personality or style"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        <div className="profile-form__actions">
          <button type="submit" disabled={saveBusy}>{saveBusy ? "Saving…" : "Save profile"}</button>
          {saved && <span className="profile-form__saved">Saved</span>}
        </div>
      </form>

      <section className="tryon-section">
        <h2>Photos that show who you are</h2>
        <p className="tryon-section__hint">
          Add a few photos — of you, an outfit you love, a place you like to go — anything that helps paint a picture
          of your style.
        </p>
        <form className="tryon-upload-form" onSubmit={handleUpload}>
          <label className="file-upload" htmlFor="profile-photo">
            {file ? file.name : "Choose a photo to add"}
          </label>
          <input
            id="profile-photo"
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <input
            type="text"
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button type="submit" disabled={uploadBusy}>{uploadBusy ? "Uploading…" : "Add photo"}</button>
        </form>

        {photos.length === 0 ? (
          <p className="empty">No photos yet — add one above.</p>
        ) : (
          <div className="tryon-photo-grid">
            {photos.map((photo) => (
              <div className="tryon-photo" key={photo.id}>
                <img src={photoUrl(photo.photo_path)} alt={photo.caption || "Profile"} />
                <span className="tryon-photo__remove" onClick={() => handleDeletePhoto(photo.id)}>
                  Remove
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
