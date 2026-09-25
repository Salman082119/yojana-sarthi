import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "../../utils/helpers";

export default function HistoryModal({ isOpen, onClose, token, onRerun, loadSchemes }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchHistory = useCallback(async () => {
    const res = await fetch("/api/check/history", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error("Login sahi nahi lage hai / Session issue. Dobara login karein.");
    }
    const data = await res.json();
    const all = await loadSchemes().catch(() => []);
    const idToName = {};
    all.forEach((s) => {
      idToName[s.id] = s.name;
    });
    return (data.history || []).map((h) => ({ ...h, idToName }));
  }, [token, loadSchemes]);

  useEffect(() => {
    if (!(isOpen && token)) return;
    let cancelled = false;
    fetchHistory()
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch((err) => {
        if (!cancelled) setErrorMsg(err.message || "History load nahi hui.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, token, fetchHistory]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop open">
      <div className="modal large">
        <span className="close" onClick={onClose}>
          &times;
        </span>
        <h3>आपकी जांचें / My Check History</h3>
        <div className="modal-body">
          {loading ? (
            <div className="empty-state">लोड हो रहा है… / Loading…</div>
          ) : errorMsg ? (
            <div className="empty-state">{errorMsg}</div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              Abhi koi history nahi — pehle ek eligibility check karo.
              <br />
              No checks yet — run an eligibility check first.
            </div>
          ) : (
            history.map((h) => {
              const ids = h.matched_scheme_ids || [];
              const chips = ids.length
                ? ids.map((id) => (
                    <span className="hist-match" key={id}>
                      {h.idToName[id] || id}
                    </span>
                  ))
                : [
                    <span className="hist-none" key="none">
                      No matches that time
                    </span>,
                  ];
              return (
                <div className="hist-card" key={h.id}>
                  <div className="hist-top">
                    <span className="hist-date">{formatDateTime(h.created_at)}</span>
                    <button className="hist-rerun" onClick={() => onRerun(h.input_data)}>
                      ↻ Re-run this
                    </button>
                  </div>
                  <p className="scheme-desc">
                    {ids.length} scheme{ids.length === 1 ? "" : "s"} matched
                  </p>
                  <div className="hist-matches">{chips}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
