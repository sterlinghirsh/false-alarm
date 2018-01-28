import openSocket from 'socket.io-client';
const socket = openSocket('http://MaxximumLazer.local:8000');

function createGame(cb) {
   socket.on('gameCreated', gameid => {
      console.log(gameid);
      window.location.hash = gameid;
   });

   socket.emit('createGame');
}

function subscribeToTimer(interval, cb) {
   socket.on('timer', timestamp => cb(null, timestamp));
   socket.emit('subscribeToTimer', interval);
}

function subscribeToGame(gameid, updatePhrase, updateButtons) {
   socket.on('updatePhrase', newPhrase => updatePhrase(null, newPhrase));
   socket.on('updateButtons', newButtons => updateButtons(null, newButtons));

   const playerid = sessionStorage.getItem('playerid');
   socket.on('setPlayerid', playerid => {
      console.log("Setting playerid: ", playerid);
      sessionStorage.setItem('playerid', playerid);
   });
   socket.emit('subscribeToGame', {gameid, playerid});
}

function ready(gameid) {
   socket.emit('ready', {gameid});
}

export default {
  createGame,
  subscribeToTimer,
  subscribeToGame,
  ready
};
