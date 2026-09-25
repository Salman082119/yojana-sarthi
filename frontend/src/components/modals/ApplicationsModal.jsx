import { useState } from "react";
import { APP_STATUS_LABELS, APP_STATUS_OPTIONS } from "../../utils/constants";

export default function ApplicationsModal({
  isOpen,
  onClose,
  appsCache,
  onLoadApps,
  onChangeStatus,
  onDelete,
}) {
  const [filter, setFilter] = useState("");

  if (!isOpen) return null;

  async function refresh() {
    await onLoadApps();
  }

  const list = filter ? appsCache.filter((a) => a.status === filter) : appsCache;

  return (
    <div className="modal-backdrop open">
      <div className="modal large">
        <span className="close" onClick={onClose}>
          &times;
        </span>
        <h3>मेरी योजनाएं / My Applications</h3>
        <div className="app-filters">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Status: All</option>
            {APP_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button className="btn ghost" onClick={refresh}>
            ↻ Refresh
          </button>
        </div>
        <div className="modal-body">
          {list.length === 0 ? (
            <div className="empty-state">
              Abhi koi tracked scheme nahi — result card ke &quot;+ Track&quot; se add karein.
              <br />
              No tracked schemes yet — use &quot;+ Track&quot; on any scheme card.
            </div>
          ) : (
            list.map((a) => (
              <div className="app-card" key={a.id}>
                <div className="scheme-top">
                  <div>
                    <div className="tags">
                      <span className="tag category">{a.category || ""}</span>
                      <span className={`app-status ${a.status}`}>
                        {APP_STATUS_LABELS[a.status] || a.status}
                      </span>
                    </div>
                    <h3 className="scheme-name">{a.name}</h3>
                    <p className="scheme-name-hi">{a.name_hi || ""}</p>
                  </div>
                </div>
                {a.notes ? <p className="app-notes">Note: {a.notes}</p> : null}
                <div className="app-actions">
                  <select value={a.status} onChange={(e) => onChangeStatus(a.scheme_id, e.target.value)}>
                    {APP_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button className="btn danger" onClick={() => onDelete(a.scheme_id)}>
                    Remove
                  </button>
                  <a
                    className="scheme-link"
                    href={a.official_link || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginTop: 0 }}
                  >
                    Official Portal ↗
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
