import React, { Component } from 'react';

class Phrase extends Component {
  render() {
    const phrase = this.props.phrase;
    if (!phrase) return null;
    return (
      <h1 className="sayThisPhrase">{phrase.Phrase}</h1>
    );
  }
}

export default Phrase;
