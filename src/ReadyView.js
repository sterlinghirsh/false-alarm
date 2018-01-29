import React, { Component } from 'react';

class ReadyView extends Component {
  render() {
    return (
    <div className="readyView">
      {this.props.gameOver ? <h2>Game Over</h2> : ''}
      <h3>1. Speak the phrase.</h3>
      <h4>2. Click a button if someone else says the phrase on it.</h4>
      <button onClick={this.props.onReady}>Start</button>
      <h5>Best with 2+ players</h5>
    </div>
    );
  }
}

export default ReadyView;
