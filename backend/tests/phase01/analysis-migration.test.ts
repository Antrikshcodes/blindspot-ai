import { it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

it('numbers multiple pre-existing analyses without overwriting historical JSON', async () => {
  const client = new PGlite();
  const folder = 'src/phase01/db/migrations';
  try {
    const journal = JSON.parse(readFileSync(`${folder}/meta/_journal.json`, 'utf8'));
    for (const entry of journal.entries.filter((item: { idx: number }) => item.idx < 2)) {
      await client.exec(readFileSync(`${folder}/${entry.tag}.sql`, 'utf8'));
    }
    const { rows } = await client.query<{ id: string }>(`INSERT INTO blindspot_phase01.projects
      (name, product_description, problem_statement, target_audience, proposed_solution)
      VALUES ('historical fixture', 'original description', 'original problem', 'original audience', 'original solution')
      RETURNING id`);
    const id = rows[0].id;
    for (const timestamp of ['2026-01-01', '2026-01-02']) {
      await client.query(`INSERT INTO blindspot_phase01.analyses
        (project_id, project_snapshot, result, model, created_at) VALUES ($1, '{}', '{"historical":true}', 'original', $2)`,
      [id, timestamp]);
    }
    const migration = journal.entries.find((entry: { idx: number }) => entry.idx === 2);
    await client.exec(readFileSync(`${folder}/${migration.tag}.sql`, 'utf8'));
    const result = await client.query<{ version: number; engine_version: string; result: unknown }>(
      'SELECT version, engine_version, result FROM blindspot_phase01.analyses ORDER BY version',
    );
    expect(result.rows.map(row => row.version)).toEqual([1, 2]);
    expect(result.rows.every(row => row.engine_version === '1')).toBe(true);
    expect(result.rows.every(row => JSON.stringify(row.result) === '{"historical":true}')).toBe(true);
  } finally { await client.close(); }
}, 30000);
