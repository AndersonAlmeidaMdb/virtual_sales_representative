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

export const api = {
  sdr: {
    enviarMensagem: ({ leadId, mensagem }) =>
      solicitar('/v1/sdr/message', {
        method: 'POST',
        body: JSON.stringify({ lead_id: leadId || undefined, message: mensagem }),
      }),
  },
};
