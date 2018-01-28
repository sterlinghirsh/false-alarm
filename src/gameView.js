import React, { Component } from 'react';
import Phrase from './Phrase';
import PhraseButtonList from './PhraseButtonList';

class GameView extends Component {
  render() {
    return (
      <div className="gameView">
        <Phrase phrase={this.props.activePhrase} />
        <PhraseButtonList buttons={this.props.buttons} onPhraseButtonClick={this.props.onPhraseButtonClick}/>
      </div>
    );
  }
}

export default GameView;
