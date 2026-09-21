/**
 * Fallback avatar for venues that carry no uploaded one — venues created
 * before the avatar requirement, and fixture rows. The monogram is derived
 * from the venue name, so the same bar always wears the same mark, and it is
 * emitted as an inline SVG data URI so it drops into the same <img src> as a
 * stored avatar.
 */

const INK = "#141413";
const NIGHT = "#0d0d0c";
const PAPER = "#f2f1ee";

/** Up to two characters: one per word, or the first two of a single word. */
export function venueInitials(name: string): string {
  const words = Array.from(name.matchAll(/[\p{L}\p{N}]+/gu), (match) => match[0]);
  if (words.length === 0) return "•";
  if (words.length === 1) return Array.from(words[0]!).slice(0, 2).join("").toUpperCase();
  return (Array.from(words[0]!)[0]! + Array.from(words[1]!)[0]!).toUpperCase();
}

/**
 * Stable index into the three house treatments. djb2 over the name: no
 * randomness, so the mark survives reloads, devices, and re-renders.
 */
function variantFor(name: string): number {
  let hash = 5381;
  for (const character of name) hash = ((hash << 5) + hash + character.codePointAt(0)!) >>> 0;
  return hash % 3;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character]!);
}

function monogram(letters: string, fill: string, fontSize: number, baseline: number): string {
  return `<text x='60' y='${baseline}' fill='${fill}' font-family='Helvetica Neue,Helvetica,Arial,sans-serif' `
    + `font-size='${fontSize}' font-weight='300' letter-spacing='2' text-anchor='middle'>${escapeXml(letters)}</text>`;
}

/** SVG data URI for the venue's generated avatar. */
export function venueAvatarDataUri(name: string): string {
  const letters = venueInitials(name);
  const body = [
    // Ink field, paper monogram, a rule under it.
    () => `<rect width='120' height='120' fill='${INK}'/>${monogram(letters, PAPER, 38, 74)}`
      + `<rect x='42' y='88' width='36' height='1.5' fill='${PAPER}' opacity='.65'/>`,
    // After-hours field with an outlined disc behind the monogram.
    () => `<rect width='120' height='120' fill='${NIGHT}'/>`
      + `<circle cx='60' cy='58' r='34' fill='none' stroke='${PAPER}' stroke-opacity='.45' stroke-width='1.5'/>`
      + monogram(letters, PAPER, 34, 70),
    // Reversed: paper field, ink frame and monogram.
    () => `<rect width='120' height='120' fill='${PAPER}'/>`
      + `<rect x='8' y='8' width='104' height='104' fill='none' stroke='${INK}' stroke-opacity='.55' stroke-width='1.5'/>`
      + monogram(letters, INK, 38, 74)
      + `<rect x='42' y='88' width='36' height='1.5' fill='${INK}' opacity='.5'/>`,
  ][variantFor(name)]!();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120' width='120' height='120'>${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
