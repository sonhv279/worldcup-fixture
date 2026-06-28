const DATA_URL = "data/worldcup-2026.json";
const FIFA_MATCHES_URL = "https://api.fifa.com/api/v3/calendar/matches?idSeason=285023&language=en&count=200";
const LIVE_SYNC_INTERVAL_MS = 60 * 1000;

const state = {
  data: null,
  view: "schedule",
  nextMatch: null,
  countdownTimer: null,
  liveSyncTimer: null,
  filters: {
    query: "",
    date: "",
    stage: "",
    group: "",
    venue: "",
    country: ""
  }
};

const elements = {
  lastUpdated: document.querySelector("#last-updated"),
  statMatches: document.querySelector("#stat-matches"),
  statVenues: document.querySelector("#stat-venues"),
  statDays: document.querySelector("#stat-days"),
  nextMatch: document.querySelector("#next-match"),
  resultCount: document.querySelector("#result-count"),
  venueCount: document.querySelector("#venue-count"),
  standingsCount: document.querySelector("#standings-count"),
  calendarCount: document.querySelector("#calendar-count"),
  bracketCount: document.querySelector("#bracket-count"),
  scheduleList: document.querySelector("#schedule-list"),
  venuesList: document.querySelector("#venues-list"),
  standingsList: document.querySelector("#standings-list"),
  calendarList: document.querySelector("#calendar-list"),
  bracketList: document.querySelector("#bracket-list"),
  scheduleView: document.querySelector("#schedule-view"),
  venuesView: document.querySelector("#venues-view"),
  standingsView: document.querySelector("#standings-view"),
  calendarView: document.querySelector("#calendar-view"),
  bracketView: document.querySelector("#bracket-view"),
  errorState: document.querySelector("#error-state"),
  themeToggle: document.querySelector("#theme-toggle"),
  resetFilters: document.querySelector("#reset-filters"),
  searchInput: document.querySelector("#search-input"),
  dateFilter: document.querySelector("#date-filter"),
  stageFilter: document.querySelector("#stage-filter"),
  groupFilter: document.querySelector("#group-filter"),
  venueFilter: document.querySelector("#venue-filter"),
  countryFilter: document.querySelector("#country-filter")
};

const collator = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });
const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const monthFormatter = new Intl.DateTimeFormat("vi-VN", {
  month: "long",
  year: "numeric"
});

const shortWeekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const knockoutStages = ["Vòng 1/32", "Vòng 1/8", "Tứ kết", "Bán kết", "Tranh hạng ba", "Chung kết"];
const liveMatchWindowMs = 135 * 60 * 1000;
const finishedStatusCodes = new Set([0, 10, 12]);
const liveStatusCodes = new Set([3, 4, 5, 6, 7, 8, 9, 11, 16, 17]);
const cancelledStatusCodes = new Set([13]);
let matchByOfficialNumber = new Map();

const liveStatusLabels = {
  0: "Kết thúc",
  1: "Sắp diễn ra",
  2: "Trước trận",
  3: "Đang diễn ra",
  4: "Nghỉ giữa hiệp",
  5: "Đang diễn ra",
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

const flagEmojiByCountry = {
  ALG: "🇩🇿",
  ARG: "🇦🇷",
  AUS: "🇦🇺",
  AUT: "🇦🇹",
  BEL: "🇧🇪",
  BIH: "🇧🇦",
  BRA: "🇧🇷",
  CAN: "🇨🇦",
  CIV: "🇨🇮",
  COD: "🇨🇩",
  COL: "🇨🇴",
  CPV: "🇨🇻",
  CRO: "🇭🇷",
  CUW: "🇨🇼",
  CZE: "🇨🇿",
  ECU: "🇪🇨",
  EGY: "🇪🇬",
  ENG: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  ESP: "🇪🇸",
  FRA: "🇫🇷",
  GER: "🇩🇪",
  GHA: "🇬🇭",
  HAI: "🇭🇹",
  IRN: "🇮🇷",
  IRQ: "🇮🇶",
  JOR: "🇯🇴",
  JPN: "🇯🇵",
  KOR: "🇰🇷",
  KSA: "🇸🇦",
  MAR: "🇲🇦",
  MEX: "🇲🇽",
  NED: "🇳🇱",
  NOR: "🇳🇴",
  NZL: "🇳🇿",
  PAN: "🇵🇦",
  PAR: "🇵🇾",
  POR: "🇵🇹",
  QAT: "🇶🇦",
  RSA: "🇿🇦",
  SCO: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  SEN: "🇸🇳",
  SUI: "🇨🇭",
  SWE: "🇸🇪",
  TUN: "🇹🇳",
  TUR: "🇹🇷",
  URU: "🇺🇾",
  USA: "🇺🇸",
  UZB: "🇺🇿"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatUpdated(isoDate) {
  if (!isoDate) {
    return "Chưa rõ thời điểm cập nhật";
  }

  return `Cập nhật ${dateTimeFormatter.format(new Date(isoDate))}`;
}

function parseVietnamShortDate(value) {
  const [day, month, year] = String(value || "").split("/").map(Number);
  return { day, month, year };
}

function dateFromVietnamShortDate(value) {
  const { day, month, year } = parseVietnamShortDate(value);
  return new Date(Date.UTC(year, month - 1, day));
}

function monthKeyFromMatch(match) {
  const { month, year } = parseVietnamShortDate(match.vietnamShortDate);
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatCountdown(isoDate) {
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) {
    return "Đang diễn ra hoặc chờ cập nhật";
  }

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `Còn ${days} ngày ${hours} giờ`;
  }
  if (hours > 0) {
    return `Còn ${hours} giờ ${minutes} phút`;
  }
  return `Còn ${minutes} phút`;
}

function googleMapsUrl(venue) {
  const query = [venue.name, venue.city, venue.countryName].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function uniqueBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (key && !map.has(key)) {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

function compareMatchesByTime(a, b) {
  return new Date(a.utcDate) - new Date(b.utcDate) || Number(a.matchNumber) - Number(b.matchNumber);
}

function compareMatchesByOfficialNumber(a, b) {
  return Number(a.matchNumber) - Number(b.matchNumber) || new Date(a.utcDate) - new Date(b.utcDate);
}

function assignDisplayNumbers(matches) {
  [...matches].sort(compareMatchesByTime).forEach((match, index) => {
    match.displayNumber = index + 1;
  });
}

function displayMatchNumber(match) {
  return match.displayNumber || match.matchNumber;
}

function populateSelect(select, items, getValue, getLabel) {
  const firstOption = select.querySelector("option");
  select.replaceChildren(firstOption);

  for (const item of items) {
    const option = document.createElement("option");
    option.value = getValue(item);
    option.textContent = getLabel(item);
    select.append(option);
  }
}

function setupFilters() {
  const matches = state.data.matches;
  const dates = uniqueBy(matches, (match) => match.vietnamShortDate);
  const stages = uniqueBy(matches, (match) => match.stageVi).sort((a, b) => a.matchNumber - b.matchNumber);
  const groups = uniqueBy(matches.filter((match) => match.group), (match) => match.group)
    .sort((a, b) => collator.compare(a.group, b.group));
  const venues = [...state.data.venues].sort((a, b) => collator.compare(a.name, b.name));
  const countries = uniqueBy(state.data.venues, (venue) => venue.country)
    .sort((a, b) => collator.compare(a.countryName, b.countryName));

  populateSelect(elements.dateFilter, dates, (match) => match.vietnamShortDate, (match) => match.vietnamDate);
  populateSelect(elements.stageFilter, stages, (match) => match.stageVi, (match) => match.stageVi);
  populateSelect(elements.groupFilter, groups, (match) => match.group, (match) => match.group);
  populateSelect(elements.venueFilter, venues, (venue) => venue.name, (venue) => venue.name);
  populateSelect(elements.countryFilter, countries, (venue) => venue.country, (venue) => venue.countryName);
}

function renderStats() {
  const days = new Set(state.data.matches.map((match) => match.vietnamShortDate));
  elements.lastUpdated.textContent = formatUpdated(state.data.generatedAt);
  elements.statMatches.textContent = state.data.matches.length;
  elements.statVenues.textContent = state.data.venues.length;
  elements.statDays.textContent = days.size;
}

function resolvedTeamName(team) {
  const name = team.name || team.shortName || team.abbreviation || "Chưa xác định";

  if (!team.isPlaceholder) {
    return name;
  }

  const reference = placeholderReference(team);
  if (!reference) {
    return name;
  }

  const sourceMatch = matchByOfficialNumber.get(reference.matchNumber);
  if (!sourceMatch) {
    return name;
  }

  const sourceHome = sourceMatch.home?.name || sourceMatch.placeholderHome || "Chưa xác định";
  const sourceAway = sourceMatch.away?.name || sourceMatch.placeholderAway || "Chưa xác định";
  return `${name} (${sourceHome} / ${sourceAway})`;
}

function placeholderReference(team) {
  const name = team?.name || team?.shortName || "";
  const reference = String(name).match(/^(Thắng|Thua) trận (\d+)$/i);

  if (!reference) {
    return null;
  }

  return {
    label: reference[1],
    matchNumber: Number(reference[2])
  };
}

function teamFlagHtml(team, title) {
  const fallback = escapeHtml(team.abbreviation || "TBD");
  const flag = flagEmojiByCountry[team.country] || flagEmojiByCountry[team.abbreviation] || fallback;
  const isEmojiFlag = flag !== fallback;
  return `<span class="flag ${isEmojiFlag ? "is-emoji" : ""}" title="${escapeHtml(team.abbreviation || title)}">${escapeHtml(flag)}</span>`;
}

function teamHtml(team) {
  const name = resolvedTeamName(team);

  return `
    <div class="team">
      ${teamFlagHtml(team, name)}
      <span>${escapeHtml(name)}</span>
    </div>
  `;
}

function compactTeamHtml(team) {
  const fallback = escapeHtml(team.abbreviation || "TBD");
  const flag = flagEmojiByCountry[team.country] || flagEmojiByCountry[team.abbreviation] || fallback;
  const isEmojiFlag = flag !== fallback;

  return `
    <div class="standing-team">
      <span class="flag ${isEmojiFlag ? "is-emoji" : ""}" title="${escapeHtml(team.abbreviation || team.name)}">${escapeHtml(flag)}</span>
      <span>${escapeHtml(team.name)}</span>
    </div>
  `;
}

function matchTeamsHtml(match) {
  const centerText = match.score ? scoreText(match) : "vs";
  const centerClass = match.score ? "match-score" : "versus";

  return `
    <div class="matchup">
      ${teamHtml(match.home)}
      <span class="${centerClass}">${escapeHtml(centerText)}</span>
      ${teamHtml(match.away)}
    </div>
  `;
}

function scoreText(match) {
  if (!match.score) {
    return "Chưa đá";
  }

  let score = `${match.score.home} - ${match.score.away}`;
  if (match.score.penaltyHome != null && match.score.penaltyAway != null) {
    score += ` pen ${match.score.penaltyHome} - ${match.score.penaltyAway}`;
  }
  return score;
}

function scoreFromLiveMatch(match) {
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

function liveStatusFor(match) {
  return {
    code: match.MatchStatus,
    label: liveStatusLabels[match.MatchStatus] || "Không rõ",
    matchTime: match.MatchTime || null
  };
}

function liveLocalizedValue(value, fallback = "") {
  if (value == null) {
    return fallback;
  }

  if (typeof value === "string") {
    return value || fallback;
  }

  if (Array.isArray(value)) {
    const item =
      value.find((entry) => entry.Locale === "en" || entry.Language === "en") ||
      value.find((entry) => entry.Description || entry.Name) ||
      value[0];
    return item?.Description || item?.Name || fallback;
  }

  return value.Description || value.Name || fallback;
}

function normalizeLivePlaceholder(value) {
  if (!value) {
    return "Chưa xác định";
  }

  return String(value)
    .replace(/^W(\d+)$/i, "Thắng trận $1")
    .replace(/^L(\d+)$/i, "Thua trận $1");
}

function teamFromLiveMatch(team, placeholder) {
  const label = normalizeLivePlaceholder(placeholder);

  if (!team) {
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

  const name = liveLocalizedValue(team.TeamName, team.ShortClubName || team.Abbreviation || "Chưa xác định");

  return {
    id: team.IdTeam || null,
    name,
    shortName: team.ShortClubName || name,
    abbreviation: team.Abbreviation || "",
    country: team.IdCountry || "",
    flagUrl: team.PictureUrl ? team.PictureUrl.replace("{format}", "png").replace("{size}", "2") : null,
    isPlaceholder: false
  };
}

function scoreSignature(score) {
  if (!score) {
    return "";
  }

  return [score.home, score.away, score.penaltyHome ?? "", score.penaltyAway ?? ""].join(":");
}

function teamSignature(team) {
  if (!team) {
    return "";
  }

  return [
    team.id ?? "",
    team.name ?? "",
    team.shortName ?? "",
    team.abbreviation ?? "",
    team.country ?? "",
    team.isPlaceholder ? "placeholder" : "team"
  ].join(":");
}

function matchStatusCode(match) {
  const code = Number(match.status?.code);
  return Number.isNaN(code) ? null : code;
}

function hasFinishedStatus(match) {
  const code = matchStatusCode(match);
  return code == null ? Boolean(match.score) : finishedStatusCodes.has(code);
}

function hasFinalScore(match) {
  return Boolean(match.score) && hasFinishedStatus(match);
}

function matchTimeMinute(matchTime) {
  const minute = String(matchTime || "").match(/\d+/);
  return minute ? Number(minute[0]) : null;
}

function livePeriodLabel(match) {
  const statusCode = matchStatusCode(match);
  const matchTime = match.status?.matchTime;

  if ((statusCode === 3 || statusCode === 5) && matchTime) {
    const minute = matchTimeMinute(matchTime);
    if (minute != null) {
      return `${minute > 45 ? "Hiệp 2" : "Hiệp 1"} · ${matchTime}`;
    }
  }

  return match.status?.label || "Đang diễn ra";
}

async function fetchLiveMatches() {
  const response = await fetch(`${FIFA_MATCHES_URL}&_=${Date.now()}`, {
    cache: "no-store",
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`FIFA live sync returned ${response.status}`);
  }

  const json = await response.json();
  return json.Results || [];
}

function mergeLiveMatches(rawMatches) {
  const byId = new Map(state.data.matches.map((match) => [String(match.id), match]));
  const byNumber = new Map(state.data.matches.map((match) => [Number(match.matchNumber), match]));
  let changed = false;

  for (const rawMatch of rawMatches) {
    const match = byId.get(String(rawMatch.IdMatch)) || byNumber.get(Number(rawMatch.MatchNumber));
    if (!match) {
      continue;
    }

    const nextScore = scoreFromLiveMatch(rawMatch);
    const nextStatus = liveStatusFor(rawMatch);
    const nextHome = teamFromLiveMatch(rawMatch.Home, rawMatch.PlaceHolderA);
    const nextAway = teamFromLiveMatch(rawMatch.Away, rawMatch.PlaceHolderB);
    const scoreChanged = scoreSignature(match.score) !== scoreSignature(nextScore);
    const teamsChanged =
      teamSignature(match.home) !== teamSignature(nextHome) ||
      teamSignature(match.away) !== teamSignature(nextAway);
    const statusChanged =
      match.status?.code !== nextStatus.code ||
      match.status?.label !== nextStatus.label ||
      match.status?.matchTime !== nextStatus.matchTime;

    if (scoreChanged) {
      match.score = nextScore;
      changed = true;
    }

    if (teamsChanged) {
      match.home = nextHome;
      match.away = nextAway;
      match.placeholderHome = normalizeLivePlaceholder(rawMatch.PlaceHolderA);
      match.placeholderAway = normalizeLivePlaceholder(rawMatch.PlaceHolderB);
      changed = true;
    }

    if (statusChanged) {
      match.status = nextStatus;
      changed = true;
    }
  }

  if (changed) {
    state.data.generatedAt = new Date().toISOString();
  }

  return changed;
}

function rerenderLiveData() {
  renderStats();
  renderNextMatch();
  renderSchedule();
  renderCalendar();
  renderStandings();
  renderBracket();
}

async function syncLiveData() {
  try {
    const rawMatches = await fetchLiveMatches();
    const changed = mergeLiveMatches(rawMatches);
    elements.lastUpdated.textContent = `${formatUpdated(state.data.generatedAt)} · live`;
    if (changed) {
      rerenderLiveData();
    }
  } catch (error) {
    console.warn("Không cập nhật được dữ liệu live từ FIFA", error);
  }
}

function startLiveSync() {
  if (state.liveSyncTimer) {
    window.clearInterval(state.liveSyncTimer);
  }

  syncLiveData();
  state.liveSyncTimer = window.setInterval(syncLiveData, LIVE_SYNC_INTERVAL_MS);
}

function matchDisplayStatus(match, now = new Date()) {
  const statusCode = matchStatusCode(match);
  const start = new Date(match.utcDate);
  const end = new Date(start.getTime() + liveMatchWindowMs);

  if (statusCode != null && cancelledStatusCodes.has(statusCode)) {
    return {
      label: match.status?.label || "Bị hủy/bỏ dở",
      type: "pending"
    };
  }

  if (hasFinishedStatus(match)) {
    return {
      label: "Kết thúc",
      type: "done"
    };
  }

  if (statusCode != null && liveStatusCodes.has(statusCode)) {
    return {
      label: livePeriodLabel(match),
      type: "live"
    };
  }

  if (now >= start && now <= end) {
    return {
      label: "Đang diễn ra",
      type: "live"
    };
  }

  if (now > end) {
    return {
      label: "Chờ cập nhật",
      type: "pending"
    };
  }

  return {
    label: "Sắp diễn ra",
    type: "upcoming"
  };
}

function renderNextMatch() {
  const now = new Date();
  const upcoming = state.data.matches.find((match) => {
    if (hasFinishedStatus(match)) {
      return false;
    }

    const start = new Date(match.utcDate);
    const end = new Date(start.getTime() + liveMatchWindowMs);
    return now <= end;
  }) || state.data.matches[0];
  state.nextMatch = upcoming;

  if (!upcoming) {
    elements.nextMatch.innerHTML = "Không có dữ liệu trận đấu.";
    return;
  }

  const status = matchDisplayStatus(upcoming, now);
  elements.nextMatch.classList.remove("skeleton");
  elements.nextMatch.innerHTML = `
    <div class="next-time">
      <strong>${escapeHtml(upcoming.vietnamTime)}</strong>
      <span>${escapeHtml(upcoming.vietnamDate)}</span>
      <em id="next-countdown">${escapeHtml(formatCountdown(upcoming.utcDate))}</em>
    </div>
    <div>
      <div class="match-title-row">
        <span class="badge red">Trận ${escapeHtml(displayMatchNumber(upcoming))}</span>
        <span class="badge">${escapeHtml(upcoming.group || upcoming.stageVi)}</span>
        <span class="badge status-${status.type}">${escapeHtml(status.label)}</span>
      </div>
      ${matchTeamsHtml(upcoming)}
    </div>
    <dl class="meta-list">
      <div><strong>Sân:</strong> ${escapeHtml(upcoming.stadium.name)}</div>
      <div><strong>Địa điểm:</strong> ${escapeHtml(upcoming.stadium.city)}, ${escapeHtml(upcoming.stadium.countryName)}</div>
      <div><strong>Giờ địa phương:</strong> ${escapeHtml(upcoming.localTimeAtVenue)}</div>
    </dl>
  `;
}

function startCountdown() {
  if (state.countdownTimer) {
    window.clearInterval(state.countdownTimer);
  }

  const update = () => {
    renderNextMatch();
    renderSchedule();
  };

  update();
  state.countdownTimer = window.setInterval(update, 60000);
}

function matchesQuery(match, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    displayMatchNumber(match),
    match.matchNumber,
    match.stage,
    match.stageVi,
    match.group,
    resolvedTeamName(match.home),
    match.home.abbreviation,
    resolvedTeamName(match.away),
    match.away.abbreviation,
    match.stadium.name,
    match.stadium.city,
    match.stadium.countryName,
    match.vietnamDate
  ].join(" ");

  return normalizeSearch(haystack).includes(normalizeSearch(query));
}

function getFilteredMatches() {
  const filters = state.filters;

  return state.data.matches
    .filter((match) => {
      if (!matchesQuery(match, filters.query)) return false;
      if (filters.date && match.vietnamShortDate !== filters.date) return false;
      if (filters.stage && match.stageVi !== filters.stage) return false;
      if (filters.group && match.group !== filters.group) return false;
      if (filters.venue && match.stadium.name !== filters.venue) return false;
      if (filters.country && match.stadium.country !== filters.country) return false;
      return true;
    })
    .sort(compareMatchesByTime);
}

function matchCardHtml(match) {
  const status = matchDisplayStatus(match);

  return `
    <article class="match-card">
      <div class="match-number">
        <span>Trận</span>
        <strong>${escapeHtml(displayMatchNumber(match))}</strong>
        <span>${escapeHtml(match.vietnamTime)}</span>
      </div>
      <div class="match-main">
        <div class="match-title-row">
          <span class="badge">${escapeHtml(match.group || match.stageVi)}</span>
          <span class="badge status-${status.type}">${escapeHtml(status.label)}</span>
        </div>
        ${matchTeamsHtml(match)}
        <div class="venue-line">
          <strong>${escapeHtml(match.stadium.name)}</strong> · ${escapeHtml(match.stadium.city)}, ${escapeHtml(match.stadium.countryName)}
        </div>
      </div>
      <dl class="meta-list">
        <div><strong>Vòng:</strong> ${escapeHtml(match.stageVi)}</div>
        <div><strong>Giờ địa phương:</strong> ${escapeHtml(match.localTimeAtVenue)}</div>
        <div><strong>UTC:</strong> ${escapeHtml(match.utcDate.replace("T", " ").replace("Z", " UTC"))}</div>
      </dl>
    </article>
  `;
}

function renderSchedule() {
  const matches = getFilteredMatches();
  elements.resultCount.textContent = `${matches.length} trận`;

  if (matches.length === 0) {
    elements.scheduleList.innerHTML = `
      <div class="empty-state">Không có trận nào khớp bộ lọc hiện tại.</div>
    `;
    return;
  }

  const groups = new Map();
  for (const match of matches) {
    if (!groups.has(match.vietnamDate)) {
      groups.set(match.vietnamDate, []);
    }
    groups.get(match.vietnamDate).push(match);
  }

  elements.scheduleList.innerHTML = [...groups.entries()]
    .map(([date, dayMatches]) => `
      <section class="day-group">
        <h3 class="day-title">${escapeHtml(date)}</h3>
        ${dayMatches.map(matchCardHtml).join("")}
      </section>
    `)
    .join("");
}

function renderVenues() {
  const matchByNumber = new Map(state.data.matches.map((match) => [Number(match.matchNumber), match]));
  elements.venueCount.textContent = `${state.data.venues.length} sân`;
  elements.venuesList.innerHTML = state.data.venues
    .map((venue) => {
      const displayNumbers = venue.matchNumbers
        .map((number) => matchByNumber.get(Number(number)))
        .filter(Boolean)
        .sort(compareMatchesByTime)
        .map(displayMatchNumber);

      return `
      <article class="venue-card">
        <div class="venue-photo" aria-hidden="true"></div>
        <header>
          <div>
            <h3>${escapeHtml(venue.name)}</h3>
            <p>${escapeHtml(venue.city)}, ${escapeHtml(venue.countryName)}</p>
          </div>
          <div class="venue-count" aria-label="${escapeHtml(venue.matchCount)} trận">${escapeHtml(venue.matchCount)}</div>
        </header>
        <dl class="venue-details">
          <div><dt>Sức chứa</dt><dd>${venue.capacity ? Number(venue.capacity).toLocaleString("vi-VN") : "Đang cập nhật"}</dd></div>
          <div><dt>Mái che</dt><dd>${venue.roof ? "Có" : "Không rõ"}</dd></div>
        </dl>
        <div class="match-chips" aria-label="Danh sách trận">
          ${displayNumbers.map((number) => `<span class="match-chip">Trận ${escapeHtml(number)}</span>`).join("")}
        </div>
        <a class="map-link" href="${escapeHtml(googleMapsUrl(venue))}" target="_blank" rel="noreferrer">Xem trên bản đồ</a>
      </article>
    `;
    })
    .join("");
}

function createStandingTeam(team, group, order) {
  return {
    id: team.id || `${group}-${team.name}`,
    group,
    order,
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0
  };
}

function buildStandings() {
  const groupMatches = state.data.matches.filter((match) => match.group);
  const groups = new Map();

  for (const match of groupMatches) {
    if (!groups.has(match.group)) {
      groups.set(match.group, new Map());
    }

    const table = groups.get(match.group);
    for (const team of [match.home, match.away]) {
      if (!team.isPlaceholder && !table.has(team.id || team.name)) {
        table.set(team.id || team.name, createStandingTeam(team, match.group, table.size + 1));
      }
    }

    if (!hasFinalScore(match)) {
      continue;
    }

    const home = table.get(match.home.id || match.home.name);
    const away = table.get(match.away.id || match.away.name);
    if (!home || !away) {
      continue;
    }

    const homeGoals = Number(match.score.home);
    const awayGoals = Number(match.score.away);
    home.played += 1;
    away.played += 1;
    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (homeGoals < awayGoals) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }

    home.goalDiff = home.goalsFor - home.goalsAgainst;
    away.goalDiff = away.goalsFor - away.goalsAgainst;
  }

  return [...groups.entries()]
    .map(([group, table]) => ({
      group,
      teams: [...table.values()].sort((a, b) =>
        b.points - a.points ||
        b.goalDiff - a.goalDiff ||
        b.goalsFor - a.goalsFor ||
        a.order - b.order
      )
    }))
    .sort((a, b) => collator.compare(a.group, b.group));
}

function renderStandings() {
  const standings = buildStandings();
  elements.standingsCount.textContent = `${standings.length} bảng`;
  elements.standingsList.innerHTML = standings
    .map((group) => `
      <article class="standings-card">
        <h3>${escapeHtml(group.group)}</h3>
        <div class="standings-table-wrap">
          <table class="standings-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Đội</th>
                <th scope="col">Tr</th>
                <th scope="col">T</th>
                <th scope="col">H</th>
                <th scope="col">B</th>
                <th scope="col">BT</th>
                <th scope="col">BB</th>
                <th scope="col">HS</th>
                <th scope="col">Đ</th>
              </tr>
            </thead>
            <tbody>
              ${group.teams.map((team, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${compactTeamHtml(team.team)}</td>
                  <td>${team.played}</td>
                  <td>${team.won}</td>
                  <td>${team.drawn}</td>
                  <td>${team.lost}</td>
                  <td>${team.goalsFor}</td>
                  <td>${team.goalsAgainst}</td>
                  <td>${team.goalDiff > 0 ? "+" : ""}${team.goalDiff}</td>
                  <td><strong>${team.points}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </article>
    `)
    .join("");
}

function renderCalendar() {
  const dayGroups = new Map();
  for (const match of [...state.data.matches].sort(compareMatchesByTime)) {
    const key = match.vietnamShortDate;
    if (!dayGroups.has(key)) {
      dayGroups.set(key, []);
    }
    dayGroups.get(key).push(match);
  }

  const monthGroups = new Map();
  for (const [date, matches] of dayGroups.entries()) {
    const monthKey = monthKeyFromMatch(matches[0]);
    if (!monthGroups.has(monthKey)) {
      monthGroups.set(monthKey, []);
    }
    monthGroups.get(monthKey).push({ date, matches });
  }

  elements.calendarCount.textContent = `${dayGroups.size} ngày`;
  elements.calendarList.innerHTML = [...monthGroups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, days]) => {
      const firstDay = dateFromVietnamShortDate(days[0].date);
      const year = firstDay.getUTCFullYear();
      const month = firstDay.getUTCMonth();
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
      const byDay = new Map(days.map((item) => [parseVietnamShortDate(item.date).day, item.matches]));
      const cells = [];

      for (let i = 0; i < firstWeekday; i += 1) {
        cells.push(`<div class="calendar-day is-empty" aria-hidden="true"></div>`);
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        const matches = byDay.get(day) || [];
        cells.push(`
          <article class="calendar-day ${matches.length ? "has-matches" : ""}">
            <strong>${day}</strong>
            ${matches.length ? `
              <span>${matches.length} trận</span>
              <div class="calendar-matches">
                ${matches.slice(0, 3).map((match) => `
                  <div>${escapeHtml(match.vietnamTime)} · Trận ${escapeHtml(displayMatchNumber(match))}</div>
                `).join("")}
                ${matches.length > 3 ? `<div>+${matches.length - 3} trận nữa</div>` : ""}
              </div>
            ` : ""}
          </article>
        `);
      }

      return `
        <section class="calendar-month">
          <h3>${escapeHtml(monthFormatter.format(firstDay))}</h3>
          <div class="calendar-weekdays">
            ${shortWeekdays.map((day) => `<span>${day}</span>`).join("")}
          </div>
          <div class="calendar-grid">
            ${cells.join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

function candidateTeamsFor(team, visited = new Set()) {
  if (!team?.isPlaceholder) {
    return team ? [team] : [];
  }

  const reference = placeholderReference(team);
  if (!reference) {
    return [];
  }

  const sourceMatch = matchByOfficialNumber.get(reference.matchNumber);
  if (!sourceMatch || visited.has(reference.matchNumber)) {
    return [];
  }

  const nextVisited = new Set(visited);
  nextVisited.add(reference.matchNumber);
  return [
    ...candidateTeamsFor(sourceMatch.home, nextVisited),
    ...candidateTeamsFor(sourceMatch.away, nextVisited)
  ];
}

function uniqueCandidateTeams(teams) {
  const seen = new Set();
  return teams.filter((team) => {
    const key = team.id || team.abbreviation || team.name;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function bracketTeamCandidateHtml(team) {
  const name = team.name || team.shortName || team.abbreviation || "Chưa xác định";
  return `
    <span class="bracket-candidate">
      ${teamFlagHtml(team, name)}
      <span>${escapeHtml(name)}</span>
    </span>
  `;
}

function bracketTeamHtml(team) {
  const name = team.name || team.shortName || team.abbreviation || "Chưa xác định";
  const reference = placeholderReference(team);

  if (!reference) {
    return `
      <div class="bracket-team">
        ${teamFlagHtml(team, name)}
        <span>${escapeHtml(name)}</span>
      </div>
    `;
  }

  const candidates = uniqueCandidateTeams(candidateTeamsFor(team));
  return `
    <div class="bracket-team is-placeholder">
      <span class="bracket-team-source">${escapeHtml(name)}</span>
      ${candidates.length ? `
        <span class="bracket-candidates">
          ${candidates.map(bracketTeamCandidateHtml).join("")}
        </span>
      ` : `
        <span class="bracket-candidates">${escapeHtml(resolvedTeamName(team))}</span>
      `}
    </div>
  `;
}

function renderBracket() {
  const knockoutMatches = state.data.matches.filter((match) => !match.group).sort(compareMatchesByOfficialNumber);
  elements.bracketCount.textContent = `${knockoutMatches.length} trận`;
  elements.bracketList.innerHTML = knockoutStages
    .map((stage) => {
      const matches = knockoutMatches.filter((match) => match.stageVi === stage);
      return `
        <section class="bracket-round">
          <h3>${escapeHtml(stage)}</h3>
          ${matches.map((match) => `
            <article class="bracket-match">
              <div class="bracket-meta">
                <span>Trận ${escapeHtml(match.matchNumber)}</span>
                <strong>${escapeHtml(match.vietnamTime)} · ${escapeHtml(match.vietnamShortDate)}</strong>
              </div>
              <div class="bracket-teams">
                ${bracketTeamHtml(match.home)}
                ${bracketTeamHtml(match.away)}
              </div>
              <p>${escapeHtml(match.stadium.name)} · ${escapeHtml(match.stadium.city)}</p>
            </article>
          `).join("")}
        </section>
      `;
    })
    .join("");
}

function updateFilterFromInputs() {
  state.filters.query = elements.searchInput.value.trim();
  state.filters.date = elements.dateFilter.value;
  state.filters.stage = elements.stageFilter.value;
  state.filters.group = elements.groupFilter.value;
  state.filters.venue = elements.venueFilter.value;
  state.filters.country = elements.countryFilter.value;
  renderSchedule();
}

function resetFilters() {
  elements.searchInput.value = "";
  elements.dateFilter.value = "";
  elements.stageFilter.value = "";
  elements.groupFilter.value = "";
  elements.venueFilter.value = "";
  elements.countryFilter.value = "";
  updateFilterFromInputs();
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".nav-tab").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  elements.scheduleView.classList.toggle("is-active", view === "schedule");
  elements.calendarView.classList.toggle("is-active", view === "calendar");
  elements.venuesView.classList.toggle("is-active", view === "venues");
  elements.standingsView.classList.toggle("is-active", view === "standings");
  elements.bracketView.classList.toggle("is-active", view === "bracket");
}

function applyTheme(mode) {
  const dark = mode === "dark";
  document.body.classList.toggle("theme-dark", dark);
  elements.themeToggle.textContent = dark ? "Light mode" : "Dark mode";
  elements.themeToggle.setAttribute("aria-pressed", String(dark));
  window.localStorage.setItem("themeMode", mode);
}

function bindEvents() {
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  const savedThemeMode = window.localStorage.getItem("themeMode") || "light";
  applyTheme(savedThemeMode);
  elements.themeToggle.addEventListener("click", () => {
    applyTheme(document.body.classList.contains("theme-dark") ? "light" : "dark");
  });

  elements.resetFilters.addEventListener("click", resetFilters);
  elements.searchInput.addEventListener("input", updateFilterFromInputs);

  [
    elements.dateFilter,
    elements.stageFilter,
    elements.groupFilter,
    elements.venueFilter,
    elements.countryFilter
  ].forEach((select) => select.addEventListener("change", updateFilterFromInputs));
}

async function loadData() {
  if (window.__WORLD_CUP_2026_DATA__) {
    return window.__WORLD_CUP_2026_DATA__;
  }

  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${DATA_URL}`);
  }
  return response.json();
}

async function init() {
  bindEvents();

  try {
    state.data = await loadData();
    assignDisplayNumbers(state.data.matches);
    matchByOfficialNumber = new Map(state.data.matches.map((match) => [Number(match.matchNumber), match]));
    setupFilters();
    renderStats();
    renderNextMatch();
    startCountdown();
    renderSchedule();
    renderCalendar();
    renderVenues();
    renderStandings();
    renderBracket();
    startLiveSync();
  } catch (error) {
    console.error(error);
    elements.nextMatch.hidden = true;
    elements.scheduleView.hidden = true;
    elements.calendarView.hidden = true;
    elements.venuesView.hidden = true;
    elements.standingsView.hidden = true;
    elements.bracketView.hidden = true;
    elements.errorState.hidden = false;
    elements.lastUpdated.textContent = "Không tải được dữ liệu cache";
  }
}

init();
