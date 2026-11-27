// Footer visit count: hidden until a value arrives; renders nothing on failure or when skipped.
import { useEffect, useState } from 'react';
import { fetchVisits, formatVisits } from '../lib/visits.js';

export default function VisitCounter() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    let active = true;
    fetchVisits().then((n) => {
      if (active && n !== null) setCount(n);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <p className="visit-count" aria-live="polite" hidden={count === null}>
      {count === null ? '' : `${formatVisits(count)} ${count === 1 ? 'visit' : 'visits'}`}
    </p>
  );
}
