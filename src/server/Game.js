const masterPhrases = require("../phrases.json");
const { LIMITS } = require("./customLists");

// A phrase's Type is a list of categories (older data used a single string).
const typesOf = (p) => (Array.isArray(p.Type) ? p.Type : [p.Type]);

const allCategories = [
  ...new Set(masterPhrases.flatMap(typesOf)),
].sort();

// Categories a new game starts with turned off; players can tick them in the
// lobby. Chamberlain names family members, so it stays out of public games
// unless someone turns it on. Thanksgiving and General 2 are the 2021 phrases
// restored on 2026-11-24 (Replit's 617a16f had cut them); they start off too.
const defaultOffCategories = ["Chamberlain", "General 2", "Thanksgiving"];
const defaultEnabledCategories = allCategories.filter(
  (c) => !defaultOffCategories.includes(c),
);

function getCategoryCounts() {
  const counts = {};
  allCategories.forEach((c) => (counts[c] = 0));
  masterPhrases.forEach((p) => {
    typesOf(p).forEach((t) => {
      if (counts[t] !== undefined) counts[t]++;
    });
  });
  return counts;
}

const categoryCounts = getCategoryCounts();

function shuffle(a) {
  for (let i = a.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = class Game {
  constructor(id) {
    this.id = id;
    this.players = {};
    this.started = false;
    this.gameOver = false;
    this.numCorrect = 0;
    this.numIncorrect = 0;
    this.timerStartDate = new Date();
    this.timeout = null;
    this.lastActivity = Date.now();
    this.allCategories = allCategories;
    this.enabledCategories = new Set(defaultEnabledCategories);
    // Player-made lists for this game only: key -> { key, name, owner, clientId, phrases }.
    this.customLists = new Map();
    this.nextListNumber = 1;
  }

  // Built-in categories plus this game's custom list keys.
  categoryKeys() {
    return [...this.allCategories, ...this.customLists.keys()];
  }

  // Adds a validated list for its owner and ticks it. Returns the key, or an
  // error string. The owner is the player whose socket sent it.
  addCustomList(owner, { name, phrases }, clientId) {
    if (this.started) return { ignored: true };
    if (this.customLists.size >= LIMITS.listsPerGame) {
      return { error: `A game can have at most ${LIMITS.listsPerGame} custom lists.` };
    }
    const key = `list${this.nextListNumber++}`;
    this.customLists.set(key, { key, name, owner, clientId: clientId || null, phrases });
    this.enabledCategories.add(key);
    this.touch();
    this.emitGameSettings();
    return { key };
  }

  // Only the player who added a list may change or remove it.
  ownedList(owner, key) {
    const list = this.customLists.get(key);
    if (!list) return { error: "Unknown list." };
    if (list.owner !== owner) return { error: "Only the phone that added a list can change it." };
    return { list };
  }

  updateCustomList(owner, key, { name, phrases }) {
    if (this.started) return { ignored: true };
    const { list, error } = this.ownedList(owner, key);
    if (error) return { error };
    list.name = name;
    list.phrases = phrases;
    this.touch();
    this.emitGameSettings();
    return { key };
  }

  removeCustomList(owner, key) {
    if (this.started) return { ignored: true };
    const { error } = this.ownedList(owner, key);
    if (error) return { error };
    this.customLists.delete(key);
    this.enabledCategories.delete(key);
    // The last-category guard: never leave a game with nothing ticked.
    if (this.enabledCategories.size === 0) {
      this.enabledCategories = new Set(defaultEnabledCategories);
    }
    this.touch();
    this.emitGameSettings();
    return { key };
  }

  // The phrases a round deals: enabled built-ins plus enabled custom lists,
  // each phrase text once (a custom phrase that repeats a built-in one is
  // dropped, since taps match by text).
  phrasePool() {
    const enabled = this.enabledCategories;
    const seen = new Set();
    const pool = [];
    const add = (p) => {
      const k = p.Phrase.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      pool.push(p);
    };
    masterPhrases.filter((p) => typesOf(p).some((t) => enabled.has(t))).forEach(add);
    for (const list of this.customLists.values()) {
      if (!enabled.has(list.key)) continue;
      list.phrases.forEach((text) => add({ Phrase: text, Type: [list.key] }));
    }
    return pool;
  }

  touch() {
    this.lastActivity = Date.now();
  }

  destroy() {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = null;
  }

  addPlayer(player) {
    this.touch();
    this.players[player.id] = player;
  }

  removePlayer(player) {
    delete this.players[player.id];
  }

  // Returns false (and changes nothing) once started, or when no known
  // category is left: the last category can't be turned off.
  updateEnabledCategories(categories) {
    if (this.started || !Array.isArray(categories)) return false;
    const keys = this.categoryKeys();
    const valid = categories.filter((c) => keys.includes(c));
    if (valid.length === 0) return false;
    this.touch();
    this.enabledCategories = new Set(valid);
    this.emitGameSettings();
    return true;
  }

  getSelectedWordCount() {
    return this.phrasePool().length;
  }

  // What every player sees. With a player, their own lists carry mine: true and
  // the clientId their phone saved them under; owners are never sent.
  getSettingsPayload(player) {
    const counts = { ...categoryCounts };
    const customLists = [...this.customLists.values()].map((l) => {
      counts[l.key] = l.phrases.length;
      const mine = !!player && l.owner === player.id;
      return mine
        ? { key: l.key, name: l.name, count: l.phrases.length, mine, clientId: l.clientId }
        : { key: l.key, name: l.name, count: l.phrases.length, mine };
    });
    return {
      allCategories: this.allCategories,
      enabledCategories: [...this.enabledCategories],
      categoryCounts: counts,
      customLists,
      selectedWordCount: this.getSelectedWordCount(),
    };
  }

  emitGameSettings() {
    this.forEachPlayer((player) => player.emit("gameSettings", this.getSettingsPayload(player)));
  }

  generateRound() {
    this.touch();
    const playerids = Object.keys(this.players);
    const numPlayers = playerids.length;
    let filtered = this.phrasePool();
    if (filtered.length === 0) {
      filtered = masterPhrases.slice(0);
    }
    const phrases = filtered.slice(0);

    shuffle(phrases);

    this.forEachPlayer((player) => player.reset());
    let curPlayer = 0;
    let curPhrase;
    while (phrases.length > 0) {
      if (curPlayer === 0) {
        shuffle(playerids);
      }
      let otherPlayer = (curPlayer + 1) % numPlayers;
      curPhrase = phrases.shift();
      this.players[playerids[curPlayer]].addPhrase(curPhrase);
      this.players[playerids[otherPlayer]].addButton(curPhrase);
      // This is the same as figuring out otherPlayer just for now.
      curPlayer = (curPlayer + 1) % numPlayers;
    }

    this.started = true;
    this.numCorrect = 0;
    this.numIncorrect = 0;
    this.forEachPlayer((player) => player.emitStartGame());
    this.startTimer();
    this.emitScore();
  }

  emitPlayerCount() {
    const values = Object.values(this.players);
    const count = values.length;
    values.forEach((player) =>
      player.emitPlayerCount(Object.keys(this.players).length),
    );
  }

  emitStartTimer() {
    this.forEachPlayer((player) => player.emit("startTimer"));
  }

  emitScore() {
    this.forEachPlayer((player) =>
      player.emitScore(this.numCorrect, this.numIncorrect),
    );
  }

  forEachPlayer(fn) {
    const values = Object.values(this.players);
    values.forEach((player) => fn(player));
  }

  // copied in src/App.js
  getMaxTime() {
    const baseTime = 1000; // ms
    const startTime = 9000; // ms
    const numCorrectBase = 0.95;
    return (
      baseTime +
      Math.round(
        startTime *
          Math.pow(numCorrectBase, this.numCorrect + this.numIncorrect * 2),
      )
    );
  }

  endGame() {
    console.log("GAME OVER");
    this.gameOver = true;
    this.started = false;
    this.forEachPlayer((player) => player.emitGameOver());
  }

  updateTimer(time) {
    if (this.timeout !== null) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(this.endGame.bind(this), Math.max(0, time));
  }

  startTimer() {
    this.timerStartDate = new Date();
    this.updateTimer(this.getMaxTime());
    this.emitStartTimer();
  }

  getElapsed() {
    return new Date() - this.timerStartDate;
  }

  handleClickPhrase(phrase, playerid) {
    this.touch();
    const clickingPlayer = this.players[playerid];
    if (!clickingPlayer) return;
    // Figure out if the phrase is active or not first.
    const playerWithActivePhrase = Object.values(this.players).find(
      (player) => player.phrases.length > 0 && player.phrases[0].Phrase === phrase,
    );

    if (typeof playerWithActivePhrase !== "undefined") {
      // Handle correct phrase
      console.log("CORRECT:", phrase, playerWithActivePhrase.id);
      playerWithActivePhrase.nextPhrase();
      clickingPlayer.removeButton(phrase);
      ++this.numCorrect;
      ++playerWithActivePhrase.othersClicked;
      ++clickingPlayer.correctClicks;
      this.startTimer();
    } else {
      // Handle incorrect phrase
      console.log("INCORRECT:", phrase);
      ++this.numIncorrect;
      ++clickingPlayer.incorrectClicks;
      this.updateTimer(this.getMaxTime() - this.getElapsed());
    }
    this.emitScore();
  }
};

module.exports.allCategories = allCategories;
module.exports.categoryCounts = categoryCounts;
module.exports.defaultEnabledCategories = defaultEnabledCategories;
module.exports.defaultOffCategories = defaultOffCategories;
