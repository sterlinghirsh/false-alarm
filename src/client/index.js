import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render((
<div className="App">
  <div className="App-intro">
    <App />
  </div>
</div>
), document.getElementById('root'));
registerServiceWorker();
