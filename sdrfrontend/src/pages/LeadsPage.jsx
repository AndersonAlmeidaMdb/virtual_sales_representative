import { Component } from 'react';
import { api } from '../api/client.js';

const FORMULARIO_VAZIO = {
  nome: '',
  email: '',
  telefone: '',
  empresa: '',
  origem: '',
  produtoInteresseId: '',
};

class LeadsPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      leads: [],
      produtos: [],
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
    this.carregarLeads();
    api.produtos
      .listar()
      .then((produtos) => this.setState({ produtos }))
      .catch((erro) => this.setState({ erro: erro.message }));
  }

  carregarLeads() {
    this.setState({ carregando: true, erro: null });
    api.leads
      .listar()
      .then((leads) => this.setState({ leads, carregando: false }))
      .catch((erro) => this.setState({ erro: erro.message, carregando: false }));
  }

  nomeProduto(produtoId) {
    const produto = this.state.produtos.find((item) => item._id === produtoId);
    return produto ? produto.nome : '-';
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
      const dados = {
        nome: formulario.nome,
        email: formulario.email,
        telefone: formulario.telefone,
        empresa: formulario.empresa,
        origem: formulario.origem,
      };
      api.leads
        .atualizar(editandoId, dados)
        .then(() => {
          this.setState({ formulario: FORMULARIO_VAZIO, editandoId: null });
          this.carregarLeads();
        })
        .catch((erro) => this.setState({ erro: erro.message }));
      return;
    }

    const dados = {
      nome: formulario.nome,
      email: formulario.email,
      telefone: formulario.telefone,
      empresa: formulario.empresa,
      origem: formulario.origem,
      produtoInteresseId: formulario.produtoInteresseId || null,
    };

    api.leads
      .criar(dados)
      .then(() => {
        this.setState({ formulario: FORMULARIO_VAZIO, editandoId: null });
        this.carregarLeads();
      })
      .catch((erro) => this.setState({ erro: erro.message }));
  }

  handleEditar(lead) {
    this.setState({
      editandoId: lead._id,
      formulario: {
        nome: lead.nome || '',
        email: lead.email || '',
        telefone: lead.telefone || '',
        empresa: lead.empresa || '',
        origem: lead.origem || '',
        produtoInteresseId: lead.produtoInteresseId || '',
      },
    });
  }

  handleExcluir(id) {
    api.leads
      .remover(id)
      .then(() => this.carregarLeads())
      .catch((erro) => this.setState({ erro: erro.message }));
  }

  handleCancelarEdicao() {
    this.setState({ editandoId: null, formulario: FORMULARIO_VAZIO });
  }

  render() {
    const { leads, produtos, carregando, erro, formulario, editandoId } = this.state;

    return (
      <main>
        <section aria-label="Cadastro de leads">
          <h2>Leads</h2>
          {erro && <p role="alert">{erro}</p>}

          <form onSubmit={this.handleSubmit}>
            <p className="campo">
              <label htmlFor="lead-nome">Nome</label>
              <input
                id="lead-nome"
                name="nome"
                type="text"
                value={formulario.nome}
                onChange={this.handleChangeCampo}
                required
              />
            </p>
            <p className="campo">
              <label htmlFor="lead-email">E-mail</label>
              <input
                id="lead-email"
                name="email"
                type="email"
                value={formulario.email}
                onChange={this.handleChangeCampo}
                required
              />
            </p>
            <p className="campo">
              <label htmlFor="lead-telefone">Telefone</label>
              <input
                id="lead-telefone"
                name="telefone"
                type="text"
                value={formulario.telefone}
                onChange={this.handleChangeCampo}
              />
            </p>
            <p className="campo">
              <label htmlFor="lead-empresa">Empresa</label>
              <input
                id="lead-empresa"
                name="empresa"
                type="text"
                value={formulario.empresa}
                onChange={this.handleChangeCampo}
              />
            </p>
            <p className="campo">
              <label htmlFor="lead-origem">Origem</label>
              <input
                id="lead-origem"
                name="origem"
                type="text"
                value={formulario.origem}
                onChange={this.handleChangeCampo}
              />
            </p>
            <p className="campo">
              <label htmlFor="lead-produto">Produto de interesse</label>
              <select
                id="lead-produto"
                name="produtoInteresseId"
                value={formulario.produtoInteresseId}
                onChange={this.handleChangeCampo}
                disabled={Boolean(editandoId)}
              >
                <option value="">Nenhum</option>
                {produtos.map((produto) => (
                  <option key={produto._id} value={produto._id}>
                    {produto.nome}
                  </option>
                ))}
              </select>
              {editandoId && <small>O produto de interesse só pode ser definido na criação do lead.</small>}
            </p>
            <nav>
              <button type="submit">{editandoId ? 'Atualizar' : 'Criar'}</button>
              {editandoId && (
                <button type="button" onClick={this.handleCancelarEdicao}>
                  Cancelar
                </button>
              )}
            </nav>
          </form>

          {carregando ? (
            <p>Carregando leads...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Empresa</th>
                  <th>Status</th>
                  <th>Produto de interesse</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead._id}>
                    <td>{lead.nome}</td>
                    <td>{lead.email}</td>
                    <td>{lead.empresa || '-'}</td>
                    <td>{lead.status}</td>
                    <td>{this.nomeProduto(lead.produtoInteresseId)}</td>
                    <td>
                      <nav>
                        <button type="button" onClick={() => this.handleEditar(lead)}>
                          Editar
                        </button>
                        <button type="button" onClick={() => this.handleExcluir(lead._id)}>
                          Excluir
                        </button>
                      </nav>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan="6">Nenhum lead cadastrado.</td>
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

export default LeadsPage;
