const TAMANHO_ALVO_CHUNK = 1200;

function dividirEmFrases(paragrafo) {
  return paragrafo.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function dividirParagrafoGrande(paragrafo, tamanhoAlvo) {
  const partes = [];
  let atual = '';

  dividirEmFrases(paragrafo).forEach((frase) => {
    if (atual && (atual + ' ' + frase).length > tamanhoAlvo) {
      partes.push(atual.trim());
      atual = frase;
    } else {
      atual = atual ? `${atual} ${frase}` : frase;
    }
  });

  if (atual.trim()) {
    partes.push(atual.trim());
  }

  return partes;
}

// Estratégia de chunking: agrupa parágrafos até o tamanho-alvo de caracteres,
// quebrando por frase quando um único parágrafo já excede o alvo.
function chunkTexto(texto, tamanhoAlvo = TAMANHO_ALVO_CHUNK) {
  const paragrafos = texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let atual = '';

  paragrafos.forEach((paragrafo) => {
    if (paragrafo.length > tamanhoAlvo) {
      if (atual.trim()) {
        chunks.push(atual.trim());
        atual = '';
      }
      chunks.push(...dividirParagrafoGrande(paragrafo, tamanhoAlvo));
      return;
    }

    const candidato = atual ? `${atual}\n\n${paragrafo}` : paragrafo;
    if (candidato.length > tamanhoAlvo && atual.trim()) {
      chunks.push(atual.trim());
      atual = paragrafo;
    } else {
      atual = candidato;
    }
  });

  if (atual.trim()) {
    chunks.push(atual.trim());
  }

  return chunks;
}

module.exports = { chunkTexto };
