import React, { Component } from 'react';
import './App.css';
import API from './api';
import GameView from './gameView';
import ReadyView from './ReadyView';

function GameInProgressError() {
  return (
    <h2 className="gameInProgressError">
      Cannot join game in progress
      <button onClick={() => window.location.reload()}>Refresh</button>
    </h2>
  );
}

function ConnectingMessage() {
  return (
    <h2 className="connecting">Connecting...</h2>
  );
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      gameid: window.location.hash ? window.location.hash.substring(1) : null,
      activePhrase: {Phrase: 'Loading...', type: 'None'},
      buttons: [],
      started: false,
      gameOver: false,
      startDate: null,
      playerid: null,
      playerCount: 0,
      numCorrect: 0,
      numIncorrect: 0,
      timerStartDate: new Date(),
      maxTime: 10000,
      gameInProgressError: false,
      connected: false,
      joinCode: ''
    };

    this.onReady = this.onReady.bind(this);
    this.onPhraseButtonClick = this.onPhraseButtonClick.bind(this);
    this.handleJoinCodeChange = this.handleJoinCodeChange.bind(this);
    this.handleJoin = this.handleJoin.bind(this);
  }
  joinGame(joinGameid) {
    console.log("Joining game", joinGameid);
    this.setState({gameid: joinGameid});
    API.subscribeToGame(joinGameid, (err, newState) => 
     this.setState(newState)
    );
  }

  // copied in Game.js
  getMaxTime() {
    const startTime = 10000; // ms
    const numCorrectBase = 0.95;
    return Math.round(startTime * Math.pow(numCorrectBase, this.state.numCorrect + (this.state.numIncorrect * 2)));
  }

  handleJoinCodeChange(e) {
    this.setState({joinCode: e.target.value});
  }

  handleJoin(e) {
    e.preventDefault();
    // Changing the hash triggers the hashchange event and joins.
    window.location.hash=this.state.joinCode;

    this.setState({joinCode: ''});
  }

  componentDidMount() {
    setInterval(() => {
      const maxTime = this.getMaxTime();
      const clientDate = new Date();
      const timeUsed = clientDate - this.state.timerStartDate;
      const timeLeft = maxTime - timeUsed;
      this.setState({
        timeLeft,
        maxTime
      });
    }, 100);

    API.setup((err, newState) => this.setState(newState));

    if (this.state.gameid) {
      this.joinGame(this.state.gameid);
    } else {
      API.createGame((gameid) => this.joinGame(gameid));
    }

    window.addEventListener('hashchange', () => {
      const gameid = window.location.hash ? window.location.hash.substring(1) : null;
      if (gameid) {
        this.joinGame(gameid);
      }
    });
  }
  onReady() {
    console.log("ON READY");
    API.ready(this.state.gameid);
  }
  onPhraseButtonClick(e) {
    const phrase = e.target.innerText;
    console.log("Clicked a button!", phrase);
    API.handleClickPhrase(this.state.playerid, this.state.gameid, phrase);
  }

  render() {
    if (this.state.gameInProgressError) {
      return <GameInProgressError />
    } else if (!this.state.connected) {
      return <ConnectingMessage />
    } else if (!this.state.started) {
      return <ReadyView
        gameOver={this.state.gameOver}
        onReady={this.onReady}
        playerCount={this.state.playerCount}
        numCorrect={this.state.numCorrect}
        numIncorrect={this.state.numIncorrect}
        gameid={this.state.gameid}
        handleJoinCodeChange={this.handleJoinCodeChange}
        handleJoin={this.handleJoin}
        joinCode={this.state.joinCode}
        />
    } else {
      return <GameView
       timeLeft={this.state.timeLeft}
       maxTime={this.state.maxTime}
       onPhraseButtonClick={this.onPhraseButtonClick}
       activePhrase={this.state.activePhrase}
       buttons={this.state.buttons}
       playerCount={this.state.playerCount}
       numCorrect={this.state.numCorrect}
       numIncorrect={this.state.numIncorrect}
       />
    }
  }
}

export default App;
