const Game = require('./Game');

module.exports = class GameManager {
  constructor() {
    this.games = [];
  }

  getById(gameid) {
    return this.games[gameid];
  }

  createGame() {
    const game = new Game(this.games.length);
    this.games.push(game);
    return game;
  }
}
