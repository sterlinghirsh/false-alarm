module.exports = class Player {
  constructor(client, playerid) {
    this.id = playerid;
    this.clients = [client];
    this.phrases = [];
    this.buttons = [];
    this.ready = false;
  }

  addClient(client) {
    this.clients.push(client);
  }

  addPhrase(phrase) {
    this.phrases.push(phrase);
  }

  addButton(button) {
    this.buttons.push(button);
  }

  emitPlayerid() {
    console.log("EmitPlayerid");
    for (let client in this.clients) {
      console.log("emitting");
      this.clients[client].emit('setPlayerid', this.id);
    }
  }

  emitPhrase() {
    for (let client in this.clients) {
      this.clients[client].emit('updatePhrase', this.phrases[0]);
    }
  }

  emitButtons() {
    for (let client in this.clients) {
      this.clients[client].emit('updatePhrase', this.phrases[0]);
    }
  }
}

