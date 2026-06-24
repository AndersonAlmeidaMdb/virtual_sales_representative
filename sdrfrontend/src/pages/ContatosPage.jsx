import { Component } from 'react';
import { api } from '../api/client.js';

const TIPOS_CONTATO = ['Email', 'Ligacao', 'WhatsApp', 'Reuniao'];

const FORMULARIO_VAZIO = { leadId: '', tipo: TIPOS_CONTATO[0], notas: '', resultado: '' };

class ContatosPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      contatos: [],
      leads: [],
      carregando: true,
      erro: null,
      formulario: FORMULARIO_VAZIO,
      editandoId: null,
    };
    this.handleChangeCampo = this.handleChangeCampo.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleEditar = this.handleEditar.bind(this);
    this.handleExcluir = this.handleExcluir.bind(this);
    this.handleCancelarEdicao = this.handleCancelarEdicao.bind(this);
  }

  componentDidMount() {
    this.carregarContatos();
    api.leads
      .listar()
      .then((leads) => this.setState({ leads }))
      .catch((erro) => this.setState({ erro: erro.message }));
  }

  carregarContatos() {
    this.setState({ carregando: true, erro: null });
    api.contatos
      .listar()
      .then((contatos) => this.setState({ contatos, carregando: false }))
      .catch((erro) => this.setState({ erro: erro.message, carregando: false }));
  }

  nomeLead(leadId) {
    const lead = this.state.leads.find((item) => item._id === leadId);
    return lead ? lead.nome : '-';
  }

  handleChangeCampo(evento) {
    const { name, value } = evento.target;
    this.setState((estadoAnterior) => ({
      formulario: { ...estadoAnterior.formulario, [name]: value },
    }));
  }

  handleSubmit(evento) {
    evento.preventDefault();
    const { formulario, editandoId } = this.state;

    if (editandoId) {
      const dados = { tipo: formulario.tipo, notas: formulario.notas, resultado: formulario.resultado };
      api.contatos
        .atualizar(editandoId, dados)
        .then(() => {
          this.setState({ formulario: FORMULARIO_VAZIO, editandoId: null });
          this.carregarContatos();
        })
        .catch((erro) => this.setState({ erro: erro.message }));
      return;
    }

    const dados = {
      leadId: formulario.leadId,
      tipo: formulario.tipo,
      notas: formulario.notas,
      resultado: formulario.resultado,
    };

    api.contatos
      .criar(dados)
      .then(() => {
        this.setState({ formulario: FORMULARIO_VAZIO, editandoId: null });
        this.carregarContatos();
      })
      .catch((erro) => this.setState({ erro: erro.message }));
  }

  handleEditar(contato) {
    this.setState({
      editandoId: contato._id,
      formulario: {
        leadId: contato.leadId,
        tipo: contato.tipo,
        notas: contato.notas || '',
        resultado: contato.resultado || '',
      },
    });
  }

  handleExcluir(id) {
    api.contatos
      .remover(id)
      .then(() => this.carregarContatos())
      .catch((erro) => this.setState({ erro: erro.message }));
  }

  handleCancelarEdicao() {
    this.setState({ editandoId: null, formulario: FORMULARIO_VAZIO });
  }

  render() {
    const { contatos, leads, carregando, erro, formulario, editandoId } = this.state;

    return (
      <main>
        <section aria-label="Histórico de contatos">
          <h2>Contatos</h2>
          {erro && <p role="alert">{erro}</p>}

          <form onSubmit={this.handleSubmit}>
            <p className="campo">
              <label htmlFor="contato-lead">Lead</label>
              <select
                id="contato-lead"
                name="leadId"
                value={formulario.leadId}
                onChange={this.handleChangeCampo}
                disabled={Boolean(editandoId)}
                required
              >
                <option value="">Selecione um lead</option>
                {leads.map((lead) => (
                  <option key={lead._id} value={lead._id}>
                    {lead.nome}
                  </option>
                ))}
              </select>
              {editandoId && <small>O lead vinculado não pode ser alterado após a criação.</small>}
            </p>
            <p className="campo">
              <label htmlFor="contato-tipo">Tipo</label>
              <select id="contato-tipo" name="tipo" value={formulario.tipo} onChange={this.handleChangeCampo}>
                {TIPOS_CONTATO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </p>
            <p className="campo">
              <label htmlFor="contato-notas">Notas</label>
              <input
                id="contato-notas"
                name="notas"
                type="text"
                value={formulario.notas}
                onChange={this.handleChangeCampo}
              />
            </p>
            <p className="campo">
              <label htmlFor="contato-resultado">Resultado</label>
              <input
                id="contato-resultado"
                name="resultado"
                type="text"
                value={formulario.resultado}
                onChange={this.handleChangeCampo}
              />
            </p>
            <nav>
              <button type="submit">{editandoId ? 'Atualizar' : 'Registrar'}</button>
              {editandoId && (
                <button type="button" onClick={this.handleCancelarEdicao}>
                  Cancelar
                </button>
              )}
            </nav>
          </form>

          {carregando ? (
            <p>Carregando contatos...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Tipo</th>
                  <th>Notas</th>
                  <th>Resultado</th>
                  <th>Data</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contatos.map((contato) => (
                  <tr key={contato._id}>
                    <td>{this.nomeLead(contato.leadId)}</td>
                    <td>{contato.tipo}</td>
                    <td>{contato.notas || '-'}</td>
                    <td>{contato.resultado || '-'}</td>
                    <td>{new Date(contato.dataContato).toLocaleString('pt-BR')}</td>
                    <td>
                      <nav>
                        <button type="button" onClick={() => this.handleEditar(contato)}>
                          Editar
                        </button>
                        <button type="button" onClick={() => this.handleExcluir(contato._id)}>
                          Excluir
                        </button>
                      </nav>
                    </td>
                  </tr>
                ))}
                {contatos.length === 0 && (
                  <tr>
                    <td colSpan="6">Nenhum contato registrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      </main>
    );
  }
}

export default ContatosPage;
