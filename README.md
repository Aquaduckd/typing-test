# Typing Test

A fast, Monkeytype-style typing test that runs entirely in the browser. Type through random words, review detailed results, and track your progress over time.

## Typing test

- **15-second timed test** — start typing on any key; a progress bar shows time remaining.
- **Monkeytype-style feel** — hidden input, per-letter highlighting, smooth caret, and line scrolling as you move through longer passages.
- **Click to focus** — click the word area if focus drifts.
- **Restart with Esc** — press Esc to reset. If you restart mid-test, the same word list is kept so you can retry the same text.
- **Slow trigram hints** — while you type, underlines mark trigrams that tend to be slow for you. Green means faster than your average; red means slower.

## Results

After each test, the results tab shows:

- **WPM, raw WPM, accuracy, and consistency**
- **WPM chart** with burst, raw, and error overlays (toggle series on and off)
- **Bigram and trigram breakdown** for that run, including lifetime averages for comparison
- **Date and time** of the result (your last result is saved locally)

## Ngrams

Lifetime bigram and trigram stats build up as you complete tests:

- Sortable tables for bigrams and trigrams (avg ms and count)
- **Download JSON** export with a timestamped filename
- **Reset ngrams** to clear lifetime typing-timing data

Trigram timing is based on the text you were meant to type. Uncorrected mistakes apply a max penalty so bad runs do not skew your profile as if you typed cleanly.

## Stats

Track overall progress:

- **Tests started** and **tests completed**
- **Personal bests** per word list — best WPM, accuracy, and date for each preset (and custom lists)

## Words

Choose what you practice on:

- Presets: **e200**, **1k**, **5k**, **10k**, **25k**, **450k**
- **Custom** list — paste your own words (saved locally)
- Changes apply on the next test restart

## Run locally

```bash
cd typing-test
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Build for production:

```bash
npm run build
npm run preview
```
