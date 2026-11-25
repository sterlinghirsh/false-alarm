// Socket event handlers, split out of server.js so they can be tested.
// Every handler validates its payload and runs inside safe(), so a bad
// message gets a "serverError" event back and never throws out of the process.

const { validateList } = require("./customLists");

const ID_RE = /^[A-Za-z0-9]{1,64}$/;

const isId = (v) => typeof v === "string" && ID_RE.test(v);
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function attach(io, gameManager, playerManager) {
  io.on("connection", (client) => {
    const fail = (message) => client.emit("serverError", { message });
    // The player this socket joined as: lists belong to it.
    let me = null;

    // Wrap a handler: validate with fn, never throw.
    const safe = (name, fn) => (payload) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`Handler ${name} failed:`, err);
        fail("Server error.");
      }
    };

    // Look up an existing game from a payload, or report why not.
    const existingGame = (gameid) => {
      if (!isId(gameid)) return fail("Invalid game id."), null;
      const game = gameManager.getById(gameid);
      if (!game) return fail("Game not found."), null;
      return game;
    };

    client.on(
      "ready",
      safe("ready", (info) => {
        if (!isObj(info)) return fail("Invalid message.");
        const game = existingGame(info.gameid);
        if (game) game.generateRound();
      }),
    );

    client.on(
      "createGame",
      safe("createGame", () => {
        const newGame = gameManager.createGame();
        client.emit("gameCreated", newGame.id);
      }),
    );

    client.on(
      "subscribeToGame",
      safe("subscribeToGame", (info) => {
        if (!isObj(info) || !isId(info.gameid)) return fail("Invalid message.");
        if (info.playerid != null && !isId(info.playerid)) {
          return fail("Invalid player id.");
        }
        const game = gameManager.getOrCreateById(info.gameid);
        let player;
        if (info.playerid) {
          player = playerManager.addClientToPlayer(client, info.playerid);
        } else if (game.started) {
          client.emit("gameInProgressError");
          return;
        } else {
          player = playerManager.addPlayer(client);
        }
        game.addPlayer(player);

        me = player;
        const leave = () => {
          if (me === player) me = null;
          player.removeClient(client);
          game.removePlayer(player);
          game.emitPlayerCount();
        };
        client.on("disconnect", safe("disconnect", leave));
        client.on("unsubscribeFromGame", safe("unsubscribeFromGame", leave));

        game.emitPlayerCount();
        client.emit("gameSettings", game.getSettingsPayload(player));
        if (game.started) player.emitStartGame();
      }),
    );

    client.on(
      "updateCategories",
      safe("updateCategories", (info) => {
        if (!isObj(info)) return fail("Invalid message.");
        const game = existingGame(info.gameid);
        if (!game) return;
        const cats = info.categories;
        if (
          !Array.isArray(cats) ||
          cats.length === 0 ||
          cats.length > game.categoryKeys().length ||
          !cats.every((c) => typeof c === "string" && game.categoryKeys().includes(c))
        ) {
          return fail("Invalid categories.");
        }
        // Changes after the start are ignored; the panel is locked then.
        if (game.started) return;
        game.updateEnabledCategories([...new Set(cats)]);
      }),
    );

    // Custom lists: the game, and this socket's player in it, or an error.
    const listGame = (info) => {
      if (!isObj(info)) return fail("Invalid message."), null;
      const game = existingGame(info.gameid);
      if (!game) return null;
      if (!me || !game.players[me.id]) return fail("Join the game first."), null;
      return game;
    };
    const report = (result) => result.error && fail(result.error);

    client.on(
      "addList",
      safe("addList", (info) => {
        const game = listGame(info);
        if (!game) return;
        if (info.clientId != null && !isId(info.clientId)) return fail("Invalid list id.");
        const list = validateList(info.name, info.phrases);
        if (list.error) return fail(list.error);
        report(game.addCustomList(me.id, list, info.clientId));
      }),
    );

    client.on(
      "updateList",
      safe("updateList", (info) => {
        const game = listGame(info);
        if (!game) return;
        if (!isId(info.key)) return fail("Unknown list.");
        const list = validateList(info.name, info.phrases);
        if (list.error) return fail(list.error);
        report(game.updateCustomList(me.id, info.key, list));
      }),
    );

    client.on(
      "removeList",
      safe("removeList", (info) => {
        const game = listGame(info);
        if (!game) return;
        if (!isId(info.key)) return fail("Unknown list.");
        report(game.removeCustomList(me.id, info.key));
      }),
    );

    client.on(
      "clickPhrase",
      safe("clickPhrase", (info) => {
        if (!isObj(info) || typeof info.phrase !== "string") {
          return fail("Invalid message.");
        }
        const game = existingGame(info.gameid);
        if (!game) return;
        if (!isId(info.playerid) || !game.players[info.playerid]) {
          return fail("Unknown player.");
        }
        game.handleClickPhrase(info.phrase, info.playerid);
      }),
    );
  });
}

module.exports = { attach, isId };
