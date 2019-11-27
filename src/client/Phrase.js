import React, { Component } from 'react';

class Phrase extends Component {
  render() {
    return (
      <h1 className="sayThisPhrase">{this.props.phrase.Phrase}</h1>
    );
  }
}

export default Phrase;
