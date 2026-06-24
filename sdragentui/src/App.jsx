import { Component } from 'react';
import ChatPage from './pages/ChatPage.jsx';

class App extends Component {
  componentDidMount() {
    document.title = 'SDR Virtual - Chat';
  }

  render() {
    return (
      <>
        <header>
          <h1>SDR Virtual</h1>
          <p>Converse com nosso time de vendas, como em um canal de WhatsApp.</p>
        </header>
        <ChatPage />
      </>
    );
  }
}

export default App;
