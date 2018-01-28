const io = require('socket.io')();
const phrases = require('./src/phrases.json');

io.on('connection', (client) => {
   client.on('subscribeToTimer', (interval) => {
      console.log('client is subscribing to timer with interval ', interval);
      setInterval(() => {
         client.emit('timer', new Date());
      }, interval);
   });

   client.on('subscribeToGame', (subscribeInfo) => {
      console.log('Client is subscribing to game with info ', subscribeInfo);
      client.emit('updatePhrase', phrases[0]);
      client.emit('updateButtons', phrases.slice(1, 5));
   });
});

const port = 8000;
io.listen(port);
console.log('listening on port ', port);
