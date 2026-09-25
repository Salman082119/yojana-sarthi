export default function Header({
  user,
  isAdmin,
  onAuth,
  onBrowse,
  onApplications,
  onHistory,
  onAdmin,
  onLogout,
}) {
  return (
    <header>
      <div className="header-row">
        <div className="brand">
          <div className="emblem">यो</div>
          <div>
            <h1>
              योजना सारथी{" "}
              <span style={{ fontSize: "15px", fontWeight: 400, color: "#c9bfa0" }}>Yojana Saarthi</span>
            </h1>
            <p className="tagline">Government Scheme Eligibility Register</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="nav-btn" onClick={onBrowse}>
            सभी योजनाएं / All Schemes
          </button>
          <div className="auth-box">
            {user && user.name ? (
              <>
                <span className="userchip">Hi, {user.name}</span>
                <button onClick={onApplications}>My Applications</button>
                <button onClick={onHistory}>My History</button>
                {isAdmin && <button onClick={onAdmin}>Admin</button>}
                <button onClick={onLogout}>Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => onAuth("login")}>Login</button>
                <button onClick={() => onAuth("register")}>Register</button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
