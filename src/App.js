import React, { Component } from 'react';
import './App.css';
import { subscribeToTimer, subscribeToGame } from './api';
import GameView from './gameView';

class App extends Component {
  componentDidMount() {
    subscribeToTimer(1000, (err, timestamp) => this.setState({
      timestamp
    }));

    subscribeToGame(null,
      (err, activePhrase) => this.setState({
        activePhrase
      }),
      (err, buttons) => this.setState({
        buttons
      }),
    );
  }
  state = {
    timestamp: 'no timestamp yet',
    activePhrase: {Phrase: 'Loading...', type: 'None'},
    buttons: []
  };
  render() {
    return (
      <div className="App">
        <div className="App-intro">
          This is the timer value: {this.state.timestamp}
          <GameView
           activePhrase={this.state.activePhrase}
           buttons={this.state.buttons} />
        </div>
      </div>
    );
  }
}

export default App;
