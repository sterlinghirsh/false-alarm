import React, { Component } from 'react';

class PhraseButton extends Component {
  render() {
    return (
      <li>{this.props.buttonData.Phrase}</li>
    );
  }
}

export default PhraseButton;
