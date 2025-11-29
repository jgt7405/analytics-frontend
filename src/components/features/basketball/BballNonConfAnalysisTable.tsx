"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useBasketballConfData } from "@/hooks/useBasketballConfData";
import { useResponsive } from "@/hooks/useResponsive";
import { ChevronDown, ChevronRight } from "lucide-react";
import Image from "next/image";
import { memo, useCallback, useMemo, useState } from "react";

interface Team {
  team_name: string;
  team_id?: string;
  logo_url?: string;
  power_record: string;
  power_win_pct: number;
  power_twv: number;
  nonpower_record: string;
  nonpower_win_pct: number;
  nonpower_twv: number;
  total_record: string;
  total_win_pct: number;
  total_twv: number;
}

interface Conference {
  team_conf: string;
  conf_logo_url: string;
  conf_primary_color: string;
  conf_secondary_color: string;
  teams: Team[];
  power_record: string;
  power_win_pct: number;
  power_twv: number;
  nonpower_record: string;
  nonpower_win_pct: number;
  nonpower_twv: number;
  total_record: string;
  total_win_pct: number;
  total_twv: number;
}

interface NonconfResponse {
  data: Conference[];
}

interface BasketballConfDataResponseWithNonconf {
  nonconfData?: NonconfResponse;
}

interface BballNonConfAnalysisTableProps {
  className?: string;
}

type SortField =
  | "team_name"
  | "power_record"
  | "power_win_pct"
  | "power_exp_win_pct"
  | "power_twv"
  | "nonpower_record"
  | "nonpower_win_pct"
  | "nonpower_exp_win_pct"
  | "nonpower_twv"
  | "total_record"
  | "total_win_pct"
  | "total_exp_win_pct"
  | "total_twv";
type SortOrder = "asc" | "desc";

function BballNonConfAnalysisTable({
  className: _className = "",
}: BballNonConfAnalysisTableProps) {
  const { isMobile } = useResponsive();
  const { data, isLoading, error } = useBasketballConfData();
  const [expandedConferences, setExpandedConferences] = useState<Set<string>>(
    new Set()
  );
  const [sortField, setSortField] = useState<SortField>("total_twv");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const tableData = useMemo(() => {
    const response = data as BasketballConfDataResponseWithNonconf | undefined;
    return response?.nonconfData?.data || [];
  }, [data]);

  const minMaxValues = useMemo(() => {
    if (tableData.length === 0) {
      return {
        confMinTWV: -1,
        confMaxTWV: 1,
        teamMinTWV: -1,
        teamMaxTWV: 1,
        confMinWinPct: 0,
        confMaxWinPct: 100,
        teamMinWinPct: 0,
        teamMaxWinPct: 100,
      };
    }

    let confMinTwv = Infinity;
    let confMaxTwv = -Infinity;
    let teamMinTwv = Infinity;
    let teamMaxTwv = -Infinity;
    let confMinWp = Infinity;
    let confMaxWp = -Infinity;
    let teamMinWp = Infinity;
    let teamMaxWp = -Infinity;

    // Conference-level values
    tableData.forEach((conf: Conference) => {
      [conf.power_twv, conf.nonpower_twv, conf.total_twv].forEach((v) => {
        confMinTwv = Math.min(confMinTwv, v);
        confMaxTwv = Math.max(confMaxTwv, v);
      });
      [conf.power_win_pct, conf.nonpower_win_pct, conf.total_win_pct].forEach(
        (v) => {
          confMinWp = Math.min(confMinWp, v);
          confMaxWp = Math.max(confMaxWp, v);
        }
      );

      // Team-level values
      if (conf.teams) {
        conf.teams.forEach((team: Team) => {
          [team.power_twv, team.nonpower_twv, team.total_twv].forEach((v) => {
            teamMinTwv = Math.min(teamMinTwv, v);
            teamMaxTwv = Math.max(teamMaxTwv, v);
          });
          [
            team.power_win_pct,
            team.nonpower_win_pct,
            team.total_win_pct,
          ].forEach((v) => {
            teamMinWp = Math.min(teamMinWp, v);
            teamMaxWp = Math.max(teamMaxWp, v);
          });
        });
      }
    });

    return {
      confMinTWV: Math.min(confMinTwv, -1),
      confMaxTWV: Math.max(confMaxTwv, 1),
      teamMinTWV: Math.min(teamMinTwv, -1),
      teamMaxTWV: Math.max(teamMaxTwv, 1),
      confMinWinPct: Math.min(confMinWp, 0),
      confMaxWinPct: Math.max(confMaxWp, 100),
      teamMinWinPct: Math.min(teamMinWp, 0),
      teamMaxWinPct: Math.max(teamMaxWp, 100),
    };
  }, [tableData]);

  const getTWVColor = useCallback(
    (value: number, isTeamRow: boolean = false) => {
      const blue = [24, 98, 123];
      const white = [255, 255, 255];
      const yellow = [255, 230, 113];

      const minTWV = isTeamRow
        ? minMaxValues.teamMinTWV
        : minMaxValues.confMinTWV;
      const maxTWV = isTeamRow
        ? minMaxValues.teamMaxTWV
        : minMaxValues.confMaxTWV;

      let r: number, g: number, b: number;

      if (value > 0) {
        const ratio = Math.min(Math.abs(value / maxTWV), 1);
        r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
        g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
        b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
      } else if (value < 0) {
        const ratio = Math.min(Math.abs(value / minTWV), 1);
        r = Math.round(white[0] + (yellow[0] - white[0]) * ratio);
        g = Math.round(white[1] + (yellow[1] - white[1]) * ratio);
        b = Math.round(white[2] + (yellow[2] - white[2]) * ratio);
      } else {
        [r, g, b] = white;
      }

      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const textColor = brightness > 140 ? "#000000" : "#ffffff";

      return {
        backgroundColor: `rgb(${r}, ${g}, ${b})`,
        color: textColor,
      };
    },
    [
      minMaxValues.confMinTWV,
      minMaxValues.confMaxTWV,
      minMaxValues.teamMinTWV,
      minMaxValues.teamMaxTWV,
    ]
  );

  const getWinPctColor = useCallback(
    (value: number, isTeamRow: boolean = false) => {
      const blue = [24, 98, 123];
      const white = [255, 255, 255];
      const yellow = [255, 230, 113];

      const minWp = isTeamRow
        ? minMaxValues.teamMinWinPct
        : minMaxValues.confMinWinPct;
      const maxWp = isTeamRow
        ? minMaxValues.teamMaxWinPct
        : minMaxValues.confMaxWinPct;

      const normalized = (value - minWp) / (maxWp - minWp);

      let r: number, g: number, b: number;

      if (normalized > 0.5) {
        const ratio = (normalized - 0.5) * 2;
        r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
        g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
        b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
      } else {
        const ratio = normalized * 2;
        r = Math.round(yellow[0] + (white[0] - yellow[0]) * ratio);
        g = Math.round(yellow[1] + (white[1] - yellow[1]) * ratio);
        b = Math.round(yellow[2] + (white[2] - yellow[2]) * ratio);
      }

      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const textColor = brightness > 140 ? "#000000" : "#ffffff";

      return {
        backgroundColor: `rgb(${r}, ${g}, ${b})`,
        color: textColor,
      };
    },
    [
      minMaxValues.confMinWinPct,
      minMaxValues.confMaxWinPct,
      minMaxValues.teamMinWinPct,
      minMaxValues.teamMaxWinPct,
    ]
  );

  const calculateExpectedWinPct = (
    record: string,
    twvValue: number
  ): number => {
    const parts = record.split("-");
    const wins = parseInt(parts[0], 10) || 0;
    const losses = parseInt(parts[1], 10) || 0;
    const totalGames = wins + losses;

    const expectedWins = wins - twvValue;

    return totalGames > 0 ? (expectedWins / totalGames) * 100 : 0;
  };

  if (isLoading) {
    return (
      <div style={{ padding: "32px", textAlign: "center" }}>Loading...</div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "#ef4444" }}>
        Error: {error.message}
      </div>
    );
  }

  if (!tableData || tableData.length === 0) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af" }}>
        No non-conference data available
      </div>
    );
  }

  const toggleConference = (conference: string) => {
    const newExpanded = new Set(expandedConferences);
    if (newExpanded.has(conference)) {
      newExpanded.delete(conference);
    } else {
      newExpanded.add(conference);
    }
    setExpandedConferences(newExpanded);
  };

  const parseRecord = (record: string): number => {
    const parts = record.split("-");
    return parseInt(parts[0], 10) || 0;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === "desc" ? " ↓" : " ↑";
  };

  const getConferenceSortValue = (
    conf: Conference,
    field: SortField
  ): number => {
    switch (field) {
      case "power_record":
        return parseRecord(conf.power_record);
      case "power_win_pct":
        return conf.power_win_pct;
      case "power_exp_win_pct":
        return calculateExpectedWinPct(conf.power_record, conf.power_twv);
      case "power_twv":
        return conf.power_twv;
      case "nonpower_record":
        return parseRecord(conf.nonpower_record);
      case "nonpower_win_pct":
        return conf.nonpower_win_pct;
      case "nonpower_exp_win_pct":
        return calculateExpectedWinPct(conf.nonpower_record, conf.nonpower_twv);
      case "nonpower_twv":
        return conf.nonpower_twv;
      case "total_record":
        return parseRecord(conf.total_record);
      case "total_win_pct":
        return conf.total_win_pct;
      case "total_exp_win_pct":
        return calculateExpectedWinPct(conf.total_record, conf.total_twv);
      case "total_twv":
        return conf.total_twv;
      default:
        return 0;
    }
  };

  const getTeamSortValue = (team: Team, field: SortField): number | string => {
    switch (field) {
      case "team_name":
        return team.team_name.toLowerCase();
      case "power_record":
        return parseRecord(team.power_record);
      case "power_win_pct":
        return team.power_win_pct;
      case "power_exp_win_pct":
        return calculateExpectedWinPct(team.power_record, team.power_twv);
      case "power_twv":
        return team.power_twv;
      case "nonpower_record":
        return parseRecord(team.nonpower_record);
      case "nonpower_win_pct":
        return team.nonpower_win_pct;
      case "nonpower_exp_win_pct":
        return calculateExpectedWinPct(team.nonpower_record, team.nonpower_twv);
      case "nonpower_twv":
        return team.nonpower_twv;
      case "total_record":
        return parseRecord(team.total_record);
      case "total_win_pct":
        return team.total_win_pct;
      case "total_exp_win_pct":
        return calculateExpectedWinPct(team.total_record, team.total_twv);
      case "total_twv":
        return team.total_twv;
      default:
        return 0;
    }
  };

  const sortConferences = (conferences: Conference[]) => {
    const sorted = [...conferences];
    sorted.sort((a, b) => {
      const aVal = getConferenceSortValue(a, sortField);
      const bVal = getConferenceSortValue(b, sortField);

      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  };

  const sortTeams = (teams: Team[]) => {
    const sorted = [...teams];
    sorted.sort((a, b) => {
      const aVal = getTeamSortValue(a, sortField);
      const bVal = getTeamSortValue(b, sortField);

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const aNum = typeof aVal === "number" ? aVal : 0;
      const bNum = typeof bVal === "number" ? bVal : 0;
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
    });
    return sorted;
  };

  const expandColWidth = isMobile ? 32 : 32;
  const confColWidth = isMobile ? 50 : 200;
  const dataColWidth = isMobile ? 50 : 70;
  const cellHeight = isMobile ? 32 : 36;
  const headerHeight = isMobile ? 40 : 48;

  return (
    <div style={{ marginBottom: "12px" }}>
      {/* Table Container */}
      <div
        style={{
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: "80vh",
          position: "relative",
          backgroundColor: "#ffffff",
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            width: "max-content",
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr key="header-row-1">
              <th
                key="expand-col-1"
                style={{
                  width: expandColWidth,
                  minWidth: expandColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: -1,
                  left: -1,
                  zIndex: 32,
                  overflow: "hidden",
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  boxShadow: "inset -2px -2px 0 0 #e5e7eb",
                }}
              ></th>
              <th
                key="conf-col-1"
                style={{
                  width: confColWidth,
                  minWidth: confColWidth,
                  height: headerHeight,
                  position: "sticky",
                  top: -1,
                  left: expandColWidth - 1,
                  zIndex: 32,
                  overflow: "hidden",
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  boxShadow: "inset -2px 0 0 0 #e5e7eb",
                  fontSize: isMobile ? "0.75rem" : "0.875rem",
                  fontWeight: 400,
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "8px",
                }}
              >
                {!isMobile && "Conference"}
              </th>
              <th
                key="power-col-1"
                colSpan={4}
                style={{
                  position: "sticky",
                  top: -1,
                  zIndex: 31,
                  overflow: "hidden",
                  height: headerHeight,
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: isMobile ? "0.75rem" : "0.875rem",
                  fontWeight: 400,
                  textAlign: "center",
                  verticalAlign: "middle",
                }}
              >
                Power Conf Opponents
              </th>
              <th
                key="nonpower-col-1"
                colSpan={4}
                style={{
                  position: "sticky",
                  top: -1,
                  zIndex: 31,
                  overflow: "hidden",
                  height: headerHeight,
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: isMobile ? "0.75rem" : "0.875rem",
                  fontWeight: 400,
                  textAlign: "center",
                  verticalAlign: "middle",
                }}
              >
                Non-Power Conf Opponents
              </th>
              <th
                key="total-col-1"
                colSpan={4}
                style={{
                  position: "sticky",
                  top: -1,
                  zIndex: 31,
                  overflow: "hidden",
                  height: headerHeight,
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: isMobile ? "0.75rem" : "0.875rem",
                  fontWeight: 400,
                  textAlign: "center",
                  verticalAlign: "middle",
                }}
              >
                Total Non-Conference
              </th>
            </tr>
            <tr key="header-row-2">
              <th
                key="expand-col-2"
                style={{
                  width: expandColWidth,
                  minWidth: expandColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  left: -1,
                  zIndex: 32,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  boxShadow: "inset -2px 0 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                }}
              ></th>
              <th
                key="conf-col-2"
                style={{
                  width: confColWidth,
                  minWidth: confColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  left: expandColWidth - 1,
                  zIndex: 32,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderTop: "none",
                  boxShadow: "inset -2px 0 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                }}
              ></th>
              <th
                key="power-record-2"
                style={{
                  width: dataColWidth,
                  minWidth: dataColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  zIndex: 31,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderTop: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                  color: "#4b5563",
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "2px",
                  cursor: "pointer",
                }}
                onClick={() => handleSort("power_record")}
              >
                Record{getSortIndicator("power_record")}
              </th>
              <th
                key="power-winpct-2"
                style={{
                  width: dataColWidth,
                  minWidth: dataColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  zIndex: 31,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderTop: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                  color: "#4b5563",
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "2px",
                  cursor: "pointer",
                }}
                onClick={() => handleSort("power_win_pct")}
              >
                Win %{getSortIndicator("power_win_pct")}
              </th>
              <th
                key="power-expwin-2"
                style={{
                  width: dataColWidth,
                  minWidth: dataColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  zIndex: 31,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderTop: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                  color: "#4b5563",
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "2px",
                  cursor: "pointer",
                }}
                onClick={() => handleSort("power_exp_win_pct")}
              >
                Exp Win %{getSortIndicator("power_exp_win_pct")}
              </th>
              <th
                key="power-twv-2"
                style={{
                  width: dataColWidth,
                  minWidth: dataColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  zIndex: 31,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderTop: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                  color: "#4b5563",
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "2px",
                  cursor: "pointer",
                }}
                onClick={() => handleSort("power_twv")}
              >
                TWV{getSortIndicator("power_twv")}
              </th>
              <th
                key="nonpower-record-2"
                style={{
                  width: dataColWidth,
                  minWidth: dataColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  zIndex: 31,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderTop: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                  color: "#4b5563",
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "2px",
                  cursor: "pointer",
                }}
                onClick={() => handleSort("nonpower_record")}
              >
                Record{getSortIndicator("nonpower_record")}
              </th>
              <th
                key="nonpower-winpct-2"
                style={{
                  width: dataColWidth,
                  minWidth: dataColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  zIndex: 31,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderTop: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                  color: "#4b5563",
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "2px",
                  cursor: "pointer",
                }}
                onClick={() => handleSort("nonpower_win_pct")}
              >
                Win %{getSortIndicator("nonpower_win_pct")}
              </th>
              <th
                key="nonpower-expwin-2"
                style={{
                  width: dataColWidth,
                  minWidth: dataColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  zIndex: 31,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderTop: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                  color: "#4b5563",
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "2px",
                  cursor: "pointer",
                }}
                onClick={() => handleSort("nonpower_exp_win_pct")}
              >
                Exp Win %{getSortIndicator("nonpower_exp_win_pct")}
              </th>
              <th
                key="nonpower-twv-2"
                style={{
                  width: dataColWidth,
                  minWidth: dataColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  zIndex: 31,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderTop: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                  color: "#4b5563",
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "2px",
                  cursor: "pointer",
                }}
                onClick={() => handleSort("nonpower_twv")}
              >
                TWV{getSortIndicator("nonpower_twv")}
              </th>
              <th
                key="total-record-2"
                style={{
                  width: dataColWidth,
                  minWidth: dataColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  zIndex: 31,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderTop: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                  color: "#4b5563",
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "2px",
                  cursor: "pointer",
                }}
                onClick={() => handleSort("total_record")}
              >
                Record{getSortIndicator("total_record")}
              </th>
              <th
                key="total-winpct-2"
                style={{
                  width: dataColWidth,
                  minWidth: dataColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  zIndex: 31,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderTop: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                  color: "#4b5563",
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "2px",
                  cursor: "pointer",
                }}
                onClick={() => handleSort("total_win_pct")}
              >
                Win %{getSortIndicator("total_win_pct")}
              </th>
              <th
                key="total-expwin-2"
                style={{
                  width: dataColWidth,
                  minWidth: dataColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  zIndex: 31,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderTop: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                  color: "#4b5563",
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "2px",
                  cursor: "pointer",
                }}
                onClick={() => handleSort("total_exp_win_pct")}
              >
                Exp Win %{getSortIndicator("total_exp_win_pct")}
              </th>
              <th
                key="total-twv-2"
                style={{
                  width: dataColWidth,
                  minWidth: dataColWidth,
                  height: headerHeight * 0.65,
                  position: "sticky",
                  top: headerHeight - 4,
                  zIndex: 31,
                  overflow: "hidden",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderLeft: "none",
                  borderTop: "none",
                  boxShadow: "inset 0 -2px 0 0 #e5e7eb",
                  fontSize: "0.7rem",
                  fontWeight: 400,
                  color: "#4b5563",
                  textAlign: "center",
                  verticalAlign: "middle",
                  padding: "2px",
                  cursor: "pointer",
                }}
                onClick={() => handleSort("total_twv")}
              >
                TWV{getSortIndicator("total_twv")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortConferences(tableData).map((row: Conference) => {
              const isExpanded = expandedConferences.has(row.team_conf);
              const hasTeams = row.teams && row.teams.length > 0;
              const sortedTeams = hasTeams ? sortTeams(row.teams) : [];
              return [
                // Conference Row
                <tr
                  key={`conf-${row.team_conf}`}
                  style={{
                    backgroundColor: "#ffffff",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  {/* Expand Carrot */}
                  <td
                    style={{
                      width: expandColWidth,
                      minWidth: expandColWidth,
                      height: cellHeight,
                      position: "sticky",
                      left: 0,
                      zIndex: 21,
                      overflow: "hidden",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      boxShadow: "inset -2px 0 0 0 #e5e7eb",
                      textAlign: "center",
                      verticalAlign: "middle",
                      cursor: "pointer",
                    }}
                    onClick={() => toggleConference(row.team_conf)}
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </td>

                  {/* Conference Logo with Name */}
                  <td
                    style={{
                      width: confColWidth,
                      minWidth: confColWidth,
                      height: cellHeight,
                      position: "sticky",
                      left: expandColWidth,
                      zIndex: 21,
                      overflow: "hidden",
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      boxShadow: "inset -2px 0 0 0 #e5e7eb",
                      paddingLeft: isMobile ? "4px" : "8px",
                      paddingRight: "4px",
                      textAlign: "left",
                      verticalAlign: "middle",
                      fontSize: isMobile ? "0.75rem" : "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {row.conf_logo_url && (
                      <Image
                        src={row.conf_logo_url}
                        alt={row.team_conf}
                        width={isMobile ? 24 : 32}
                        height={isMobile ? 16 : 20}
                        style={{
                          maxWidth: "100%",
                          height: "auto",
                          objectFit: "contain",
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          console.warn(
                            `Failed to load conference logo: ${row.conf_logo_url}`
                          );
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    {!isMobile && (
                      <span
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {row.team_conf}
                      </span>
                    )}
                  </td>

                  {/* POWER SECTION */}
                  <td
                    style={{
                      width: dataColWidth,
                      minWidth: dataColWidth,
                      height: cellHeight,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      textAlign: "center",
                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                      verticalAlign: "middle",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {row.power_record}
                  </td>
                  <td
                    style={{
                      width: dataColWidth,
                      minWidth: dataColWidth,
                      height: cellHeight,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      textAlign: "center",
                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                      verticalAlign: "middle",
                      ...getWinPctColor(row.power_win_pct, false),
                    }}
                  >
                    {Math.round(row.power_win_pct)}%
                  </td>
                  <td
                    style={{
                      width: dataColWidth,
                      minWidth: dataColWidth,
                      height: cellHeight,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      textAlign: "center",
                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                      verticalAlign: "middle",
                      backgroundColor: "#ffffff",
                      color: "#111827",
                    }}
                  >
                    {Math.round(
                      calculateExpectedWinPct(row.power_record, row.power_twv)
                    )}
                    %
                  </td>
                  <td
                    style={{
                      width: dataColWidth,
                      minWidth: dataColWidth,
                      height: cellHeight,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      textAlign: "center",
                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                      verticalAlign: "middle",
                      ...getTWVColor(row.power_twv, false),
                    }}
                  >
                    {row.power_twv > 0 ? "+" : ""}
                    {row.power_twv.toFixed(2)}
                  </td>
                  {/* NONPOWER SECTION */}
                  <td
                    style={{
                      width: dataColWidth,
                      minWidth: dataColWidth,
                      height: cellHeight,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      textAlign: "center",
                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                      verticalAlign: "middle",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {row.nonpower_record}
                  </td>
                  <td
                    style={{
                      width: dataColWidth,
                      minWidth: dataColWidth,
                      height: cellHeight,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      textAlign: "center",
                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                      verticalAlign: "middle",
                      ...getWinPctColor(row.nonpower_win_pct, false),
                    }}
                  >
                    {Math.round(row.nonpower_win_pct)}%
                  </td>
                  <td
                    style={{
                      width: dataColWidth,
                      minWidth: dataColWidth,
                      height: cellHeight,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      textAlign: "center",
                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                      verticalAlign: "middle",
                      backgroundColor: "#ffffff",
                      color: "#111827",
                    }}
                  >
                    {Math.round(
                      calculateExpectedWinPct(
                        row.nonpower_record,
                        row.nonpower_twv
                      )
                    )}
                    %
                  </td>
                  <td
                    style={{
                      width: dataColWidth,
                      minWidth: dataColWidth,
                      height: cellHeight,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      textAlign: "center",
                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                      verticalAlign: "middle",
                      ...getTWVColor(row.nonpower_twv, false),
                    }}
                  >
                    {row.nonpower_twv > 0 ? "+" : ""}
                    {row.nonpower_twv.toFixed(2)}
                  </td>

                  {/* TOTAL SECTION */}
                  <td
                    style={{
                      width: dataColWidth,
                      minWidth: dataColWidth,
                      height: cellHeight,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      textAlign: "center",
                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                      verticalAlign: "middle",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {row.total_record}
                  </td>
                  <td
                    style={{
                      width: dataColWidth,
                      minWidth: dataColWidth,
                      height: cellHeight,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      textAlign: "center",
                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                      verticalAlign: "middle",
                      ...getWinPctColor(row.total_win_pct, false),
                    }}
                  >
                    {Math.round(row.total_win_pct)}%
                  </td>
                  <td
                    style={{
                      width: dataColWidth,
                      minWidth: dataColWidth,
                      height: cellHeight,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      textAlign: "center",
                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                      verticalAlign: "middle",
                      backgroundColor: "#ffffff",
                      color: "#111827",
                    }}
                  >
                    {Math.round(
                      calculateExpectedWinPct(row.total_record, row.total_twv)
                    )}
                    %
                  </td>
                  <td
                    style={{
                      width: dataColWidth,
                      minWidth: dataColWidth,
                      height: cellHeight,
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderLeft: "none",
                      textAlign: "center",
                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                      verticalAlign: "middle",
                      ...getTWVColor(row.total_twv, false),
                    }}
                  >
                    {row.total_twv > 0 ? "+" : ""}
                    {row.total_twv.toFixed(2)}
                  </td>
                </tr>,

                // Team Rows
                ...(isExpanded && hasTeams
                  ? sortedTeams.map((team) => (
                      <tr
                        key={`team-${row.team_conf}-${team.team_name}`}
                        style={{
                          backgroundColor: "#ffffff",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <td
                          style={{
                            width: expandColWidth,
                            minWidth: expandColWidth,
                            height: cellHeight,
                            position: "sticky",
                            left: 0,
                            zIndex: 20,
                            overflow: "hidden",
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderRight: "2px solid #e5e7eb",
                          }}
                        ></td>
                        <td
                          style={{
                            width: confColWidth,
                            minWidth: confColWidth,
                            height: cellHeight,
                            position: "sticky",
                            left: expandColWidth,
                            zIndex: 20,
                            overflow: "hidden",
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            borderRight: "2px solid #e5e7eb",
                            paddingLeft: isMobile ? "4px" : "28px",
                            paddingRight: "4px",
                            textAlign: "left",
                            verticalAlign: "middle",
                            fontSize: isMobile ? "0.75rem" : "0.875rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {team.logo_url && (
                            <TeamLogo
                              logoUrl={team.logo_url}
                              teamName={team.team_name}
                              size={isMobile ? 16 : 20}
                            />
                          )}
                          {!isMobile && (
                            <span
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {team.team_name}
                            </span>
                          )}
                        </td>

                        {/* POWER */}
                        <td
                          style={{
                            width: dataColWidth,
                            minWidth: dataColWidth,
                            height: cellHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            textAlign: "center",
                            fontSize: isMobile ? "0.65rem" : "0.75rem",
                            color: "#6b7280",
                            verticalAlign: "middle",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          {team.power_record}
                        </td>
                        <td
                          style={{
                            width: dataColWidth,
                            minWidth: dataColWidth,
                            height: cellHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            textAlign: "center",
                            fontSize: isMobile ? "0.65rem" : "0.75rem",
                            verticalAlign: "middle",
                            ...getWinPctColor(team.power_win_pct, true),
                          }}
                        >
                          {Math.round(team.power_win_pct)}%
                        </td>
                        <td
                          style={{
                            width: dataColWidth,
                            minWidth: dataColWidth,
                            height: cellHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            textAlign: "center",
                            fontSize: isMobile ? "0.65rem" : "0.75rem",
                            verticalAlign: "middle",
                            backgroundColor: "#ffffff",
                            color: "#111827",
                          }}
                        >
                          {Math.round(
                            calculateExpectedWinPct(
                              team.power_record,
                              team.power_twv
                            )
                          )}
                          %
                        </td>
                        <td
                          style={{
                            width: dataColWidth,
                            minWidth: dataColWidth,
                            height: cellHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            textAlign: "center",
                            fontSize: isMobile ? "0.65rem" : "0.75rem",
                            verticalAlign: "middle",
                            ...getTWVColor(team.power_twv, true),
                          }}
                        >
                          {team.power_twv > 0 ? "+" : ""}
                          {team.power_twv.toFixed(2)}
                        </td>
                        {/* NONPOWER */}
                        <td
                          style={{
                            width: dataColWidth,
                            minWidth: dataColWidth,
                            height: cellHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            textAlign: "center",
                            fontSize: isMobile ? "0.65rem" : "0.75rem",
                            color: "#6b7280",
                            verticalAlign: "middle",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          {team.nonpower_record}
                        </td>
                        <td
                          style={{
                            width: dataColWidth,
                            minWidth: dataColWidth,
                            height: cellHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            textAlign: "center",
                            fontSize: isMobile ? "0.65rem" : "0.75rem",
                            verticalAlign: "middle",
                            ...getWinPctColor(team.nonpower_win_pct, true),
                          }}
                        >
                          {Math.round(team.nonpower_win_pct)}%
                        </td>
                        <td
                          style={{
                            width: dataColWidth,
                            minWidth: dataColWidth,
                            height: cellHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            textAlign: "center",
                            fontSize: isMobile ? "0.65rem" : "0.75rem",
                            verticalAlign: "middle",
                            backgroundColor: "#ffffff",
                            color: "#111827",
                          }}
                        >
                          {Math.round(
                            calculateExpectedWinPct(
                              team.nonpower_record,
                              team.nonpower_twv
                            )
                          )}
                          %
                        </td>
                        <td
                          style={{
                            width: dataColWidth,
                            minWidth: dataColWidth,
                            height: cellHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            textAlign: "center",
                            fontSize: isMobile ? "0.65rem" : "0.75rem",
                            verticalAlign: "middle",
                            ...getTWVColor(team.nonpower_twv, true),
                          }}
                        >
                          {team.nonpower_twv > 0 ? "+" : ""}
                          {team.nonpower_twv.toFixed(2)}
                        </td>

                        {/* TOTAL */}
                        <td
                          style={{
                            width: dataColWidth,
                            minWidth: dataColWidth,
                            height: cellHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            textAlign: "center",
                            fontSize: isMobile ? "0.65rem" : "0.75rem",
                            color: "#6b7280",
                            verticalAlign: "middle",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          {team.total_record}
                        </td>
                        <td
                          style={{
                            width: dataColWidth,
                            minWidth: dataColWidth,
                            height: cellHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            textAlign: "center",
                            fontSize: isMobile ? "0.65rem" : "0.75rem",
                            verticalAlign: "middle",
                            ...getWinPctColor(team.total_win_pct, true),
                          }}
                        >
                          {Math.round(team.total_win_pct)}%
                        </td>
                        <td
                          style={{
                            width: dataColWidth,
                            minWidth: dataColWidth,
                            height: cellHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            textAlign: "center",
                            fontSize: isMobile ? "0.65rem" : "0.75rem",
                            verticalAlign: "middle",
                            backgroundColor: "#ffffff",
                            color: "#111827",
                          }}
                        >
                          {Math.round(
                            calculateExpectedWinPct(
                              team.total_record,
                              team.total_twv
                            )
                          )}
                          %
                        </td>
                        <td
                          style={{
                            width: dataColWidth,
                            minWidth: dataColWidth,
                            height: cellHeight,
                            border: "1px solid #e5e7eb",
                            borderTop: "none",
                            borderLeft: "none",
                            textAlign: "center",
                            fontSize: isMobile ? "0.65rem" : "0.75rem",
                            verticalAlign: "middle",
                            ...getTWVColor(team.total_twv, true),
                          }}
                        >
                          {team.total_twv > 0 ? "+" : ""}
                          {team.total_twv.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default memo(BballNonConfAnalysisTable);
