// Summary panel: totals for the year plus the list of accepted breaks.
import { formatRange } from '../lib/dates.js';

export default function Summary({ profile, summary, onRemove }) {
  const accepted = [...profile.accepted].sort((a, b) => a.start.localeCompare(b.start));
  return (
    <section className="panel summary" aria-labelledby="summary-heading">
      <h2 id="summary-heading">Summary · {profile.year}</h2>
      <dl className="stats">
        <div>
          <dt>Total days off</dt>
          <dd>{summary.daysOff}</dd>
        </div>
        <div>
          <dt>PTO used</dt>
          <dd>{summary.ptoUsed}</dd>
        </div>
        <div className={summary.remaining < 0 ? 'is-negative' : ''}>
          <dt>PTO remaining</dt>
          <dd aria-live="polite">
            {summary.remaining} <span className="muted">/ {profile.balance}</span>
          </dd>
        </div>
        <div>
          <dt>Longest break</dt>
          <dd>{summary.longest} days</dd>
        </div>
      </dl>
      {summary.longestRange && (
        <p className="muted small">Longest break: {formatRange(summary.longestRange.start, summary.longestRange.end)}</p>
      )}
      <h3>Accepted plan</h3>
      {accepted.length === 0 ? (
        <p className="muted">Nothing accepted yet. Accept a suggestion or use the PTO brush on the calendar.</p>
      ) : (
        <ul className="accepted-list">
          {accepted.map((a) => (
            <li key={a.id}>
              <span>
                {formatRange(a.start, a.end)}
                <span className="muted">
                  {' '}
                  · {a.halfDates.length ? 'half day' : `${a.daysOff} days off`} · {a.ptoUsed} PTO
                </span>
              </span>
              <button type="button" className="btn btn-small" onClick={() => onRemove(a.id)} aria-label={`Remove ${formatRange(a.start, a.end)} from plan`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
