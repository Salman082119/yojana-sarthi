import SchemeCard from "./SchemeCard";
import NearMatchCard from "./NearMatchCard";
import "../styles/components.css";

export default function ResultsPanel({
  result,
  schemeTotal,
  error,
  onShare,
  onPrint,
  isTracked,
  onToggleTrack,
}) {
  const hasMatches = result && result.matches && result.matches.length > 0;
  const hasNear = result && result.nearMatches && result.nearMatches.length > 0;

  return (
    <section>
      <div className="results-head">
        <h2>पात्र योजनाएं</h2>
        <div className="result-actions">
          <button id="shareBtn" onClick={onShare} disabled={!result}>
            Share
          </button>
          <button id="printBtn" onClick={onPrint} disabled={!result}>
            Print / PDF
          </button>
          {result && (
            <span className="results-count mono" id="resultsCount">
              {result.count} MATCH{result.count === 1 ? "" : "ES"}
            </span>
          )}
        </div>
      </div>
      <p className="results-sub">
        Live results from the database — <span id="schemeTotal">{schemeTotal}</span> schemes loaded.
      </p>

      <div id="resultsArea">
        {error ? (
          <div className="empty-state">{error}</div>
        ) : !result ? (
          <div className="empty-state">
            बाईं ओर फॉर्म भरें और &quot;पात्रता जांचें&quot; दबाएं।
            <br />
            Fill the form and press &quot;Check Eligibility&quot;.
          </div>
        ) : !hasMatches ? (
          <div className="empty-state">
            आपकी जानकारी के अनुसार कोई योजना मेल नहीं खाई।
            <br />
            No schemes matched your details.
          </div>
        ) : (
          <div className="scheme-grid">
            {result.matches.map((s) => (
              <SchemeCard
                key={s.id}
                scheme={s}
                showStamp
                isTracked={isTracked}
                onToggleTrack={onToggleTrack}
              />
            ))}
          </div>
        )}
      </div>

      {hasNear && (
        <div id="nearArea" className="near-area">
          <div className="near-head">
            <h3>करीब पास हुईं / Almost Eligible</h3>
            <span className="near-count mono">
              {result.nearCount} NEAR{result.nearCount === 1 ? "" : "S"}
            </span>
          </div>
          <p className="near-sub">
            Sirf ek-do shart aapme poori nahi — agar wo pooree kar lein, ye yojanaen milein.
            <br />
            You were just one or two conditions short of these schemes.
          </p>
          <div className="scheme-grid">
            {result.nearMatches.map((s) => (
              <NearMatchCard key={s.id} scheme={s} isTracked={isTracked} onToggleTrack={onToggleTrack} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
