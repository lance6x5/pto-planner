// Footer feedback links: open pre-filled GitHub issue forms in a new tab.
import { buildIssueUrl } from '../lib/feedback.js';

export default function Feedback() {
  return (
    <section className="feedback" aria-labelledby="feedback-heading">
      <h2 id="feedback-heading" className="feedback-heading">Feedback</h2>
      <ul className="feedback-actions">
        <li>
          <a className="btn" href={buildIssueUrl('bug')} target="_blank" rel="noopener noreferrer">
            Report a bug<span className="visually-hidden"> (opens GitHub in a new tab)</span>
          </a>
        </li>
        <li>
          <a className="btn" href={buildIssueUrl('feature')} target="_blank" rel="noopener noreferrer">
            Request a feature<span className="visually-hidden"> (opens GitHub in a new tab)</span>
          </a>
        </li>
      </ul>
      <p className="feedback-note">Opens GitHub — a free GitHub account is required. Don't include personal data.</p>
    </section>
  );
}
