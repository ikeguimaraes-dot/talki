import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileIdentities } from './reconcile-identities.mjs';

const person = { profile_id: 'source', auth_id: 'source', auth_email_hash: 'hash-a', profile_email_hash: 'hash-a', confirmed: true, role: 'admin' };
const destination = { ...person, profile_id: 'target', auth_id: 'target', role: 'membro' };
function run(source = person, profiles = [destination], orphans = [], extraSource = []) {
  return reconcileIdentities({ profiles: [source, ...extraSource] }, { profiles, auth_without_profile: orphans })[0];
}
test('matches verified Auth emails without copying global role or approving the map', () => {
  const row = run();
  assert.equal(row.status, 'verified_email_candidate');
  assert.deepEqual(row.target_candidates, ['target']);
  assert.equal(row.proposed_module_role, 'gestor');
  assert.equal(row.approved, false);
  assert.equal('auth_email_hash' in row, false);
});
test('does not auto-match unverified source or destination', () => {
  assert.equal(run({ ...person, confirmed: false }).status, 'activation_required');
  assert.equal(run(person, [{ ...destination, confirmed: false }]).status, 'activation_required');
});
test('distinguishes missing account from missing profile', () => {
  assert.equal(run(person, []).status, 'provisioning_required');
  assert.equal(run(person, [], [{ auth_id: 'target', email_hash: 'hash-a', confirmed: true }]).status, 'profile_repair_required');
});
test('requires review for duplicate identities on either side', () => {
  assert.equal(run(person, [destination, { ...destination, auth_id: 'other' }]).status, 'review_duplicate_identity');
  assert.equal(run(person, [destination], [], [{ ...person, profile_id: 'other-source' }]).status, 'review_duplicate_identity');
});
test('never uses inconsistent or missing Auth identity', () => {
  assert.equal(run({ ...person, auth_id: null }).status, 'review_source_identity');
  assert.equal(run({ ...person, auth_email_hash: null }).status, 'review_source_identity');
  assert.equal(run({ ...person, profile_email_hash: 'different' }).status, 'review_source_identity');
  assert.equal(run(person, [{ ...destination, profile_email_hash: 'different' }]).status, 'review_target_identity');
});
