import React from 'react';
import Intro from './intro';

function GameOver(props) {
  return <div className="gameOver">
    <h2 className="gameOverText">Game Over</h2>
    Group Score: {props.numCorrect} Incorrect: {props.numIncorrect}
    <br />
    My Score: {props.personalStats.correctClicks} My Mistakes: {props.personalStats.incorrectClicks}
    <br />
    My Shouts: {props.personalStats.othersClicked}
    
  </div>
}

function ReadyView(props) {
  return (
  <div className="readyView">
    <Intro
     gameid={props.gameid}
     handleJoinCodeChange={props.handleJoinCodeChange}
     handleJoin={props.handleJoin}
     joinCode={props.joinCode}
     />
    {props.gameOver && <GameOver
     numCorrect={props.numCorrect}
     numIncorrect={props.numIncorrect}
     personalStats={props.personalStats}
     />}
    <div className="startAndPlayerInfo">
      Players: {props.playerCount}
      <br />
      <button onClick={props.onReady}>Start Game!</button>
    </div>
    <h2 className="howToPlayLabel">How to play:</h2>
    <h3>1. Shout the <span style={{color: "red"}}>red</span> phrase.</h3>
    <h4>2. Listen to other people shout.</h4>
    <h4>3. When you hear a phrase, tap it!</h4>
    <h5>Best with 3+ players</h5>
    <a href="http://sterlinghirsh.com/">By Sterling Hirsh</a>
    <br />
    <a href="mailto:sterlinghirsh.com">sterlinghirsh@gmail.com</a>
  </div>
  );
}

export default ReadyView;
