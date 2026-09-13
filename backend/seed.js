// seed.js
// Run with: npm run seed
// Creates tables (if missing) and inserts/updates the scheme dataset.
// Eligibility rules are stored as JSON "criteria" so they can be evaluated
// generically on the server (see routes/check.js) without hardcoded JS per scheme.
//
// Criteria fields (all optional - omit a field to mean "no restriction"):
//   minAge, maxAge            - number
//   genders                   - array e.g. ["female"]
//   states                    - array of allowed state names (omit = all states)
//   residences                 - array e.g. ["rural"], ["urban"] (omit = both)
//   maxIncome                 - number (annual family income ceiling)
//   categories                - array e.g. ["sc","st","obc","ews"]
//   occupations                - array e.g. ["farmer"]
//   requiresLandOwner          - true
//   requiresBPL                - true
//   requiresDisability         - true
//   requiresWidow              - true
//   requiresNoPucca            - true
//   minEducation               - string: none|school|hs|graduate|postgraduate
//   minLandSize                - number (acres, needs landOwner)
//   maxLandSize                - number (acres)
//   minFamilySize, maxFamilySize - number (household members)

const pool = require("./db");
const fs = require("fs");
const path = require("path");

const schemes = [
  { id: "pmkisan", name: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)", name_hi: "प्रधानमंत्री किसान सम्मान निधि", level: "central", state: null, ministry: "Ministry of Agriculture & Farmers Welfare", category: "Agriculture", description: "₹6,000 per year direct income support to eligible small and marginal landholding farmer families, paid in 3 installments.", official_link: "https://pmkisan.gov.in", criteria: { minAge: 18, occupations: ["farmer"], requiresLandOwner: true } },
  { id: "pmfby", name: "Pradhan Mantri Fasal Bima Yojana", name_hi: "प्रधानमंत्री फसल बीमा योजना", level: "central", state: null, ministry: "Ministry of Agriculture & Farmers Welfare", category: "Agriculture", description: "Crop insurance scheme protecting farmers against crop loss/damage due to natural calamities, pests or disease.", official_link: "https://pmfby.gov.in", criteria: { occupations: ["farmer"], requiresLandOwner: true } },
  { id: "kcc", name: "Kisan Credit Card", name_hi: "किसान क्रेडिट कार्ड", level: "central", state: null, ministry: "Ministry of Agriculture & Farmers Welfare", category: "Agriculture", description: "Collateral-free short-term credit up to ₹3 lakh for farmers to meet agricultural and allied expenses.", official_link: "https://www.myscheme.gov.in/schemes/kcc", criteria: { occupations: ["farmer"], requiresLandOwner: true } },
  { id: "pmuy", name: "Pradhan Mantri Ujjwala Yojana", name_hi: "प्रधानमंत्री उज्ज्वला योजना", level: "central", state: null, ministry: "Ministry of Petroleum & Natural Gas", category: "Women & Household", description: "Free LPG gas connection for women from BPL households to promote clean cooking fuel.", official_link: "https://www.pmuy.gov.in", criteria: { minAge: 18, genders: ["female"], requiresBPL: true } },
  { id: "pmay_g", name: "Pradhan Mantri Awas Yojana - Gramin", name_hi: "प्रधानमंत्री आवास योजना - ग्रामीण", level: "central", state: null, ministry: "Ministry of Rural Development", category: "Housing", description: "Financial assistance for construction of a pucca house for rural households without one.", official_link: "https://pmayg.nic.in", criteria: { requiresNoPucca: true, maxIncome: 300000, residences: ["rural"] } },
  { id: "pmay_u", name: "Pradhan Mantri Awas Yojana - Urban", name_hi: "प्रधानमंत्री आवास योजना - शहरी", level: "central", state: null, ministry: "Ministry of Housing & Urban Affairs", category: "Housing", description: "Affordable housing support and interest subsidy for urban EWS/LIG/MIG households without a pucca house.", official_link: "https://pmay-urban.gov.in", criteria: { requiresNoPucca: true, maxIncome: 1800000, residences: ["urban"] } },
  { id: "ayushman", name: "Ayushman Bharat - PM Jan Arogya Yojana (PM-JAY)", name_hi: "आयुष्मान भारत - प्रधानमंत्री जन आरोग्य योजना", level: "central", state: null, ministry: "Ministry of Health & Family Welfare", category: "Health", description: "Health cover of ₹5 lakh per family per year for secondary and tertiary hospitalisation, for economically vulnerable families.", official_link: "https://pmjay.gov.in", criteria: { maxIncome: 250000, orBPL: true } },
  { id: "nsap_oap", name: "NSAP - Old Age Pension", name_hi: "वृद्धावस्था पेंशन", level: "central", state: null, ministry: "Ministry of Rural Development", category: "Pension", description: "Monthly pension for elderly persons from BPL households.", official_link: "https://nsap.nic.in", criteria: { minAge: 60, requiresBPL: true } },
  { id: "nsap_widow", name: "NSAP - Widow Pension", name_hi: "इंदिरा गांधी राष्ट्रीय विधवा पेंशन योजना", level: "central", state: null, ministry: "Ministry of Rural Development", category: "Pension", description: "Monthly pension support for widows aged 40-79 from BPL households.", official_link: "https://nsap.nic.in", criteria: { minAge: 40, maxAge: 79, requiresWidow: true, requiresBPL: true } },
  { id: "nsap_disability", name: "NSAP - Disability Pension", name_hi: "इंदिरा गांधी राष्ट्रीय दिव्यांग पेंशन योजना", level: "central", state: null, ministry: "Ministry of Rural Development", category: "Pension", description: "Monthly pension for persons with severe/multiple disabilities from BPL households, aged 18-79.", official_link: "https://nsap.nic.in", criteria: { minAge: 18, maxAge: 79, requiresDisability: true, requiresBPL: true } },
  { id: "apy", name: "Atal Pension Yojana", name_hi: "अटल पेंशन योजना", level: "central", state: null, ministry: "Ministry of Finance (PFRDA)", category: "Pension", description: "Guaranteed monthly pension (₹1,000-₹5,000) after age 60, for workers in the unorganised sector.", official_link: "https://npscra.nsdl.co.in/scheme-details.php", criteria: { minAge: 18, maxAge: 40, occupations: ["laborer", "self_employed", "unemployed", "homemaker"] } },
  { id: "pmjjby", name: "Pradhan Mantri Jeevan Jyoti Bima Yojana", name_hi: "प्रधानमंत्री जीवन ज्योति बीमा योजना", level: "central", state: null, ministry: "Ministry of Finance", category: "Insurance", description: "Life insurance cover of ₹2 lakh per year at a low annual premium, for ages 18-50.", official_link: "https://jansuraksha.gov.in", criteria: { minAge: 18, maxAge: 50 } },
  { id: "pmsby", name: "Pradhan Mantri Suraksha Bima Yojana", name_hi: "प्रधानमंत्री सुरक्षा बीमा योजना", level: "central", state: null, ministry: "Ministry of Finance", category: "Insurance", description: "Accidental death and disability cover of up to ₹2 lakh per year at a very low premium, for ages 18-70.", official_link: "https://jansuraksha.gov.in", criteria: { minAge: 18, maxAge: 70 } },
  { id: "sukanya", name: "Sukanya Samriddhi Yojana", name_hi: "सुकन्या समृद्धि योजना", level: "central", state: null, ministry: "Ministry of Finance", category: "Women & Household", description: "High-interest savings scheme for the education/marriage needs of a girl child below age 10.", official_link: "https://www.nsiindia.gov.in", criteria: { maxAge: 9, genders: ["female"] } },
  { id: "mudra", name: "Pradhan Mantri Mudra Yojana", name_hi: "प्रधानमंत्री मुद्रा योजना", level: "central", state: null, ministry: "Ministry of Finance", category: "Employment & Business", description: "Collateral-free loans up to ₹20 lakh for non-corporate, non-farm small businesses.", official_link: "https://www.mudra.org.in", criteria: { minAge: 18, occupations: ["self_employed"] } },
  { id: "stand_up", name: "Stand-Up India", name_hi: "स्टैंड-अप इंडिया", level: "central", state: null, ministry: "Ministry of Finance", category: "Employment & Business", description: "Bank loans between ₹10 lakh-₹1 crore for SC/ST and women entrepreneurs setting up greenfield enterprises.", official_link: "https://www.standupmitra.in", criteria: { minAge: 18, occupations: ["self_employed"], categoriesOrFemale: ["sc", "st"] } },
  { id: "pmegp", name: "Prime Minister's Employment Generation Programme", name_hi: "प्रधानमंत्री रोजगार सृजन कार्यक्रम", level: "central", state: null, ministry: "Ministry of MSME", category: "Employment & Business", description: "Credit-linked subsidy for setting up new micro-enterprises for unemployed youth, aged 18+.", official_link: "https://www.kviconline.gov.in/pmegpeportal", criteria: { minAge: 18, occupations: ["unemployed", "self_employed"] } },
  { id: "pmsvanidhi", name: "PM SVANidhi", name_hi: "पीएम स्वनिधि", level: "central", state: null, ministry: "Ministry of Housing & Urban Affairs", category: "Employment & Business", description: "Working-capital loans up to ₹50,000 for street vendors, in progressive tranches.", official_link: "https://pmsvanidhi.mohua.gov.in", criteria: { occupations: ["self_employed"], maxIncome: 300000 } },
  { id: "nsp", name: "National Scholarship Portal - Pre/Post Matric", name_hi: "राष्ट्रीय छात्रवृत्ति पोर्टल", level: "central", state: null, ministry: "Ministry of Education / Social Justice", category: "Education", description: "Central scholarships for SC/ST/OBC/EWS/minority students at school and college level, income-based.", official_link: "https://scholarships.gov.in", criteria: { occupations: ["student"], maxIncome: 250000, categories: ["sc", "st", "obc", "ews"] } },
  { id: "pmvvy", name: "Pradhan Mantri Vaya Vandana Yojana", name_hi: "प्रधानमंत्री वय वंदना योजना", level: "central", state: null, ministry: "Ministry of Finance (LIC)", category: "Pension", description: "Guaranteed pension scheme for senior citizens aged 60+, providing regular income on a lump-sum deposit.", official_link: "https://www.licindia.in", criteria: { minAge: 60 } },
  { id: "jsy", name: "Janani Suraksha Yojana", name_hi: "जननी सुरक्षा योजना", level: "central", state: null, ministry: "Ministry of Health & Family Welfare", category: "Health", description: "Cash assistance for institutional delivery to reduce maternal and infant mortality, for BPL/SC/ST pregnant women.", official_link: "https://nhm.gov.in", criteria: { minAge: 18, maxAge: 45, genders: ["female"], bplOrCategories: ["sc", "st"] } },
  { id: "one_nation", name: "One Nation One Ration Card", name_hi: "वन नेशन वन राशन कार्ड", level: "central", state: null, ministry: "Ministry of Consumer Affairs, Food & PD", category: "Food Security", description: "Allows ration card holders to access subsidised food grains from any Fair Price Shop across India.", official_link: "https://nfsa.gov.in", criteria: { requiresBPL: true } },
  { id: "udid", name: "Unique Disability ID (UDID)", name_hi: "यूनिक डिसएबिलिटी आईडी", level: "central", state: null, ministry: "Ministry of Social Justice & Empowerment", category: "Disability", description: "Universal ID for persons with disabilities enabling access to aids, appliances, and welfare benefits.", official_link: "https://www.swavlambancard.gov.in", criteria: { requiresDisability: true } },
  { id: "adip", name: "Assistance to Disabled Persons (ADIP)", name_hi: "दिव्यांगजन सहायक उपकरण योजना", level: "central", state: null, ministry: "Ministry of Social Justice & Empowerment", category: "Disability", description: "Free aids and assistive devices for persons with disabilities with low income.", official_link: "https://www.myscheme.gov.in/schemes/adip", criteria: { requiresDisability: true, maxIncome: 300000 } },
  { id: "pmkvy", name: "Pradhan Mantri Kaushal Vikas Yojana", name_hi: "प्रधानमंत्री कौशल विकास योजना", level: "central", state: null, ministry: "Ministry of Skill Development", category: "Education", description: "Free short-term skill training and certification for youth to improve employability.", official_link: "https://www.pmkvyofficial.org", criteria: { minAge: 15, maxAge: 45, occupations: ["unemployed", "student"] } },
  { id: "nrega", name: "MGNREGA", name_hi: "मनरेगा", level: "central", state: null, ministry: "Ministry of Rural Development", category: "Employment & Business", description: "Guarantees 100 days of wage employment per year to rural households willing to do unskilled manual work.", official_link: "https://nrega.nic.in", criteria: { minAge: 18, occupations: ["laborer"], residences: ["rural"] } },
  { id: "beti_bachao", name: "Beti Bachao Beti Padhao", name_hi: "बेटी बचाओ बेटी पढ़ाओ", level: "central", state: null, ministry: "Ministry of Women & Child Development", category: "Women & Household", description: "Awareness and support programme for the survival, protection and education of the girl child.", official_link: "https://wcd.nic.in", criteria: { maxAge: 17, genders: ["female"] } },
  { id: "matru_vandana", name: "Pradhan Mantri Matru Vandana Yojana", name_hi: "प्रधानमंत्री मातृ वंदना योजना", level: "central", state: null, ministry: "Ministry of Women & Child Development", category: "Women & Household", description: "₹5,000 cash benefit to pregnant and lactating mothers for their first living child.", official_link: "https://pmmvy.wcd.gov.in", criteria: { minAge: 19, maxAge: 45, genders: ["female"] } },
  { id: "dairy_scheme", name: "Dairy Entrepreneurship Development Scheme", name_hi: "डेयरी उद्यमिता विकास योजना", level: "central", state: null, ministry: "NABARD", category: "Agriculture", description: "Capital subsidy for setting up small dairy farms and related infrastructure.", official_link: "https://www.nabard.org", criteria: { occupations: ["farmer"], requiresLandOwner: true } },

  { id: "up_kanya_sumangala", name: "UP Mukhyamantri Kanya Sumangala Yojana", name_hi: "मुख्यमंत्री कन्या सुमंगला योजना", level: "state", state: "Uttar Pradesh", ministry: "Govt. of Uttar Pradesh", category: "Women & Household", description: "Multi-stage cash incentive for the girl child's education, from birth up to graduation, for low-income UP families.", official_link: "https://mksy.up.gov.in", criteria: { states: ["Uttar Pradesh"], maxAge: 20, genders: ["female"], maxIncome: 300000 } },
  { id: "mh_lek_ladki", name: "Maharashtra Lek Ladki Yojana", name_hi: "लेक लाडकी योजना", level: "state", state: "Maharashtra", ministry: "Govt. of Maharashtra", category: "Women & Household", description: "Staged financial assistance for girl children in yellow/orange ration card families, up to age 18.", official_link: "https://womenchild.maharashtra.gov.in", criteria: { states: ["Maharashtra"], maxAge: 17, genders: ["female"], maxIncome: 100000 } },
  { id: "tn_marriage_assist", name: "TN Moovalur Ramamirtham Marriage Assistance", name_hi: "திருமண உதவித் திட்டம்", level: "state", state: "Tamil Nadu", ministry: "Govt. of Tamil Nadu", category: "Women & Household", description: "Financial assistance for the marriage of daughters of widows, orphaned or poor women.", official_link: "https://www.tn.gov.in", criteria: { states: ["Tamil Nadu"], minAge: 18, genders: ["female"], requiresBPL: true } },
  { id: "wb_kanyashree", name: "West Bengal Kanyashree Prakalpa", name_hi: "কন্যাশ্রী প্রকল্প", level: "state", state: "West Bengal", ministry: "Govt. of West Bengal", category: "Education", description: "Annual scholarship and one-time grant for unmarried girls aged 13-18 from low-income families.", official_link: "https://wbkanyashree.gov.in", criteria: { states: ["West Bengal"], minAge: 13, maxAge: 18, genders: ["female"], maxIncome: 120000 } },
  { id: "raj_kalibai", name: "Rajasthan Kali Bai Bhil Scooty Yojana", name_hi: "काली बाई भील मेधावी छात्रा स्कूटी योजना", level: "state", state: "Rajasthan", ministry: "Govt. of Rajasthan", category: "Education", description: "Free scooty for meritorious girl students in Class 12/graduation from SC/ST/BPL/low-income families.", official_link: "https://hte.rajasthan.gov.in", criteria: { states: ["Rajasthan"], genders: ["female"], occupations: ["student"], bplOrCategories: ["sc", "st"] } },
  { id: "karnataka_gruha_lakshmi", name: "Karnataka Gruha Lakshmi Scheme", name_hi: "ಗೃಹ ಲಕ್ಷ್ಮಿ ಯೋಜನೆ", level: "state", state: "Karnataka", ministry: "Govt. of Karnataka", category: "Women & Household", description: "Monthly cash assistance of ₹2,000 to the woman head of eligible below-poverty-line households.", official_link: "https://sevasindhugs.karnataka.gov.in", criteria: { states: ["Karnataka"], minAge: 18, genders: ["female"], requiresBPL: true } },
  { id: "delhi_old_age", name: "Delhi Old Age Pension Scheme", name_hi: "दिल्ली वृद्धावस्था पेंशन योजना", level: "state", state: "Delhi (NCT)", ministry: "Govt. of NCT of Delhi", category: "Pension", description: "Monthly pension for elderly residents of Delhi from low-income households.", official_link: "https://edistrict.delhigovt.nic.in", criteria: { states: ["Delhi (NCT)"], minAge: 60, maxIncome: 100000 } },
  { id: "odisha_kalia", name: "Odisha KALIA Scheme", name_hi: "କାଳିଆ ଯୋଜନା", level: "state", state: "Odisha", ministry: "Govt. of Odisha", category: "Agriculture", description: "Financial assistance to small, marginal, and landless farmers for cultivation and livelihood support.", official_link: "https://kalia.odisha.gov.in", criteria: { states: ["Odisha"], occupations: ["farmer"] } },
  { id: "ap_ysr_pension", name: "AP YSR Pension Kanuka", name_hi: "వైయస్సార్ పెన్షన్ కానుక", level: "state", state: "Andhra Pradesh", ministry: "Govt. of Andhra Pradesh", category: "Pension", description: "Enhanced monthly pension for elderly, widows, and persons with disabilities in Andhra Pradesh.", official_link: "https://navasakam.ap.gov.in", criteria: { states: ["Andhra Pradesh"], maxIncome: 120000, ageOrWidowOrDisability: 60 } },
  { id: "punjab_shagun", name: "Punjab Shagun Scheme", name_hi: "ਸ਼ਗਨ ਸਕੀਮ", level: "state", state: "Punjab", ministry: "Govt. of Punjab", category: "Women & Household", description: "One-time financial assistance for the marriage of daughters of BPL/low-income families.", official_link: "https://punjab.gov.in", criteria: { states: ["Punjab"], genders: ["female"], requiresBPL: true } },
  { id: "kerala_snehapoornam", name: "Kerala Snehapoornam Scholarship", name_hi: "സ്നേഹപൂർണ്ണം സ്കോളർഷിപ്പ്", level: "state", state: "Kerala", ministry: "Govt. of Kerala", category: "Education", description: "Scholarship for orphans and children of BPL families studying in school, in Kerala.", official_link: "https://cwc.kerala.gov.in", criteria: { states: ["Kerala"], occupations: ["student"], requiresBPL: true } },
  { id: "bi_kanya_utthan", name: "Bihar Mukhyamantri Kanya Utthan Yojana", name_hi: "मुख्यमंत्री कन्या उत्थान योजना", level: "state", state: "Bihar", ministry: "Govt. of Bihar", category: "Education", description: "Financial incentive to girl students of class 9-12 studying in state-run schools, promoted online in 2024 as Kanya Utthan.", official_link: "https://edudir.bihar.gov.in", criteria: { states: ["Bihar"], genders: ["female"], occupations: ["student"], maxAge: 20, maxIncome: 200000 } },
  { id: "mp_ladli_behana", name: "MP Ladli Behna Yojana", name_hi: "मुख्यमंत्री लाड़ली बहना योजना", level: "state", state: "Madhya Pradesh", ministry: "Govt. of Madhya Pradesh", category: "Women & Household", description: "Monthly financial assistance to married women aged 23-60 from economically weak families in Madhya Pradesh.", official_link: "https://cmladlibahna.mp.gov.in", criteria: { states: ["Madhya Pradesh"], minAge: 23, maxAge: 60, genders: ["female"], maxIncome: 250000 } },
  { id: "mp_ladli_laxmi", name: "MP Ladli Laxmi Yojana", name_hi: "लाड़ली लक्ष्मी योजना", level: "state", state: "Madhya Pradesh", ministry: "Govt. of Madhya Pradesh", category: "Women & Household", description: "National Savings Certificate of ₹2,50,000 maturity value for the girl child from low-income families in Madhya Pradesh.", official_link: "https://ladlilaxmi.mp.gov.in", criteria: { states: ["Madhya Pradesh"], maxAge: 17, genders: ["female"], maxIncome: 200000 } },
  { id: "gj_kanya_kelavani", name: "Gujarat Kanya Kelavani Yojana", name_hi: "કન્યા કેળવણી યોજના", level: "state", state: "Gujarat", ministry: "Govt. of Gujarat", category: "Education", description: "Incentive to girls to continue schooling, with support throughout secondary education in Gujarat government schools.", official_link: "https://www.digitalgujarat.gov.in", criteria: { states: ["Gujarat"], genders: ["female"], occupations: ["student"], maxAge: 18, maxIncome: 250000 } },
  { id: "hr_vivah_shagun", name: "Haryana Mukhyamantri Vivah Shagun Yojana", name_hi: "मुख्यमंत्री विवाह शगुन योजना", level: "state", state: "Haryana", ministry: "Govt. of Haryana", category: "Women & Household", description: "One-time financial assistance for the marriage of daughters/daughters-in-law of eligible low-income families in Haryana.", official_link: "https://wcdhry.gov.in", criteria: { states: ["Haryana"], genders: ["female"], maxIncome: 200000 } },
  { id: "jh_sukanya", name: "Jharkhand Mukhyamantri Sukanya Yojana", name_hi: "मुख्यमंत्री सुकन्या योजना", level: "state", state: "Jharkhand", ministry: "Govt. of Jharkhand", category: "Women & Household", description: "Fixed-deposit based scheme opening an account for newborn/young girls in low-income families of Jharkhand.", official_link: "https://jharswh.ac.in", criteria: { states: ["Jharkhand"], genders: ["female"], maxAge: 5, maxIncome: 250000 } },
  { id: "pb_mai_bhago", name: "Punjab Mai Bhago Istri Shakti Yojana", name_hi: "ਮਾਈ ਭਾਗੋ ਇਸਤਰੀ ਸ਼ਕਤੀ ਸਕੀਮ", level: "state", state: "Punjab", ministry: "Govt. of Punjab", category: "Women & Household", description: "Annual financial assistance to women from BPL families aged 18-60 in Punjab.", official_link: "https://sja.punjab.gov.in", criteria: { states: ["Punjab"], genders: ["female"], minAge: 18, maxAge: 60, requiresBPL: true } },
  { id: "ct_sambal", name: "Chhattisgarh Sambal Yojana", name_hi: "छत्तीसगढ़ संबल योजना", level: "state", state: "Chhattisgarh", ministry: "Govt. of Chhattisgarh", category: "Pension", description: "Monthly pension for the elderly, widows, and disabled in Chhattisgarh meeting the family's live register (~SSY) norms.", official_link: "https://sambal.cgstate.gov.in", criteria: { states: ["Chhattisgarh"], ageOrWidowOrDisability: 60 } },
  { id: "tg_aasara", name: "Telangana Aasara Pension", name_hi: "ఆసరా పెన్షన్", level: "state", state: "Telangana", ministry: "Govt. of Telangana", category: "Pension", description: "Monthly pension for elderly, widows, single women, and persons with disabilities in Telangana.", official_link: "https://www.telangana.gov.in", criteria: { states: ["Telangana"], ageOrWidowOrDisability: 65, maxIncome: 120000 } },

  { id: "pmkmy", name: "PM Kisan Maandhan Yojana (PM-KMY)", name_hi: "प्रधानमंत्री किसान मानधन योजना", level: "central", state: null, ministry: "Ministry of Agriculture & Farmers Welfare", category: "Pension", description: "Monthly pension of ₹3,000 after age 60 for small and marginal farmers who contribute a small premium from ages 18-40.", official_link: "https://maandhan.in", criteria: { minAge: 18, maxAge: 40, occupations: ["farmer"], requiresLandOwner: true } },
  { id: "pmsym", name: "PM Shram Yogi Maandhan (PM-SYM)", name_hi: "प्रधानमंत्री श्रम योगी मानधन", level: "central", state: null, ministry: "Ministry of Social Justice & Empowerment", category: "Pension", description: "Monthly pension of ₹3,000 after age 60 for unorganised workers aged 18-40 with monthly income under ₹15,000.", official_link: "https://maandhan.in", criteria: { minAge: 18, maxAge: 40, occupations: ["laborer", "self_employed", "unemployed", "homemaker"], maxIncome: 180000 } },
  { id: "pm_vishwakarma", name: "PM Vishwakarma", name_hi: "पीएम विश्वकर्मा", level: "central", state: null, ministry: "Ministry of Micro, Small & Medium Enterprises", category: "Employment & Business", description: "Skill vouchers, toolkits, and loans up to ₹1 lakh for traditional artisans and craftspeople aged 18+.", official_link: "https://pmvishwakarma.gov.in", criteria: { minAge: 18, maxAge: 60, occupations: ["self_employed"] } },
  { id: "pm_surya_ghar", name: "PM Surya Ghar: Muft Bijli Yojana", name_hi: "प्रधानमंत्री सूर्य घर मुफ्त बिजली योजना", level: "central", state: null, ministry: "Ministry of New & Renewable Energy", category: "Housing", description: "Subsidy of up to ₹78,000 for installing rooftop solar panels on residential houses to cut electricity bills.", official_link: "https://pmsuryaghar.gov.in", criteria: { minAge: 18 } },
  { id: "pmjdy", name: "Pradhan Mantri Jan Dhan Yojana (PMJDY)", name_hi: "प्रधानमंत्री जन धन योजना", level: "central", state: null, ministry: "Ministry of Finance", category: "Financial Inclusion", description: "Zero-balance bank account with RuPay debit card, insurance, and overdraft facility for every unbanked adult.", official_link: "https://pmjdy.gov.in", criteria: { minAge: 10 } },
  { id: "pmkfusem", name: "PM-KUSUM - Solar Pumps for Farmers", name_hi: "पीएम-कुसुम योजना", level: "central", state: null, ministry: "Ministry of New & Renewable Energy", category: "Agriculture", description: "Subsidy on standalone solar agriculture pumps and solarisation of existing grid-connected pumps for farmers.", official_link: "https://pmkusum.mnre.gov.in", criteria: { occupations: ["farmer"], requiresLandOwner: true } },
  { id: "nmmss", name: "National Means-cum-Merit Scholarship", name_hi: "राष्ट्रीय मीन्स-कम-मेरिट छात्रवृत्ति", level: "central", state: null, ministry: "Ministry of Education", category: "Education", description: "₹12,000 per year scholarship for meritorious class 9-12 students from families with annual income under ₹3.5 lakh.", official_link: "https://scholarships.gov.in", criteria: { occupations: ["student"], minAge: 13, maxAge: 18, maxIncome: 350000 } },
  { id: "csnses", name: "Central Sector Scholarship for College Students", name_hi: "केंद्रीय क्षेत्र छात्रवृत्ति योजना", level: "central", state: null, ministry: "Ministry of Education", category: "Education", description: "Scholarship of ₹10,000-₹20,000 per year for top-scoring college/university students from families earning under ₹4.5 lakh.", official_link: "https://scholarships.gov.in", criteria: { occupations: ["student"], minAge: 17, maxAge: 30, maxIncome: 450000 } },

  { id: "mh_ladki_bahin", name: "Maharashtra Mukhyamantri Ladki Bahin Yojana", name_hi: "मुख्यमंत्री लाडकी बहीण योजना", level: "state", state: "Maharashtra", ministry: "Govt. of Maharashtra", category: "Women & Household", description: "₹1,500 per month to women aged 21-65 from families with annual income under ₹2.5 lakh in Maharashtra.", official_link: "https://ladakibahin.maharashtra.gov.in", criteria: { states: ["Maharashtra"], genders: ["female"], minAge: 21, maxAge: 65, maxIncome: 250000 } },
  { id: "wb_lakshmir_bhandar", name: "West Bengal Lakshmir Bhandar", name_hi: "লক্ষ্মীর ভান্ডার", level: "state", state: "West Bengal", ministry: "Govt. of West Bengal", category: "Women & Household", description: "Monthly financial assistance of ₹500-₹1,000 to women aged 18+ from recognised beneficiary families in West Bengal.", official_link: "https://lmban.wb.gov.in", criteria: { states: ["West Bengal"], genders: ["female"], minAge: 18, maxIncome: 500000 } },
  { id: "delhi_mahila_samman", name: "Delhi Mahila Samman Yojana", name_hi: "दिल्ली महिला सम्मान योजना", level: "state", state: "Delhi (NCT)", ministry: "Govt. of NCT of Delhi", category: "Women & Household", description: "₹2,500 per month to women aged 18+ resident in Delhi with family income under ₹3 lakh.", official_link: "https://mahilasamman.delhi.gov.in", criteria: { states: ["Delhi (NCT)"], genders: ["female"], minAge: 18, maxIncome: 300000 } },
  { id: "tn_pudhumai_penn", name: "TN Pudhumai Penn (Girl Child Education)", name_hi: "புதுமை பெண்", level: "state", state: "Tamil Nadu", ministry: "Govt. of Tamil Nadu", category: "Education", description: "₹1,000 per month to girl students aged 18-24 studying in higher education in Tamil Nadu, from low-income families.", official_link: "https://www.tn.gov.in", criteria: { states: ["Tamil Nadu"], genders: ["female"], minAge: 18, maxAge: 24, occupations: ["student"], maxIncome: 250000 } },
  { id: "raj_rajshree", name: "Rajasthan Rajshree Yojana", name_hi: "राजश्री योजना", level: "state", state: "Rajasthan", ministry: "Govt. of Rajasthan", category: "Women & Household", description: "Cash incentives for the girl child from birth till college for families below the income ceiling in Rajasthan.", official_link: "https://rajshree.rajasthan.gov.in", criteria: { states: ["Rajasthan"], genders: ["female"], maxAge: 18, maxIncome: 300000 } },
  { id: "hr_ladli_lakshmi", name: "Haryana Mukhyamantri Ladli Lakshmi Yojana", name_hi: "मुख्यमंत्री लाडली लक्ष्मी योजना", level: "state", state: "Haryana", ministry: "Govt. of Haryana", category: "Women & Household", description: "Savings scheme depositing money for the girl child up to age 18 in low-income families of Haryana.", official_link: "https://wcdhry.gov.in", criteria: { states: ["Haryana"], genders: ["female"], maxAge: 18, maxIncome: 180000 } },
  { id: "up_rani_laxmibai", name: "UP Rani Laxmibai Pension Yojana", name_hi: "रानी लक्ष्मीबाई पेंशन योजना", level: "state", state: "Uttar Pradesh", ministry: "Govt. of Uttar Pradesh", category: "Pension", description: "Improved monthly pension for widows in Uttar Pradesh unable to fully support themselves after losing their husband.", official_link: "https://socialwelfare.up.gov.in", criteria: { states: ["Uttar Pradesh"], genders: ["female"], requiresWidow: true, minAge: 18 } },

  { id: "pmksy", name: "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)", name_hi: "प्रधानमंत्री कृषि सिंचाई योजना", level: "central", state: null, ministry: "Ministry of Agriculture & Farmers Welfare", category: "Agriculture", description: "Assistance for micro-irrigation (drip/sprinkler), water conservation and irrigation efficiency for farmers.", official_link: "https://pmksy.gov.in", criteria: { minAge: 18, occupations: ["farmer"], requiresLandOwner: true } },
  { id: "pmfme", name: "PM Formalisation of Micro Food Processing Enterprises (PM-FME)", name_hi: "प्रधानमंत्री सूक्ष्म खाद्य प्रसंस्करण उद्यम योजना", level: "central", state: null, ministry: "Ministry of Food Processing Industries", category: "Employment & Business", description: "Credit-linked subsidy up to ₹10 lakh for micro food-processing units and informal food entrepreneurs.", official_link: "https://pmfme.mofpi.gov.in", criteria: { minAge: 18, occupations: ["self_employed"] } },
  { id: "pm_vidyalaxmi", name: "PM VidyaLaxmi Scheme", name_hi: "प्रधानमंत्री विद्यालक्ष्मी योजना", level: "central", state: null, ministry: "Ministry of Finance (Department of Financial Services)", category: "Education", description: "Education loans up to ₹10 lakh without collateral for students admitted to quality higher-education institutions.", official_link: "https://www.vidyalakshmi.co.in", criteria: { occupations: ["student"], minAge: 18, maxAge: 29, minEducation: "hs" } },
  { id: "pm_poshan", name: "PM Poshan Shakti Nirman (Mid-Day Meal)", name_hi: "पीएम पोषण शक्ति निर्माण", level: "central", state: null, ministry: "Ministry of Education", category: "Education", description: "Nutritious hot cooked meal for children of government / government-aided schools to improve nutrition and attendance.", official_link: "https://pmposhan.education.gov.in", criteria: { occupations: ["student"], minAge: 5, maxAge: 12 } },
  { id: "nps_vatsalya", name: "NPS Vatsalya", name_hi: "एनपीएस वात्सल्य", level: "central", state: null, ministry: "Ministry of Finance (PFRDA)", category: "Financial Inclusion", description: "Pension savings account under NPS for minor children, opened and managed by parents/guardians until they turn 18.", official_link: "https://npsvatsalya.nsdl.com", criteria: { maxAge: 17 } },
  { id: "pm_apprenticeship", name: "PM Youth Apprenticeship Scheme", name_hi: "प्रधानमंत्री युवा प्रशिक्षुता योजना", level: "central", state: null, ministry: "Ministry of Labour & Employment", category: "Employment & Business", description: "Up to ₹7,500 monthly stipend along with on-the-job training for new graduates and diploma holders.", official_link: "https://apprenticeshipindia.gov.in", criteria: { minAge: 21, maxAge: 24, occupations: ["student", "unemployed"], minEducation: "graduate" } },
  { id: "pm_sse_disabled", name: "PM Self-Employment Scheme for Disabled Persons", name_hi: "दिव्यांगजन स्वरोजगार योजना", level: "central", state: null, ministry: "Ministry of Social Justice & Empowerment", category: "Employment & Business", description: "Bank loans up to ₹50 lakh with subsidy for self-employment ventures of persons with disabilities.", official_link: "https://socialjustice.gov.in", criteria: { requiresDisability: true, minAge: 18, occupations: ["self_employed"] } },
  { id: "pmgkay", name: "PM Garib Kalyan Anna Yojana (PMGKAY)", name_hi: "प्रधानमंत्री गरीब कल्याण अन्न योजना", level: "central", state: null, ministry: "Ministry of Consumer Affairs, Food & PD", category: "Food Security", description: "Free food grains (5 kg per person per month) to NFSA ration-card holder families.", official_link: "https://www.nfsa.gov.in", criteria: { requiresBPL: true } },
  { id: "jjm", name: "Jal Jeevan Mission", name_hi: "जल जीवन मिशन", level: "central", state: null, ministry: "Ministry of Jal Shakti", category: "Housing", description: "Tap-water connection to every rural household, with special priority to households in villages with high water contamination.", official_link: "https://jalshakti-ddws.gov.in", criteria: { residences: ["rural"] } },
  { id: "saubhagya", name: "Pradhan Mantri Sahaj Bijli Har Ghar Yojana (SAUBHAGYA)", name_hi: "सौभाग्य योजना", level: "central", state: null, ministry: "Ministry of Power", category: "Housing", description: "Electrification of unelectrified rural and urban households with free/subsidised connections for last-mile families.", official_link: "https://saubhagya.gov.in", criteria: { residences: ["rural"] } },
  { id: "sbm_g2", name: "Swachh Bharat Mission - Grameen (Phase II)", name_hi: "स्वच्छ भारत मिशन ग्रामीण", level: "central", state: null, ministry: "Ministry of Jal Shakti", category: "Women & Household", description: "Support for individual household toilets and solid/liquid waste management in rural areas.", official_link: "https://sbm.gov.in", criteria: { residences: ["rural"], requiresNoPucca: true } },
  { id: "pm_suryodaya", name: "PM Suryodaya Yojana", name_hi: "प्रधानमंत्री सूर्योदय योजना", level: "central", state: null, ministry: "Ministry of Finance", category: "Housing", description: "Rooftop solar installations for economically weaker households living in slum / urban poor housing.", official_link: "https://pmsuryodaya.gov.in", criteria: { residences: ["urban"], requiresBPL: true } },
];

// Category-level default documents & apply steps, so every scheme has a useful
// checklist. Specific schemes can override with entries in schemeDetails.
const CATEGORY_DEFAULTS = {
  Agriculture: {
    documents: ["Aadhaar card", "Identity proof (Voter/PAN/Driving licence)", "Land records (Khasra / Patta / RoR)", "Bank account passbook", "Income certificate (if applicable)"],
    steps: ["Check eligibility and documents on the official portal", "Register / login on the scheme portal", "Fill the online application form", "Upload required documents", "Track your application / acknowledgement number"],
  },
  "Women & Household": {
    documents: ["Aadhaar card", "Identity proof", "Address proof / residence certificate", "Bank account passbook (with IFSC)", "Ration card / SES certificate (if required)"],
    steps: ["Verify eligibility on the official portal", "Register on the nearest government service centre or online", "Fill the application form", "Submit documents and get acknowledgement", "Track status / benefit disbursement"],
  },
  Housing: {
    documents: ["Aadhaar card", "Identity & address proof", "Land/property papers or dwelling details", "Income certificate", "Ration card (for BPL schemes)"],
    steps: ["Confirm eligibility on the official portal", "Apply online or at the local office (gram panchayat / urban body)", "Fill in beneficiary details", "Upload documents and submit", "Track application status"],
  },
  Health: {
    documents: ["Aadhaar card", "Identity proof", "Ration card / SES certificate (for PM-JAY)", "Bank account details", "Recent income proof (if required)"],
    steps: ["Check the scheme's eligibility criteria", "Enrol online or at the nearest empanelled centre", "Complete the enrolment form", "Verify documents and receive the card/ID", "Use the benefits at empanelled hospitals"],
  },
  Pension: {
    documents: ["Aadhaar card", "Age proof / birth certificate", "Bank account passbook", "Proof of residence", "BPL/widow/disability certificate (as applicable)"],
    steps: ["Confirm eligibility on the official portal", "Apply at the local office (panchayat / social welfare office) or online", "Fill the pension application", "Submit documents", "Track sanction and monthly disbursement"],
  },
  Insurance: {
    documents: ["Aadhaar card", "Identity proof", "Bank account details (for auto-debit)", "Age proof", "Nominee details"],
    steps: ["Check eligibility (age limits) for the scheme", "Register through the bank or online portal", "Select the scheme and agree to auto-debit premium", "Provide nominee details", "Enrolment confirmed — keep the policy/acknowledgement"],
  },
  Education: {
    documents: ["Aadhaar card", "Class/marksheet or enrolment proof", "Bank account details (for scholarships)", "Income certificate of parents", "Category certificate (SC/ST/OBC/EWS) if applicable"],
    steps: ["Verify the scholarship criteria and deadline", "Apply on the National Scholarship Portal or state portal", "Fill the form and upload documents", "Verify the application (institute/parent endorsement)", "Track sanction status on the portal"],
  },
  "Employment & Business": {
    documents: ["Aadhaar card", "Identity proof", "Business plan / project proposal", "Bank account details", "Educational qualification proof (where needed)"],
    steps: ["Check the scheme's target group and eligibility", "Apply on the portal or at the district office", "Attach the business/project proposal", "Submit and await loan/subsidy sanction", "Track disbursement and repay as per terms"],
  },
  "Financial Inclusion": {
    documents: ["Aadhaar card", "Identity proof", "Bank account details", "Age proof", "Nominee details (for NPS)"],
    steps: ["Verify eligibility", "Open/apply through the bank or official portal", "Fill the application / KYC form", "Submit documents", "Activation confirmed — track through passbook/portal"],
  },
  "Food Security": {
    documents: ["Aadhaar card", "Ration card (NFSA/PHH)", "Family details", "Bank account (for DBT where applicable)"],
    steps: ["Check if your family is an NFSA beneficiary", "Verify ration card details at the fair price shop", "Update family details / e-KYC at the ration shop or portal", "Track entitlements in your ration book"],
  },
  Disability: {
    documents: ["Aadhaar card", "Disability certificate (UDID)", "Identity & residence proof", "Bank account details", "Income certificate (if required)"],
    steps: ["Verify eligibility on the portal", "Apply online or at the district social welfare office", "Fill the application with disability details", "Upload documents including UDID", "Track sanction and benefit disbursement"],
  },
  General: {
    documents: ["Aadhaar card", "Identity proof", "Address proof", "Bank account details", "Income/category certificate (as applicable)"],
    steps: ["Confirm eligibility on the official portal", "Apply online or at the government office", "Complete and submit the application", "Upload/attach required documents", "Track application status"],
  },
};

// Overrides for the most-used schemes with scheme-specific requirements.
const schemeDetails = {
  pmkisan: {
    documents: ["Aadhaar card", "Land ownership documents (ROR/Khatauni)", "Bank account passbook", "Identity proof", "Mobile number"],
    steps: ["Check name on the PM-KISAN beneficiary list at pmkisan.gov.in", "Register or login on the portal (PM Kisan/PFMS)", "Verify landholding and bank details", "Status and instalments are updated on the portal"],
  },
  ayushman: {
    documents: ["Aadhaar card", "Ration card / SES (SECC 2011) certificate", "Family identity documents", "Contact details"],
    steps: ["Check if your family is in the SECC eligibility list", "Register/verify at a CSC or empanelled centre", "Generate your Ayushman card (PMJAY-ID)", "Use the card at empanelled hospitals"],
  },
  pmay_g: {
    documents: ["Aadhaar card", "Ration card", "Land/property papers", "Bank account details", "Prior-house status documents"],
    steps: ["Apply through the gram panchayat or PMAY-G portal", "Beneficiary selection through Awaas+ survey", "Submit application with land & identity papers", "Bank account seeding and approval", "Track construction instalments"],
  },
  pmay_u: {
    documents: ["Aadhaar card", "Address proof (in the city)", "Income certificate", "Bank account details", "Property/no-pucca-house declaration"],
    steps: ["Register on the PMAY-U portal or at the urban local body", "Choose the vertical (CLSS/AFL/BP) applicable", "Submit application with income and address proof", "Verification by ULB", "Track sanction status"],
  },
  nsp: {
    documents: ["Aadhaar card", "Bonafide student certificate", "Previous year marksheet", "Bank account details", "Income certificate", "Category (SC/ST/OBC/EWS) certificate"],
    steps: ["Register on the National Scholarship Portal", "Apply for the relevant pre/post-matric scheme", "Fill the form and upload documents", "Institute verification (for post-matric)", "Track sanction and disbursement"],
  },
  nrega: {
    documents: ["Aadhaar card", "Job card (apply at gram panchayat)", "Bank/Post-office account details", "Residence proof in the village"],
    steps: ["Register for a job card at the gram panchayat", "Ask for work through the job card / portal", "Receive a dated work order", "Attend work and get wage slips", "Wages credited to your account (Muster/DPR verified)"],
  },
  pmuy: {
    documents: ["Aadhaar card", "Photo identity", "Ration card (BPL proof)", "Address proof", "Bank account (for DBT)"],
    steps: ["Check eligibility through the BPL/SES list", "Apply at the district petrol/LPG distributor office or online", "Fill the Ujjwala 2.0 form", "Deposit the one-time rate if applicable", "Get the connection with free first refill"],
  },
};

function detailsFor(s) {
  const specific = schemeDetails[s.id];
  if (specific) return { documents: specific.documents, steps: specific.steps };
  const def = CATEGORY_DEFAULTS[s.category] || CATEGORY_DEFAULTS.General;
  return { documents: def.documents, steps: def.steps };
}

async function seed() {
  console.log("Creating tables (if not already present)...");
  const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schemaSql);

  console.log(`Inserting/updating ${schemes.length} schemes...`);
  for (const s of schemes) {
    const { documents, steps } = detailsFor(s);
    await pool.query(
      `INSERT INTO schemes (id, name, name_hi, level, state, ministry, category, description, official_link, criteria, documents, steps)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         name=$2, name_hi=$3, level=$4, state=$5, ministry=$6, category=$7,
         description=$8, official_link=$9, criteria=$10, documents=$11, steps=$12`,
      [s.id, s.name, s.name_hi, s.level, s.state, s.ministry, s.category, s.description, s.official_link, JSON.stringify(s.criteria), documents, JSON.stringify(steps)]
    );
  }
  console.log("Seed complete! Schemes in database:", schemes.length);
  return schemes.length;
}

if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}

module.exports = seed;
