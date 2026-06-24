const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS) || 15000;

module.exports = { OPENAI_MODEL, OPENAI_TIMEOUT_MS };
