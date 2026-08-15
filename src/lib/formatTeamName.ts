// Long single-word team names wrap awkwardly in narrow table columns with no
// visible break. A soft hyphen only renders as a visible "-" when the browser
// itself breaks the line there; html2canvas (used for the download/print
// export) doesn't replicate that behavior and just drops it. A real hyphen +
// zero-width space instead guarantees the same visible break on-screen and in
// exports, so every entry below pairs a literal "-" with "​" rather than
// relying on CSS hyphens: auto.
const ZWS = "​";

const HYPHENATED_NAMES: Record<string, string> = {
  Massachusetts: `Massa-${ZWS}chusetts`,
  Northwestern: `North-${ZWS}western`,
  Pennsylvania: `Penn-${ZWS}sylvania`,
  Connecticut: `Connect-${ZWS}icut`,
  Chattanooga: `Chatta-${ZWS}nooga`,
  California: `Cali-${ZWS}fornia`,
  Georgetown: `George-${ZWS}town`,
  Louisville: `Louis-${ZWS}ville`,
  Pittsburgh: `Pitts-${ZWS}burgh`,
  Vanderbilt: `Vander-${ZWS}bilt`,
  Washington: `Wash-${ZWS}ington`,
  Cincinnati: `Cincin-${ZWS}nati`,
  Mercyhurst: `Mercy-${ZWS}hurst`,
  Valparaiso: `Valpa-${ZWS}raiso`,
  Lindenwood: `Linden-${ZWS}wood`,
  Minnesota: `Minne-${ZWS}sota`,
  Dartmouth: `Dart-${ZWS}mouth`,
  Princeton: `Prince-${ZWS}ton`,
  Villanova: `Villa-${ZWS}nova`,
  Wisconsin: `Wis-${ZWS}consin`,
  Lafayette: `Lafa-${ZWS}yette`,
  Charlotte: `Char-${ZWS}lotte`,
  Tennessee: `Tennes-${ZWS}see`,
  Grambling: `Gram-${ZWS}bling`,
  Merrimack: `Merri-${ZWS}mack`,
  Presbyterian: `Presby-${ZWS}terian`,
  Northeastern: `North-${ZWS}eastern`,
  Jacksonville: `Jackson-${ZWS}ville`,
  Bakersfield: `Bakers-${ZWS}field`,
  Charleston: `Charles-${ZWS}ton`,
  Providence: `Provi-${ZWS}dence`,
  Evansville: `Evans-${ZWS}ville`,
  Bellarmine: `Bellar-${ZWS}mine`,
  Quinnipiac: `Quinni-${ZWS}piac`,
  Occidental: `Occi-${ZWS}dental`,
  Binghamton: `Bingham-${ZWS}ton`,
  Pepperdine: `Pepper-${ZWS}dine`,
  Stonehill: `Stone-${ZWS}hill`,
  Fairfield: `Fair-${ZWS}field`,
  Manhattan: `Man-${ZWS}hattan`,
  McKendree: `McKen-${ZWS}dree`,
  Milwaukee: `Mil-${ZWS}waukee`,
  Marquette: `Mar-${ZWS}quette`,
  Creighton: `Creigh-${ZWS}ton`,
};

const HYPHENATION_REGEX = new RegExp(
  `\\b(${Object.keys(HYPHENATED_NAMES).join("|")})\\b`,
  "g"
);

// Inserts a visible hyphenation break into long single-word team names (e.g.
// "Northwestern" -> "North-western") so they wrap cleanly instead of
// overflowing or breaking mid-word with no indication. Multi-word names
// already wrap fine at their existing spaces and are left untouched.
export function formatTeamName(name: string): string {
  return name.replace(
    HYPHENATION_REGEX,
    (match) => HYPHENATED_NAMES[match] ?? match
  );
}
