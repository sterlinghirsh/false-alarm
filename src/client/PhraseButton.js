import React, { Component } from 'react';

class PhraseButton extends Component {
  render() {
    return (
      <li>
        <button onClick={this.props.onPhraseButtonClick}>
          {this.props.buttonData.Phrase}
        </button>
      </li>
    );
  }
}

export default PhraseButton;
