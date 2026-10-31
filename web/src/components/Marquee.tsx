import { STRIP } from '../data/content';

export function Marquee() {
  const loop = [...STRIP, ...STRIP];
  return (
    <section aria-label="Recipes and apartment cleaning tips" className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2 className="font-serif text-2xl text-ink">From the kitchen</h2>
        <p className="text-sm text-muted">Recipes and apartment care</p>
      </div>
      <div className="marquee-fade overflow-hidden motion-reduce:overflow-x-auto">
        <div className="flex w-max gap-3 py-1 animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
          {loop.map((item, index) => (
            <article
              key={`${item.kind}-${item.title}-${index}`}
              className="w-[17.5rem] shrink-0 rounded-2xl border border-line bg-card px-4 py-3 shadow-card"
            >
              <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${item.kind === 'recipe' ? 'text-clay' : 'text-sage'}`}>
                {item.kind === 'recipe' ? `Recipe · ${item.minutes} min` : 'Apartment'}
              </p>
              <h3 className="mt-1 font-serif text-lg leading-tight text-ink">{item.title}</h3>
              <p className="mt-1 text-sm leading-snug text-muted">{item.note}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
