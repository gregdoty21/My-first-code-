import { useEffect, useState } from "react";
import { api, photoUrl } from "../api.js";

export default function TryOn() {
  const [configured, setConfigured] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [wardrobe, setWardrobe] = useState([]);
  const [results, setResults] = useState([]);
  const [file, setFile] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [generateBusy, setGenerateBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getTryonConfig(), api.listTryonPhotos(), api.listWardrobe(), api.listTryonResults()])
      .then(([config, photoList, items, resultList]) => {
        setConfigured(config.configured);
        setPhotos(photoList);
        setWardrobe(items);
        setResults(resultList);
        if (photoList[0]) setSelectedPhoto(photoList[0].id);
        if (items[0]) setSelectedItem(items[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Choose a photo of yourself first.");
      return;
    }
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const photo = await api.addTryonPhoto(fd);
      setPhotos((prev) => [photo, ...prev]);
      setSelectedPhoto(photo.id);
      setFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadBusy(false);
    }
  }

  async function handleDeletePhoto(id) {
    await api.deleteTryonPhoto(id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (selectedPhoto === id) setSelectedPhoto(null);
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    if (!selectedPhoto || !selectedItem) {
      setError("Pick a photo of yourself and a wardrobe item.");
      return;
    }
    setGenerateBusy(true);
    try {
      const result = await api.generateTryon({ tryon_photo_id: selectedPhoto, wardrobe_item_id: selectedItem });
      setResults((prev) => [result, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerateBusy(false);
    }
  }

  async function handleDeleteResult(id) {
    await api.deleteTryonResult(id);
    setResults((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) return <p className="page-loading">Loading Rat's Assistance…</p>;

  return (
    <div className="tryon-page">
      <header className="page-header">
        <h1>Rat's Assistance</h1>
        <p>Upload a photo of yourself and see how a piece from your wardrobe looks on you.</p>
      </header>

      {!configured && (
        <p className="form-error">
          Virtual try-on isn't set up on this server yet — ask the app owner to add a Gemini API key. You can still
          upload photos, but generating a try-on won't work until that's configured.
        </p>
      )}

      <section className="tryon-section">
        <h2>Your photos</h2>
        <p className="tryon-section__hint">
          Use a well-lit, front-facing full-body photo for the best results. Photos are only used to generate your
          try-ons and can be deleted any time.
        </p>
        <form className="tryon-upload-form" onSubmit={handleUpload}>
          <label className="file-upload" htmlFor="tryon-photo">
            {file ? file.name : "Take a photo of yourself"}
          </label>
          <input
            id="tryon-photo"
            className="visually-hidden"
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button type="submit" disabled={uploadBusy}>{uploadBusy ? "Uploading…" : "Upload photo"}</button>
        </form>

        {photos.length === 0 ? (
          <p className="empty">No photos yet — upload one above to get started.</p>
        ) : (
          <div className="tryon-photo-grid">
            {photos.map((photo) => (
              <button
                type="button"
                key={photo.id}
                className={selectedPhoto === photo.id ? "tryon-photo tryon-photo--selected" : "tryon-photo"}
                onClick={() => setSelectedPhoto(photo.id)}
              >
                <img src={photoUrl(photo.photo_path)} alt="You" />
                <span className="tryon-photo__remove" onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }}>
                  Remove
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="tryon-section">
        <h2>Try something on</h2>
        {wardrobe.length === 0 ? (
          <p className="empty">Add some items to your wardrobe first.</p>
        ) : (
          <form className="tryon-generate-form" onSubmit={handleGenerate}>
            <select value={selectedItem || ""} onChange={(e) => setSelectedItem(Number(e.target.value))}>
              {wardrobe.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <button type="submit" disabled={generateBusy || !configured || !selectedPhoto}>
              {generateBusy ? "Generating… (can take a moment)" : "Try it on"}
            </button>
          </form>
        )}
        {error && <p className="form-error">{error}</p>}
      </section>

      <section className="tryon-section">
        <h2>Your try-ons</h2>
        {results.length === 0 ? (
          <p className="empty">Nothing generated yet.</p>
        ) : (
          <div className="tryon-results-grid">
            {results.map((result) => (
              <article className="tryon-result-card" key={result.id}>
                <img src={photoUrl(result.result_image_path)} alt={result.item_name} />
                <div className="tryon-result-card__body">
                  <h3>{result.item_name}</h3>
                  <button type="button" className="link-button" onClick={() => handleDeleteResult(result.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
