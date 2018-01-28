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
      started: false
    };

    this.onReady = this.onReady.bind(this);
  }
  joinGame(joinGameid) {
    this.setState({gameid: joinGameid});
    API.subscribeToGame(joinGameid,
      (err, activePhrase) => this.setState({
        activePhrase
      }),
      (err, buttons) => this.setState({
        buttons
      }),
    );
  }

  componentDidMount() {
    API.subscribeToTimer(1000, (err, timestamp) => this.setState({
      timestamp
    }));

    if (this.state.gameid) {
      this.joinGame(this.state.gameid);
    } else {
      API.createGame((gameid) => this.joinGame(gameid));
    }
  }
  onReady() {
    API.ready(this.state.gameid);
  }

  render() {
    const mainView = this.state.started ?
      <GameView
       activePhrase={this.state.activePhrase}
       buttons={this.state.buttons} />
    :
      <ReadyView onReady={this.onReady} />;
    return (
      <div className="App">
        <div className="App-intro">
          This is the timer value: {this.state.timestamp}
          {mainView}
        </div>
      </div>
    );
  }
}

export default App;
