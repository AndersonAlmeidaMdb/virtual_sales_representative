const BASE_URL = 'http://localhost:3000/api';

async function solicitar(caminho, opcoes = {}) {
  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });

  const dados = resposta.status !== 204 ? await resposta.json().catch(() => null) : null;

  if (!resposta.ok) {
    const mensagem = (dados && dados.erro) || `Erro ${resposta.status} ao comunicar com a API.`;
    throw new Error(mensagem);
  }

  return dados;
}

function criarRecursoCrud(nomeRecurso) {
  return {
    listar: () => solicitar(`/${nomeRecurso}`),
    criar: (dados) => solicitar(`/${nomeRecurso}`, { method: 'POST', body: JSON.stringify(dados) }),
    atualizar: (id, dados) =>
      solicitar(`/${nomeRecurso}/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
    remover: (id) => solicitar(`/${nomeRecurso}/${id}`, { method: 'DELETE' }),
  };
}

export const api = {
  leads: {
    ...criarRecursoCrud('leads'),
    qualificar: (id) => solicitar(`/leads/${id}/qualificar`, { method: 'PUT' }),
  },
  produtos: {
    ...criarRecursoCrud('produtos'),
    extrairTexto: (id) => solicitar(`/produtos/${id}/extract-text`, { method: 'POST' }),
    chunkarConteudo: (id) => solicitar(`/produtos/${id}/chunk-contents`, { method: 'POST' }),
  },
  contatos: criarRecursoCrud('contatos'),
  tarefas: criarRecursoCrud('tarefas'),
  dashboard: {
    cadencia: () => solicitar('/dashboard/cadencia'),
  },
};
