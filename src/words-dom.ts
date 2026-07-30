import { queryRequired } from "./dom";

export function getWordsContainer(): HTMLElement {
  return queryRequired<HTMLElement>("#words");
}

export function getWordsWrapper(): HTMLElement {
  return queryRequired<HTMLElement>("#words-wrapper");
}

export function getWordsViewport(): HTMLElement {
  return queryRequired<HTMLElement>("#words-viewport");
}

export function getCaretElement(): HTMLElement {
  return queryRequired<HTMLElement>("#caret");
}

export function setInlineStylePx(
  element: HTMLElement,
  values: Partial<
    Record<
      | "left"
      | "top"
      | "marginTop"
      | "marginLeft"
      | "width"
      | "animationName"
      | "opacity"
      | "display"
      | "transform",
      string
    >
  >,
): void {
  Object.assign(element.style, values);
}

/** Sum offsetLeft/Top up to (but not including) ancestor — matches MT's chained offsets. */
export function getOffsetWithinAncestor(
  element: HTMLElement,
  ancestor: HTMLElement,
): { left: number; top: number } {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = element;

  while (node && node !== ancestor) {
    left += node.offsetLeft;
    top += node.offsetTop;
    const parent = node.offsetParent as HTMLElement | null;
    if (!parent || !ancestor.contains(parent)) {
      const elementRect = element.getBoundingClientRect();
      const ancestorRect = ancestor.getBoundingClientRect();
      return {
        left: elementRect.left - ancestorRect.left,
        top: elementRect.top - ancestorRect.top,
      };
    }
    node = parent;
  }

  return { left, top };
}
