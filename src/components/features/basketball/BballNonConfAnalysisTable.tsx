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
type ColumnType = "power" | "nonpower" | "total";

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
        powerConfMinTWV: -1,
        powerConfMaxTWV: 1,
        nonpowerConfMinTWV: -1,
        nonpowerConfMaxTWV: 1,
        totalConfMinTWV: -1,
        totalConfMaxTWV: 1,
        powerTeamMinTWV: -1,
        powerTeamMaxTWV: 1,
        nonpowerTeamMinTWV: -1,
        nonpowerTeamMaxTWV: 1,
        totalTeamMinTWV: -1,
        totalTeamMaxTWV: 1,
        powerConfMinWinPct: 0,
        powerConfMaxWinPct: 100,
        nonpowerConfMinWinPct: 0,
        nonpowerConfMaxWinPct: 100,
        totalConfMinWinPct: 0,
        totalConfMaxWinPct: 100,
        powerTeamMinWinPct: 0,
        powerTeamMaxWinPct: 100,
        nonpowerTeamMinWinPct: 0,
        nonpowerTeamMaxWinPct: 100,
        totalTeamMinWinPct: 0,
        totalTeamMaxWinPct: 100,
      };
    }

    let powerConfMinTwv = Infinity;
    let powerConfMaxTwv = -Infinity;
    let nonpowerConfMinTwv = Infinity;
    let nonpowerConfMaxTwv = -Infinity;
    let totalConfMinTwv = Infinity;
    let totalConfMaxTwv = -Infinity;
    let powerTeamMinTwv = Infinity;
    let powerTeamMaxTwv = -Infinity;
    let nonpowerTeamMinTwv = Infinity;
    let nonpowerTeamMaxTwv = -Infinity;
    let totalTeamMinTwv = Infinity;
    let totalTeamMaxTwv = -Infinity;
    // eslint-disable-next-line prefer-const
    let powerConfMinWp = Infinity;
    // eslint-disable-next-line prefer-const
    let powerConfMaxWp = -Infinity;
    // eslint-disable-next-line prefer-const
    let nonpowerConfMinWp = Infinity;
    // eslint-disable-next-line prefer-const
    let nonpowerConfMaxWp = -Infinity;
    // eslint-disable-next-line prefer-const
    let totalConfMinWp = Infinity;
    // eslint-disable-next-line prefer-const
    let totalConfMaxWp = -Infinity;
    let powerTeamMinWp = Infinity;
    let powerTeamMaxWp = -Infinity;
    let nonpowerTeamMinWp = Infinity;
    let nonpowerTeamMaxWp = -Infinity;
    let totalTeamMinWp = Infinity;
    let totalTeamMaxWp = -Infinity;

    // Conference-level values (averaged by team count)
    tableData.forEach((conf: Conference) => {
      const teamCount = conf.teams?.length || 1;
      const powerTwvAvg = conf.power_twv / teamCount;
      const nonpowerTwvAvg = conf.nonpower_twv / teamCount;
      const totalTwvAvg = conf.total_twv / teamCount;

      powerConfMinTwv = Math.min(powerConfMinTwv, powerTwvAvg);
      powerConfMaxTwv = Math.max(powerConfMaxTwv, powerTwvAvg);
      nonpowerConfMinTwv = Math.min(nonpowerConfMinTwv, nonpowerTwvAvg);
      nonpowerConfMaxTwv = Math.max(nonpowerConfMaxTwv, nonpowerTwvAvg);
      totalConfMinTwv = Math.min(totalConfMinTwv, totalTwvAvg);
      totalConfMaxTwv = Math.max(totalConfMaxTwv, totalTwvAvg);

      powerConfMinWp = Math.min(powerConfMinWp, conf.power_win_pct);
      powerConfMaxWp = Math.max(powerConfMaxWp, conf.power_win_pct);
      nonpowerConfMinWp = Math.min(nonpowerConfMinWp, conf.nonpower_win_pct);
      nonpowerConfMaxWp = Math.max(nonpowerConfMaxWp, conf.nonpower_win_pct);
      totalConfMinWp = Math.min(totalConfMinWp, conf.total_win_pct);
      totalConfMaxWp = Math.max(totalConfMaxWp, conf.total_win_pct);

      // Team-level values
      if (conf.teams) {
        conf.teams.forEach((team: Team) => {
          powerTeamMinTwv = Math.min(powerTeamMinTwv, team.power_twv);
          powerTeamMaxTwv = Math.max(powerTeamMaxTwv, team.power_twv);
          nonpowerTeamMinTwv = Math.min(nonpowerTeamMinTwv, team.nonpower_twv);
          nonpowerTeamMaxTwv = Math.max(nonpowerTeamMaxTwv, team.nonpower_twv);
          totalTeamMinTwv = Math.min(totalTeamMinTwv, team.total_twv);
          totalTeamMaxTwv = Math.max(totalTeamMaxTwv, team.total_twv);

          powerTeamMinWp = Math.min(powerTeamMinWp, team.power_win_pct);
          powerTeamMaxWp = Math.max(powerTeamMaxWp, team.power_win_pct);
          nonpowerTeamMinWp = Math.min(
            nonpowerTeamMinWp,
            team.nonpower_win_pct
          );
          nonpowerTeamMaxWp = Math.max(
            nonpowerTeamMaxWp,
            team.nonpower_win_pct
          );
          totalTeamMinWp = Math.min(totalTeamMinWp, team.total_win_pct);
          totalTeamMaxWp = Math.max(totalTeamMaxWp, team.total_win_pct);
        });
      }
    });

    return {
      powerConfMinTWV: powerConfMinTwv === Infinity ? -1 : powerConfMinTwv,
      powerConfMaxTWV: powerConfMaxTwv === -Infinity ? 1 : powerConfMaxTwv,
      nonpowerConfMinTWV:
        nonpowerConfMinTwv === Infinity ? -1 : nonpowerConfMinTwv,
      nonpowerConfMaxTWV:
        nonpowerConfMaxTwv === -Infinity ? 1 : nonpowerConfMaxTwv,
      totalConfMinTWV: totalConfMinTwv === Infinity ? -1 : totalConfMinTwv,
      totalConfMaxTWV: totalConfMaxTwv === -Infinity ? 1 : totalConfMaxTwv,
      powerTeamMinTWV: powerTeamMinTwv === Infinity ? -1 : powerTeamMinTwv,
      powerTeamMaxTWV: powerTeamMaxTwv === -Infinity ? 1 : powerTeamMaxTwv,
      nonpowerTeamMinTWV:
        nonpowerTeamMinTwv === Infinity ? -1 : nonpowerTeamMinTwv,
      nonpowerTeamMaxTWV:
        nonpowerTeamMaxTwv === -Infinity ? 1 : nonpowerTeamMaxTwv,
      totalTeamMinTWV: totalTeamMinTwv === Infinity ? -1 : totalTeamMinTwv,
      totalTeamMaxTWV: totalTeamMaxTwv === -Infinity ? 1 : totalTeamMaxTwv,
      powerConfMinWinPct: powerConfMinWp === Infinity ? 0 : powerConfMinWp,
      powerConfMaxWinPct: powerConfMaxWp === -Infinity ? 100 : powerConfMaxWp,
      nonpowerConfMinWinPct:
        nonpowerConfMinWp === Infinity ? 0 : nonpowerConfMinWp,
      nonpowerConfMaxWinPct:
        nonpowerConfMaxWp === -Infinity ? 100 : nonpowerConfMaxWp,
      totalConfMinWinPct: totalConfMinWp === Infinity ? 0 : totalConfMinWp,
      totalConfMaxWinPct: totalConfMaxWp === -Infinity ? 100 : totalConfMaxWp,
      powerTeamMinWinPct: powerTeamMinWp === Infinity ? 0 : powerTeamMinWp,
      powerTeamMaxWinPct: powerTeamMaxWp === -Infinity ? 100 : powerTeamMaxWp,
      nonpowerTeamMinWinPct:
        nonpowerTeamMinWp === Infinity ? 0 : nonpowerTeamMinWp,
      nonpowerTeamMaxWinPct:
        nonpowerTeamMaxWp === -Infinity ? 100 : nonpowerTeamMaxWp,
      totalTeamMinWinPct: totalTeamMinWp === Infinity ? 0 : totalTeamMinWp,
      totalTeamMaxWinPct: totalTeamMaxWp === -Infinity ? 100 : totalTeamMaxWp,
    };
  }, [tableData]);

  const getTWVColor = useCallback(
    (
      value: number,
      isTeamRow: boolean = false,
      column: ColumnType = "power"
    ) => {
      const blue = [24, 98, 123];
      const white = [255, 255, 255];
      const yellow = [255, 230, 113];

      let minTWV: number;
      let maxTWV: number;

      if (isTeamRow) {
        if (column === "power") {
          minTWV = minMaxValues.powerTeamMinTWV;
          maxTWV = minMaxValues.powerTeamMaxTWV;
        } else if (column === "nonpower") {
          minTWV = minMaxValues.nonpowerTeamMinTWV;
          maxTWV = minMaxValues.nonpowerTeamMaxTWV;
        } else {
          minTWV = minMaxValues.totalTeamMinTWV;
          maxTWV = minMaxValues.totalTeamMaxTWV;
        }
      } else {
        if (column === "power") {
          minTWV = minMaxValues.powerConfMinTWV;
          maxTWV = minMaxValues.powerConfMaxTWV;
        } else if (column === "nonpower") {
          minTWV = minMaxValues.nonpowerConfMinTWV;
          maxTWV = minMaxValues.nonpowerConfMaxTWV;
        } else {
          minTWV = minMaxValues.totalConfMinTWV;
          maxTWV = minMaxValues.totalConfMaxTWV;
        }
      }

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
    [minMaxValues]
  );

  const getWinPctColor = useCallback(
    (
      value: number,
      isTeamRow: boolean = false,
      column: ColumnType = "power"
    ) => {
      const blue = [24, 98, 123];
      const white = [255, 255, 255];
      const yellow = [255, 230, 113];

      let minWp: number;
      let maxWp: number;

      if (isTeamRow) {
        if (column === "power") {
          minWp = minMaxValues.powerTeamMinWinPct;
          maxWp = minMaxValues.powerTeamMaxWinPct;
        } else if (column === "nonpower") {
          minWp = minMaxValues.nonpowerTeamMinWinPct;
          maxWp = minMaxValues.nonpowerTeamMaxWinPct;
        } else {
          minWp = minMaxValues.totalTeamMinWinPct;
          maxWp = minMaxValues.totalTeamMaxWinPct;
        }
      } else {
        if (column === "power") {
          minWp = minMaxValues.powerConfMinWinPct;
          maxWp = minMaxValues.powerConfMaxWinPct;
        } else if (column === "nonpower") {
          minWp = minMaxValues.nonpowerConfMinWinPct;
          maxWp = minMaxValues.nonpowerConfMaxWinPct;
        } else {
          minWp = minMaxValues.totalConfMinWinPct;
          maxWp = minMaxValues.totalConfMaxWinPct;
        }
      }

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
    [minMaxValues]
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
        return conf.power_twv / (conf.teams?.length || 1);
      case "nonpower_record":
        return parseRecord(conf.nonpower_record);
      case "nonpower_win_pct":
        return conf.nonpower_win_pct;
      case "nonpower_exp_win_pct":
        return calculateExpectedWinPct(conf.nonpower_record, conf.nonpower_twv);
      case "nonpower_twv":
        return conf.nonpower_twv / (conf.teams?.length || 1);
      case "total_record":
        return parseRecord(conf.total_record);
      case "total_win_pct":
        return conf.total_win_pct;
      case "total_exp_win_pct":
        return calculateExpectedWinPct(conf.total_record, conf.total_twv);
      case "total_twv":
        return conf.total_twv / (conf.teams?.length || 1);
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
                      ...getWinPctColor(row.power_win_pct, false, "power"),
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
                      ...getTWVColor(
                        row.power_twv / (row.teams?.length || 1),
                        false,
                        "power"
                      ),
                    }}
                  >
                    {(() => {
                      const value = row.power_twv / (row.teams?.length || 1);
                      console.log("Power Conf TWV Debug:", {
                        conference: row.team_conf,
                        rawValue: row.power_twv,
                        teamCount: row.teams?.length || 1,
                        averagedValue: value,
                        minTWV: minMaxValues.powerConfMinTWV,
                        maxTWV: minMaxValues.powerConfMaxTWV,
                      });
                      return null;
                    })()}
                    {row.power_twv / (row.teams?.length || 1) > 0 ? "+" : ""}
                    {(row.power_twv / (row.teams?.length || 1)).toFixed(2)}
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
                      ...getWinPctColor(
                        row.nonpower_win_pct,
                        false,
                        "nonpower"
                      ),
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
                      ...getTWVColor(
                        row.nonpower_twv / (row.teams?.length || 1),
                        false,
                        "nonpower"
                      ),
                    }}
                  >
                    {row.nonpower_twv / (row.teams?.length || 1) > 0 ? "+" : ""}
                    {(row.nonpower_twv / (row.teams?.length || 1)).toFixed(2)}
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
                      ...getWinPctColor(row.total_win_pct, false, "total"),
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
                      ...getTWVColor(
                        row.total_twv / (row.teams?.length || 1),
                        false,
                        "total"
                      ),
                    }}
                  >
                    {row.total_twv / (row.teams?.length || 1) > 0 ? "+" : ""}
                    {(row.total_twv / (row.teams?.length || 1)).toFixed(2)}
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
                            ...getWinPctColor(
                              team.power_win_pct,
                              true,
                              "power"
                            ),
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
                            ...getTWVColor(team.power_twv, true, "power"),
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
                            ...getWinPctColor(
                              team.nonpower_win_pct,
                              true,
                              "nonpower"
                            ),
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
                            ...getTWVColor(team.nonpower_twv, true, "nonpower"),
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
                            ...getWinPctColor(
                              team.total_win_pct,
                              true,
                              "total"
                            ),
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
                            ...getTWVColor(team.total_twv, true, "total"),
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
