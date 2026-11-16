const ORIGIN = 'https://talki.freneze.com.br';
const APP_URL = `${ORIGIN}/mini`;
function classifyUrl(value) {
  try {
    const url = new URL(value);
    if (url.origin !== ORIGIN || url.username || url.password) return 'blocked';
    return url.pathname === '/mini' ? 'mini' : 'external';
  } catch { return 'blocked'; }
}
module.exports = { ORIGIN, APP_URL, classifyUrl };
