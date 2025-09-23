import openSocket from "socket.io-client";

let subscribed = false;

// Dev: CRA proxy forwards to backend (3001)
// Prod: Same Express server handles everything
let socket; // = openSocket();

function setup(updateState) {
   socket = openSocket();
   socket.on("disconnect", () => {
      console.log("Disconnected from server, reloading in 2s...");
      updateState(null, { connected: false });
      window.setTimeout(() => {
         window.location.reload();
      }, 2000);
   });

   socket.on("connect", () => {
      console.log("Connected to server");
      updateState(null, { connected: true });
   });

   if (socket.connected) {
      console.log("Already connected to server");
      updateState(null, { connected: true });
   }
}

function createGame(cb) {
   socket.on("gameCreated", (gameid) => {
      console.log("Game Created:", gameid);
      window.location.hash = gameid;
      cb(gameid);
   });

   console.log("Creating game...");
   socket.emit("createGame");
}

// None of this depends on the gameid
function subscribeOnce(updateState) {
   subscribed = true;

   socket.on("updatePhrase", (newPhrase) =>
      updateState(null, { activePhrase: newPhrase }),
   );
   socket.on("updateButtons", (newButtons) =>
      updateState(null, { buttons: newButtons }),
   );

   const playerid = sessionStorage.getItem("playerid");
   updateState(null, { playerid });
   socket.on("setPlayerid", (playerid) => {
      console.log("Setting playerid: ", playerid);
      sessionStorage.setItem("playerid", playerid);
      updateState(null, { playerid });
   });

   socket.on("startGame", () => {
      console.log("Game starting");
      updateState(null, {
         started: true,
         startDate: new Date(),
         timerStartDate: new Date(),
      });
   });
   socket.on("startTimer", () =>
      updateState(null, {
         timerStartDate: new Date(),
      }),
   );

   socket.on("updatePlayerCount", (playerCount) => {
      console.log("Player count: ", playerCount);
      updateState(null, { playerCount });
   });

   socket.on("updateScore", (scoreInfo) =>
      updateState(null, {
         numCorrect: scoreInfo.numCorrect,
         numIncorrect: scoreInfo.numIncorrect,
      }),
   );

   socket.on("gameInProgressError", () => {
      console.log("Game in progress error");
      updateState(null, { gameInProgressError: true });
   });

   socket.on("gameOver", (personalStats) => {
      console.log("Game over", personalStats);
      updateState(null, {
         started: false,
         gameOver: true,
         personalStats,
      });
   });
}

function subscribeToGame(gameid, updateState) {
   console.log("Subscribing to game: ", gameid);
   if (subscribed) {
      console.log("Already subscribed, unsubscribing first");
      socket.emit("unsubscribeFromGame");
   } else {
      console.log("SubscribeOnce");
      subscribeOnce(updateState);
   }
   const playerid = sessionStorage.getItem("playerid");
   console.log("SubsribeToGame: ", gameid, playerid);
   socket.emit("subscribeToGame", { gameid, playerid });
}

function ready(gameid) {
   console.log("Ready");
   socket.emit("ready", { gameid });
}

function handleClickPhrase(playerid, gameid, phrase) {
   socket.emit("clickPhrase", { playerid, gameid, phrase });
}

export default {
   setup,
   createGame,
   subscribeToGame,
   ready,
   handleClickPhrase,
};
