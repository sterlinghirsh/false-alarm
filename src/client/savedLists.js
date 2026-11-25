// Custom phrase lists saved on this phone (localStorage). The server checks the
// same limits (src/server/customLists.js); these are here so the sheet can say
// what's wrong before anything is sent.
export const LIMITS = { listsPerGame: 5, phrasesPerList: 100, phraseLength: 40, nameLength: 24 };

const KEY = "falseAlarm.lists";
const clean = (s) => s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤﻿]/g, "").replace(/\s+/g, " ").trim();

// Pasted text -> phrases: one per line, trimmed, blank lines and repeats dropped.
export function parsePhrases(text) {
  const seen = new Set();
  const out = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const t = clean(line);
    const k = t.toLowerCase();
    if (!t || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export function cleanName(name) {
  return clean(String(name || ""));
}

// The first thing wrong with a list, or null.
export function listProblem(name, phrases) {
  if (!name) return "Give the list a name.";
  if (name.length > LIMITS.nameLength) return `Names can be at most ${LIMITS.nameLength} characters.`;
  if (phrases.length === 0) return "Add at least one phrase.";
  if (phrases.length > LIMITS.phrasesPerList) return `At most ${LIMITS.phrasesPerList} phrases (this has ${phrases.length}).`;
  const long = phrases.find((p) => p.length > LIMITS.phraseLength);
  if (long) return `Phrases can be at most ${LIMITS.phraseLength} characters: “${long.slice(0, 24)}…”`;
  return null;
}

export function loadLists() {
  try {
    const lists = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(lists)
      ? lists.filter((l) => l && typeof l.id === "string" && typeof l.name === "string" && Array.isArray(l.phrases))
      : [];
  } catch (e) {
    return [];
  }
}

function store(lists) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lists));
  } catch (e) {
    // Private mode or full storage: the list still works for this game.
  }
}

export function saveList(list) {
  const lists = loadLists();
  const i = lists.findIndex((l) => l.id === list.id);
  if (i >= 0) lists[i] = list;
  else lists.push(list);
  store(lists);
  return lists;
}

export function deleteList(id) {
  const lists = loadLists().filter((l) => l.id !== id);
  store(lists);
  return lists;
}

export function newListId() {
  return "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Plain text, one phrase per line: what "Copy list" puts on the clipboard.
export function listText(list) {
  return list.phrases.join("\n");
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // Older phones, or no clipboard permission: the select-and-copy fallback.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e2) {}
    ta.remove();
    return ok;
  }
}
