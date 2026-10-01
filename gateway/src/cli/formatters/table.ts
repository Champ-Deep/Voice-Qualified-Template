import { CallNode } from '../../graph/types.js';

export function printCallTable(calls: CallNode[]): void {
  if (calls.length === 0) {
    console.log('  No calls found.');
    return;
  }

  const cols = ['callId', 'status', 'outcome', 'toNumber', 'created', 'duration'] as const;
  const rows = calls.map(c => ({
    callId: c.callId,
    status: c.status,
    outcome: c.outcome,
    toNumber: c.toNumber,
    created: c.timestamps.created.slice(0, 19).replace('T', ' '),
    duration: c.durationSeconds ? `${c.durationSeconds}s` : '-',
  }));

  const widths = {} as Record<(typeof cols)[number], number>;
  for (const col of cols) {
    widths[col] = Math.max(col.length, ...rows.map(r => r[col].length));
  }

  const widthOf = (col: (typeof cols)[number]): number => widths[col] ?? col.length;

  const sep = '+' + cols.map(c => '-'.repeat(widthOf(c) + 2)).join('+') + '+';
  const header = '|' + cols.map(c => ` ${c.padEnd(widthOf(c))} `).join('|') + '|';

  console.log(sep);
  console.log(header);
  console.log(sep);
  for (const row of rows) {
    console.log('|' + cols.map(c => ` ${row[c].padEnd(widthOf(c))} `).join('|') + '|');
  }
  console.log(sep);
}
