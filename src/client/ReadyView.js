import React from 'react';
import Intro from './intro';
import PlayerInfo from './PlayerInfo';

function ReadyView(props) {
  return (
  <div className="readyView">
    <Intro />
    {props.gameOver ? <h2>Game Over</h2> : ''}
    <PlayerInfo
      playerCount={props.playerCount}
      numCorrect={props.numCorrect}
      numIncorrect={props.numIncorrect}
      />
    <button onClick={props.onReady}>Start</button>
    <h2>How to play:</h2>
    <h3>1. Shout the <span style={{color: "red"}}>red</span> phrase.</h3>
    <h4>2. Listen to other people shout.</h4>
    <h4>3. When you hear a phrase, tap it!</h4>
    <h5>Best with 3+ players</h5>
  </div>
  );
}

export default ReadyView;
