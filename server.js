const io = require('socket.io')();
const PlayerManager = require('./PlayerManager');
const GameManager = require('./GameManager');

const playerManager = new PlayerManager();
const gameManager = new GameManager();

var curGame = gameManager.createGame();

io.on('connection', (client) => {
  client.on('subscribeToTimer', (interval) => {
    console.log('client is subscribing to timer with interval ', interval);
    setInterval(() => {
      client.emit('timer', new Date());
    }, interval);
  });

  client.on('ready', (readyInfo) => {
    const game = gameManager.getById(readyInfo.gameid);
    game.generateRound();
  });

  client.on('createGame', () => {
    const newGame = gameManager.createGame();
    client.emit('gameCreated', newGame.id);
  });

  client.on('subscribeToGame', (subscribeInfo) => {
    let player;
    if (subscribeInfo.playerid) {
      console.log("Found playerid");
      player = playerManager.addClientToPlayer(client,
       subscribeInfo.playerid);
    } else {
      console.log("Creating player");
      player = playerManager.addPlayer(client);
    }

    const game = gameManager.getById(subscribeInfo.gameid);
    console.log('Client is subscribing to game' , game.id, 'with info ', subscribeInfo, 'player id', player.id);
    game.addPlayer(player);
    game.emitPlayerCount();
    if (game.started) {
      console.log("GAME WAS STARTED");
      player.emitStartGame();
    } else {
      console.log("GAME WAS NOT STARTED");
    }
  });
});

const port = 8000;
io.listen(port);
console.log('listening on port ', port);
