"use client";

import type { KeyboardEvent } from "react";

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Enter moves to the next field instead of submitting, the way a data-entry
 * form should behave. On the last field it submits. Attach to a `<form>`:
 *
 *     <form action={action} onKeyDown={advanceOnEnter}>
 */
export function advanceOnEnter(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== "Enter" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

  const target = event.target as HTMLElement;
  // A textarea keeps Enter for newlines, and a button keeps its own action.
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement) return;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
  if (target instanceof HTMLInputElement && (target.type === "submit" || target.type === "button")) return;

  const fields = focusableFields(event.currentTarget);
  const index = fields.indexOf(target as Field);
  if (index === -1) return;

  event.preventDefault();
  const next = fields[index + 1];
  if (next) next.focus();
  else event.currentTarget.requestSubmit();
}

function focusableFields(form: HTMLFormElement): Field[] {
  return [...form.elements].filter((element): element is Field => {
    if (
      !(
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      )
    ) {
      return false;
    }
    if (element.disabled) return false;
    if (!(element instanceof HTMLSelectElement) && element.readOnly) return false;
    if (element instanceof HTMLInputElement && (element.type === "hidden" || element.type === "submit")) return false;
    // Skip anything the layout has taken out of the flow (the calendar proxy).
    return element.tabIndex !== -1 && element.offsetParent !== null;
  });
}
