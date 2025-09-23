const masterPhrases = require("../phrases.json");
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
  }

  addPlayer(player) {
    this.players[player.id] = player;
  }

  removePlayer(player) {
    delete this.players[player.id];
  }

  generateRound() {
    const playerids = Object.keys(this.players);
    const numPlayers = playerids.length;
    const phrases = masterPhrases.slice(0);

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
    this.timeout = setTimeout(this.endGame.bind(this), time);
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
    const clickingPlayer = this.players[playerid];
    // Figure out if the phrase is active or not first.
    const playerWithActivePhrase = Object.values(this.players).find(
      (player) => player.phrases[0].Phrase === phrase,
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
