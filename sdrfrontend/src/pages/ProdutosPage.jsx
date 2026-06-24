import { Component } from 'react';
import { api } from '../api/client.js';

const FORMULARIO_VAZIO = { nome: '', descricao: '', preco: '' };

// O backend não normaliza o nome do campo de descrição longa (alguns produtos
// foram inseridos via seed com a chave grafada "decription"), então aceitamos as variações.
function descricaoCompleta(produto) {
  return produto.description || produto.decription || produto.descricao || '';
}

class ProdutosPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      produtos: [],
      carregando: true,
      erro: null,
      formulario: FORMULARIO_VAZIO,
      editandoId: null,
      produtoDescricaoAberta: null,
      acoesPendentes: {},
      toast: null,
    };
    this.handleChangeCampo = this.handleChangeCampo.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleEditar = this.handleEditar.bind(this);
    this.handleExcluir = this.handleExcluir.bind(this);
    this.handleCancelarEdicao = this.handleCancelarEdicao.bind(this);
    this.handleAbrirDescricao = this.handleAbrirDescricao.bind(this);
    this.handleFecharDescricao = this.handleFecharDescricao.bind(this);
    this.handleExtrairTexto = this.handleExtrairTexto.bind(this);
    this.handleChunkarConteudo = this.handleChunkarConteudo.bind(this);
  }

  componentDidMount() {
    this.carregarProdutos();
  }

  carregarProdutos() {
    this.setState({ carregando: true, erro: null });
    api.produtos
      .listar()
      .then((produtos) => this.setState({ produtos, carregando: false }))
      .catch((erro) => this.setState({ erro: erro.message, carregando: false }));
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
    const dados = {
      nome: formulario.nome,
      descricao: formulario.descricao,
      preco: formulario.preco === '' ? null : Number(formulario.preco),
    };

    const promessa = editandoId
      ? api.produtos.atualizar(editandoId, dados)
      : api.produtos.criar(dados);

    promessa
      .then(() => {
        this.setState({ formulario: FORMULARIO_VAZIO, editandoId: null });
        this.carregarProdutos();
      })
      .catch((erro) => this.setState({ erro: erro.message }));
  }

  handleEditar(produto) {
    this.setState({
      editandoId: produto._id,
      formulario: {
        nome: produto.nome || '',
        descricao: produto.descricao || '',
        preco: produto.preco ?? '',
      },
    });
  }

  handleExcluir(id) {
    api.produtos
      .remover(id)
      .then(() => this.carregarProdutos())
      .catch((erro) => this.setState({ erro: erro.message }));
  }

  handleCancelarEdicao() {
    this.setState({ editandoId: null, formulario: FORMULARIO_VAZIO });
  }

  handleAbrirDescricao(produto) {
    this.setState({ produtoDescricaoAberta: produto });
  }

  handleFecharDescricao() {
    this.setState({ produtoDescricaoAberta: null });
  }

  mostrarToast(tipo, mensagem) {
    this.setState({ toast: { tipo, mensagem } });
    setTimeout(() => {
      this.setState((estadoAnterior) =>
        estadoAnterior.toast && estadoAnterior.toast.mensagem === mensagem
          ? { toast: null }
          : null
      );
    }, 4000);
  }

  setAcaoPendente(produtoId, chave, valor) {
    this.setState((estadoAnterior) => ({
      acoesPendentes: {
        ...estadoAnterior.acoesPendentes,
        [produtoId]: { ...estadoAnterior.acoesPendentes[produtoId], [chave]: valor },
      },
    }));
  }

  handleExtrairTexto(produto) {
    this.setAcaoPendente(produto._id, 'extraindo', true);
    api.produtos
      .extrairTexto(produto._id)
      .then(() => {
        this.mostrarToast('sucesso', `Texto extraído com sucesso para "${produto.nome}".`);
        this.carregarProdutos();
      })
      .catch((erro) => this.mostrarToast('erro', erro.message))
      .finally(() => this.setAcaoPendente(produto._id, 'extraindo', false));
  }

  handleChunkarConteudo(produto) {
    this.setAcaoPendente(produto._id, 'chunkando', true);
    api.produtos
      .chunkarConteudo(produto._id)
      .then((resultado) => {
        this.mostrarToast(
          'sucesso',
          `${resultado.chunksCriados} chunk(s) salvos em knowledge_base para "${produto.nome}".`
        );
      })
      .catch((erro) => this.mostrarToast('erro', erro.message))
      .finally(() => this.setAcaoPendente(produto._id, 'chunkando', false));
  }

  render() {
    const {
      produtos,
      carregando,
      erro,
      formulario,
      editandoId,
      produtoDescricaoAberta,
      acoesPendentes,
      toast,
    } = this.state;

    return (
      <main>
        {toast && (
          <div className={`toast toast-${toast.tipo}`} role="status">
            {toast.mensagem}
          </div>
        )}
        <section aria-label="Cadastro de produtos">
          <h2>Produtos</h2>
          {erro && <p role="alert">{erro}</p>}

          <form onSubmit={this.handleSubmit}>
            <p className="campo">
              <label htmlFor="produto-nome">Nome</label>
              <input
                id="produto-nome"
                name="nome"
                type="text"
                value={formulario.nome}
                onChange={this.handleChangeCampo}
                required
              />
            </p>
            <p className="campo">
              <label htmlFor="produto-descricao">Descrição</label>
              <input
                id="produto-descricao"
                name="descricao"
                type="text"
                value={formulario.descricao}
                onChange={this.handleChangeCampo}
              />
            </p>
            <p className="campo">
              <label htmlFor="produto-preco">Preço</label>
              <input
                id="produto-preco"
                name="preco"
                type="number"
                step="0.01"
                value={formulario.preco}
                onChange={this.handleChangeCampo}
              />
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
            <p>Carregando produtos...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Descrição completa</th>
                  <th>Preço</th>
                  <th>Leads qualificados</th>
                  <th>Alta demanda</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((produto) => {
                  const pendente = acoesPendentes[produto._id] || {};
                  const semConteudo = !produto.contents;
                  return (
                    <tr key={produto._id}>
                      <td>{produto.nome}</td>
                      <td>{produto.descricao}</td>
                      <td>
                        <button type="button" onClick={() => this.handleAbrirDescricao(produto)}>
                          Ver descrição completa
                        </button>
                      </td>
                      <td>{produto.preco != null ? `R$ ${produto.preco.toFixed(2)}` : '-'}</td>
                      <td>{produto.qtdLeadsQualificados}</td>
                      <td>{produto.flagAltaDemanda ? 'Sim' : 'Não'}</td>
                      <td>
                        <nav>
                          <button type="button" onClick={() => this.handleEditar(produto)}>
                            Editar
                          </button>
                          <button type="button" onClick={() => this.handleExcluir(produto._id)}>
                            Excluir
                          </button>
                          <button
                            type="button"
                            disabled={pendente.extraindo}
                            onClick={() => this.handleExtrairTexto(produto)}
                          >
                            {pendente.extraindo ? 'Extraindo...' : 'Extrair Texto'}
                          </button>
                          <button
                            type="button"
                            disabled={pendente.chunkando || semConteudo}
                            title={semConteudo ? 'Execute "Extrair Texto" antes de gerar os chunks.' : undefined}
                            onClick={() => this.handleChunkarConteudo(produto)}
                          >
                            {pendente.chunkando ? 'Gerando chunks...' : 'Chunk Text'}
                          </button>
                        </nav>
                      </td>
                    </tr>
                  );
                })}
                {produtos.length === 0 && (
                  <tr>
                    <td colSpan="7">Nenhum produto cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>

        {produtoDescricaoAberta && (
          <div className="modal-fundo" role="presentation" onClick={this.handleFecharDescricao}>
            <section
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-label={`Descrição completa de ${produtoDescricaoAberta.nome}`}
              onClick={(evento) => evento.stopPropagation()}
            >
              <header>
                <h3>{produtoDescricaoAberta.nome}</h3>
                <button type="button" onClick={this.handleFecharDescricao}>
                  Fechar
                </button>
              </header>
              <p>{descricaoCompleta(produtoDescricaoAberta) || 'Sem descrição completa cadastrada.'}</p>
            </section>
          </div>
        )}
      </main>
    );
  }
}

export default ProdutosPage;
