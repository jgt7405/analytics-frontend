import {
  conferenceLabel,
  conferenceLabels,
  conferenceLogoPath,
  labelResponse,
  storedConferenceName,
  storedParams,
  storedQueryValue,
  storedRequestBody,
  storedTeamName,
  teamLabel,
  teamPagePath,
} from "../display-names";
import { CONFERENCE_DISPLAY_NAMES, TEAM_DISPLAY_NAMES } from "@/config/display-names";
import { SPORT_IDS, archivedSeasons, currentSeason } from "@/config/seasons";

const ARCHIVED = archivedSeasons("basketball")[0];

describe("the display-name list", () => {
  it("has unique ids, stored names and labels per kind", () => {
    const lists = [CONFERENCE_DISPLAY_NAMES, ...SPORT_IDS.map((s) => TEAM_DISPLAY_NAMES[s])];
    for (const list of lists) {
      for (const field of ["id", "stored", "label"] as const) {
        const values = list.map((entry) => entry[field]);
        expect(new Set(values).size).toBe(values.length);
      }
    }
  });

  it("never uses a label that is another entry's stored name", () => {
    for (const sport of SPORT_IDS) {
      const stored = new Set(TEAM_DISPLAY_NAMES[sport].map((t) => t.stored));
      for (const { label } of TEAM_DISPLAY_NAMES[sport]) expect(stored.has(label)).toBe(false);
    }
    const stored = new Set(CONFERENCE_DISPLAY_NAMES.map((c) => c.stored));
    for (const { label } of CONFERENCE_DISPLAY_NAMES) expect(stored.has(label)).toBe(false);
  });

  it("only uses labels the proxy's path rules accept", () => {
    for (const { label } of CONFERENCE_DISPLAY_NAMES) expect(label).toMatch(/^[A-Za-z0-9_ .-]+$/);
    for (const sport of SPORT_IDS) {
      for (const { label } of TEAM_DISPLAY_NAMES[sport]) {
        expect(label).toMatch(/^[\p{L}\p{N}_ .'&()-]+$/u);
      }
    }
  });
});

describe("labels by season", () => {
  it("shows labels on the current season", () => {
    expect(teamLabel("basketball", "New Orleans")).toBe("LSU New Orleans");
    expect(teamLabel("basketball", "New Orleans", currentSeason("basketball"))).toBe(
      "LSU New Orleans",
    );
    expect(conferenceLabel("basketball", "Metro Atlantic Athletic")).toBe("MAAC");
    expect(conferenceLabel("basketball", "Metro_Atlantic_Athletic")).toBe("MAAC");
    expect(teamLabel("football", "Connecticut")).toBe("UConn");
  });

  it("keeps archived seasons' names", () => {
    expect(teamLabel("basketball", "New Orleans", ARCHIVED)).toBe("New Orleans");
    expect(conferenceLabel("basketball", "Western Athletic", ARCHIVED)).toBe("Western Athletic");
  });

  it("leaves other names alone", () => {
    expect(teamLabel("basketball", "Duke")).toBe("Duke");
    expect(conferenceLabel("basketball", "Big 12")).toBe("Big 12");
    // A basketball-only team isn't relabeled in football.
    expect(teamLabel("football", "New Orleans")).toBe("New Orleans");
  });
});

describe("stored names for requests", () => {
  it("turns labels back into stored names", () => {
    expect(storedTeamName("basketball", "LSU New Orleans")).toBe("New Orleans");
    expect(storedTeamName("basketball", "Duke")).toBe("Duke");
    expect(storedConferenceName("basketball", "MAAC")).toBe("Metro Atlantic Athletic");
    expect(storedConferenceName("basketball", "Summit_League")).toBe("Summit");
    expect(storedConferenceName("basketball", "Big_12")).toBe("Big_12");
  });

  it("maps path parameters by name", () => {
    expect(storedParams("basketball", { conference: "SoCon", team: "UConn" })).toEqual({
      conference: "Southern",
      team: "Connecticut",
    });
    // "American" is a team (American University) as a team parameter.
    expect(storedParams("basketball", { team: "American" })).toEqual({ team: "American" });
    // Conference labels go out in the path form the site uses (`_`).
    expect(storedParams("basketball", { conference: "American" })).toEqual({
      conference: "American_Athletic",
    });
    expect(storedParams("basketball", { conference: "Big 12" })).toEqual({ conference: "Big 12" });
  });

  it("maps the teams query list", () => {
    expect(storedQueryValue("basketball", "teams", "Duke,UConn")).toBe("Duke,Connecticut");
    expect(storedQueryValue("basketball", "season", "2025-26")).toBe("2025-26");
  });

  it("maps POST bodies by key", () => {
    expect(
      storedRequestBody("basketball", {
        conference: "SoCon",
        selections: [{ winner: "UConn", loser: "American" }],
      }),
    ).toEqual({
      conference: "Southern",
      selections: [{ winner: "Connecticut", loser: "American" }],
    });
  });
});

describe("labelResponse", () => {
  const response = {
    conferences: ["Big 12", "Southern", "Metro Atlantic Athletic"],
    data: [
      { team_name: "Southern", conference: "Southwestern Athletic" },
      { team_name: "Wofford", team_conf: "Southern" },
      { team_name: "New Orleans", conference: "Southland", wins: 5 },
    ],
    by_team: { "New Orleans": { opponent: "Connecticut" } },
  };

  it("relabels values, list items and keys", () => {
    expect(labelResponse("basketball", response)).toEqual({
      conferences: ["Big 12", "SoCon", "MAAC"],
      data: [
        // Southern University stays; the Southern Conference becomes SoCon.
        { team_name: "Southern", conference: "SWAC" },
        { team_name: "Wofford", team_conf: "SoCon" },
        { team_name: "LSU New Orleans", conference: "Southland", wins: 5 },
      ],
      by_team: { "LSU New Orleans": { opponent: "UConn" } },
    });
  });

  it("leaves archived seasons unchanged", () => {
    expect(labelResponse("basketball", response, ARCHIVED)).toEqual(response);
  });
});

describe("team page paths", () => {
  it("uses the label on the current season and the stored name in archives", () => {
    expect(teamPagePath("basketball", "New Orleans")).toBe("/basketball/team/LSU%20New%20Orleans/");
    expect(teamPagePath("basketball", "LSU New Orleans")).toBe(
      "/basketball/team/LSU%20New%20Orleans/",
    );
    expect(teamPagePath("basketball", "New Orleans", ARCHIVED)).toBe(
      `/basketball/${ARCHIVED}/team/New%20Orleans/`,
    );
    expect(teamPagePath("basketball", "Duke")).toBe("/basketball/team/Duke/");
  });
});

describe("conference logos", () => {
  it("names the file after the stored name, from either name", () => {
    expect(conferenceLogoPath("MAAC")).toBe("/images/conf_logos/Metro_Atlantic_Athletic.png");
    expect(conferenceLogoPath("Mid-American")).toBe("/images/conf_logos/Mid_American.png");
    expect(conferenceLogoPath("MAC")).toBe("/images/conf_logos/Mid_American.png");
    expect(conferenceLogoPath("Big 12")).toBe("/images/conf_logos/Big_12.png");
  });

  it("lists every label for known-conference checks", () => {
    expect(conferenceLabels("basketball")).toEqual(
      expect.arrayContaining(["MAAC", "SoCon", "UAC", "ASUN"]),
    );
  });
});
