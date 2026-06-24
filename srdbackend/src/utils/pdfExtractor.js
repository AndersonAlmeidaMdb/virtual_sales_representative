const pdfParse = require('pdf-parse');

async function extrairTextoDePdfUrl(url) {
  const resposta = await fetch(url);

  if (!resposta.ok) {
    throw new Error(`Não foi possível baixar o PDF (HTTP ${resposta.status}).`);
  }

  const buffer = Buffer.from(await resposta.arrayBuffer());
  const contentType = resposta.headers.get('content-type') || '';

  // Links de download do Google Drive (e similares) podem devolver uma página HTML
  // de confirmação/aviso em vez do PDF, em arquivos grandes ou sem acesso público.
  if (contentType.includes('text/html') || buffer.subarray(0, 4).toString('latin1') !== '%PDF') {
    throw new Error('O conteúdo retornado pela URL não é um arquivo PDF válido.');
  }

  const { text } = await pdfParse(buffer);
  return text.trim();
}

module.exports = { extrairTextoDePdfUrl };
