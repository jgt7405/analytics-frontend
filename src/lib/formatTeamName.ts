// Long words wrap awkwardly in narrow table columns: overflow-wrap: break-word
// still has to fragment a word wider than the column, and it does so silently
// - no visible "-" - so the reader sees e.g. "Oklahom" / "a State" with no
// indication a word was cut. A soft hyphen only renders as a visible "-" when
// the browser itself breaks the line there; html2canvas (used for the
// download/print export) doesn't replicate that behavior and just drops it.
// A real hyphen + zero-width space instead guarantees the same visible break
// on-screen and in exports.
const ZWS = "​";

// Empirically, a plain word up to 7 characters fits on one line in the
// tightest team-name columns (--team-column-width: 2.95rem on mobile); 8+
// does not ("Arizona" wraps cleanly, "Oklahoma" does not - both single words
// inside two-word team names). Any word at or above this length gets a break,
// whether it's an entire team name ("Northwestern") or just one word inside a
// longer one ("Oklahoma" in "Oklahoma State") - the word-level regex below
// matches either case identically.
const MIN_LENGTH_TO_HYPHENATE = 8;

// Curated, syllable-sensible break points for the long words that come up
// often. Anything long that ISN'T listed here still gets hyphenated - see
// hyphenateWord's mechanical fallback - so a new/unlisted team name can never
// silently reproduce the "Oklahoma State" bug; it just gets a less
// elegant-but-still-correct break until someone adds a nicer entry here.
const CURATED_BREAKS: Record<string, string> = {
  Massachusetts: "Massa-chusetts",
  Northwestern: "North-western",
  Pennsylvania: "Penn-sylvania",
  Connecticut: "Connect-icut",
  Chattanooga: "Chatta-nooga",
  California: "Cali-fornia",
  Georgetown: "George-town",
  Louisville: "Louis-ville",
  Pittsburgh: "Pitts-burgh",
  Vanderbilt: "Vander-bilt",
  Washington: "Wash-ington",
  Cincinnati: "Cincin-nati",
  Mercyhurst: "Mercy-hurst",
  Valparaiso: "Valpa-raiso",
  Lindenwood: "Linden-wood",
  Minnesota: "Minne-sota",
  Dartmouth: "Dart-mouth",
  Princeton: "Prince-ton",
  Villanova: "Villa-nova",
  Wisconsin: "Wis-consin",
  Lafayette: "Lafa-yette",
  Charlotte: "Char-lotte",
  Tennessee: "Tennes-see",
  Grambling: "Gram-bling",
  Merrimack: "Merri-mack",
  Oklahoma: "Okla-homa",
  Presbyterian: "Presby-terian",
  Northeastern: "North-eastern",
  Jacksonville: "Jackson-ville",
  Bakersfield: "Bakers-field",
  Charleston: "Charles-ton",
  Providence: "Provi-dence",
  Evansville: "Evans-ville",
  Bellarmine: "Bellar-mine",
  Quinnipiac: "Quinni-piac",
  Occidental: "Occi-dental",
  Binghamton: "Bingham-ton",
  Pepperdine: "Pepper-dine",
  Stonehill: "Stone-hill",
  Fairfield: "Fair-field",
  Manhattan: "Man-hattan",
  McKendree: "McKen-dree",
  Milwaukee: "Mil-waukee",
  Marquette: "Mar-quette",
  Creighton: "Creigh-ton",
};

// Splits a long, unlisted word roughly 55% of the way through (never fewer
// than 3 characters on either side) and inserts a real hyphen there. Not
// guaranteed to land on a linguistically perfect syllable boundary, but it's
// a mechanical rule that applies to any word - the safety net that makes new
// or missed team names fail safe instead of silently fragmenting.
function mechanicalBreak(word: string): string {
  const breakPoint = Math.max(3, Math.min(word.length - 3, Math.round(word.length * 0.55)));
  return `${word.slice(0, breakPoint)}-${word.slice(breakPoint)}`;
}

function hyphenateWord(word: string): string {
  if (word.length < MIN_LENGTH_TO_HYPHENATE || word.includes("-")) {
    return word;
  }
  const withHyphen = CURATED_BREAKS[word] ?? mechanicalBreak(word);
  return withHyphen.replace("-", `-${ZWS}`);
}

// Inserts a visible hyphenation break into any long word - whether the whole
// team name is one word ("Northwestern") or the word is just part of a
// multi-word name ("Oklahoma" in "Oklahoma State") - so it wraps cleanly
// instead of overflowing or splitting mid-word with no indication. Words
// that already contain a real hyphen (e.g. "Gardner-Webb") wrap fine at that
// hyphen already and are left untouched.
export function formatTeamName(name: string): string {
  return name
    .split(" ")
    .map(hyphenateWord)
    .join(" ");
}
