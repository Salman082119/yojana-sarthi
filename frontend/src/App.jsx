import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { apiGet, apiPost, apiPatch, apiDelete } from "./utils/api";
import { useModal } from "./hooks/useModal";
import Header from "./components/Header";
import EligibilityForm from "./components/EligibilityForm";
import ResultsPanel from "./components/ResultsPanel";
import Footer from "./components/Footer";
import AuthModal from "./components/modals/AuthModal";
import BrowseModal from "./components/modals/BrowseModal";
import HistoryModal from "./components/modals/HistoryModal";
import ApplicationsModal from "./components/modals/ApplicationsModal";
import AdminModal from "./components/modals/AdminModal";

const EMPTY_FORM = {
  age: "",
  gender: null,
  state: "All-India / Central Only",
  residence: null,
  income: "",
  education: "",
  familySize: "",
  landSizeAcres: "",
  category: null,
  occupation: "farmer",
  landOwner: false,
  bpl: false,
  disability: false,
  widow: false,
  noPucca: false,
};

// Email links deep-link with #reset?token=... or #verify?token=..., so the auth
// modal must open on load even though the user never clicked "Login".
function opensAuthFromHash() {
  const hash = window.location.hash || "";
  return hash.startsWith("#reset?") || hash.startsWith("#verify?");
}

// The service worker is a progressive enhancement: it only works on a secure
// origin, so registration is skipped on plain-http LAN addresses.
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const isSecure =
    location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (!isSecure) return;
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    },
    { once: true }
  );
}

export default function App() {
  const { token, user, isAdmin, login, register, logout } = useAuth();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [result, setResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [schemeTotal, setSchemeTotal] = useState("...");
  const [appsCache, setAppsCache] = useState([]);
  const [error, setError] = useState("");
  const [verifyNote, setVerifyNote] = useState("");

  const authModal = useModal(opensAuthFromHash());
  const browseModal = useModal();
  const historyModal = useModal();
  const applicationsModal = useModal();
  const adminModal = useModal();
  const printAreaRef = useRef(null);
  const schemesCacheRef = useRef(null);

  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Stable identity: the modals put this in effect dependency lists, so a new
  // function on every render would refetch in a loop.
  const loadSchemes = useCallback(async () => {
    if (schemesCacheRef.current) return schemesCacheRef.current;
    const data = await apiGet("/api/schemes");
    schemesCacheRef.current = data.schemes;
    return data.schemes;
  }, []);

  const loadApplicationsSilently = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiGet("/api/applications");
      setAppsCache(data.applications || []);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    registerServiceWorker();
    let cancelled = false;
    // Priming the cache here means the Browse/History modals usually render
    // from the ref without a second round trip.
    apiGet("/api/schemes")
      .then((data) => {
        if (cancelled) return;
        schemesCacheRef.current = data.schemes;
        setSchemeTotal(data.total);
      })
      .catch(() => {
        if (!cancelled) setSchemeTotal("?");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiGet("/api/applications")
      .then((data) => {
        if (!cancelled) setAppsCache(data.applications || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (printAreaRef.current) {
      window.print();
    }
  }, [result]);

  function handleLogout() {
    logout();
    setAppsCache([]);
    setVerifyNote("");
  }

  async function resendVerification() {
    setVerifyNote("");
    try {
      await apiPost("/api/auth/resend-verification", {});
      setVerifyNote("Verification link bhej diya. Apna inbox check karein.");
    } catch (e) {
      setVerifyNote(e.message || "Link nahi bheja ja saka. Thodi der baad try karein.");
    }
  }

  async function runCheck() {
    setIsChecking(true);
    setError("");
    try {
      const payload = { ...formData };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "" || payload[k] === null) payload[k] = null;
      });
      const data = await apiPost("/api/check", payload);
      setResult(data);
    } catch {
      setError("Server se connect nahi ho paya. Backend chalu hai check karein.");
      setResult(null);
    } finally {
      setIsChecking(false);
    }
  }

  async function toggleTrack(schemeId) {
    if (!token) {
      authModal.open();
      return { needsLogin: true };
    }
    const idx = appsCache.findIndex((a) => a.scheme_id === schemeId);
    const wasTracked = idx !== -1;
    try {
      if (wasTracked) {
        await apiDelete(`/api/applications/${encodeURIComponent(schemeId)}`);
      } else {
        await apiPost("/api/applications", { scheme_id: schemeId, status: "saved" });
      }
      await loadApplicationsSilently();
      return { tracked: !wasTracked };
    } catch (e) {
      return { error: e.message };
    }
  }

  function isTracked(schemeId) {
    return appsCache.some((a) => a.scheme_id === schemeId);
  }

  async function changeAppStatus(schemeId, status) {
    try {
      await apiPatch(`/api/applications/${encodeURIComponent(schemeId)}`, { status });
      await loadApplicationsSilently();
    } catch (e) {
      alert(e.message || "Status update nahi hua.");
    }
  }

  async function deleteApp(schemeId) {
    try {
      await apiDelete(`/api/applications/${encodeURIComponent(schemeId)}`);
      await loadApplicationsSilently();
    } catch (e) {
      alert(e.message || "Delete nahi hua.");
    }
  }

  function rerunCheck(inputData) {
    setFormData({
      age: inputData.age ?? "",
      gender: inputData.gender ?? null,
      state: inputData.state || "All-India / Central Only",
      residence: inputData.residence ?? null,
      income: inputData.income ?? "",
      education: inputData.education || "",
      familySize: inputData.familySize ?? "",
      landSizeAcres: inputData.landSizeAcres ?? "",
      category: inputData.category ?? null,
      occupation: inputData.occupation || "farmer",
      landOwner: !!inputData.landOwner,
      bpl: !!inputData.bpl,
      disability: !!inputData.disability,
      widow: !!inputData.widow,
      noPucca: !!inputData.noPucca,
    });
    historyModal.close();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => runCheck(), 0);
  }

  function shareResults() {
    if (!result) return;
    const lines = ["योजना सारथी — पात्र योजनाएं / Eligible Schemes:"];
    if (result.count === 0) lines.push("कोई योजना नहीं मिली / No schemes matched.");
    result.matches.forEach((m) => {
      lines.push(`• ${m.name}${m.official_link ? " — " + m.official_link : ""}`);
    });
    const text = lines.join("\n");
    if (navigator.share) {
      navigator.share({ title: "Yojana Saarthi — Eligible Schemes", text }).catch(() => {});
    } else {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          alert("Result clipboard par copy ho gaya / Results copied to clipboard.");
        })
        .catch(() => {});
    }
  }

  function printResults() {
    if (!result) return;
    const head = `
      <h1>योजना सारथी — Eligible Schemes (पात्र योजनाएं)</h1>
      <p class="p-sub">Checked on ${new Date().toLocaleDateString("en-IN")} at ${new Date().toLocaleTimeString("en-IN")} — ${result.count} eligible, ${result.nearCount} almost eligible.</p>`;
    const list = result.matches.length
      ? result.matches
          .map(
            (m) => `
            <div class="p-scheme">
              <h3>${m.name}${m.name_hi ? " (" + m.name_hi + ")" : ""}</h3>
              <p>${m.description}</p>
              <p><b>Ministry:</b> ${m.ministry} &nbsp;•&nbsp; <b>Level:</b> ${m.level === "central" ? "Central" : m.state}</p>
              <p>Official portal: <a href="${m.official_link}">${m.official_link}</a></p>
            </div>`
          )
          .join("")
      : `<p>कोई योजना नहीं मिली। / No schemes matched this time.</p>`;
    const foot = `<p class="p-foot">This is a general guidance tool — always verify eligibility on the official portal before applying.</p>`;
    if (printAreaRef.current) {
      printAreaRef.current.innerHTML = head + list + foot;
      window.print();
    }
  }

  return (
    <>
      <Header
        user={user}
        isAdmin={isAdmin}
        onAuth={authModal.open}
        onBrowse={browseModal.open}
        onApplications={applicationsModal.open}
        onHistory={historyModal.open}
        onAdmin={adminModal.open}
        onLogout={handleLogout}
      />

      {token && user && user.email_verified === false && (
        <div className="verify-banner">
          <span>Email abhi verify nahi hua hai. Inbox mein verification link check karein.</span>
          <button type="button" onClick={resendVerification}>
            Resend verification link
          </button>
          {verifyNote && <span className="verify-note">{verifyNote}</span>}
        </div>
      )}

      <div className="disclaimer">
        <b>जानकारी हेतु / For information only:</b> यह टूल एक सामान्य मार्गदर्शक है। आवेदन से पहले आधिकारिक
        पोर्टल पर पात्रता की पुष्टि करें। This is a guidance tool — always verify on the scheme&apos;s
        official portal before applying.
      </div>

      <main className="page-main">
        <EligibilityForm
          formData={formData}
          onChange={updateField}
          onSubmit={runCheck}
          isChecking={isChecking}
        />

        <ResultsPanel
          result={result}
          schemeTotal={schemeTotal}
          error={error}
          onShare={shareResults}
          onPrint={printResults}
          isTracked={isTracked}
          onToggleTrack={toggleTrack}
          token={token}
        />
      </main>

      <Footer />
      <div id="printArea" ref={printAreaRef} />

      {authModal.isOpen && (
        <AuthModal
          isOpen={authModal.isOpen}
          onClose={authModal.close}
          onLogin={login}
          onRegister={register}
        />
      )}
      {browseModal.isOpen && (
        <BrowseModal
          isOpen={browseModal.isOpen}
          onClose={browseModal.close}
          loadSchemes={loadSchemes}
          isTracked={isTracked}
          onToggleTrack={toggleTrack}
        />
      )}
      {historyModal.isOpen && (
        <HistoryModal
          isOpen={historyModal.isOpen}
          onClose={historyModal.close}
          token={token}
          onRerun={rerunCheck}
          loadSchemes={loadSchemes}
        />
      )}
      {applicationsModal.isOpen && (
        <ApplicationsModal
          isOpen={applicationsModal.isOpen}
          onClose={applicationsModal.close}
          appsCache={appsCache}
          onLoadApps={loadApplicationsSilently}
          onChangeStatus={changeAppStatus}
          onDelete={deleteApp}
        />
      )}
      {adminModal.isOpen && (
        <AdminModal isOpen={adminModal.isOpen} onClose={adminModal.close} token={token} />
      )}
    </>
  );
}
