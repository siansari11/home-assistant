import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  };
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6.5 9.5V20h11V9.5" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
    </svg>
  );
}

export function MealsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 4.5v7a2.5 2.5 0 0 0 5 0v-7M7.5 4.5V20M16 4.5c1.6 0 2.5 1.4 2.5 3.2 0 2.2-1.6 3.3-2.5 3.3V20" />
    </svg>
  );
}

export function ChoresIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

export function HouseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M7 10.5V19h10v-8.5" />
      <path d="M11 19v-4h2v4" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" />
    </svg>
  );
}

export function WeatherGlyph({ code, className = '' }: { code: number; className?: string }) {
  if (code >= 95) {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M13 3 6 14h6l-1 7 8-12h-6l0-6z" fill="currentColor" />
      </svg>
    );
  }
  if (code >= 71 && code <= 77 || code === 85 || code === 86) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M8 16h.01M12 18h.01M16 16h.01M7 13a5 5 0 0 1 9.6-1.5A3.5 3.5 0 1 1 17 18H8a3 3 0 0 1-1-5z" strokeLinecap="round" />
      </svg>
    );
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M7 14a5 5 0 0 1 9.6-1.5A3.5 3.5 0 1 1 17 19H8a3 3 0 0 1-1-5z" strokeLinecap="round" />
        <path d="M9 20.5 8 22M13 20.5 12 22M17 20.5 16 22" strokeLinecap="round" />
      </svg>
    );
  }
  if (code === 45 || code === 48) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <path d="M4 15h16M6 18h12M8 12h8" strokeLinecap="round" />
      </svg>
    );
  }
  if (code === 0 || code === 1) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M7 16a5 5 0 0 1 9.6-1.5A3.5 3.5 0 1 1 17 20H8a3 3 0 0 1-1-4z" strokeLinecap="round" />
    </svg>
  );
}
