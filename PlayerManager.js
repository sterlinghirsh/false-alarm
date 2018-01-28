const Player = require('./Player');

module.exports = class PlayerManager {
  constructor() {
    this.playersByClientid = {};
    this.playersByPlayerid = {};
    this.nextPlayerid = 0;
  }

  addPlayer(client) {
    const playerid = this.nextPlayerid++;
    const player = new Player(client, playerid);
    this.playersByClientid[client.id] = player;
    this.playersByPlayerid[player.id] = player;
    player.emitPlayerid();
    return player;
  }

  addClientToPlayer(client, playerid) {
    const player = this.playersByPlayerid[playerid];
    if (!player) {
      console.log("Didn't find player", playerid, ", creating.");
      return this.addPlayer(client);
    }
    player.addClient(client);
    this.playersByClientid[client.id] = player;
    return player;
  }
}
