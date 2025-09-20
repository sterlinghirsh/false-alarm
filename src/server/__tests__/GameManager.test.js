const GameManager = require('../GameManager');

describe('GameManager', () => {
  let gameManager;

  beforeEach(() => {
    gameManager = new GameManager();
  });

  describe('constructor', () => {
    test('should initialize with empty games object', () => {
      expect(gameManager.games).toEqual({});
    });
  });

  describe('newGameid', () => {
    test('should generate a 4-character game ID', () => {
      const gameId = gameManager.newGameid();
      
      expect(typeof gameId).toBe('string');
      expect(gameId.length).toBe(4);
      expect(/^[a-z]{4}$/.test(gameId)).toBe(true);
    });

    test('should generate different IDs on multiple calls', () => {
      const id1 = gameManager.newGameid();
      const id2 = gameManager.newGameid();
      const id3 = gameManager.newGameid();
      
      // It's statistically very unlikely to get the same ID
      const uniqueIds = new Set([id1, id2, id3]);
      expect(uniqueIds.size).toBeGreaterThan(1);
    });
  });

  describe('createGame', () => {
    test('should create game with specified ID', () => {
      const gameId = 'test';
      const game = gameManager.createGame(gameId);
      
      expect(game.id).toBe(gameId);
      expect(gameManager.games[gameId]).toBe(game);
    });

    test('should create game with auto-generated ID when no ID provided', () => {
      const game = gameManager.createGame();
      
      expect(typeof game.id).toBe('string');
      expect(game.id.length).toBe(4);
      expect(gameManager.games[game.id]).toBe(game);
    });

    test('should convert game ID to lowercase', () => {
      const gameId = 'TEST';
      const game = gameManager.createGame(gameId);
      
      expect(game.id).toBe('test');
      expect(gameManager.games['test']).toBe(game);
      expect(gameManager.games['TEST']).toBeUndefined();
    });
  });

  describe('getById', () => {
    test('should return game by ID', () => {
      const gameId = 'test';
      const game = gameManager.createGame(gameId);
      
      const retrievedGame = gameManager.getById(gameId);
      expect(retrievedGame).toBe(game);
    });

    test('should return undefined for non-existent game', () => {
      const retrievedGame = gameManager.getById('nonexistent');
      expect(retrievedGame).toBeUndefined();
    });

    test('should be case-insensitive', () => {
      const gameId = 'test';
      const game = gameManager.createGame(gameId);
      
      const retrievedGame = gameManager.getById('TEST');
      expect(retrievedGame).toBe(game);
    });
  });

  describe('getOrCreateById', () => {
    test('should return existing game if it exists', () => {
      const gameId = 'test';
      const existingGame = gameManager.createGame(gameId);
      
      const retrievedGame = gameManager.getOrCreateById(gameId);
      expect(retrievedGame).toBe(existingGame);
    });

    test('should create new game if it does not exist', () => {
      const gameId = 'newgame';
      
      const retrievedGame = gameManager.getOrCreateById(gameId);
      expect(retrievedGame.id).toBe(gameId);
      expect(gameManager.games[gameId]).toBe(retrievedGame);
    });

    test('should be case-insensitive', () => {
      const gameId = 'test';
      const existingGame = gameManager.createGame(gameId);
      
      const retrievedGame = gameManager.getOrCreateById('TEST');
      expect(retrievedGame).toBe(existingGame);
    });
  });
});