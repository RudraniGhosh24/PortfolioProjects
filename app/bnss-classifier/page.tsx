"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, Gavel, ShieldAlert, Scale, BookOpen } from "lucide-react";
import { jsPDF } from "jspdf";

interface Provision {
  bnss_section: string;
  offense: string;
  punishment: string;
  cognizable: string;
  bailable: string;
  court: string;
}

interface BNSSData {
  provisions: Provision[];
}

const STOPWORDS = new Set([
  "the", "and", "or", "of", "to", "in", "a", "is", "that", "for", "it", "with", "as", "was", "on", "be", "by",
  "this", "from", "at", "an", "has", "have", "had", "not", "are", "but", "were", "been", "their", "they", "we",
  "he", "she", "his", "her", "him", "them", "which", "who", "when", "where", "what", "how", "all", "any", "can",
  "shall", "may", "will", "would", "could", "should", "there", "than", "so", "if", "no", "yes", "up", "out", "down",
  "over", "under", "again", "further", "then", "once", "here", "why", "off", "also", "into", "through", "during",
  "before", "after", "above", "below", "between", "among", "until", "while", "about", "against", "such", "only",
  "own", "same", "too", "very", "just", "now", "does", "done", "being", "anyone", "every", "everyone", "someone",
]);

// Synonym dictionary bridging everyday language to legal terminology
const SYNONYMS: Record<string, string[]> = {
  // Theft / Property crimes
  stole: ["theft", "stealing", "robbery", "extortion", "dacoity", "snatching", "mischief", "criminal", "breach", "trust", "misappropriation"],
  steal: ["theft", "stealing", "robbery", "extortion", "dacoity", "snatching"],
  robbed: ["robbery", "dacoity", "theft", "extortion"],
  rob: ["robbery", "dacoity", "theft", "extortion"],
  taken: ["theft", "misappropriation", "conversion", "robbery"],
  taking: ["theft", "misappropriation", "conversion", "robbery"],
  stuff: ["property", "movable", "goods", "valuable", "security"],
  things: ["property", "movable", "goods", "valuable"],
  belongings: ["property", "movable", "goods"],
  jewellery: ["property", "valuable", "security"],
  jewelry: ["property", "valuable", "security"],
  money: ["property", "valuable", "security", "bribery", "gratification"],
  cash: ["property", "valuable", "security"],
  wallet: ["property", "movable"],
  phone: ["property", "movable"],
  bike: ["property", "movable"],
  car: ["property", "movable", "vehicle"],

  // House-breaking / Trespass
  broke: ["house-breaking", "trespass", "lurking", "criminal", "mischief", "entry", "break"],
  break: ["house-breaking", "trespass", "lurking", "entry", "break"],
  broken: ["house-breaking", "trespass", "entry"],
  enter: ["trespass", "house-trespass", "house-breaking", "entry", "intrusion"],
  entered: ["trespass", "house-trespass", "house-breaking", "entry"],
  intrude: ["trespass", "intrusion", "house-trespass"],
  house: ["dwelling", "house", "building", "place", "worship", "vessel"],
  home: ["dwelling", "house", "building"],
  building: ["building", "dwelling", "house"],
  door: ["entry", "trespass", "house-breaking"],
  window: ["entry", "trespass", "house-breaking"],
  lock: ["entry", "trespass", "forgery", "false"],
  gate: ["entry", "trespass"],
  night: ["night", "lurking", "house-breaking", "after", "sunset", "sunrise"],
  midnight: ["night", "lurking", "after", "sunset"],

  // Assault / Hurt
  hurt: ["hurt", "grievous", "assault", "voluntarily", "harm", "injury"],
  beating: ["hurt", "assault", "grievous", "voluntarily"],
  beat: ["hurt", "assault", "grievous", "voluntarily"],
  hit: ["hurt", "assault", "grievous"],
  punched: ["hurt", "assault", "grievous"],
  kicked: ["hurt", "assault", "grievous"],
  slap: ["hurt", "assault"],
  attacked: ["assault", "hurt", "grievous", "voluntarily"],
  attack: ["assault", "hurt", "grievous"],
  injured: ["hurt", "grievous", "injury", "voluntarily"],
  injure: ["hurt", "grievous", "injury"],
  wound: ["hurt", "grievous", "injury"],
  wounded: ["hurt", "grievous", "injury"],
  acid: ["acid", "grievous", "hurt", "burn"],
  thrown: ["throwing", "acid", "hurt"],

  // Murder / Death
  killed: ["murder", "culpable", "homicide", "death", "cause"],
  kill: ["murder", "culpable", "homicide", "death"],
  murder: ["murder", "culpable", "homicide", "death"],
  murdered: ["murder", "culpable", "homicide", "death"],
  dead: ["death", "murder", "culpable", "homicide"],
  death: ["death", "murder", "culpable", "homicide"],
  died: ["death", "murder", "culpable", "homicide"],
  strangled: ["murder", "death", "cause"],
  poisoned: ["murder", "death", "poison", "cause"],
  stabbed: ["murder", "death", "hurt", "dangerous", "weapon"],
  shoot: ["murder", "death", "weapon", "firearm"],
  shot: ["murder", "death", "weapon", "firearm"],
  gun: ["weapon", "firearm", "dangerous"],
  knife: ["weapon", "dangerous", "hurt"],

  // Sexual offenses
  rape: ["rape", "sexual", "intercourse", "gang", "penetration"],
  raped: ["rape", "sexual", "intercourse", "gang"],
  molest: ["sexual", "harassment", "assault", "outrage", "modesty"],
  molested: ["sexual", "harassment", "assault", "outrage", "modesty"],
  harass: ["harassment", "sexual", "stalking", "outrage", "modesty"],
  harassed: ["harassment", "sexual", "stalking", "outrage", "modesty"],
  touched: ["sexual", "assault", "outrage", "modesty"],
  undress: ["disrobe", "outrage", "modesty", "sexual"],
  naked: ["disrobe", "outrage", "modesty"],
  video: ["voyeurism", "privacy", "image"],
  photo: ["voyeurism", "privacy", "image"],
  followed: ["stalking", "harassment"],
  follow: ["stalking", "harassment"],
  stalking: ["stalking", "harassment"],
  sexually: ["sexual", "assault", "rape", "intercourse", "modesty"],
  assaulted: ["assault", "hurt", "grievous", "sexual"],

  // Kidnapping / Abduction / Confinement
  kidnap: ["kidnapping", "abduction", "wrongful", "confinement"],
  kidnapped: ["kidnapping", "abduction", "wrongful", "confinement"],
  abduct: ["abduction", "kidnapping", "wrongful", "confinement"],
  abducted: ["abduction", "kidnapping", "wrongful", "confinement"],
  captured: ["kidnapping", "abduction", "wrongful"],
  trapped: ["wrongful", "confinement", "kidnapping"],
  tied: ["wrongful", "confinement", "restraint"],
  locked: ["wrongful", "confinement", "restraint", "kidnapping"],
  confinement: ["wrongful", "confinement", "restraint"],
  confined: ["wrongful", "confinement", "restraint"],

  // Cheating / Fraud / Forgery
  cheat: ["cheating", "fraud", "dishonestly", "deception", "personation"],
  cheated: ["cheating", "fraud", "dishonestly", "deception"],
  fraud: ["fraud", "cheating", "forgery", "counterfeit", "false"],
  fake: ["forgery", "counterfeit", "false", "fraud"],
  forged: ["forgery", "counterfeit", "false"],
  document: ["document", "forgery", "false", "certificate"],
  signature: ["forgery", "false", "document"],
  lied: ["false", "cheating", "fraud", "perjury"],
  lie: ["false", "cheating", "fraud"],
  promise: ["cheating", "breach", "trust"],
  marriage: ["marriage", "bigamy", "cruelty", "dowry"],
  married: ["marriage", "bigamy", "cruelty", "dowry"],
  dowry: ["dowry", "cruelty", "death"],

  // Bribery / Corruption
  bribe: ["bribery", "gratification", "corruption", "public", "servant"],
  bribed: ["bribery", "gratification", "corruption"],
  corrupt: ["corruption", "bribery", "gratification"],
  officer: ["public", "servant", "officer", "police"],
  police: ["public", "servant", "police", "officer"],
  politician: ["public", "servant", "election", "vote"],
  vote: ["election", "vote", "bribery", "undue"],
  voting: ["election", "vote", "bribery"],

  // Arson / Destruction
  fire: ["fire", "mischief", "arson", "explosive", "burn"],
  burn: ["fire", "mischief", "burn", "explosive", "acid"],
  burned: ["fire", "mischief", "burn", "explosive"],
  explosion: ["explosive", "mischief", "fire"],
  bomb: ["explosive", "mischief", "terrorist", "weapon"],
  destroyed: ["mischief", "damage", "destroy"],
  damage: ["mischief", "damage", "destroy"],
  vandalism: ["mischief", "damage", "trespass"],

  // Riots / Unlawful assembly
  riot: ["riot", "unlawful", "assembly", "affray"],
  mob: ["unlawful", "assembly", "riot"],
  crowd: ["unlawful", "assembly", "riot"],
  protest: ["unlawful", "assembly", "riot"],
  fight: ["affray", "riot", "assault", "hurt"],
  fighting: ["affray", "riot", "assault"],
  group: ["group", "people"],
  gang: ["gang", "organised", "crime", "dacoity"],

  // Terrorism / Sedition
  terror: ["terrorist", "terrorism", "organised", "crime"],
  terrorist: ["terrorist", "terrorism", "organised", "crime"],
  blast: ["explosive", "terrorist", "weapon"],
  nation: ["state", "government", "war", "sedition"],
  country: ["state", "government", "war", "sedition"],
  government: ["government", "state", "public", "servant", "war"],
  war: ["war", "government", "state", "sedition"],
  army: ["war", "mutiny", "soldier", "armed"],
  soldier: ["mutiny", "soldier", "armed", "forces"],

  // Drugs / Medical
  drugs: ["drug", "adulteration", "poison", "intoxication"],
  drug: ["drug", "adulteration", "poison"],
  alcohol: ["intoxication", "liquor", "drunk"],
  drunk: ["intoxication", "drunk", "liquor"],
  poison: ["poison", "adulteration", "drug", "murder"],
  food: ["food", "drink", "adulteration", "noxious"],
  water: ["water", "foul", "public", "health"],

  // Traffic / Negligence
  driving: ["driving", "rash", "negligence", "vehicle"],
  accident: ["negligence", "rash", "death", "hurt"],
  crash: ["negligence", "rash", "death", "hurt"],
  speed: ["rash", "driving", "negligence"],
  reckless: ["rash", "negligence", "dangerous"],

  // Misc legal terms
  threatened: ["threat", "criminal", "intimidation", "extortion"],
  threat: ["threat", "criminal", "intimidation", "extortion"],
  blackmail: ["extortion", "threat", "criminal", "intimidation"],
  force: ["force", "criminal", "assault", "compel"],
  forced: ["force", "criminal", "assault", "compel"],
  compelled: ["compel", "force", "coerce"],
  consent: ["consent", "without", "rape", "sexual"],
  unconscious: ["without", "consent", "rape"],
  minor: ["child", "under", "age"],
  child: ["child", "minor", "under", "age"],
  girl: ["woman", "female"],
  boy: ["male"],
  woman: ["woman", "female", "modesty", "cruelty", "dowry"],
  women: ["woman", "female", "modesty", "cruelty", "dowry"],
  wife: ["woman", "cruelty", "dowry", "marriage"],
  husband: ["marriage", "bigamy", "cruelty"],
};

function stem(word: string): string {
  // Simple Porter-style stemmer for common inflections
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("ied")) return word.slice(0, -3) + "y";
  if (word.endsWith("ied")) return word.slice(0, -3) + "y";
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("ying")) return word.slice(0, -3) + "ie";
  if (word.endsWith("ing")) {
    const base = word.slice(0, -3);
    if (base.length > 2) return base;
  }
  if (word.endsWith("edly")) return word.slice(0, -4);
  if (word.endsWith("edly")) return word.slice(0, -2);
  if (word.endsWith("ed")) {
    const base = word.slice(0, -2);
    if (base.length > 2) return base;
  }
  if (word.endsWith("en")) {
    const base = word.slice(0, -2);
    if (base.length > 2) return base;
  }
  if (word.endsWith("er")) {
    const base = word.slice(0, -2);
    if (base.length > 2) return base;
  }
  if (word.endsWith("est")) {
    const base = word.slice(0, -3);
    if (base.length > 2) return base;
  }
  // Common irregulars
  const irregulars: Record<string, string> = {
    stole: "steal", stolen: "steal", stealing: "steal",
    broke: "break", broken: "break",
    took: "take", taken: "take",
    gave: "give", given: "give",
    went: "go", gone: "go",
    came: "come",
    saw: "see", seen: "see",
    knew: "know", known: "know",
    drove: "drive", driven: "drive",
    wrote: "write", written: "write",
    spoke: "speak", spoken: "speak",
    chose: "choose", chosen: "choose",
    froze: "freeze", frozen: "freeze",
    woke: "wake", woken: "wake",
    rode: "ride", ridden: "ride",
    hid: "hide", hidden: "hide",
    bit: "bite", bitten: "bite",
    beat: "beat", beaten: "beat",
    fell: "fall", fallen: "fall",
    got: "get", gotten: "get",
    forgot: "forget", forgotten: "forget",
    did: "do", done: "do",
    ate: "eat", eaten: "eat",
    drank: "drink", drunk: "drink",
    swam: "swim", swum: "swim",
    ran: "run",
    sang: "sing", sung: "sing",
    began: "begin", begun: "begin",
    rang: "ring", rung: "ring",
    shrank: "shrink", shrunk: "shrink",
    sank: "sink", sunk: "sink",
    stank: "stink", stunk: "stink",
    sprang: "spring", sprung: "spring",
    spun: "spin",
    stuck: "stick",
    struck: "strike", stricken: "strike",
    swore: "swear", sworn: "swear",
    tore: "tear", torn: "tear",
    wore: "wear", worn: "wear",
    wove: "weave", woven: "weave",
    won: "win",
    wound: "wind",
    withdrew: "withdraw", withdrawn: "withdraw",
    withheld: "withhold",
    misunderstood: "misunderstand",
    undertook: "undertake", undertaken: "undertake",
  };
  if (irregulars[word]) return irregulars[word];
  return word;
}

function tokenize(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
  // Return both raw and stemmed forms
  const stemmed = raw.map(stem);
  return Array.from(new Set([...raw, ...stemmed]));
}

function expandTokens(tokens: string[]): string[] {
  const expanded = new Set<string>(tokens);
  for (const t of tokens) {
    const stems = SYNONYMS[t];
    if (stems) {
      for (const s of stems) expanded.add(s);
    }
    // Also add partial matches for compound words
    for (const [key, vals] of Object.entries(SYNONYMS)) {
      if (t.includes(key) || key.includes(t)) {
        for (const v of vals) expanded.add(v);
      }
    }
  }
  return Array.from(expanded);
}

function buildDocText(p: Provision): string {
  // Combine offense + punishment + key metadata for richer matching
  return `${p.offense} ${p.punishment} ${p.cognizable} ${p.bailable} ${p.court}`;
}

function computeIdf(docs: string[][]): Record<string, number> {
  const df: Record<string, number> = {};
  const N = docs.length;

  for (const doc of docs) {
    const seen = new Set<string>();
    for (const term of doc) {
      if (!seen.has(term)) {
        df[term] = (df[term] || 0) + 1;
        seen.add(term);
      }
    }
  }

  const idf: Record<string, number> = {};
  for (const [term, count] of Object.entries(df)) {
    idf[term] = Math.log(N / (count || 1));
  }
  return idf;
}

function computeTfIdfVectors(docs: string[][], idf: Record<string, number>): Record<string, number>[] {
  return docs.map((doc) => {
    const tf: Record<string, number> = {};
    for (const term of doc) {
      tf[term] = (tf[term] || 0) + 1;
    }
    const vec: Record<string, number> = {};
    for (const term of Object.keys(tf)) {
      vec[term] = tf[term] * (idf[term] || 0);
    }
    return vec;
  });
}

function computeQueryVector(tokens: string[], idf: Record<string, number>): Record<string, number> {
  const tf: Record<string, number> = {};
  for (const term of tokens) {
    tf[term] = (tf[term] || 0) + 1;
  }
  const vec: Record<string, number> = {};
  for (const term of Object.keys(tf)) {
    vec[term] = tf[term] * (idf[term] || 0);
  }
  return vec;
}

function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const k of Object.keys(a)) {
    normA += a[k] * a[k];
    if (b[k] !== undefined) {
      dot += a[k] * b[k];
    }
  }
  for (const k of Object.keys(b)) {
    normB += b[k] * b[k];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export default function BNSSClassifierPage() {
  const [data, setData] = useState<BNSSData | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ provision: Provision; score: number }>>([]);
  const [vectors, setVectors] = useState<Record<string, number>[]>([]);
  const [idf, setIdf] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch("/data/bnss-dataset.json")
      .then((r) => r.json())
      .then((d: BNSSData) => {
        setData(d);
        const docs = d.provisions.map((p) => expandTokens(tokenize(buildDocText(p))));
        const computedIdf = computeIdf(docs);
        setIdf(computedIdf);
        setVectors(computeTfIdfVectors(docs, computedIdf));
      });
  }, []);

function getPhrases(text: string): string[] {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
  const phrases: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }
  for (let i = 0; i < words.length - 2; i++) {
    phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return phrases;
}

function computeRefinedScore(
  queryRaw: string,
  queryTokens: string[],
  queryExpanded: string[],
  provision: Provision,
  baseCosine: number
): number {
  const docText = buildDocText(provision).toLowerCase();
  const docTokens = tokenize(buildDocText(provision));

  // 1. Base TF-IDF score (capped to avoid outliers)
  let score = Math.min(baseCosine, 0.85);

  // 2. Direct token overlap bonus
  const directMatches = queryTokens.filter((t) => docTokens.includes(t));
  score += directMatches.length * 0.06;

  // 3. Phrase overlap bonus
  const queryPhrases = getPhrases(queryRaw);
  let phraseMatches = 0;
  for (const phrase of queryPhrases) {
    if (docText.includes(phrase)) phraseMatches++;
  }
  score += phraseMatches * 0.12;

  // 4. Expanded token overlap count (for minimum match gating)
  const expandedMatches = queryExpanded.filter((t) => docTokens.includes(t) || docText.includes(t));

  // 5. Category detection for query and provision
  const querySet = new Set(queryTokens);
  const rawLower = queryRaw.toLowerCase();

  // Multi-signal query flags
  const isTheftQuery = ["steal", "stole", "stolen", "stealing", "robbed", "rob", "theft", "money", "wallet", "cash", "property", "belongings", "jewellery", "jewelry", "bike", "car", "phone"].some((t) => querySet.has(t));
  const isReceivingQuery = ["receive", "receiving", "buy", "bought", "purchase", "purchased", "sell", "sold"].some((t) => querySet.has(t));
  const isKidnappingQuery = ["kidnap", "kidnapped", "abduct", "abducted", "captured", "trapped", "tied"].some((t) => querySet.has(t));
  const isMurderQuery = ["killed", "kill", "murder", "murdered", "dead", "death", "died", "strangled", "poisoned", "stabbed", "shoot", "shot"].some((t) => querySet.has(t));
  const isSexualQuery = ["rape", "raped", "molest", "molested", "harass", "harassed", "touched", "undress", "naked", "stalking", "sexually"].some((t) => querySet.has(t)) || (rawLower.includes("sexual") && rawLower.includes("assault"));
  const isConfinementQuery = ["locked", "confinement", "confined", "trapped", "tied", "restrained"].some((t) => querySet.has(t));
  const isHurtQuery = ["hurt", "beating", "beat", "hit", "punched", "kicked", "slap", "attacked", "attack", "injured", "injure", "wound", "wounded"].some((t) => querySet.has(t));
  const isTrespassQuery = ["broke", "break", "broken", "enter", "entered", "intrude", "house", "home", "building", "door", "window", "lock", "gate"].some((t) => querySet.has(t));

  // Provision category flags
  const isTheftProvision = docText.includes("theft") || docText.includes("robbery") || docText.includes("extortion") || docText.includes("dacoity") || docText.includes("snatching") || docText.includes("mischief");
  const isKidnappingProvision = docText.includes("kidnapping") || docText.includes("abducting") || docText.includes("abduction");
  const isMurderProvision = docText.includes("murder") || docText.includes("culpable homicide");
  const isSexualProvision = docText.includes("rape") || docText.includes("sexual") || docText.includes("modesty");
  const isConfinementProvision = docText.includes("wrongful confinement") || docText.includes("wrongfully confining") || docText.includes("wrongful restrain");
  const isHurtProvision = docText.includes("hurt") || docText.includes("grievous") || docText.includes("assault");
  const isTrespassProvision = docText.includes("trespass") || docText.includes("house-breaking") || docText.includes("lurking");
  const isReceivingProvision = docText.includes("receiving") || docText.includes("receipt") || (docText.includes("stolen") && docText.includes("property") && !docText.includes("theft") && !docText.includes("robbery"));

  // Boost matching categories (additive, not multiplicative penalty on others)
  if (isTheftQuery && isTheftProvision) score += 0.18;
  if (isKidnappingQuery && isKidnappingProvision) score += 0.18;
  if (isMurderQuery && isMurderProvision) score += 0.18;
  if (isSexualQuery && isSexualProvision) score += 0.18;
  if (isConfinementQuery && isConfinementProvision) score += 0.18;
  if (isHurtQuery && isHurtProvision) score += 0.12;
  if (isTrespassQuery && isTrespassProvision) score += 0.15;

  // Penalize receiving-stolen-property when query describes active theft
  if (isTheftQuery && isReceivingProvision && !isReceivingQuery) {
    score *= 0.3;
  }

  // Light cross-category penalty ONLY when query is clearly single-category and provision is clearly unrelated
  const singleCategoryQuery = [isTheftQuery, isKidnappingQuery, isMurderQuery, isSexualQuery, isConfinementQuery].filter(Boolean).length === 1;
  if (singleCategoryQuery) {
    if (isTheftQuery && isSexualProvision && directMatches.length < 1) score *= 0.5;
    if (isTheftQuery && isMurderProvision && directMatches.length < 1) score *= 0.5;
    if (isKidnappingQuery && isSexualProvision && directMatches.length < 1) score *= 0.5;
    if (isMurderQuery && isTheftProvision && directMatches.length < 1) score *= 0.5;
    if (isSexualQuery && isTheftProvision && directMatches.length < 1) score *= 0.5;
    if (isSexualQuery && isMurderProvision && directMatches.length < 1) score *= 0.5;
  }

  // 9. Minimum match gate: reject if fewer than 2 expanded tokens match
  if (expandedMatches.length < 2) {
    score *= 0.2;
  }

  // 10. Penalize pure synonym-only matches (no direct matches at all)
  if (directMatches.length === 0 && expandedMatches.length > 0) {
    score *= 0.5;
  }

  // 11. Boost strong direct matches
  if (directMatches.length >= 3) {
    score *= 1.25;
  }

  return Math.max(0, Math.min(score, 0.99));
}

  const handleClassify = () => {
    if (!data || vectors.length === 0 || !input.trim()) return;
    setLoading(true);
    setResults([]);

    setTimeout(() => {
      const rawQuery = input.trim();
      const userTokens = tokenize(rawQuery);
      const userExpanded = expandTokens(userTokens);
      const userVec = computeQueryVector(userExpanded, idf);

      // Score all provisions
      const allScored = vectors
        .map((vec, i) => ({
          index: i,
          cosine: cosineSimilarity(userVec, vec),
        }))
        .filter((s) => s.cosine > 0)
        .map((s) => ({
          index: s.index,
          score: computeRefinedScore(rawQuery, userTokens, userExpanded, data.provisions[s.index], s.cosine),
          provision: data.provisions[s.index],
        }))
        .filter((s) => s.score > 0.02)
        .sort((a, b) => b.score - a.score);

      // Detect which categories are present in the query
      const querySet = new Set(userTokens);
      const rawLower = rawQuery.toLowerCase();
      const detectedCategories: string[] = [];
      if (["steal", "stole", "stolen", "stealing", "robbed", "rob", "theft", "money", "wallet", "cash", "property", "belongings", "jewellery", "jewelry", "bike", "car", "phone"].some((t) => querySet.has(t))) detectedCategories.push("theft");
      if (["kidnap", "kidnapped", "abduct", "abducted", "captured", "trapped", "tied"].some((t) => querySet.has(t))) detectedCategories.push("kidnapping");
      if (["killed", "kill", "murder", "murdered", "dead", "death", "died", "strangled", "poisoned", "stabbed", "shoot", "shot"].some((t) => querySet.has(t))) detectedCategories.push("murder");
      if (["rape", "raped", "molest", "molested", "harass", "harassed", "touched", "undress", "naked", "stalking", "sexually"].some((t) => querySet.has(t)) || (rawLower.includes("sexual") && rawLower.includes("assault"))) detectedCategories.push("sexual");
      if (["locked", "confinement", "confined", "trapped", "tied", "restrained"].some((t) => querySet.has(t))) detectedCategories.push("confinement");
      if (["hurt", "beating", "beat", "hit", "punched", "kicked", "slap", "attacked", "attack", "injured", "injure", "wound", "wounded"].some((t) => querySet.has(t))) detectedCategories.push("hurt");
      if (["broke", "break", "broken", "enter", "entered", "intrude", "house", "home", "building", "door", "window", "lock", "gate"].some((t) => querySet.has(t))) detectedCategories.push("trespass");

      // Helper to categorize a provision
      function provisionCategory(p: Provision): string {
        const d = `${p.offense} ${p.punishment}`.toLowerCase();
        if (d.includes("rape") || d.includes("sexual") || d.includes("modesty")) return "sexual";
        if (d.includes("wrongful confinement") || d.includes("wrongfully confining") || d.includes("wrongful restrain")) return "confinement";
        if (d.includes("kidnapping") || d.includes("abducting") || d.includes("abduction")) return "kidnapping";
        if (d.includes("murder") || d.includes("culpable homicide")) return "murder";
        if (d.includes("theft") || d.includes("robbery") || d.includes("extortion") || d.includes("dacoity") || d.includes("snatching")) return "theft";
        if (d.includes("hurt") || d.includes("grievous") || (d.includes("assault") && !d.includes("sexual"))) return "hurt";
        if (d.includes("trespass") || d.includes("house-breaking") || d.includes("lurking")) return "trespass";
        return "other";
      }

      const picked = new Set<number>();
      const finalResults: Array<{ provision: Provision; score: number }> = [];

      // Pick top 2 from each detected category
      for (const cat of detectedCategories) {
        let count = 0;
        for (const s of allScored) {
          if (picked.has(s.index)) continue;
          if (provisionCategory(s.provision) === cat) {
            finalResults.push({ provision: s.provision, score: s.score });
            picked.add(s.index);
            count++;
            if (count >= 2) break;
          }
        }
      }

      // Fill remaining slots with highest overall scores (up to 10 total)
      for (const s of allScored) {
        if (picked.has(s.index)) continue;
        finalResults.push({ provision: s.provision, score: s.score });
        picked.add(s.index);
        if (finalResults.length >= 10) break;
      }

      // Sort by score descending
      finalResults.sort((a, b) => b.score - a.score);

      setResults(finalResults);
      setLoading(false);
    }, 500);
  };

  const generateFIR = (provision: Provision) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("FIRST INFORMATION REPORT (FIR)", 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 35);
    doc.text(`Section: ${provision.bnss_section} of Bharatiya Nyaya Sanhita`, 20, 45);
    doc.text(`Offense: ${provision.offense.substring(0, 120)}...`, 20, 55);
    doc.text(`Punishment: ${provision.punishment.substring(0, 120)}`, 20, 65);
    doc.text(`Cognizable: ${provision.cognizable} | Bailable: ${provision.bailable}`, 20, 75);
    doc.text(`Triable by: ${provision.court}`, 20, 85);
    doc.text("This is a computer-generated draft for research purposes.", 20, 105);
    doc.save(`FIR_Section_${provision.bnss_section}.pdf`);
  };

  const generateBail = (provision: Provision) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BAIL BOND / BAIL APPLICATION", 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 35);
    doc.text(`Section: ${provision.bnss_section} of Bharatiya Nyaya Sanhita`, 20, 45);
    doc.text(`Offense: ${provision.offense.substring(0, 120)}...`, 20, 55);
    doc.text(`Bailable: ${provision.bailable}`, 20, 65);
    doc.text(`Triable by: ${provision.court}`, 20, 75);
    doc.text("The applicant undertakes to appear before the court as and when required.", 20, 90);
    doc.text("This is a computer-generated draft for research purposes.", 20, 105);
    doc.save(`Bail_Section_${provision.bnss_section}.pdf`);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Offence Detection under Indian Criminal Law</h1>
        <p className="text-muted-foreground mt-1">
          Classify offences under the Bharatiya Nyaya Sanhita (BNSS, 2023) using TF-IDF and cosine similarity.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Describe the Offense
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe the incident in plain language (e.g., 'A group of five people broke into a house at night and stole jewelry')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
          />
          <Button onClick={handleClassify} disabled={loading || !data} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
            Classify Offense
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-4 mb-6">
          {results.map((r, idx) => (
            <Card key={r.provision.bnss_section} className={idx === 0 ? "border-primary/50" : ""}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {idx === 0 ? "Best Match" : `Applicable Section ${idx}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={idx === 0 ? "default" : "secondary"}>Section {r.provision.bnss_section}</Badge>
                  <Badge variant="outline">Confidence: {(r.score * 100).toFixed(1)}%</Badge>
                </div>
                <p className="text-sm leading-relaxed">{r.provision.offense}</p>
                <Separator />
                <div className="grid gap-3 md:grid-cols-2 text-sm">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Punishment</p>
                      <p className="text-muted-foreground">{r.provision.punishment}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Scale className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Cognizable</p>
                      <p className="text-muted-foreground">{r.provision.cognizable}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Scale className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Bailable</p>
                      <p className="text-muted-foreground">{r.provision.bailable}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Gavel className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Court</p>
                      <p className="text-muted-foreground">{r.provision.court}</p>
                    </div>
                  </div>
                </div>
                {idx === 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" size="sm" onClick={() => generateFIR(r.provision)} className="gap-2">
                        <FileText className="h-4 w-4" />
                        Download FIR Draft
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => generateBail(r.provision)} className="gap-2">
                        <FileText className="h-4 w-4" />
                        Download Bail Bond Draft
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Enter a description of the incident in everyday language.</p>
            <p>2. The text is tokenized and stopwords are removed.</p>
            <p>3. TF-IDF vectors are computed for the input and all 443 BNSS provisions.</p>
            <p>4. Cosine similarity identifies the most relevant legal section.</p>
            <p>5. Auto-generate draft FIR or bail bond as a PDF.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              This tool is for research and educational purposes. Legal documents generated here
              are drafts and must be reviewed by a qualified legal practitioner before use in any
              official proceeding.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
