# Typing Test

A browser typing test built for **practice**. As you type, the site learns which letter combinations are slow for you and underlines them in real time — so you can put extra focus on those spots and naturally improve over time.

Monkeytype-style timing and feel, with ngram-aware feedback layered on top.

## How practice works

While you type, your slowest trigrams get underlined based on your lifetime stats:

- **Red** — slower than your average for that trigram; worth slowing down and paying attention
- **Green** — faster than your average; you're getting comfortable with this one

The goal is not just to hit a WPM number once. Keep practicing, notice the underlines, and your weak ngrams gradually speed up.

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
