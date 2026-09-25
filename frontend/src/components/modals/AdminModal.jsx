import { useCallback, useEffect, useState } from "react";
import "../../styles/admin.css";

function BarsFor({ rows, labelKey }) {
  if (!rows || !rows.length) return <p className="app-notes">No data yet.</p>;
  const max = Math.max(...rows.map((r) => r.n));
  return rows.map((r, i) => {
    const w = Math.max(2, Math.round((r.n / max) * 100));
    return (
      <div className="bar-row" key={i}>
        <span className="barlabel">{r[labelKey] || "–"}</span>
        <span className="barwrap">
          <span className="bar" style={{ width: `${w}%` }} />
        </span>
        <span className="barval">{r.n}</span>
      </div>
    );
  });
}

export default function AdminModal({ isOpen, onClose, token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Access denied.");
    return d;
  }, [token]);

  useEffect(() => {
    if (!(isOpen && token)) return;
    let cancelled = false;
    fetchStats()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, token, fetchStats]);

  if (!isOpen) return null;

  // Signing out mid-session is the only way to reach this without a token.
  const needsLogin = !token;
  const viewLoading = loading && !needsLogin;
  const viewError = needsLogin ? "Login required." : error;

  return (
    <div className="modal-backdrop open">
      <div className="modal large">
        <span className="close" onClick={onClose}>
          &times;
        </span>
        <h3>Admin Dashboard — Analytics</h3>
        <div className="modal-body">
          <div id="adminContent">
            {viewLoading ? (
              <div className="empty-state">लोड हो रहा है… / Loading…</div>
            ) : viewError ? (
              <div className="empty-state">{viewError}</div>
            ) : data ? (
              <>
                <div className="admin-grid">
                  <div className="stat-card">
                    <div className="num">{data.users}</div>
                    <div className="lbl">Users</div>
                  </div>
                  <div className="stat-card">
                    <div className="num">{data.checks}</div>
                    <div className="lbl">Eligibility checks</div>
                  </div>
                  <div className="stat-card">
                    <div className="num">{data.applications}</div>
                    <div className="lbl">Tracked applications</div>
                  </div>
                  <div className="stat-card">
                    <div className="num">{data.schemes}</div>
                    <div className="lbl">Schemes</div>
                  </div>
                </div>
                <div className="admin-section">
                  <h4>Checks — last 7 days</h4>
                  <BarsFor rows={data.trend} labelKey="day" />
                </div>
                <div className="admin-section">
                  <h4>Most matched schemes</h4>
                  <BarsFor rows={data.topSchemes} labelKey="name" />
                </div>
                <div className="admin-section">
                  <h4>State-wise checks</h4>
                  <BarsFor rows={data.topStates} labelKey="state" />
                </div>
                <div className="admin-section">
                  <h4>Category-wise checks</h4>
                  <BarsFor rows={data.topCategories} labelKey="category" />
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
