import { formatMissLabel } from "../utils/helpers";
import { EDU_LABELS } from "../utils/constants";

export default function NearMatchCard({ scheme, isTracked, onToggleTrack }) {
  const levelTag =
    scheme.level === "central" ? (
      <span className="tag central">Central</span>
    ) : (
      <span className="tag state">{scheme.state}</span>
    );
  const chips = (scheme.missed || []).map((m, i) => (
    <span className="miss-chip" key={i}>
      {formatMissLabel(m, EDU_LABELS)}
    </span>
  ));
  const score = typeof scheme.score === "number" ? <span className="match-chip">{scheme.score}%</span> : null;

  const docs = (scheme.documents || []).length ? (
    <details className="scheme-dets">
      <summary>📄 आवश्यक दस्तावेज़ / Required Documents</summary>
      <ul className="dets-list">
        {scheme.documents.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
    </details>
  ) : null;

  const steps = (scheme.steps || []).length ? (
    <details className="scheme-dets">
      <summary>➜ आवेदन कैसे करें / How to Apply</summary>
      <ol className="dets-list">
        {scheme.steps.map((st, i) => (
          <li key={i}>{st}</li>
        ))}
      </ol>
    </details>
  ) : null;

  let trackBtn = null;
  if (onToggleTrack) {
    const tracked = isTracked ? isTracked(scheme.id) : false;
    trackBtn = (
      <button
        className={`track-btn${tracked ? " tracked" : ""}`}
        data-scheme={scheme.id}
        onClick={() => onToggleTrack(scheme.id)}
      >
        {tracked ? "✓ Tracked" : "+ Track"}
      </button>
    );
  }

  return (
    <div className="scheme-card">
      <div className={""}>
        <div>
          <div className="tags">
            {levelTag}
            <span className="tag category">{scheme.category}</span>
            {score}
          </div>
          <h3 className="scheme-name">{scheme.name}</h3>
          <p className="scheme-name-hi">{scheme.name_hi || ""}</p>
        </div>
      </div>
      <div className="miss-list">{chips}</div>
      <p className="scheme-desc">{scheme.description}</p>
      <p className="scheme-meta">
        <b>Ministry/Dept:</b> {scheme.ministry}
      </p>
      {docs}
      {steps}
      <div className="card-actions">
        <a className="scheme-link" href={scheme.official_link} target="_blank" rel="noopener noreferrer">
          Official Portal ↗
        </a>
        {trackBtn}
      </div>
    </div>
  );
}
