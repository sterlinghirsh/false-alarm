import React from 'react';

function Intro(props) {
  return (
    <div className="roomCodeInfo">
      <h1 className="title">False Alarm!</h1>
      <h5>
        Game code: <span className="gameid">{props.gameid}</span>
      </h5>

      <h6>
        Invite friends with this link: <br />
        <a href={window.location.href}>{window.location.href}</a>
      </h6>

      <h6>
        Or join another game: <br />
        <form onSubmit={props.handleJoin}>
          <input
           type="text"
           placeholder="abcd"
           size="6"
           className="joinGameCodeInput"
           value={props.joinCode}
           onChange={props.handleJoinCodeChange}
           />
          <button
           type="button"
           className="joinButton"
           onClick={props.handleJoin}
           >
            Join
          </button>
        </form>
      </h6>
    </div>
  );
}

export default Intro;
