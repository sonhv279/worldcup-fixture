import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const outputPath = path.join(dataDir, "worldcup-2026.json");
const browserOutputPath = path.join(dataDir, "worldcup-2026.js");

const API_BASE = "https://api.fifa.com/api/v3";
const ID_COMPETITION = "17";
const ID_SEASON = "285023";
const TIMEZONE = "Asia/Ho_Chi_Minh";
const SOURCE_URL = `${API_BASE}/calendar/matches?idSeason=${ID_SEASON}&language=en&count=200`;

const statusLabels = {
  0: "Kết thúc",
  1: "Sắp diễn ra",
  2: "Trước trận",
  3: "Hiệp 1",
  4: "Nghỉ giữa hiệp",
  5: "Hiệp 2",
  6: "Hiệp phụ",
  7: "Hiệp phụ 1",
  8: "Nghỉ hiệp phụ",
  9: "Hiệp phụ 2",
  10: "Kết thúc",
  11: "Luân lưu",
  12: "Sau trận",
  13: "Bị hủy/bỏ dở",
  16: "Chuẩn bị luân lưu",
  17: "Chuẩn bị hiệp phụ"
};

const stageLabels = {
  "First Stage": "Vòng bảng",
  "Round of 32": "Vòng 1/32",
  "Round of 16": "Vòng 1/8",
  "Quarter-final": "Tứ kết",
  "Semi-final": "Bán kết",
  "Play-off for third place": "Tranh hạng ba",
  "Final": "Chung kết"
};

const countryLabels = {
  CAN: "Canada",
  MEX: "Mexico",
  USA: "Mỹ"
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TIMEZONE,
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const shortDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const timeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function getLocalizedValue(values, fallback = "") {
  if (!Array.isArray(values) || values.length === 0) {
    return fallback;
  }

  const english = values.find((item) => String(item.Locale).toLowerCase().startsWith("en"));
  return english?.Description || values[0]?.Description || fallback;
}

function normalizePlaceholder(value) {
  if (!value) {
    return "";
  }

  const text = String(value).trim();
  const winner = text.match(/^W(\d+)$/i);
  if (winner) {
    return `Thắng trận ${winner[1]}`;
  }

  const runnerUp = text.match(/^RU(\d+)$/i);
  if (runnerUp) {
    return `Thua trận ${runnerUp[1]}`;
  }

  const loser = text.match(/^L(\d+)$/i);
  if (loser) {
    return `Thua trận ${loser[1]}`;
  }

  return text;
}

function normalizeGroup(value) {
  if (!value) {
    return "";
  }

  const group = String(value).match(/^Group\s+(.+)$/i);
  return group ? `Bảng ${group[1]}` : value;
}

function normalizeTeam(team, placeholder) {
  if (!team) {
    const label = normalizePlaceholder(placeholder) || "Chưa xác định";
    return {
      id: null,
      name: label,
      shortName: label,
      abbreviation: "",
      country: "",
      flagUrl: null,
      isPlaceholder: true
    };
  }

  return {
    id: team.IdTeam || null,
    name: getLocalizedValue(team.TeamName, team.ShortClubName || team.Abbreviation || "Chưa xác định"),
    shortName: team.ShortClubName || getLocalizedValue(team.TeamName, team.Abbreviation || ""),
    abbreviation: team.Abbreviation || "",
    country: team.IdCountry || "",
    flagUrl: team.PictureUrl ? team.PictureUrl.replace("{format}", "png").replace("{size}", "2") : null,
    isPlaceholder: false
  };
}

function normalizeStadium(stadium) {
  if (!stadium) {
    return {
      id: null,
      name: "Chưa xác định",
      city: "",
      country: "",
      countryName: "",
      capacity: null,
      roof: false
    };
  }

  const country = stadium.IdCountry || "";
  return {
    id: stadium.IdStadium || null,
    name: getLocalizedValue(stadium.Name, "Chưa xác định"),
    city: getLocalizedValue(stadium.CityName, ""),
    country,
    countryName: countryLabels[country] || country,
    capacity: stadium.Capacity || null,
    roof: Boolean(stadium.Roof)
  };
}

function formatLocalTime(isoDate) {
  if (!isoDate) {
    return {
      vietnamDate: "",
      vietnamShortDate: "",
      vietnamTime: ""
    };
  }

  const date = new Date(isoDate);
  return {
    vietnamDate: dateFormatter.format(date),
    vietnamShortDate: shortDateFormatter.format(date),
    vietnamTime: timeFormatter.format(date)
  };
}

function formatSourceLocalTime(localDate) {
  if (!localDate) {
    return "";
  }

  const date = new Date(localDate);
  if (Number.isNaN(date.getTime())) {
    return localDate;
  }

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hour}:${minute} ${day}/${month}/${year}`;
}

function scoreFor(match) {
  if (match.HomeTeamScore == null || match.AwayTeamScore == null) {
    return null;
  }

  return {
    home: match.HomeTeamScore,
    away: match.AwayTeamScore,
    penaltyHome: match.HomeTeamPenaltyScore,
    penaltyAway: match.AwayTeamPenaltyScore
  };
}

function normalizeMatch(match) {
  const stage = getLocalizedValue(match.StageName, "");
  const group = normalizeGroup(getLocalizedValue(match.GroupName, ""));
  const time = formatLocalTime(match.Date);
  const stadium = normalizeStadium(match.Stadium);

  return {
    id: match.IdMatch,
    matchNumber: match.MatchNumber,
    stage,
    stageVi: stageLabels[stage] || stage || "Không rõ vòng",
    group,
    utcDate: match.Date,
    localDateAtVenue: match.LocalDate,
    localTimeAtVenue: formatSourceLocalTime(match.LocalDate),
    vietnamDate: time.vietnamDate,
    vietnamShortDate: time.vietnamShortDate,
    vietnamTime: time.vietnamTime,
    home: normalizeTeam(match.Home, match.PlaceHolderA),
    away: normalizeTeam(match.Away, match.PlaceHolderB),
    placeholderHome: normalizePlaceholder(match.PlaceHolderA),
    placeholderAway: normalizePlaceholder(match.PlaceHolderB),
    score: scoreFor(match),
    status: {
      code: match.MatchStatus,
      label: statusLabels[match.MatchStatus] || "Không rõ"
    },
    stadium
  };
}

function buildVenues(matches) {
  const venues = new Map();

  for (const match of matches) {
    if (!match.stadium.id) {
      continue;
    }

    const current = venues.get(match.stadium.id) || {
      ...match.stadium,
      matchCount: 0,
      matchNumbers: []
    };

    current.matchCount += 1;
    current.matchNumbers.push(match.matchNumber);
    venues.set(match.stadium.id, current);
  }

  return [...venues.values()]
    .map((venue) => ({
      ...venue,
      matchNumbers: venue.matchNumbers.sort((a, b) => a - b)
    }))
    .sort((a, b) => b.matchCount - a.matchCount || a.name.localeCompare(b.name));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      accept: "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`FIFA API returned ${response.status} for ${url}`);
  }

  return response.json();
}

async function fetchAllMatches() {
  const params = new URLSearchParams({
    idSeason: ID_SEASON,
    language: "en",
    count: "200"
  });

  const matches = [];
  const seenHashes = new Set();
  let continuationToken = null;
  let continuationHash = null;

  do {
    const headers = {};
    if (continuationToken) {
      params.set("continuationhash", continuationHash);
      headers["x-mdp-continuation-token"] = continuationToken;
    }

    const json = await fetchJson(`${API_BASE}/calendar/matches?${params.toString()}`, { headers });
    matches.push(...(json.Results || []));

    continuationToken = json.ContinuationToken || null;
    continuationHash = json.ContinuationHash || null;

    if (continuationHash) {
      if (seenHashes.has(continuationHash)) {
        break;
      }
      seenHashes.add(continuationHash);
    }
  } while (continuationToken && continuationHash);

  return matches;
}

async function main() {
  const rawMatches = await fetchAllMatches();
  const matches = rawMatches
    .map(normalizeMatch)
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate) || a.matchNumber - b.matchNumber);

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    idCompetition: ID_COMPETITION,
    idSeason: ID_SEASON,
    timezone: TIMEZONE,
    matches,
    venues: buildVenues(matches)
  };

  await mkdir(dataDir, { recursive: true });
  const serializedPayload = JSON.stringify(payload, null, 2);
  await writeFile(outputPath, `${serializedPayload}\n`, "utf8");
  await writeFile(browserOutputPath, `window.__WORLD_CUP_2026_DATA__ = ${serializedPayload};\n`, "utf8");

  console.log(
    `Synced ${payload.matches.length} matches and ${payload.venues.length} venues to ${path.relative(rootDir, outputPath)}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
