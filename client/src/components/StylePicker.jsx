const ICONS = {
  cartoon:     '🎨',
  sketch:      '✏️',
  anime:       '🌸',
  oilpainting: '🖌️',
  sepia:       '📜',
  retro:       '📼',
};

export default function StylePicker({ styles, value, onChange, disabled = false }) {
  if (!styles?.length) return null;
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" disabled={disabled}>
      <legend className="sr-only">Animation style</legend>
      {styles.map((s) => {
        const selected = value === s.id;
        return (
          <label
            key={s.id}
            className={`relative cursor-pointer card p-4 transition border-2 ${
              selected
                ? 'border-brand-600 ring-2 ring-brand-500/20'
                : 'border-transparent hover:border-slate-200'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <input
              type="radio"
              name="style"
              value={s.id}
              checked={selected}
              onChange={() => onChange(s.id)}
              className="sr-only"
            />
            <div className="flex items-center gap-3">
              <span aria-hidden className="text-2xl">{ICONS[s.id] || '🎬'}</span>
              <span className="font-semibold text-slate-900">{s.label}</span>
              {selected && (
                <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-snug">{s.description}</p>
          </label>
        );
      })}
    </fieldset>
  );
}
