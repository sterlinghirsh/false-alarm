import React from 'react';
import Phrase from './Phrase';
import PhraseButtonList from './PhraseButtonList';
import PlayerInfo from './PlayerInfo';

function GameView(props) {
  return (
    <div className="gameView">
      <PlayerInfo
        playerCount={props.playerCount}
        numCorrect={props.numCorrect}
        numIncorrect={props.numIncorrect}
        />
      <h6 className="sayThisLabel">Say this:</h6>
      <Phrase phrase={props.activePhrase} />
      <progress value={props.timeLeft} max={props.maxTime} />
      <h6 className="listenForTheseLabel">Tap if you hear it:</h6>
      <PhraseButtonList buttons={props.buttons} onPhraseButtonClick={props.onPhraseButtonClick}/>
    </div>
  );
}

export default GameView;
