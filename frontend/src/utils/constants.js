export const EDUCATION_OPTIONS = [
  { value: "none", label: "कोई औपचारिक शिक्षा नहीं / No formal education" },
  { value: "school", label: "10वीं तक / Up to 10th" },
  { value: "hs", label: "12वीं पास / 12th (High School/Intermediate)" },
  { value: "graduate", label: "स्नातक / Graduate" },
  { value: "postgraduate", label: "स्नातकोत्तर / Postgraduate" },
];

export const OCCUPATION_OPTIONS = [
  { value: "farmer", label: "किसान / Farmer" },
  { value: "student", label: "विद्यार्थी / Student" },
  { value: "laborer", label: "दिहाड़ी मजदूर / Daily Wage Laborer" },
  { value: "unemployed", label: "बेरोजगार / Unemployed" },
  { value: "self_employed", label: "स्वरोजगार / Self-employed" },
  { value: "private_salaried", label: "निजी नौकरी / Private Salaried" },
  { value: "govt_employee", label: "सरकारी कर्मचारी / Govt. Employee" },
  { value: "homemaker", label: "गृहिणी / Homemaker" },
  { value: "retired", label: "सेवानिवृत्त / Retired" },
];

export const CATEGORY_OPTIONS = [
  { value: "general", label: "सामान्य / General" },
  { value: "obc", label: "OBC" },
  { value: "sc", label: "SC" },
  { value: "st", label: "ST" },
  { value: "ews", label: "EWS" },
];

export const GENDER_OPTIONS = [
  { value: "male", label: "पुरुष / Male" },
  { value: "female", label: "महिला / Female" },
  { value: "other", label: "अन्य / Other" },
];

export const RESIDENCE_OPTIONS = [
  { value: "rural", label: "ग्रामीण / Rural" },
  { value: "urban", label: "शहरी / Urban" },
];

export const EDU_LABELS = {
  none: "No formal education",
  school: "Up to 10th",
  hs: "12th pass",
  graduate: "Graduate",
  postgraduate: "Postgraduate",
};

export const APP_STATUS_LABELS = {
  saved: "Saved",
  applied: "Applied",
  documents_pending: "Documents Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const APP_STATUS_OPTIONS = Object.entries(APP_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));
