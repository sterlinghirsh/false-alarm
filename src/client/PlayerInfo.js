import React from 'react';

function PlayerInfo(props) {
  return (
    <div className="playerInfo">
      Players: {props.playerCount} Score: {props.numCorrect} Incorrect: {props.numIncorrect}
    </div>
  );
}

export default PlayerInfo;
