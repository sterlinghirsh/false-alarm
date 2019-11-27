import React, { Component } from 'react';
import './App.css';
import API from './api';
import GameView from './gameView';
import ReadyView from './ReadyView';


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
      connected: false
    };

    this.onReady = this.onReady.bind(this);
    this.onPhraseButtonClick = this.onPhraseButtonClick.bind(this);
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
    const mainView = this.state.gameInProgressError ?
      <h2 className="gameInProgressError">
        Cannot join game in progress
        <button onClick={() => window.location.reload()}>Refresh</button>
      </h2>
    : !this.state.connected ?
      <h2 className="connecting">Connecting...</h2>
    : this.state.started ?
      <GameView
       timeLeft={this.state.timeLeft}
       maxTime={this.state.maxTime}
       onPhraseButtonClick={this.onPhraseButtonClick}
       activePhrase={this.state.activePhrase}
       buttons={this.state.buttons} />
    :
      <ReadyView gameOver={this.state.gameOver} onReady={this.onReady} />;
    return (
      <div className="App">
        <div className="App-intro">
          <h1>False Alarm!</h1>
          <h6>
            Invite friends with this link: <br />
            <a href={window.location.href}>{window.location.href}</a>
          </h6>
          Players: {this.state.playerCount} Score: {this.state.numCorrect} Incorrect: {this.state.numIncorrect}
          <br/>
          {mainView}
        </div>
      </div>
    );
  }
}

export default App;
