import { useCallback } from "react";
import { STATES } from "../utils/states";
import {
  GENDER_OPTIONS,
  RESIDENCE_OPTIONS,
  CATEGORY_OPTIONS,
  EDUCATION_OPTIONS,
  OCCUPATION_OPTIONS,
} from "../utils/constants";
import "../styles/form.css";

export default function EligibilityForm({ formData, onChange, onSubmit, isChecking }) {
  const showLandSize = formData.landOwner || formData.occupation === "farmer";

  const handlePill = useCallback(
    (key, value) => {
      onChange(key, value);
    },
    [onChange]
  );

  return (
    <section className="ledger">
      <h2>अपनी जानकारी भरें</h2>
      <p className="sub">Fill in your details to check eligibility</p>

      <div className="field">
        <label>आयु / Age (years)</label>
        <input
          type="number"
          id="age"
          min="0"
          max="120"
          value={formData.age}
          onChange={(e) => onChange("age", e.target.value)}
        />
      </div>

      <div className="field">
        <label>लिंग / Gender</label>
        <div className="radio-row">
          {GENDER_OPTIONS.map((g) => (
            <div
              key={g.value}
              className={`pill${formData.gender === g.value ? " active" : ""}`}
              data-val={g.value}
              onClick={() => handlePill("gender", g.value)}
            >
              {g.label}
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <label>राज्य / State or UT</label>
        <select id="state" value={formData.state} onChange={(e) => onChange("state", e.target.value)}>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>क्षेत्र / Residence Area</label>
        <div className="radio-row">
          {RESIDENCE_OPTIONS.map((r) => (
            <div
              key={r.value}
              className={`pill${formData.residence === r.value ? " active" : ""}`}
              onClick={() => handlePill("residence", r.value)}
            >
              {r.label}
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <label>वार्षिक पारिवारिक आय / Annual Family Income (₹)</label>
        <input
          type="number"
          id="income"
          min="0"
          value={formData.income}
          onChange={(e) => onChange("income", e.target.value)}
        />
      </div>

      <div className="field">
        <label>शिक्षा / Education</label>
        <select
          id="education"
          value={formData.education}
          onChange={(e) => onChange("education", e.target.value)}
        >
          <option value="">— चुनें / Select —</option>
          {EDUCATION_OPTIONS.map((ed) => (
            <option key={ed.value} value={ed.value}>
              {ed.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>परिवार के सदस्य / Family Size (members)</label>
        <input
          type="number"
          id="familySize"
          min="1"
          max="30"
          placeholder="e.g. 4"
          value={formData.familySize}
          onChange={(e) => onChange("familySize", e.target.value)}
        />
      </div>

      {showLandSize && (
        <div className="field">
          <label>कृषि भूमि (एकड़ में) / Agricultural Land (acres)</label>
          <input
            type="number"
            id="landSizeAcres"
            min="0"
            step="0.1"
            placeholder="e.g. 1.5"
            value={formData.landSizeAcres}
            onChange={(e) => onChange("landSizeAcres", e.target.value)}
          />
        </div>
      )}

      <div className="field">
        <label>श्रेणी / Category</label>
        <div className="radio-row">
          {CATEGORY_OPTIONS.map((c) => (
            <div
              key={c.value}
              className={`pill${formData.category === c.value ? " active" : ""}`}
              onClick={() => handlePill("category", c.value)}
            >
              {c.label}
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <label>व्यवसाय / Occupation</label>
        <select
          id="occupation"
          value={formData.occupation}
          onChange={(e) => onChange("occupation", e.target.value)}
        >
          {OCCUPATION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>अतिरिक्त जानकारी / Additional details</label>
        <label className="check-inline">
          <input
            type="checkbox"
            id="landOwner"
            checked={formData.landOwner}
            onChange={(e) => onChange("landOwner", e.target.checked)}
          />
          कृषि भूमि है / Owns agricultural land
        </label>
        <label className="check-inline">
          <input
            type="checkbox"
            id="bpl"
            checked={formData.bpl}
            onChange={(e) => onChange("bpl", e.target.checked)}
          />
          BPL राशन कार्ड
        </label>
        <label className="check-inline">
          <input
            type="checkbox"
            id="disability"
            checked={formData.disability}
            onChange={(e) => onChange("disability", e.target.checked)}
          />
          दिव्यांग / Person with disability
        </label>
        <label className="check-inline">
          <input
            type="checkbox"
            id="widow"
            checked={formData.widow}
            onChange={(e) => onChange("widow", e.target.checked)}
          />
          विधवा / Widow
        </label>
        <label className="check-inline">
          <input
            type="checkbox"
            id="noPucca"
            checked={formData.noPucca}
            onChange={(e) => onChange("noPucca", e.target.checked)}
          />
          पक्का घर नहीं है / No pucca house
        </label>
      </div>

      <button className="submit-btn" id="checkBtn" onClick={onSubmit} disabled={isChecking}>
        {isChecking ? "जांच रहे हैं... Checking..." : "पात्रता जांचें — Check Eligibility"}
      </button>
    </section>
  );
}
