// Ranked suggestion list with Accept / Dismiss actions.
import { formatRange } from '../lib/dates.js';

const REASON_LABEL = {
  'must-include': 'Covers a must-include date',
  plan: 'Recommended',
  alternative: 'Alternative'
};

export default function Suggestions({
  suggestions,
  warnings,
  remaining,
  selectedId,
  onSelect,
  onAccept,
  onDismiss,
  dismissedCount,
  onRestore
}) {
  return (
    <section className="panel suggestions" aria-labelledby="sugg-heading">
      <div className="panel-head">
        <h2 id="sugg-heading">Suggestions</h2>
        {dismissedCount > 0 && (
          <button type="button" className="link-button" onClick={onRestore}>
            Restore {dismissedCount} dismissed
          </button>
        )}
      </div>
      {warnings.length > 0 && (
        <ul className="warnings">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {suggestions.length === 0 ? (
        <p className="muted">
          {remaining < 1
            ? 'No PTO balance left to suggest more breaks.'
            : 'No suggestions found. Try adding holidays or switching strategy.'}
        </p>
      ) : (
        <ol className="sugg-list">
          {suggestions.map((s, i) => {
            const tooExpensive = s.ptoUsed > remaining;
            return (
              <li key={s.id} className={`sugg ${s.recommended ? 'is-recommended' : ''} ${selectedId === s.id ? 'is-selected' : ''}`}>
                <button
                  type="button"
                  className="sugg-main"
                  aria-pressed={selectedId === s.id}
                  onClick={() => onSelect(s)}
                  title="Highlight on calendar"
                >
                  <span className="sugg-rank" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="sugg-body">
                    <span className="sugg-range">{formatRange(s.start, s.end)}</span>
                    <span className="sugg-meta">
                      <strong>{s.daysOff}</strong> days off · <strong>{s.ptoUsed}</strong> PTO ·{' '}
                      <strong>{s.efficiency.toFixed(2)}×</strong> efficiency
                    </span>
                    <span className={`tag tag-${s.reason}`}>{REASON_LABEL[s.reason]}</span>
                  </span>
                </button>
                <div className="sugg-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => onAccept(s)}
                    disabled={tooExpensive}
                    aria-label={`Accept ${formatRange(s.start, s.end)}`}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => onDismiss(s)}
                    aria-label={`Dismiss ${formatRange(s.start, s.end)}`}
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
