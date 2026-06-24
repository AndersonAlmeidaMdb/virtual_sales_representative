import { Component } from 'react';
import CockpitPage from './pages/CockpitPage.jsx';
import LeadsPage from './pages/LeadsPage.jsx';
import ProdutosPage from './pages/ProdutosPage.jsx';
import ContatosPage from './pages/ContatosPage.jsx';
import TarefasPage from './pages/TarefasPage.jsx';

const PAGINAS = [
  { chave: 'cockpit', rotulo: 'Cockpit' },
  { chave: 'leads', rotulo: 'Leads' },
  { chave: 'produtos', rotulo: 'Produtos' },
  { chave: 'contatos', rotulo: 'Contatos' },
  { chave: 'tarefas', rotulo: 'Tarefas' },
];

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { paginaAtual: 'cockpit' };
    this.navegarPara = this.navegarPara.bind(this);
  }

  componentDidMount() {
    document.title = 'Cockpit SDR';
  }

  navegarPara(chave) {
    this.setState({ paginaAtual: chave });
  }

  renderPagina() {
    switch (this.state.paginaAtual) {
      case 'leads':
        return <LeadsPage />;
      case 'produtos':
        return <ProdutosPage />;
      case 'contatos':
        return <ContatosPage />;
      case 'tarefas':
        return <TarefasPage />;
      default:
        return <CockpitPage />;
    }
  }

  render() {
    const { paginaAtual } = this.state;

    return (
      <>
        <header>
          <h1>Cockpit SDR</h1>
          <p>Sua central de produtividade para a rotina diária de prospecção.</p>
          <nav>
            {PAGINAS.map((pagina) => (
              <button
                type="button"
                key={pagina.chave}
                aria-current={pagina.chave === paginaAtual ? 'page' : undefined}
                onClick={() => this.navegarPara(pagina.chave)}
              >
                {pagina.rotulo}
              </button>
            ))}
          </nav>
        </header>
        {this.renderPagina()}
      </>
    );
  }
}

export default App;
