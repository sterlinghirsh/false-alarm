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
    for (let client in this.clients) {
      this.clients[client].emit('setPlayerid', this.id);
    }
  }

  emitPhrase() {
    for (let client in this.clients) {
      this.clients[client].emit('updatePhrase', this.phrases[0]);
    }
  }

  emitButtons() {
    const sortedButtons = this.buttons.slice(0, 4);
    sortedButtons.sort((a, b) => a.Phrase.localeCompare(b.Phrase));
    for (let client in this.clients) {
      this.clients[client].emit('updateButtons', sortedButtons);
    }
  }

  emitStartGame(startDate) {
    this.emitPhrase();
    this.emitButtons();
    this.emit('startGame', startDate);
  }

  emitPlayerCount(count) {
    this.emit('updatePlayerCount', count);
  }

  emitScore(numCorrect, numIncorrect) {
    this.emit('updateScore', {numCorrect, numIncorrect});
  }

  emit(name, value) {
    for (let client in this.clients) {
      this.clients[client].emit(name, value);
    }
  }

  nextPhrase() {
    this.phrases.shift();
    this.emitPhrase();
  }

  removeButton(phraseToRemove) {
    this.buttons = this.buttons.filter(button =>
     phraseToRemove !== button.Phrase);
    this.emitButtons();
  }
}

