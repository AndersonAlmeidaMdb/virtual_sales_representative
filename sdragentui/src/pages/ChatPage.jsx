import { Component, createRef } from 'react';
import { api } from '../api/client.js';

const ESTAGIO_ROTULOS = {
  descoberta: 'Descoberta',
  qualificacao: 'Qualificação',
  agendamento: 'Agendamento',
  reuniao_agendada: 'Reunião agendada',
  descartado: 'Descartado',
};

function formatarHora(data) {
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

class ChatPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mensagens: [],
      rascunho: '',
      enviando: false,
      erro: null,
      leadId: null,
      estagioAtual: null,
    };
    this.refConversa = createRef();
    this.handleChangeRascunho = this.handleChangeRascunho.bind(this);
    this.handleEnviar = this.handleEnviar.bind(this);
    this.novoAtendimento = this.novoAtendimento.bind(this);
  }

  componentDidUpdate() {
    const elementoConversa = this.refConversa.current;
    if (elementoConversa) {
      elementoConversa.scrollTop = elementoConversa.scrollHeight;
    }
  }

  handleChangeRascunho(evento) {
    this.setState({ rascunho: evento.target.value });
  }

  handleEnviar(evento) {
    evento.preventDefault();
    const texto = this.state.rascunho.trim();
    if (!texto || this.state.enviando) {
      return;
    }

    const leadId = this.state.leadId;
    const mensagemCliente = { id: `cliente-${Date.now()}`, autor: 'cliente', texto, hora: new Date() };

    this.setState((estadoAnterior) => ({
      mensagens: [...estadoAnterior.mensagens, mensagemCliente],
      rascunho: '',
      enviando: true,
      erro: null,
    }));

    api.sdr
      .enviarMensagem({ leadId, mensagem: texto })
      .then((dados) => {
        const mensagemSdr = {
          id: `sdr-${Date.now()}`,
          autor: 'sdr',
          texto: dados.response,
          hora: new Date(),
        };
        this.setState((estadoAnterior) => ({
          mensagens: [...estadoAnterior.mensagens, mensagemSdr],
          leadId: dados.lead_id || estadoAnterior.leadId,
          estagioAtual: dados.next_stage || estadoAnterior.estagioAtual,
          enviando: false,
        }));
      })
      .catch((erro) => this.setState({ erro: erro.message, enviando: false }));
  }

  novoAtendimento() {
    this.setState({
      mensagens: [],
      rascunho: '',
      enviando: false,
      erro: null,
      leadId: null,
      estagioAtual: null,
    });
  }

  render() {
    const { mensagens, rascunho, enviando, erro, estagioAtual } = this.state;

    return (
      <main>
        <section aria-label="Conversa com o SDR virtual">
          <header>
            <h2>Atendimento</h2>
            <p>
              Estágio: <strong>{ESTAGIO_ROTULOS[estagioAtual] || 'Aguardando primeira mensagem'}</strong>
            </p>
            <nav>
              <button type="button" onClick={this.novoAtendimento}>
                Novo atendimento
              </button>
            </nav>
          </header>

          {erro && <p role="alert">{erro}</p>}

          <ol ref={this.refConversa} aria-label="Histórico de mensagens">
            {mensagens.length === 0 && (
              <li data-vazio="true">
                <p>Envie uma mensagem para iniciar o atendimento.</p>
              </li>
            )}
            {mensagens.map((mensagem) => (
              <li key={mensagem.id} data-autor={mensagem.autor}>
                <p>{mensagem.texto}</p>
                <time dateTime={mensagem.hora.toISOString()}>{formatarHora(mensagem.hora)}</time>
              </li>
            ))}
            {enviando && (
              <li data-autor="sdr" data-digitando="true">
                <p>Digitando...</p>
              </li>
            )}
          </ol>

          <form onSubmit={this.handleEnviar}>
            <p className="campo">
              <label htmlFor="campo-mensagem">Mensagem</label>
              <input
                id="campo-mensagem"
                type="text"
                value={rascunho}
                onChange={this.handleChangeRascunho}
                placeholder="Digite sua mensagem..."
                autoComplete="off"
                disabled={enviando}
              />
            </p>
            <button type="submit" disabled={enviando || !rascunho.trim()}>
              Enviar
            </button>
          </form>
        </section>
      </main>
    );
  }
}

export default ChatPage;
