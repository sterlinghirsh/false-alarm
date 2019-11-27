import React from 'react';

function Intro(props) {
  return (
    <div>
      <h1>False Alarm!</h1>
      <h6>
        Invite friends with this link: <br />
        <a href={window.location.href}>{window.location.href}</a>
      </h6>
    </div>
  );
}

export default Intro;
