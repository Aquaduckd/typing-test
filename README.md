# Minimal Monkeytype-style Typing Test

A small typing test inspired by [Monkeytype](https://monkeytype.com): hidden textarea input, custom letter rendering, and a smoothly animated caret.

## Stack

- TypeScript
- Vite
- Tailwind CSS v4 (utility classes only — no custom stylesheets)

## Run

```bash
cd typing-test
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## How it works

1. **`#words-input`** — invisible textarea captures keyboard input (with Monkeytype's leading-space trick).
2. **`beforeinput` / `input`** — validates keystrokes, tracks stats, commits words on space.
3. **`#words`** — each word is a `<div class="word">` with `<letter>` children; classes update as you type.
4. **`#caret`** — separate DOM element positioned over the active letter, animated with the Web Animations API when smooth caret is on.

## Project layout

```
src/
  main.ts           App bootstrap & event wiring
  input-element.ts  Hidden textarea helpers
  input-handler.ts  Insert/delete logic
  caret.ts          Smooth caret positioning
  render.ts         Word/letter DOM updates
  state.ts          Test state
  stats.ts          WPM & accuracy
  style.css         Tailwind import only
```
