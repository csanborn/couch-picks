import { useState, type SubmitEvent } from 'react';
import { MOOD_MAX_LENGTH } from '../../shared/schema';
import { useFocusable } from '../focus/hooks';
import { PRESET_MOODS } from '../moods';

const CHIP_ROW = 'chips';

function MoodChip({ index, mood, onPick }: { index: number; mood: string; onPick: (mood: string) => void }) {
  const focusable = useFocusable(`chip-${String(index)}`, { row: CHIP_ROW });
  return (
    <button
      type="button"
      className="chip"
      {...focusable}
      onClick={() => {
        onPick(mood);
      }}
    >
      {mood}
    </button>
  );
}

export function MoodPrompt({ onSearch, busy }: { onSearch: (mood: string) => void; busy: boolean }) {
  const [mood, setMood] = useState('');
  const input = useFocusable('mood-input');

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mood.trim()) onSearch(mood.trim());
  };

  return (
    <header className="header">
      <p className="brand">
        couch<span className="brand-dot">·</span>picks
      </p>
      <form className="prompt" onSubmit={submit} role="search">
        <label className="prompt-label" htmlFor="mood">
          What are you in the mood for?
        </label>
        <div className="prompt-field">
          <input
            id="mood"
            className="prompt-input"
            type="text"
            autoComplete="off"
            enterKeyHint="search"
            maxLength={MOOD_MAX_LENGTH}
            placeholder="A cozy rainy Sunday, a movie night with grandma..."
            value={mood}
            onChange={(event) => {
              setMood(event.target.value);
            }}
            {...input}
          />
          <span className="prompt-hint" aria-live="polite">
            {busy ? 'Finding picks' : 'Press Enter'}
          </span>
        </div>
      </form>
      <div className="chips" role="group" aria-label="Try a mood">
        {PRESET_MOODS.map((preset, index) => (
          <MoodChip
            key={preset}
            index={index}
            mood={preset}
            onPick={(picked) => {
              setMood(picked);
              onSearch(picked);
            }}
          />
        ))}
      </div>
    </header>
  );
}
