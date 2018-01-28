const Game = require('./Game');

module.exports = class GameManager {
  constructor() {
    this.games = {};
  }

  getOrCreateById(gameid) {
    return this.getById(gameid) || this.createGame(gameid);
  }
  getById(gameid) {
    return this.games[gameid];
  }

  newGameid() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 4; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  createGame(requestedGameid) {
    const game = new Game(typeof requestedGameid !== 'undefined' ?
     requestedGameid : this.newGameid());
    this.games[game.id] = game;
    return game;
  }
}
