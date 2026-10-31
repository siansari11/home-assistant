import { useState } from 'react';
import { alarmJoinUrl, enableAlarmAlerts } from '../lib/alarm-link';

export function AlarmLinkCard() {
  const [copied, setCopied] = useState('');
  const link = alarmJoinUrl();

  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <h2 className="font-serif text-2xl">Hear it in another room</h2>
      <p className="mt-2 text-sm text-muted">
        Open this link on a phone and leave Our Home on the screen. When the kitchen timer ends, that phone rings too, until someone taps Dismiss on either device. No Amazon or Spotify account.
      </p>
      <p className="mt-3 break-all rounded-2xl bg-paper px-3 py-2 text-sm">{link}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full bg-sage px-4 py-2 text-sm font-medium text-white"
          onClick={() => {
            void navigator.clipboard?.writeText(link).then(() => setCopied('Link copied.')).catch(() => setCopied(link));
          }}
        >
          Copy alarm link
        </button>
        <button type="button" className="rounded-full border border-line px-4 py-2 text-sm" onClick={() => void enableAlarmAlerts().then(() => setCopied('Alerts allowed on this device.'))}>
          Allow alerts on this device
        </button>
      </div>
      {copied && <p className="mt-2 text-sm text-sage-deep">{copied}</p>}
    </section>
  );
}
