import openSocket from 'socket.io-client';
const socket = openSocket('http://MaxximumLazer.local:8000');

function setup(updateState) {
   socket.on('disconnect', () => {
     updateState(null, {connected: false});
     window.setTimeout(() => {
       window.location.reload();
     }, 2000);
   });

   socket.on('connect', () => {
      updateState(null, {connected: true});
   });
}

function createGame(cb) {
   socket.on('gameCreated', gameid => {
      console.log(gameid);
      window.location.hash = gameid;
   });

   socket.emit('createGame');
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
      updateState(null, {
         started: true,
         startDate: new Date(),
         timerStartDate: new Date(),
      });
   });
   socket.on('startTimer', () => updateState(null, {
      timerStartDate: new Date(),
   }));


   socket.on('updatePlayerCount', (playerCount) => {
      updateState(null, {playerCount});
   });

   socket.on('updateScore', scoreInfo => updateState(null, {
      numCorrect: scoreInfo.numCorrect,
      numIncorrect: scoreInfo.numIncorrect
   }));

   socket.on('gameInProgressError', () => updateState(null, {gameInProgressError: true}));

   socket.on('gameOver', () => updateState(null, {
      started: false
   }));


   socket.emit('subscribeToGame', {gameid, playerid});
}

function ready(gameid) {
   socket.emit('ready', {gameid});
}

function handleClickPhrase(playerid, gameid, phrase) {
   socket.emit('clickPhrase', {playerid, gameid, phrase});
}

export default {
  setup,
  createGame,
  subscribeToGame,
  ready,
  handleClickPhrase,
};
