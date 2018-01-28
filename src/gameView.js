import React, { Component } from 'react';
import Phrase from './Phrase';
import PhraseButtonList from './PhraseButtonList';

class GameView extends Component {
  render() {
    return (
      <div className="gameView">
        <span>{this.props.timeLeft}</span>
        <br />
        <Phrase phrase={this.props.activePhrase} />
        <progress value={this.props.timeLeft} max={this.props.maxTime} />
        <br />
        <PhraseButtonList buttons={this.props.buttons} onPhraseButtonClick={this.props.onPhraseButtonClick}/>
      </div>
    );
  }
}

export default GameView;
