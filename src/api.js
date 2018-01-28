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

function subscribeToGame(gameid, updateState) {
   socket.on('updatePhrase', newPhrase => updateState(null, {activePhrase: newPhrase}));
   socket.on('updateButtons', newButtons => updateState(null, {buttons: newButtons}));

   const playerid = sessionStorage.getItem('playerid');
   updateState(null, {playerid});
   socket.on('setPlayerid', playerid => {
      console.log("Setting playerid: ", playerid);
      sessionStorage.setItem('playerid', playerid);
      updateState(null, {playerid});
   });

   socket.on('startGame', () => {
      updateState(null, {started: true});
   });

   socket.on('updatePlayerCount', (playerCount) => {
      updateState(null, {playerCount});
   });

   socket.emit('subscribeToGame', {gameid, playerid});
}

function ready(gameid) {
   socket.emit('ready', {gameid});
}

function resetPlayerid() {
   sessionStorage.removeItem('playerid');
   window.location.reload();
}

export default {
  createGame,
  subscribeToTimer,
  subscribeToGame,
  ready,
  resetPlayerid
};
