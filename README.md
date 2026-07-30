# Typing Test

A browser typing test built for **practice**. The site learns which letter combinations are slow for you, marks them with orange underlines ahead of time, and shows whether you beat your average as you type — so you can give those spots extra focus without breaking rhythm.

Monkeytype-style timing and feel, with ngram-aware feedback layered on top.

## How practice works

The site tracks your slowest trigrams over time and marks them with **orange underlines** before you reach them - a cue to focus on typing that ngram faster. 

As you type through each one:

- **Green** — faster than your average; you nailed it at speed
- **Red** — slower than your average this time

The idea is simple: watch for orange, stay at pace, and try to turn it green. 

## Typing test

- **15-second timed test** — start typing on any key; a progress bar shows time remaining
- **Per-letter feedback** — smooth caret, line scrolling, and click-to-focus
- **Restart with Esc** — mid-test restart keeps the same words so you can retry the same passage

## Results

After each test:

- **WPM, raw WPM, accuracy, and consistency**
- **WPM chart** with burst, raw, and error overlays
- **Bigram and trigram breakdown** for that run, compared to your lifetime averages
- Your last result is saved locally with date and time

## Ngrams

Lifetime bigram and trigram stats power the underlines and deepen over time:

- Sortable tables for bigrams and trigrams (avg ms and count)
- **Download JSON** export with a timestamped filename
- **Reset ngrams** to start fresh

Trigram timing reflects the text you were meant to type. Uncorrected mistakes count as a max penalty so one bad run does not look like a clean rep.

## Stats

- **Tests started** and **tests completed**
- **Personal bests** per word list — best WPM, accuracy, and date for each preset (and custom lists)

## Words

Choose what you practice on:

- Presets: **e200**, **1k**, **5k**, **10k**, **25k**, **450k**
- **Custom** list — paste your own words (saved locally)

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
