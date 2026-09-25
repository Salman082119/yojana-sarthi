export function formatMissLabel(m, EDU_LABELS) {
  const v = m.value;
  const money = v !== undefined ? "₹" + Number(v).toLocaleString("en-IN") : "";
  switch (m.code) {
    case "minAge":
      return `आयु ${v}+ चाहिए / Min age ${v}`;
    case "maxAge":
      return `आयु ${v} से कम चाहिए / Max age ${v}`;
    case "genders":
      return `केवल ${v.join("/")} / Only ${v.join("/")}`;
    case "states":
      return `केवल ${v.join("/")} के लिए / Only for ${v.join("/")}`;
    case "maxIncome":
      return `आय ${money} से कम चाहिए / Income under ${money}`;
    case "categories":
      return `श्रेणी ${v.join("/").toUpperCase()} / Needs category ${v.join("/").toUpperCase()}`;
    case "occupations":
      return `व्यवसाय: ${v.join("/")} / Needs occupation ${v.join("/")}`;
    case "residences":
      return v.includes("rural")
        ? "ग्रामीण क्षेत्र चाहिए / Needs rural area"
        : "शहरी क्षेत्र चाहिए / Needs urban area";
    case "landOwner":
      return "कृषि भूमि चाहिए / Needs agri land";
    case "bpl":
      return "BPL कार्ड चाहिए / Needs BPL card";
    case "disability":
      return "दिव्यांग होने पर / Needs disability";
    case "widow":
      return "विधवा होने पर / Needs widow status";
    case "noPucca":
      return "पक्का घर नहीं होना चाहिए / Needs no pucca house";
    case "categoriesOrFemale":
      return `श्रेणी ${v.join("/").toUpperCase()} या महिला / Needs ${v.join("/").toUpperCase()} or female`;
    case "bplOrCategories":
      return `BPL या श्रेणी ${v.join("/").toUpperCase()} / Needs BPL or ${v.join("/").toUpperCase()}`;
    case "ageOrWidowOrDisability":
      return `आयु ${v}+ या विधवा/दिव्यांग / Age ${v}+ or widow/disabled`;
    case "minEducation":
      return `शिक्षा: ${EDU_LABELS[v] || v} चाहिए / Needs ${v} education`;
    case "maxEducation":
      return `शिक्षा ${EDU_LABELS[v] || v} से ज़्यादा नहीं / Max education ${v}`;
    case "minLandSize":
      return `कम से कम ${v} एकड़ भूमि / Needs ${v} acres land`;
    case "maxLandSize":
      return `ज़्यादा से ज़्यादा ${v} एकड़ भूमि / Max ${v} acres land`;
    case "minFamilySize":
      return `परिवार में कम से कम ${v} सदस्य / Min family size ${v}`;
    case "maxFamilySize":
      return `परिवार में अधिकतम ${v} सदस्य / Max family size ${v}`;
    default:
      return m.code;
  }
}

export function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}
