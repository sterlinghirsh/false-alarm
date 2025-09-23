module.exports = class Player {
  constructor(client, playerid) {
    this.id = playerid;
    this.clients = [client];
    this.reset();
  }

  reset() {
    this.phrases = [];
    this.buttons = [];
    this.correctClicks = 0;
    this.incorrectClicks = 0;
    this.othersClicked = 0;
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
    console.log("Emitting player ID:", this.id, "to", this.clients.length, "client(s)");
    for (let client of this.clients) {
      client.emit('setPlayerid', this.id);
    }
  }

  emitPhrase() {
    for (let client of this.clients) {
      client.emit('updatePhrase', this.phrases[0]);
    }
  }

  emitButtons() {
    const sortedButtons = this.buttons.slice(0, 4);
    sortedButtons.sort((a, b) => a.Phrase.localeCompare(b.Phrase));
    for (let client of this.clients) {
      client.emit('updateButtons', sortedButtons);
    }
  }

  emitStartGame() {
    this.emitPhrase();
    this.emitButtons();
    this.emit('startGame');
  }

  emitPlayerCount(count) {
    this.emit('updatePlayerCount', count);
  }

  emitScore(numCorrect, numIncorrect) {
    this.emit('updateScore', {numCorrect, numIncorrect});
  }

  emitGameOver() {
    this.emit('gameOver', {
      correctClicks: this.correctClicks,
      incorrectClicks: this.incorrectClicks,
      othersClicked: this.othersClicked
    });
  }

  emit(name, value) {
    for (let client of this.clients) {
      client.emit(name, value);
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

