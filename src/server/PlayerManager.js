const Player = require('./Player');

module.exports = class PlayerManager {
  constructor() {
    this.playersByClientid = {};
    this.playersByPlayerid = {};
  }

  newPlayerid() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 32; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  addPlayer(client) {
    const playerid = this.newPlayerid();
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

  // Forget players that are in no game and have been unseen for a while.
  sweep(now = Date.now(), activeIds = new Set(), idleMs = 30 * 60 * 1000) {
    for (const [id, player] of Object.entries(this.playersByPlayerid)) {
      if (activeIds.has(id) || now - player.lastSeen <= idleMs) continue;
      delete this.playersByPlayerid[id];
      for (const [cid, p] of Object.entries(this.playersByClientid)) {
        if (p === player) delete this.playersByClientid[cid];
      }
    }
  }
}
