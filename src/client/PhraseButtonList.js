import React, { Component } from 'react';
import PhraseButton from './PhraseButton';

class PhraseButtonList extends Component {
  render() {
    const buttons = this.props.buttons.map(button =>
      <PhraseButton buttonData={button} key={button.Phrase} onPhraseButtonClick={this.props.onPhraseButtonClick} />);
    return (
      <ul className="phraseButtonList">
        {buttons}
      </ul>
    );
  }
}

export default PhraseButtonList;
