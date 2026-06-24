import { Component } from 'react';
import { api } from '../api/client.js';

const TIPOS_TAREFA = ['Email', 'Ligacao', 'WhatsApp', 'Reuniao', 'LinkedIn'];

const FORMULARIO_VAZIO = {
  leadId: '',
  tipo: TIPOS_TAREFA[0],
  descricao: '',
  dataVencimento: '',
  concluida: false,
};

function paraDatetimeLocal(data) {
  const item = new Date(data);
  const deslocamento = item.getTimezoneOffset() * 60000;
  return new Date(item.getTime() - deslocamento).toISOString().slice(0, 16);
}

class TarefasPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tarefas: [],
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
    this.carregarTarefas();
    api.leads
      .listar()
      .then((leads) => this.setState({ leads }))
      .catch((erro) => this.setState({ erro: erro.message }));
  }

  carregarTarefas() {
    this.setState({ carregando: true, erro: null });
    api.tarefas
      .listar()
      .then((tarefas) => this.setState({ tarefas, carregando: false }))
      .catch((erro) => this.setState({ erro: erro.message, carregando: false }));
  }

  nomeLead(leadId) {
    const lead = this.state.leads.find((item) => item._id === leadId);
    return lead ? lead.nome : '-';
  }

  handleChangeCampo(evento) {
    const { name, value, type, checked } = evento.target;
    this.setState((estadoAnterior) => ({
      formulario: { ...estadoAnterior.formulario, [name]: type === 'checkbox' ? checked : value },
    }));
  }

  handleSubmit(evento) {
    evento.preventDefault();
    const { formulario, editandoId } = this.state;

    if (editandoId) {
      const dados = {
        tipo: formulario.tipo,
        descricao: formulario.descricao,
        dataVencimento: formulario.dataVencimento,
        concluida: formulario.concluida,
      };
      api.tarefas
        .atualizar(editandoId, dados)
        .then(() => {
          this.setState({ formulario: FORMULARIO_VAZIO, editandoId: null });
          this.carregarTarefas();
        })
        .catch((erro) => this.setState({ erro: erro.message }));
      return;
    }

    const dados = {
      leadId: formulario.leadId,
      tipo: formulario.tipo,
      descricao: formulario.descricao,
      dataVencimento: formulario.dataVencimento,
    };

    api.tarefas
      .criar(dados)
      .then(() => {
        this.setState({ formulario: FORMULARIO_VAZIO, editandoId: null });
        this.carregarTarefas();
      })
      .catch((erro) => this.setState({ erro: erro.message }));
  }

  handleEditar(tarefa) {
    this.setState({
      editandoId: tarefa._id,
      formulario: {
        leadId: tarefa.leadId,
        tipo: tarefa.tipo,
        descricao: tarefa.descricao || '',
        dataVencimento: paraDatetimeLocal(tarefa.dataVencimento),
        concluida: tarefa.concluida,
      },
    });
  }

  handleExcluir(id) {
    api.tarefas
      .remover(id)
      .then(() => this.carregarTarefas())
      .catch((erro) => this.setState({ erro: erro.message }));
  }

  handleCancelarEdicao() {
    this.setState({ editandoId: null, formulario: FORMULARIO_VAZIO });
  }

  render() {
    const { tarefas, leads, carregando, erro, formulario, editandoId } = this.state;

    return (
      <main>
        <section aria-label="Cadastro de tarefas">
          <h2>Tarefas</h2>
          {erro && <p role="alert">{erro}</p>}

          <form onSubmit={this.handleSubmit}>
            <p className="campo">
              <label htmlFor="tarefa-lead">Lead</label>
              <select
                id="tarefa-lead"
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
              <label htmlFor="tarefa-tipo">Tipo</label>
              <select id="tarefa-tipo" name="tipo" value={formulario.tipo} onChange={this.handleChangeCampo}>
                {TIPOS_TAREFA.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </p>
            <p className="campo">
              <label htmlFor="tarefa-descricao">Descrição</label>
              <input
                id="tarefa-descricao"
                name="descricao"
                type="text"
                value={formulario.descricao}
                onChange={this.handleChangeCampo}
              />
            </p>
            <p className="campo">
              <label htmlFor="tarefa-vencimento">Vencimento</label>
              <input
                id="tarefa-vencimento"
                name="dataVencimento"
                type="datetime-local"
                value={formulario.dataVencimento}
                onChange={this.handleChangeCampo}
                required
              />
            </p>
            {editandoId && (
              <p className="campo">
                <label htmlFor="tarefa-concluida">Concluída</label>
                <input
                  id="tarefa-concluida"
                  name="concluida"
                  type="checkbox"
                  checked={formulario.concluida}
                  onChange={this.handleChangeCampo}
                />
              </p>
            )}
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
            <p>Carregando tarefas...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Concluída</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tarefas.map((tarefa) => (
                  <tr key={tarefa._id}>
                    <td>{this.nomeLead(tarefa.leadId)}</td>
                    <td>{tarefa.tipo}</td>
                    <td>{tarefa.descricao || '-'}</td>
                    <td>{new Date(tarefa.dataVencimento).toLocaleString('pt-BR')}</td>
                    <td>{tarefa.concluida ? 'Sim' : 'Não'}</td>
                    <td>
                      <nav>
                        <button type="button" onClick={() => this.handleEditar(tarefa)}>
                          Editar
                        </button>
                        <button type="button" onClick={() => this.handleExcluir(tarefa._id)}>
                          Excluir
                        </button>
                      </nav>
                    </td>
                  </tr>
                ))}
                {tarefas.length === 0 && (
                  <tr>
                    <td colSpan="6">Nenhuma tarefa cadastrada.</td>
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

export default TarefasPage;
