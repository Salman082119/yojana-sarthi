// lib/eligibility.js
// Pure eligibility-matching engine. No database or HTTP dependencies —
// can be unit-tested in isolation.

const MISSED_LABELS = {
  minAge: "minAge",
  maxAge: "maxAge",
  genders: "genders",
  states: "states",
  maxIncome: "maxIncome",
  categories: "categories",
  occupations: "occupations",
  landOwner: "requiresLandOwner",
  bpl: "requiresBPL",
  disability: "requiresDisability",
  widow: "requiresWidow",
  noPucca: "requiresNoPucca",
  residences: "residences",
  categoriesOrFemale: "categoriesOrFemale",
  bplOrCategories: "bplOrCategories",
  ageOrWidowOrDisability: "ageOrWidowOrDisability",
  minEducation: "minEducation",
  maxEducation: "maxEducation",
  minLandSize: "minLandSize",
  maxLandSize: "maxLandSize",
  minFamilySize: "minFamilySize",
  maxFamilySize: "maxFamilySize",
};

const EDUCATION_LEVELS = { none: 0, school: 1, hs: 2, graduate: 3, postgraduate: 4 };
const educIndex = (e) => (e && EDUCATION_LEVELS[e] !== undefined ? EDUCATION_LEVELS[e] : 0);

// Number of restriction keys a scheme actually checks (used for relevance %).
function countCriteria(criteria) {
  let n = 0;
  if (criteria.minAge !== undefined) n++;
  if (criteria.maxAge !== undefined) n++;
  if (criteria.genders) n++;
  if (criteria.states) n++;
  if (criteria.maxIncome !== undefined) n++;
  if (criteria.categories) n++;
  if (criteria.occupations) n++;
  if (criteria.residences) n++;
  if (criteria.requiresLandOwner) n++;
  if (criteria.requiresBPL) n++;
  if (criteria.requiresDisability) n++;
  if (criteria.requiresWidow) n++;
  if (criteria.requiresNoPucca) n++;
  if (criteria.categoriesOrFemale) n++;
  if (criteria.bplOrCategories) n++;
  if (criteria.ageOrWidowOrDisability !== undefined) n++;
  if (criteria.minEducation !== undefined) n++;
  if (criteria.maxEducation !== undefined) n++;
  if (criteria.minLandSize !== undefined) n++;
  if (criteria.maxLandSize !== undefined) n++;
  if (criteria.minFamilySize !== undefined) n++;
  if (criteria.maxFamilySize !== undefined) n++;
  return n;
}

// Evaluates a scheme's "criteria" object against the submitted answers.
// Returns an array of missed conditions (empty array = fully eligible).
function evaluateCriteria(criteria, u) {
  const missed = [];
  if (criteria.minAge !== undefined && (u.age === null || u.age < criteria.minAge))
    missed.push({ code: "minAge", label: MISSED_LABELS.minAge, value: criteria.minAge });
  if (criteria.maxAge !== undefined && (u.age === null || u.age > criteria.maxAge))
    missed.push({ code: "maxAge", label: MISSED_LABELS.maxAge, value: criteria.maxAge });

  if (criteria.genders && !criteria.genders.includes(u.gender))
    missed.push({ code: "genders", label: MISSED_LABELS.genders, value: criteria.genders });

  if (criteria.states && !criteria.states.includes(u.state))
    missed.push({ code: "states", label: MISSED_LABELS.states, value: criteria.states });

  if (criteria.maxIncome !== undefined) {
    if (u.income === null || u.income === undefined || u.income > criteria.maxIncome)
      missed.push({ code: "maxIncome", label: MISSED_LABELS.maxIncome, value: criteria.maxIncome });
  }

  if (criteria.categories && !criteria.categories.includes(u.category))
    missed.push({ code: "categories", label: MISSED_LABELS.categories, value: criteria.categories });

  if (criteria.occupations && !criteria.occupations.includes(u.occupation))
    missed.push({ code: "occupations", label: MISSED_LABELS.occupations, value: criteria.occupations });

  if (criteria.residences && !criteria.residences.includes(u.residence))
    missed.push({ code: "residences", label: MISSED_LABELS.residences, value: criteria.residences });

  if (criteria.minEducation !== undefined && educIndex(u.education) < educIndex(criteria.minEducation))
    missed.push({ code: "minEducation", label: MISSED_LABELS.minEducation, value: criteria.minEducation });
  if (criteria.maxEducation !== undefined && educIndex(u.education) > educIndex(criteria.maxEducation))
    missed.push({ code: "maxEducation", label: MISSED_LABELS.maxEducation, value: criteria.maxEducation });

  if (
    criteria.minLandSize !== undefined &&
    (u.landSizeAcres === null || u.landSizeAcres < criteria.minLandSize)
  )
    missed.push({ code: "minLandSize", label: MISSED_LABELS.minLandSize, value: criteria.minLandSize });
  if (
    criteria.maxLandSize !== undefined &&
    (u.landSizeAcres === null || u.landSizeAcres > criteria.maxLandSize)
  )
    missed.push({ code: "maxLandSize", label: MISSED_LABELS.maxLandSize, value: criteria.maxLandSize });

  if (
    criteria.minFamilySize !== undefined &&
    (u.familySize === null || u.familySize < criteria.minFamilySize)
  )
    missed.push({ code: "minFamilySize", label: MISSED_LABELS.minFamilySize, value: criteria.minFamilySize });
  if (
    criteria.maxFamilySize !== undefined &&
    (u.familySize === null || u.familySize > criteria.maxFamilySize)
  )
    missed.push({ code: "maxFamilySize", label: MISSED_LABELS.maxFamilySize, value: criteria.maxFamilySize });

  if (criteria.requiresLandOwner && !u.landOwner)
    missed.push({ code: "landOwner", label: MISSED_LABELS.landOwner });
  if (criteria.requiresBPL && !u.bpl) missed.push({ code: "bpl", label: MISSED_LABELS.bpl });
  if (criteria.requiresDisability && !u.disability)
    missed.push({ code: "disability", label: MISSED_LABELS.disability });
  if (criteria.requiresWidow && !u.widow) missed.push({ code: "widow", label: MISSED_LABELS.widow });
  if (criteria.requiresNoPucca && !u.noPucca) missed.push({ code: "noPucca", label: MISSED_LABELS.noPucca });

  if (criteria.categoriesOrFemale) {
    const catMatch = criteria.categoriesOrFemale.includes(u.category);
    if (!catMatch && u.gender !== "female")
      missed.push({
        code: "categoriesOrFemale",
        label: MISSED_LABELS.categoriesOrFemale,
        value: criteria.categoriesOrFemale,
      });
  }
  if (criteria.bplOrCategories) {
    const catMatch = criteria.bplOrCategories.includes(u.category);
    if (!u.bpl && !catMatch)
      missed.push({
        code: "bplOrCategories",
        label: MISSED_LABELS.bplOrCategories,
        value: criteria.bplOrCategories,
      });
  }
  if (criteria.ageOrWidowOrDisability !== undefined) {
    const ageOk = u.age !== null && u.age >= criteria.ageOrWidowOrDisability;
    if (!ageOk && !u.widow && !u.disability)
      missed.push({
        code: "ageOrWidowOrDisability",
        label: MISSED_LABELS.ageOrWidowOrDisability,
        value: criteria.ageOrWidowOrDisability,
      });
  }

  return missed;
}

// Special-case override for Ayushman Bharat style "income OR bpl" rule
function isEligibleSpecial(schemeId, criteria, u) {
  if (schemeId === "ayushman") {
    if (u.bpl) return { eligible: true, missed: [] };
    if (criteria.maxIncome !== undefined && u.income !== null && u.income !== undefined) {
      return u.income <= criteria.maxIncome
        ? { eligible: true, missed: [] }
        : { eligible: false, missed: [{ code: "maxIncome", label: "maxIncome", value: criteria.maxIncome }] };
    }
    return { eligible: false, missed: [{ code: "bpl", label: "requiresBPL" }] };
  }
  const missed = evaluateCriteria(criteria, u);
  return { eligible: missed.length === 0, missed };
}

// Evaluate a single scheme and return its score (relevance %).
function evaluateScheme(scheme, u) {
  const outcome = isEligibleSpecial(scheme.id, scheme.criteria, u);
  const total = countCriteria(scheme.criteria);
  const score = total === 0 ? 100 : Math.max(0, Math.round((100 * (total - outcome.missed.length)) / total));
  return { ...scheme, ...outcome, score };
}

// Evaluate all schemes and split into matches vs near-matches.
function evaluateAll(schemes, u) {
  const evaluated = schemes.map((s) => evaluateScheme(s, u));

  const matches = evaluated
    .filter((s) => s.eligible)
    .map(({ eligible: _e, missed: _m, ...rest }) => rest)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const nearMatches = evaluated
    .filter((s) => !s.eligible && s.missed.length > 0 && s.missed.length <= 2)
    .map(({ eligible: _e, ...rest }) => rest)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return { matches, nearMatches };
}

module.exports = {
  MISSED_LABELS,
  EDUCATION_LEVELS,
  countCriteria,
  evaluateCriteria,
  isEligibleSpecial,
  evaluateScheme,
  evaluateAll,
};
