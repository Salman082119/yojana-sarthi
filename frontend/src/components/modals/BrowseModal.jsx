import { useEffect, useState } from "react";
import SchemeCard from "../SchemeCard";

export default function BrowseModal({ isOpen, onClose, loadSchemes, isTracked, onToggleTrack }) {
  const [schemes, setSchemes] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    loadSchemes()
      .then((all) => {
        if (!cancelled) setSchemes(all);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, loadSchemes]);

  if (!isOpen) return null;

  const categories = [...new Set(schemes.map((s) => s.category))].sort();
  const states = [
    ...new Set(schemes.filter((s) => s.level === "state" && s.state).map((s) => s.state)),
  ].sort();

  const filtered = schemes.filter((s) => {
    if (level && s.level !== level) return false;
    if (state && s.state !== state) return false;
    if (category && s.category !== category) return false;
    const q = search.trim().toLowerCase();
    if (
      q &&
      !(
        s.name.toLowerCase().includes(q) ||
        (s.name_hi || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q)
      )
    )
      return false;
    return true;
  });

  return (
    <div className="modal-backdrop open">
      <div className="modal large">
        <span className="close" onClick={onClose}>
          &times;
        </span>
        <h3>सभी योजनाएं / All Schemes</h3>
        <div className="browse-controls">
          <input
            type="text"
            placeholder="Search schemes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Category: All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Level: All</option>
            <option value="central">Central</option>
            <option value="state">State</option>
          </select>
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">State: All</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <p className="browse-count">
          {filtered.length} scheme{filtered.length === 1 ? "" : "s"}
        </p>
        <div className="modal-body">
          <div className="browse-list">
            {loading ? (
              <div className="empty-state">लोड हो रहा है… / Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">कोई योजना नहीं मिली / No schemes found.</div>
            ) : (
              filtered.map((s) => (
                <SchemeCard key={s.id} scheme={s} isTracked={isTracked} onToggleTrack={onToggleTrack} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
