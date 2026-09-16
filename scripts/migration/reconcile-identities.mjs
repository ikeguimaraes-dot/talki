// Read-only reconciliation. Candidates still need review; this never provisions users.
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function reconcileIdentities(source, target) {
  if (!Array.isArray(source.profiles) || !Array.isArray(target.profiles)
      || !Array.isArray(target.auth_without_profile)) {
    throw new Error('Expected audit objects containing profiles and auth_without_profile arrays');
  }
  return source.profiles.map(person => {
    const hash = person.auth_email_hash;
    const profiles = target.profiles.filter(p => hash && p.auth_email_hash === hash);
    const missingProfiles = target.auth_without_profile.filter(p => hash && p.email_hash === hash);
    const candidates = [...profiles.map(p => ({
      id: p.auth_id, confirmed: p.confirmed,
      consistent: p.profile_email_hash === p.auth_email_hash, profile_exists: true,
    })), ...missingProfiles.map(p => ({
      id: p.auth_id, confirmed: p.confirmed, consistent: true, profile_exists: false,
    }))];
    const duplicateSource = hash && source.profiles.filter(p => p.auth_email_hash === hash).length > 1;
    let status;
    if (!person.auth_id || !hash || person.profile_email_hash !== hash) status = 'review_source_identity';
    else if (duplicateSource || candidates.length > 1) status = 'review_duplicate_identity';
    else if (!person.confirmed || candidates.some(p => !p.confirmed)) status = 'activation_required';
    else if (candidates.some(p => !p.consistent)) status = 'review_target_identity';
    else if (candidates.length === 0) status = 'provisioning_required';
    else if (!candidates[0].profile_exists) status = 'profile_repair_required';
    else status = 'verified_email_candidate';
    return {
      source_profile_id: person.profile_id,
      source_auth_id: person.auth_id,
      source_role: person.role,
      proposed_module_role: person.role === 'admin' ? 'gestor' : 'participante',
      target_candidates: candidates.map(p => p.id), status,
      approved: false,
    };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [sourcePath, targetPath, outputPath] = process.argv.slice(2);
  if (!sourcePath || !targetPath || !outputPath) {
    throw new Error('Usage: node reconcile-identities.mjs <source-audit.json> <target-audit.json> <new-private-output.json>');
  }
  const [source, target] = await Promise.all([sourcePath, targetPath].map(async p => JSON.parse(await readFile(p, 'utf8'))));
  const rows = reconcileIdentities(source, target);
  await writeFile(outputPath, JSON.stringify(rows, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify(rows.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] ?? 0) + 1 }), {})));
}
