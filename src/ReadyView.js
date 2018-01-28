import React, { Component } from 'react';

class ReadyView extends Component {
  render() {
    return (
    <div className="readyView">
      <h1>Ready?</h1>
      <button onClick={this.props.onReady}>Ready</button>
    </div>
    );
  }
}

export default ReadyView;
