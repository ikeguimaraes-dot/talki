const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyUrl, APP_URL } = require('./navigation.cjs');
test('keeps only mini on the trusted origin in the app', () => {
  assert.equal(classifyUrl(APP_URL), 'mini');
  assert.equal(classifyUrl(`${APP_URL}?view=today`), 'mini');
  assert.equal(classifyUrl('https://talki.freneze.com.br/tarefas/123'), 'external');
});
test('blocks untrusted destinations and privileged protocols', () => {
  for (const url of ['https://evil.com', 'https://talki.freneze.com.br.evil.com/mini', 'javascript:alert(1)', 'file:///etc/passwd', 'http://talki.freneze.com.br/mini', 'https://user@talki.freneze.com.br/mini']) assert.equal(classifyUrl(url), 'blocked', url);
});
