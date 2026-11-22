const Game = require('./Game');

module.exports = class GameManager {
  constructor() {
    this.games = {};
  }

  getOrCreateById(gameid) {
    return this.getById(gameid) || this.createGame(gameid);
  }
  getById(gameid) {
    return this.games[gameid.toLowerCase()];
  }

  newGameid() {
    let text = "";
    const possible = "abcdefghijklmnopqrstuvwxyz";

    for (var i = 0; i < 4; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  createGame(requestedGameid) {
    const game = new Game(typeof requestedGameid !== 'undefined' ?
     requestedGameid.toLowerCase() : this.newGameid());
    this.games[game.id] = game;
    return game;
  }

  // Delete games that are empty or finished and have been idle for a while.
  sweep(now = Date.now(), emptyMs = 5 * 60 * 1000, anyMs = 6 * 60 * 60 * 1000) {
    for (const [id, game] of Object.entries(this.games)) {
      const idle = now - game.lastActivity;
      const empty = Object.keys(game.players).length === 0;
      if ((empty && idle > emptyMs) || idle > anyMs) {
        game.destroy();
        delete this.games[id];
      }
    }
  }

  activePlayerIds() {
    const ids = new Set();
    Object.values(this.games).forEach((g) =>
      Object.keys(g.players).forEach((id) => ids.add(id)));
    return ids;
  }
}
