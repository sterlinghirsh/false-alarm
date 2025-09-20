const express = require('express')
const http = require('http');
const PlayerManager = require('./PlayerManager');
const GameManager = require('./GameManager');

const playerManager = new PlayerManager();
const gameManager = new GameManager();

const app = express();
app.use(express.static('build'));
const server = http.createServer(app);
const io = require('socket.io')(server);

io.on('connection', (client) => {
  client.on('ready', (readyInfo) => {
    const game = gameManager.getById(readyInfo.gameid);
    game.generateRound();
  });

  client.on('createGame', () => {
    const newGame = gameManager.createGame();
    client.emit('gameCreated', newGame.id);
  });

  client.on('subscribeToGame', (subscribeInfo) => {
    const game = gameManager.getOrCreateById(subscribeInfo.gameid);
    let player;
    if (subscribeInfo.playerid) {
      console.log("Found playerid");
      player = playerManager.addClientToPlayer(client,
       subscribeInfo.playerid);
    } else if (game.started) {
      console.log('GAME IN PROGRESS ERROR');
      client.emit('gameInProgressError');
      return;
    } else {
      console.log("Creating player");
      player = playerManager.addPlayer(client);
    }

    console.log('Client is subscribing to game' , game.id, 'with info ', subscribeInfo, 'player id', player.id);
    game.addPlayer(player);

    const leave = () => {
      console.log("Client disconnected");
      console.log(client.id);
      game.removePlayer(player);
      game.emitPlayerCount();
    };

    client.on('disconnect', leave);
    client.on('unsubscribeFromGame', leave);

    game.emitPlayerCount();
    if (game.started) {
      console.log("GAME WAS STARTED");
      player.emitStartGame();
    } else {
      console.log("GAME WAS NOT STARTED");
    }
  });

  client.on('clickPhrase', ({playerid, gameid, phrase}) => {
    console.log("Clicked ", phrase, " for game ", gameid, " and player ", playerid);
    const game = gameManager.getById(gameid);
    game.handleClickPhrase(phrase, playerid);
  });
});

const port = process.env.PORT || 3001;
//io.listen(port);
server.listen(port);
console.log('listening on port ', port);
