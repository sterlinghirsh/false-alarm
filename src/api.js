import openSocket from 'socket.io-client';
const socket = openSocket('http://MaxximumLazer.local:8000');

function subscribeToTimer(interval, cb) {
   socket.on('timer', timestamp => cb(null, timestamp));
   socket.emit('subscribeToTimer', interval);
}

function subscribeToGame(dummy, updatePhrase, updateButtons) {
   socket.on('updatePhrase', newPhrase => updatePhrase(null, newPhrase));
   socket.on('updateButtons', newButtons => updateButtons(null, newButtons));
   socket.emit('subscribeToGame', dummy);
}

export { subscribeToTimer, subscribeToGame };
