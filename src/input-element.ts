import { queryRequired } from "./dom";

const inputEl = queryRequired<HTMLTextAreaElement>("#words-input");

/** Monkeytype stores a leading space to avoid Safari trimming on focus. */
export function setInputValue(value: string): void {
  inputEl.value = ` ${value}`;
}

export function getInputValue(): string {
  return inputEl.value.slice(1);
}

export function appendInputValue(char: string): void {
  inputEl.value += char;
}

export function replaceLastInputChar(char: string): void {
  const value = getInputValue();
  setInputValue(value.slice(0, -1) + char);
}

export function clearInputValue(): void {
  setInputValue("");
}

export function focusInput(): void {
  inputEl.focus({ preventScroll: true });
}

export function blurInput(): void {
  inputEl.blur();
}

export function isInputFocused(): boolean {
  return document.activeElement === inputEl;
}

export function getInputElement(): HTMLTextAreaElement {
  return inputEl;
}
