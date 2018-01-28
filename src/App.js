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
      timestamp: 'no timestamp yet',
      activePhrase: {Phrase: 'Loading...', type: 'None'},
      buttons: [],
      started: false,
      startDate: null,
      playerid: null,
      playerCount: 0,
      numCorrect: 0,
      numIncorrect: 0,
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

  componentDidMount() {
    API.subscribeToTimer(1000, (err, timestamp) => this.setState({
      timestamp
    }));

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
      <h1 className="gameInProgressError">
        Cannot join game in progress
        <button onClick={() => window.location.reload()}>Refresh</button>
      </h1>
    : !this.state.connected ?
      <h1 className="connecting">Connecting...</h1>
    : this.state.started ?
      <GameView
       onPhraseButtonClick={this.onPhraseButtonClick}
       activePhrase={this.state.activePhrase}
       buttons={this.state.buttons} />
    :
      <ReadyView onReady={this.onReady} />;
    return (
      <div className="App">
        <div className="App-intro">
          This is the timer value: {this.state.timestamp}
          <br/>
          Playerid: {this.state.playerid}
          <br/>
          Players: {this.state.playerCount} Correct: {this.state.numCorrect} Incorrect: {this.state.numIncorrect}
          <br/>
          <button onClick={API.resetPlayerid}>Reset Playerid</button>
          {mainView}
        </div>
      </div>
    );
  }
}

export default App;
