import { Component } from 'react';
import { api } from '../api/client.js';

const ESTAGIOS = {
  NOVO: 'Novo',
  TENTATIVA: 'Em Tentativa de Contato',
  QUALIFICADO: 'Qualificado',
};

// O backend persiste o status do lead com estes valores; mapeamos para os
// rótulos de estágio usados nas colunas do funil.
const STATUS_PARA_ESTAGIO = {
  Novo: ESTAGIOS.NOVO,
  'Em Contato': ESTAGIOS.TENTATIVA,
  Qualificado: ESTAGIOS.QUALIFICADO,
};

const TIPOS_TAREFA = {
  EMAIL: 'Email',
  LIGACAO: 'Ligacao',
  LINKEDIN: 'LinkedIn',
};

const ROTULOS_TIPO_TAREFA = {
  [TIPOS_TAREFA.EMAIL]: 'e-mails para enviar agora',
  [TIPOS_TAREFA.LIGACAO]: 'ligações para fazer',
  [TIPOS_TAREFA.LINKEDIN]: 'conexões no LinkedIn pendentes',
};

const RESULTADOS_LIGACAO = ['Não atendeu', 'Agendou Reunião', 'Sem interesse'];

function montarRoteiro(lead) {
  return (
    `Olá, ${lead.nome}! Aqui é da equipe comercial. Notei que a ${lead.empresa} pode se beneficiar ` +
    'da nossa solução de cadência de vendas. Você tem 2 minutos para entender como temos ajudado ' +
    'empresas do seu segmento a aumentar a conversão de leads?'
  );
}

class LeadCard extends Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    this.props.onAbrirAtendimento(this.props.lead._id);
  }

  render() {
    const { lead } = this.props;
    return (
      <article tabIndex={0} role="button" onClick={this.handleClick}>
        <h4>{lead.nome}</h4>
        <p>{lead.empresa || '-'}</p>
      </article>
    );
  }
}

class FunilPreVenda extends Component {
  render() {
    const { leads, onAbrirAtendimento } = this.props;
    const estagios = [ESTAGIOS.NOVO, ESTAGIOS.TENTATIVA, ESTAGIOS.QUALIFICADO];
    const leadsComEstagio = leads
      .map((lead) => ({ ...lead, estagio: STATUS_PARA_ESTAGIO[lead.status] }))
      .filter((lead) => Boolean(lead.estagio));

    return (
      <section aria-label="Funil de pré-venda">
        <h2>Funil de Pré-Venda</h2>
        <section className="colunas">
          {estagios.map((estagio) => {
            const leadsDoEstagio = leadsComEstagio.filter((lead) => lead.estagio === estagio);
            return (
              <section key={estagio} data-estagio={estagio}>
                <h3>
                  {estagio} <small>({leadsDoEstagio.length})</small>
                </h3>
                {leadsDoEstagio.length === 0 && <p>Nenhum lead nesta etapa.</p>}
                {leadsDoEstagio.map((lead) => (
                  <LeadCard key={lead._id} lead={lead} onAbrirAtendimento={onAbrirAtendimento} />
                ))}
              </section>
            );
          })}
        </section>
      </section>
    );
  }
}

class BlocoTarefa extends Component {
  render() {
    const { tipo, cadencia, onConcluirTarefa, onAbrirAtendimento } = this.props;
    const grupo = cadencia.find((item) => item.tipo === tipo);
    const totalTarefas = grupo ? grupo.totalTarefas : 0;
    const proxima = grupo ? grupo.tarefas[0] : null;

    return (
      <article data-tipo={tipo}>
        <h3>
          {totalTarefas} {ROTULOS_TIPO_TAREFA[tipo]}
        </h3>
        {proxima ? (
          <>
            <p>
              <strong>{proxima.lead ? proxima.lead.nome : 'Lead'}</strong> — {proxima.descricao}
            </p>
            <nav>
              {tipo === TIPOS_TAREFA.LIGACAO && (
                <button type="button" onClick={() => onAbrirAtendimento(proxima.leadId)}>
                  Iniciar Ligação
                </button>
              )}
              <button type="button" onClick={() => onConcluirTarefa(proxima._id)}>
                Concluir e ir para a próxima
              </button>
            </nav>
          </>
        ) : (
          <p>Tudo concluído por aqui.</p>
        )}
      </article>
    );
  }
}

class CadenciaDiaria extends Component {
  render() {
    return (<div></div>);

    const { cadencia, onConcluirTarefa, onAbrirAtendimento } = this.props;
    return (
      <section aria-label="Cadência diária">
        <h2>Cadência Diária</h2>
        <section className="blocos">
          {Object.values(TIPOS_TAREFA).map((tipo) => (
            <BlocoTarefa
              key={tipo}
              tipo={tipo}
              cadencia={cadencia}
              onConcluirTarefa={onConcluirTarefa}
              onAbrirAtendimento={onAbrirAtendimento}
            />
          ))}
        </section>
      </section>
    );
  }
}

class PainelAtendimento extends Component {
  constructor(props) {
    super(props);
    this.handleNotasChange = this.handleNotasChange.bind(this);
  }

  handleNotasChange(evento) {
    this.props.onAtualizarNotas(this.props.lead._id, evento.target.value);
  }

  render() {
    const { lead, notas, onFechar, onRegistrarResultado } = this.props;

    return (
      <aside className="aberto" aria-label="Atendimento ativo">
        <header>
          <h2>Atendimento Ativo</h2>
          <button type="button" onClick={onFechar}>
            Fechar
          </button>
        </header>
        <section>
          <h3>{lead.nome}</h3>
          <p>{lead.empresa}</p>
          <p>{lead.telefone}</p>
          <p>{lead.email}</p>
        </section>
        <section>
          <h3>Roteiro de Ligação</h3>
          <p>{montarRoteiro(lead)}</p>
        </section>
        <section>
          <h3>Notas Rápidas</h3>
          <textarea
            rows={5}
            value={notas}
            onChange={this.handleNotasChange}
            placeholder="Anote os pontos importantes da ligação..."
          />
        </section>
        <section>
          <h3>Resultado da Chamada</h3>
          <nav>
            {RESULTADOS_LIGACAO.map((resultado) => (
              <button type="button" key={resultado} onClick={() => onRegistrarResultado(lead._id, resultado)}>
                {resultado}
              </button>
            ))}
          </nav>
        </section>
      </aside>
    );
  }
}

class CockpitPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      leads: [],
      cadencia: [],
      carregando: true,
      erro: null,
      leadEmAtendimentoId: null,
      rascunhoNotas: {},
    };
    this.carregarDados = this.carregarDados.bind(this);
    this.abrirAtendimento = this.abrirAtendimento.bind(this);
    this.fecharAtendimento = this.fecharAtendimento.bind(this);
    this.atualizarNotas = this.atualizarNotas.bind(this);
    this.registrarResultado = this.registrarResultado.bind(this);
    this.concluirTarefa = this.concluirTarefa.bind(this);
  }

  componentDidMount() {
    this.carregarDados();
  }

  carregarDados() {
    this.setState({ carregando: true, erro: null });
    Promise.all([api.leads.listar(), api.dashboard.cadencia()])
      .then(([leads, cadencia]) => this.setState({ leads, cadencia, carregando: false }))
      .catch((erro) => this.setState({ erro: erro.message, carregando: false }));
  }

  abrirAtendimento(leadId) {
    this.setState({ leadEmAtendimentoId: leadId });
  }

  fecharAtendimento() {
    this.setState({ leadEmAtendimentoId: null });
  }

  atualizarNotas(leadId, notas) {
    this.setState((estadoAnterior) => ({
      rascunhoNotas: { ...estadoAnterior.rascunhoNotas, [leadId]: notas },
    }));
  }

  registrarResultado(leadId, resultado) {
    const notas = this.state.rascunhoNotas[leadId] || '';

    api.contatos
      .criar({ leadId, tipo: TIPOS_TAREFA.LIGACAO, notas, resultado })
      .then(() => (resultado === 'Agendou Reunião' ? api.leads.qualificar(leadId) : null))
      .then(() => {
        this.setState((estadoAnterior) => {
          const rascunhoNotas = { ...estadoAnterior.rascunhoNotas };
          delete rascunhoNotas[leadId];
          return { leadEmAtendimentoId: null, rascunhoNotas };
        });
        this.carregarDados();
      })
      .catch((erro) => this.setState({ erro: erro.message }));
  }

  concluirTarefa(tarefaId) {
    api.tarefas
      .atualizar(tarefaId, { concluida: true })
      .then(() => this.carregarDados())
      .catch((erro) => this.setState({ erro: erro.message }));
  }

  render() {
    const { leads, cadencia, carregando, erro, leadEmAtendimentoId, rascunhoNotas } = this.state;
    const leadEmAtendimento = leads.find((lead) => lead._id === leadEmAtendimentoId) || null;

    return (
      <>
        <main>
          {erro && <p role="alert">{erro}</p>}
          {carregando ? (
            <p>Carregando cockpit...</p>
          ) : (
            <>
              <CadenciaDiaria
                cadencia={cadencia}
                onConcluirTarefa={this.concluirTarefa}
                onAbrirAtendimento={this.abrirAtendimento}
              />
              <FunilPreVenda leads={leads} onAbrirAtendimento={this.abrirAtendimento} />
            </>
          )}
        </main>
        {leadEmAtendimento && (
          <PainelAtendimento
            lead={leadEmAtendimento}
            notas={rascunhoNotas[leadEmAtendimento._id] || ''}
            onFechar={this.fecharAtendimento}
            onAtualizarNotas={this.atualizarNotas}
            onRegistrarResultado={this.registrarResultado}
          />
        )}
      </>
    );
  }
}

export default CockpitPage;
