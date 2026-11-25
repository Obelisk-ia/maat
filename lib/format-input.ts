/**
 * Reformats an input as it's typed without throwing the cursor to the end.
 * The cursor stays after the same number of meaningful characters; spaces and hyphens don't count.
 */
export function reformatInput(input: HTMLInputElement, format: (value: string) => string) {
  const meaningful = /[a-z0-9]/gi;
  const typed = input.value;
  const caret = input.selectionStart ?? typed.length;
  const next = format(typed);
  let position = next.length;
  if (caret < typed.length) {
    let remaining = typed.slice(0, caret).match(meaningful)?.length ?? 0;
    for (position = 0; position < next.length && remaining > 0; position++) {
      if (next[position].match(meaningful)) remaining--;
    }
  }
  input.value = next;
  input.setSelectionRange(position, position);
  return next;
}
