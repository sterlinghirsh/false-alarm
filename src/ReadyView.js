import React, { Component } from 'react';

class ReadyView extends Component {
  render() {
    return (
    <div className="readyView">
      {this.props.gameOver ? <h2>Game Over</h2> : ''}
      <h1>Ready?</h1>
      <button onClick={this.props.onReady}>Ready</button>
      <h3>Say the phrase out loud.</h3>
      <h4>Click the button when you hear someone else say that phrase.</h4>
    </div>
    );
  }
}

export default ReadyView;
