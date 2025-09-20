const Game = require('../Game');

// Mock phrases.json
jest.mock('../../phrases.json', () => [
  { "Phrase": "Test phrase 1", "Type": "Test" },
  { "Phrase": "Test phrase 2", "Type": "Test" },
  { "Phrase": "Test phrase 3", "Type": "Test" },
  { "Phrase": "Test phrase 4", "Type": "Test" }
]);

// Mock Player class
const mockPlayer = {
  id: 'test-player-1',
  reset: jest.fn(),
  addPhrase: jest.fn(),
  addButton: jest.fn(),
  emitStartGame: jest.fn(),
  emitPlayerCount: jest.fn(),
  emitScore: jest.fn(),
  emit: jest.fn()
};

const mockPlayer2 = {
  id: 'test-player-2',
  reset: jest.fn(),
  addPhrase: jest.fn(),
  addButton: jest.fn(),
  emitStartGame: jest.fn(),
  emitPlayerCount: jest.fn(),
  emitScore: jest.fn(),
  emit: jest.fn()
};

describe('Game', () => {
  let game;

  beforeEach(() => {
    game = new Game('test-game-id');
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with correct default values', () => {
      expect(game.id).toBe('test-game-id');
      expect(game.players).toEqual({});
      expect(game.started).toBe(false);
      expect(game.gameOver).toBe(false);
      expect(game.numCorrect).toBe(0);
      expect(game.numIncorrect).toBe(0);
      expect(game.timerStartDate).toBeInstanceOf(Date);
    });
  });

  describe('addPlayer', () => {
    test('should add player to players object', () => {
      game.addPlayer(mockPlayer);
      expect(game.players[mockPlayer.id]).toBe(mockPlayer);
    });
  });

  describe('removePlayer', () => {
    test('should remove player from players object', () => {
      game.addPlayer(mockPlayer);
      expect(game.players[mockPlayer.id]).toBe(mockPlayer);
      
      game.removePlayer(mockPlayer);
      expect(game.players[mockPlayer.id]).toBeUndefined();
    });
  });

  describe('generateRound', () => {
    beforeEach(() => {
      game.addPlayer(mockPlayer);
      game.addPlayer(mockPlayer2);
    });

    test('should start the game', () => {
      game.generateRound();
      expect(game.started).toBe(true);
    });

    test('should reset score counters', () => {
      game.numCorrect = 5;
      game.numIncorrect = 3;
      
      game.generateRound();
      
      expect(game.numCorrect).toBe(0);
      expect(game.numIncorrect).toBe(0);
    });

    test('should reset all players', () => {
      game.generateRound();
      
      expect(mockPlayer.reset).toHaveBeenCalled();
      expect(mockPlayer2.reset).toHaveBeenCalled();
    });

    test('should assign phrases and buttons to players', () => {
      game.generateRound();
      
      expect(mockPlayer.addPhrase).toHaveBeenCalled();
      expect(mockPlayer.addButton).toHaveBeenCalled();
      expect(mockPlayer2.addPhrase).toHaveBeenCalled();
      expect(mockPlayer2.addButton).toHaveBeenCalled();
    });

    test('should emit start game to all players', () => {
      game.generateRound();
      
      expect(mockPlayer.emitStartGame).toHaveBeenCalled();
      expect(mockPlayer2.emitStartGame).toHaveBeenCalled();
    });
  });

  describe('emitPlayerCount', () => {
    test('should emit player count to all players', () => {
      game.addPlayer(mockPlayer);
      game.addPlayer(mockPlayer2);
      
      game.emitPlayerCount();
      
      expect(mockPlayer.emitPlayerCount).toHaveBeenCalledWith(2);
      expect(mockPlayer2.emitPlayerCount).toHaveBeenCalledWith(2);
    });
  });

  describe('getMaxTime', () => {
    test('should return correct base time for no correct answers', () => {
      game.numCorrect = 0;
      game.numIncorrect = 0;
      
      const maxTime = game.getMaxTime();
      
      // Base: 1000 + 9000 = 10000ms
      expect(maxTime).toBe(10000);
    });

    test('should decrease time as correct answers increase', () => {
      game.numCorrect = 1;
      game.numIncorrect = 0;
      
      const maxTime = game.getMaxTime();
      
      // Should be less than base time
      expect(maxTime).toBeLessThan(10000);
    });

    test('should decrease time more with incorrect answers', () => {
      const timeWithCorrect = (() => {
        game.numCorrect = 1;
        game.numIncorrect = 0;
        return game.getMaxTime();
      })();

      const timeWithIncorrect = (() => {
        game.numCorrect = 0;
        game.numIncorrect = 1;
        return game.getMaxTime();
      })();

      // Incorrect answers should penalize more than correct answers
      expect(timeWithIncorrect).toBeLessThan(timeWithCorrect);
    });
  });

  describe('forEachPlayer', () => {
    test('should call function for each player', () => {
      game.addPlayer(mockPlayer);
      game.addPlayer(mockPlayer2);
      
      const mockFn = jest.fn();
      game.forEachPlayer(mockFn);
      
      expect(mockFn).toHaveBeenCalledWith(mockPlayer);
      expect(mockFn).toHaveBeenCalledWith(mockPlayer2);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });
});