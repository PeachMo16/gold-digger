// All content in this demo is fictional, including the gate states and quote.
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordEvent, saveCard } from './library-core.mjs';
import { main } from './library.mjs';

const root = mkdtempSync(join(tmpdir(), 'gold-digger-demo-'));
for (const dir of ['finds', 'digs']) mkdirSync(join(root, dir));
writeFileSync(join(root, 'queue.md'), '# SYNTHETIC DEMO\n- [accepted] LEAD-0001 · synthetic sensor cost example\n');
writeFileSync(join(root, 'taste.md'), '# SYNTHETIC DEMO\n## verdict log\n');
writeFileSync(join(root, 'finds/LEAD-0001.md'), '# SYNTHETIC FIND\n## three sentences\nThe fictional prototype exceeded its sensor budget.\nNo real experiment is described.\nA new quote could justify a cost check.\n');
writeFileSync(join(root, 'digs/LEAD-0001.md'), '# SYNTHETIC DIG\nThe fictional prototype exceeded its sensor budget.\n');
saveCard(root, { version: 1, leadId: 'LEAD-0001', title: 'Synthetic sensor-cost route',
  questions: ['Can a lower sensor price revive this prototype?', '能不能降低传感器成本'],
  candidateUse: 'Recheck one fictional prototype against a declared sensor budget.',
  limitations: ['All data are synthetic. A cheap quote does not prove performance, manufacturability or commercial value.'],
  conditions: [{ id: 'cost', description: 'A comparable sensor fits the project budget', state: 'unmet', recheckWhen: 'A dated written quote for the same specifications arrives' }],
  nextTest: { action: 'Compare one written quote with the frozen specification and budget', deliverable: 'A dated comparison with included/excluded costs', pass: 'Same specifications and total cost within budget', fail: 'Different specifications or total cost above budget', budget: '30 minutes, no purchases' },
  sources: [{ path: 'digs/LEAD-0001.md', quote: 'The fictional prototype exceeded its sensor budget.' }], dependsOn: [], reviewedEventIds: [] });
console.log(`SYNTHETIC DEMO ONLY. Isolated mine: ${root}`);
main(['ask', '降低传感器成本', '--root', root]);
writeFileSync(join(root, 'digs/LEAD-0001.new-quote.md'), '# SYNTHETIC OBSERVATION\nA new fictional quote may meet the budget; specification equivalence is not yet checked.\n');
recordEvent(root, { version: 1, id: 'EV-demo-price', leadId: 'LEAD-0001', kind: 'condition-change', conditionId: 'cost',
  summary: 'A cheaper quote arrived; compare the specifications before reusing the old idea.',
  sources: [{ path: 'digs/LEAD-0001.new-quote.md', quote: 'A new fictional quote may meet the budget; specification equivalence is not yet checked.' }] });
console.log('\nAfter a new evidence event:');
main(['review', '--root', root]);
