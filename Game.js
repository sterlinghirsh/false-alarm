const masterPhrases = require('./src/phrases.json');
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
    this.players = [];
    this.started = false;
  }

  addPlayer(player) {
    this.players[player.id] = player;
  }

  generateRound() {
    const numPlayers = this.players.length;
    const phrases = masterPhrases.slice(0, 10);
    shuffle(phrases);
    let curPlayer = 0;
    let curPhrase;
    console.log(this.players);
    while (phrases.length > 0) {
      let otherPlayer = (curPlayer + 1) % numPlayers;
      curPhrase = phrases.shift();
      this.players[curPlayer].addPhrase(curPhrase);
      this.players[otherPlayer].addButton(curPhrase);
      // This is the same as figuring out otherPlayer just for now.
      curPlayer = (curPlayer + 1) % numPlayers;
    }
  }
}

