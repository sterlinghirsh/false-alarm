// Player-made phrase lists. A list lives in its game's memory only: it comes
// from one phone's localStorage, is shared with that game's players as a
// category, and goes when the game is swept. No accounts, no server storage.

const LIMITS = {
  listsPerGame: 5,
  phrasesPerList: 100,
  phraseLength: 40,
  nameLength: 24,
  // Raw lines accepted before trimming and deduping (a paste with blank lines).
  rawLines: 300,
};

// Control characters and zero-width/bidi marks: not text a player can see.
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤﻿]/g;
const clean = (s) => s.replace(INVISIBLE, "").replace(/\s+/g, " ").trim();

// Returns { name, phrases } or { error } for a list a player sent.
function validateList(name, phrases) {
  if (typeof name !== "string" || name.length > 200) return { error: "Invalid list name." };
  const n = clean(name);
  if (!n) return { error: "A list needs a name." };
  if (n.length > LIMITS.nameLength) {
    return { error: `List names can be at most ${LIMITS.nameLength} characters.` };
  }
  if (!Array.isArray(phrases) || phrases.length > LIMITS.rawLines) {
    return { error: "Invalid phrases." };
  }
  const seen = new Set();
  const out = [];
  for (const p of phrases) {
    if (typeof p !== "string" || p.length > 200) return { error: "Invalid phrases." };
    const t = clean(p);
    if (!t) continue;
    if (t.length > LIMITS.phraseLength) {
      return { error: `Phrases can be at most ${LIMITS.phraseLength} characters: "${t.slice(0, 20)}…"` };
    }
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  if (out.length === 0) return { error: "A list needs at least one phrase." };
  if (out.length > LIMITS.phrasesPerList) {
    return { error: `Lists can have at most ${LIMITS.phrasesPerList} phrases.` };
  }
  return { name: n, phrases: out };
}

module.exports = { LIMITS, validateList, clean };
