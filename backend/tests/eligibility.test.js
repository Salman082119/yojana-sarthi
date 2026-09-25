import { describe, it, expect } from "vitest";
import {
  countCriteria,
  evaluateCriteria,
  isEligibleSpecial,
  evaluateScheme,
  evaluateAll,
} from "../lib/eligibility.js";

const baseUser = {
  age: 30,
  gender: "male",
  state: "Delhi (NCT)",
  income: 100000,
  category: "general",
  occupation: "private_salaried",
  residence: "urban",
  education: "graduate",
  landSizeAcres: null,
  familySize: 4,
  landOwner: false,
  bpl: false,
  disability: false,
  widow: false,
  noPucca: false,
};

function user(overrides = {}) {
  return { ...baseUser, ...overrides };
}

function scheme(criteria, id = "test-scheme") {
  return {
    id,
    name: `Scheme ${id}`,
    name_hi: "योजना",
    level: "central",
    state: null,
    ministry: "Test Ministry",
    category: "Test",
    description: "Test scheme",
    official_link: "https://example.com",
    documents: [],
    steps: [],
    criteria,
  };
}

describe("countCriteria", () => {
  it("counts zero when no criteria are set", () => {
    expect(countCriteria({})).toBe(0);
  });

  it("counts each present criterion exactly once", () => {
    expect(
      countCriteria({
        minAge: 18,
        maxAge: 60,
        genders: ["female"],
        states: ["UP"],
        maxIncome: 500000,
      })
    ).toBe(5);
  });

  it("ignores undefined / falsy criteria", () => {
    expect(countCriteria({ minAge: 10, genders: undefined, bpl: false })).toBe(1);
  });

  it("counts compound criteria", () => {
    expect(
      countCriteria({
        categoriesOrFemale: ["sc", "st"],
        bplOrCategories: ["obc"],
        ageOrWidowOrDisability: 40,
      })
    ).toBe(3);
  });
});

describe("evaluateCriteria - age", () => {
  it("minAge is satisfied when age >= threshold", () => {
    expect(evaluateCriteria({ minAge: 18 }, user({ age: 25 }))).toHaveLength(0);
  });

  it("minAge is missed when age < threshold", () => {
    const missed = evaluateCriteria({ minAge: 18 }, user({ age: 15 }));
    expect(missed).toHaveLength(1);
    expect(missed[0]).toMatchObject({ code: "minAge", value: 18 });
  });

  it("minAge is missed when age is null", () => {
    expect(evaluateCriteria({ minAge: 18 }, user({ age: null }))).toHaveLength(1);
  });

  it("maxAge is satisfied when age <= threshold", () => {
    expect(evaluateCriteria({ maxAge: 60 }, user({ age: 45 }))).toHaveLength(0);
  });

  it("maxAge is missed when age > threshold", () => {
    expect(evaluateCriteria({ maxAge: 60 }, user({ age: 65 }))).toHaveLength(1);
  });

  it("inside age window passes", () => {
    expect(evaluateCriteria({ minAge: 18, maxAge: 60 }, user({ age: 30 }))).toHaveLength(0);
  });

  it("outside age window fails on the right side", () => {
    const missed = evaluateCriteria({ minAge: 18, maxAge: 60 }, user({ age: 70 }));
    expect(missed.map((m) => m.code)).toContain("maxAge");
  });
});

describe("evaluateCriteria - gender", () => {
  it("satisfies when user gender is in allowed list", () => {
    expect(evaluateCriteria({ genders: ["male", "female"] }, user({ gender: "female" }))).toHaveLength(0);
  });

  it("misses when user gender is not in allowed list", () => {
    const missed = evaluateCriteria({ genders: ["female"] }, user({ gender: "male" }));
    expect(missed[0]).toMatchObject({ code: "genders", value: ["female"] });
  });
});

describe("evaluateCriteria - state", () => {
  it("satisfies when user state is in allowed list", () => {
    expect(evaluateCriteria({ states: ["UP", "Bihar"] }, user({ state: "Bihar" }))).toHaveLength(0);
  });

  it("misses when user state is not in allowed list", () => {
    expect(evaluateCriteria({ states: ["UP"] }, user({ state: "Kerala" }))).toHaveLength(1);
  });
});

describe("evaluateCriteria - income", () => {
  it("satisfies when income <= threshold", () => {
    expect(evaluateCriteria({ maxIncome: 300000 }, user({ income: 250000 }))).toHaveLength(0);
  });

  it("satisfies when income exactly equals threshold", () => {
    expect(evaluateCriteria({ maxIncome: 300000 }, user({ income: 300000 }))).toHaveLength(0);
  });

  it("misses when income > threshold", () => {
    expect(evaluateCriteria({ maxIncome: 300000 }, user({ income: 350000 }))).toHaveLength(1);
  });

  it("misses when income is null", () => {
    expect(evaluateCriteria({ maxIncome: 300000 }, user({ income: null }))).toHaveLength(1);
  });
});

describe("evaluateCriteria - category", () => {
  it("satisfies when user category is in allowed list", () => {
    expect(evaluateCriteria({ categories: ["sc", "st"] }, user({ category: "st" }))).toHaveLength(0);
  });

  it("misses when user category is not in allowed list", () => {
    expect(evaluateCriteria({ categories: ["sc"] }, user({ category: "general" }))).toHaveLength(1);
  });
});

describe("evaluateCriteria - occupation", () => {
  it("satisfies when occupation matches", () => {
    expect(evaluateCriteria({ occupations: ["farmer"] }, user({ occupation: "farmer" }))).toHaveLength(0);
  });

  it("misses when occupation does not match", () => {
    expect(evaluateCriteria({ occupations: ["farmer"] }, user({ occupation: "student" }))).toHaveLength(1);
  });
});

describe("evaluateCriteria - residence", () => {
  it("rural scheme matches rural user", () => {
    expect(evaluateCriteria({ residences: ["rural"] }, user({ residence: "rural" }))).toHaveLength(0);
  });

  it("rural scheme misses urban user", () => {
    expect(evaluateCriteria({ residences: ["rural"] }, user({ residence: "urban" }))).toHaveLength(1);
  });

  it("urban scheme matches urban user", () => {
    expect(evaluateCriteria({ residences: ["urban"] }, user({ residence: "urban" }))).toHaveLength(0);
  });
});

describe("evaluateCriteria - education", () => {
  it("minEducation satisfied when education level is higher", () => {
    expect(evaluateCriteria({ minEducation: "hs" }, user({ education: "graduate" }))).toHaveLength(0);
  });

  it("minEducation satisfied at exact boundary", () => {
    expect(evaluateCriteria({ minEducation: "hs" }, user({ education: "hs" }))).toHaveLength(0);
  });

  it("minEducation missed when below", () => {
    expect(evaluateCriteria({ minEducation: "hs" }, user({ education: "school" }))).toHaveLength(1);
  });

  it("maxEducation satisfied when equal", () => {
    expect(evaluateCriteria({ maxEducation: "graduate" }, user({ education: "graduate" }))).toHaveLength(0);
  });

  it("maxEducation missed when above", () => {
    expect(evaluateCriteria({ maxEducation: "hs" }, user({ education: "postgraduate" }))).toHaveLength(1);
  });
});

describe("evaluateCriteria - land size", () => {
  it("minLandSize satisfied when land == threshold", () => {
    expect(evaluateCriteria({ minLandSize: 1 }, user({ landSizeAcres: 1 }))).toHaveLength(0);
  });

  it("minLandSize satisfied when land > threshold", () => {
    expect(evaluateCriteria({ minLandSize: 1 }, user({ landSizeAcres: 2.5 }))).toHaveLength(0);
  });

  it("minLandSize missed when land < threshold", () => {
    expect(evaluateCriteria({ minLandSize: 1 }, user({ landSizeAcres: 0.5 }))).toHaveLength(1);
  });

  it("minLandSize missed when land is null", () => {
    expect(evaluateCriteria({ minLandSize: 1 }, user({ landSizeAcres: null }))).toHaveLength(1);
  });

  it("maxLandSize missed when land > cap", () => {
    expect(evaluateCriteria({ maxLandSize: 5 }, user({ landSizeAcres: 6 }))).toHaveLength(1);
  });
});

describe("evaluateCriteria - family size", () => {
  it("minFamilySize satisfied when family == threshold", () => {
    expect(evaluateCriteria({ minFamilySize: 4 }, user({ familySize: 4 }))).toHaveLength(0);
  });

  it("minFamilySize missed when below", () => {
    expect(evaluateCriteria({ minFamilySize: 4 }, user({ familySize: 2 }))).toHaveLength(1);
  });

  it("maxFamilySize missed when above", () => {
    expect(evaluateCriteria({ maxFamilySize: 4 }, user({ familySize: 6 }))).toHaveLength(1);
  });
});

describe("evaluateCriteria - boolean flags", () => {
  it("requiresLandOwner missed when user is not landowner", () => {
    expect(evaluateCriteria({ requiresLandOwner: true }, user({ landOwner: false }))).toHaveLength(1);
  });

  it("requiresLandOwner satisfied when user is landowner", () => {
    expect(evaluateCriteria({ requiresLandOwner: true }, user({ landOwner: true }))).toHaveLength(0);
  });

  it("requiresBPL missed when user has no BPL card", () => {
    expect(evaluateCriteria({ requiresBPL: true }, user({ bpl: false }))).toHaveLength(1);
  });

  it("requiresBPL satisfied with BPL card", () => {
    expect(evaluateCriteria({ requiresBPL: true }, user({ bpl: true }))).toHaveLength(0);
  });

  it("requiresDisability missed without disability", () => {
    expect(evaluateCriteria({ requiresDisability: true }, user({ disability: false }))).toHaveLength(1);
  });

  it("requiresWidow missed without widow status", () => {
    expect(evaluateCriteria({ requiresWidow: true }, user({ widow: false }))).toHaveLength(1);
  });

  it("requiresNoPucca missed with pucca house", () => {
    expect(evaluateCriteria({ requiresNoPucca: true }, user({ noPucca: false }))).toHaveLength(1);
  });
});

describe("evaluateCriteria - compound conditions", () => {
  it("categoriesOrFemale passes with matching category", () => {
    expect(
      evaluateCriteria({ categoriesOrFemale: ["sc"] }, user({ category: "sc", gender: "male" }))
    ).toHaveLength(0);
  });

  it("categoriesOrFemale passes with female regardless of category", () => {
    expect(
      evaluateCriteria({ categoriesOrFemale: ["sc"] }, user({ category: "general", gender: "female" }))
    ).toHaveLength(0);
  });

  it("categoriesOrFemale fails with male non-matching category", () => {
    expect(
      evaluateCriteria({ categoriesOrFemale: ["sc"] }, user({ category: "general", gender: "male" }))
    ).toHaveLength(1);
  });

  it("bplOrCategories passes with BPL card", () => {
    expect(
      evaluateCriteria({ bplOrCategories: ["obc"] }, user({ category: "general", bpl: true }))
    ).toHaveLength(0);
  });

  it("bplOrCategories passes with matching category", () => {
    expect(
      evaluateCriteria({ bplOrCategories: ["obc"] }, user({ category: "obc", bpl: false }))
    ).toHaveLength(0);
  });

  it("bplOrCategories fails with neither", () => {
    expect(
      evaluateCriteria({ bplOrCategories: ["obc"] }, user({ category: "general", bpl: false }))
    ).toHaveLength(1);
  });

  it("ageOrWidowOrDisability passes for old enough", () => {
    expect(
      evaluateCriteria({ ageOrWidowOrDisability: 60 }, user({ age: 65, widow: false, disability: false }))
    ).toHaveLength(0);
  });

  it("ageOrWidowOrDisability passes for widow under age", () => {
    expect(evaluateCriteria({ ageOrWidowOrDisability: 60 }, user({ age: 30, widow: true }))).toHaveLength(0);
  });

  it("ageOrWidowOrDisability passes for disabled under age", () => {
    expect(
      evaluateCriteria({ ageOrWidowOrDisability: 60 }, user({ age: 30, disability: true }))
    ).toHaveLength(0);
  });

  it("ageOrWidowOrDisability fails for young non-widow non-disabled", () => {
    expect(
      evaluateCriteria({ ageOrWidowOrDisability: 60 }, user({ age: 30, widow: false, disability: false }))
    ).toHaveLength(1);
  });
});

describe("isEligibleSpecial - Ayushman (income OR BPL)", () => {
  const ayushmanCriteria = { maxIncome: 250000 };

  it("eligible when user has BPL card regardless of income", () => {
    const result = isEligibleSpecial("ayushman", ayushmanCriteria, user({ bpl: true, income: 999999 }));
    expect(result.eligible).toBe(true);
    expect(result.missed).toHaveLength(0);
  });

  it("eligible when income <= threshold without BPL", () => {
    const result = isEligibleSpecial("ayushman", ayushmanCriteria, user({ bpl: false, income: 200000 }));
    expect(result.eligible).toBe(true);
  });

  it("not eligible when income > threshold and no BPL", () => {
    const result = isEligibleSpecial("ayushman", ayushmanCriteria, user({ bpl: false, income: 300000 }));
    expect(result.eligible).toBe(false);
    expect(result.missed[0].code).toBe("maxIncome");
  });

  it("not eligible when no income and no BPL", () => {
    const result = isEligibleSpecial("ayushman", ayushmanCriteria, user({ bpl: false, income: null }));
    expect(result.eligible).toBe(false);
    expect(result.missed[0].code).toBe("bpl");
  });
});

describe("evaluateScheme - scoring", () => {
  it("returns 100% when scheme has no criteria", () => {
    const s = scheme({});
    const result = evaluateScheme(s, baseUser);
    expect(result.eligible).toBe(true);
    expect(result.score).toBe(100);
  });

  it("returns 100% when fully matched", () => {
    const s = scheme({ minAge: 18, maxAge: 60 });
    const result = evaluateScheme(s, user({ age: 30 }));
    expect(result.eligible).toBe(true);
    expect(result.score).toBe(100);
  });

  it("returns partial score when one of two criteria missed", () => {
    const s = scheme({ minAge: 18, maxAge: 60 });
    const result = evaluateScheme(s, user({ age: 70 }));
    expect(result.eligible).toBe(false);
    expect(result.score).toBe(50);
  });

  it("returns 0% when all criteria missed", () => {
    const s = scheme({ minAge: 18, genders: ["female"] });
    const result = evaluateScheme(s, user({ age: 5, gender: "male" }));
    expect(result.score).toBe(0);
  });

  it("scores never go below 0", () => {
    const s = scheme({
      minAge: 18,
      genders: ["female"],
      residences: ["rural"],
      requiresBPL: true,
    });
    const result = evaluateScheme(s, user({ age: 5, gender: "male", residence: "urban", bpl: false }));
    expect(result.score).toBe(0);
  });
});

describe("evaluateAll - matches and near matches", () => {
  const schemes = [
    scheme({ minAge: 18 }, "eligible-scheme"),
    scheme({ minAge: 60 }, "near-scheme"),
    scheme({ minAge: 18, maxAge: 25, genders: ["female"], residences: ["rural"] }, "far-scheme"),
  ];

  it("separates eligible and near-eligible schemes", () => {
    const { matches, nearMatches } = evaluateAll(
      schemes,
      user({ age: 30, gender: "male", residence: "rural" })
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe("eligible-scheme");
    // near-scheme misses only minAge (1/1 => near). far-scheme misses maxAge + gender (2/4 => near).
    expect(nearMatches.map((n) => n.id)).toEqual(expect.arrayContaining(["near-scheme", "far-scheme"]));
  });

  it("sorts matches by score descending", () => {
    const mixed = [scheme({ minAge: 18, maxAge: 60 }, "partial"), scheme({}, "full-100")];
    const { matches } = evaluateAll(mixed, user({ age: 50 }));
    expect(matches[0].id).toBe("full-100");
    expect(matches[1].id).toBe("partial");
  });

  it("returns empty lists when nothing is eligible or near", () => {
    const hard = [scheme({ minAge: 18, genders: ["female"], residences: ["rural"] })];
    const { matches, nearMatches } = evaluateAll(hard, user({ age: 10, gender: "male", residence: "urban" }));
    expect(matches).toHaveLength(0);
    expect(nearMatches).toHaveLength(0);
  });

  it("near-match with more than 2 missed conditions is not near", () => {
    const { nearMatches } = evaluateAll(
      [scheme({ minAge: 18, maxAge: 25, genders: ["female"], residences: ["rural"], requiresBPL: true })],
      user({ age: 40, gender: "male", residence: "urban", bpl: false })
    );
    expect(nearMatches).toHaveLength(0);
  });
});
