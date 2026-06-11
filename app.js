const DATA_URL = "data/worldcup-2026.json";

const state = {
  data: null,
  view: "schedule",
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
  scheduleList: document.querySelector("#schedule-list"),
  venuesList: document.querySelector("#venues-list"),
  standingsList: document.querySelector("#standings-list"),
  scheduleView: document.querySelector("#schedule-view"),
  venuesView: document.querySelector("#venues-view"),
  standingsView: document.querySelector("#standings-view"),
  errorState: document.querySelector("#error-state"),
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

function teamHtml(team) {
  const fallback = escapeHtml(team.abbreviation || "TBD");
  const flag = flagEmojiByCountry[team.country] || flagEmojiByCountry[team.abbreviation] || fallback;
  const isEmojiFlag = flag !== fallback;

  return `
    <div class="team">
      <span class="flag ${isEmojiFlag ? "is-emoji" : ""}" title="${escapeHtml(team.abbreviation || team.name)}">${escapeHtml(flag)}</span>
      <span>${escapeHtml(team.name)}</span>
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
  return `
    <div class="matchup">
      ${teamHtml(match.home)}
      <span class="versus">vs</span>
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

function renderNextMatch() {
  const now = new Date();
  const upcoming = state.data.matches.find((match) => new Date(match.utcDate) >= now) || state.data.matches[0];

  if (!upcoming) {
    elements.nextMatch.innerHTML = "Không có dữ liệu trận đấu.";
    return;
  }

  elements.nextMatch.classList.remove("skeleton");
  elements.nextMatch.innerHTML = `
    <div class="next-time">
      <strong>${escapeHtml(upcoming.vietnamTime)}</strong>
      <span>${escapeHtml(upcoming.vietnamDate)}</span>
    </div>
    <div>
      <div class="match-title-row">
        <span class="badge red">Trận ${escapeHtml(upcoming.matchNumber)}</span>
        <span class="badge">${escapeHtml(upcoming.group || upcoming.stageVi)}</span>
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

function matchesQuery(match, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    match.matchNumber,
    match.stage,
    match.stageVi,
    match.group,
    match.home.name,
    match.home.abbreviation,
    match.away.name,
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

  return state.data.matches.filter((match) => {
    if (!matchesQuery(match, filters.query)) return false;
    if (filters.date && match.vietnamShortDate !== filters.date) return false;
    if (filters.stage && match.stageVi !== filters.stage) return false;
    if (filters.group && match.group !== filters.group) return false;
    if (filters.venue && match.stadium.name !== filters.venue) return false;
    if (filters.country && match.stadium.country !== filters.country) return false;
    return true;
  });
}

function matchCardHtml(match) {
  return `
    <article class="match-card">
      <div class="match-number">
        <span>Trận</span>
        <strong>${escapeHtml(match.matchNumber)}</strong>
        <span>${escapeHtml(match.vietnamTime)}</span>
      </div>
      <div class="match-main">
        <div class="match-title-row">
          <span class="badge">${escapeHtml(match.group || match.stageVi)}</span>
          <span class="badge red">${escapeHtml(match.status.label)}</span>
          <span class="score">${escapeHtml(scoreText(match))}</span>
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
  elements.venueCount.textContent = `${state.data.venues.length} sân`;
  elements.venuesList.innerHTML = state.data.venues
    .map((venue) => `
      <article class="venue-card">
        <header>
          <div>
            <h3>${escapeHtml(venue.name)}</h3>
            <p>${escapeHtml(venue.city)}, ${escapeHtml(venue.countryName)}</p>
          </div>
          <div class="venue-count" aria-label="${escapeHtml(venue.matchCount)} trận">${escapeHtml(venue.matchCount)}</div>
        </header>
        <div class="match-chips" aria-label="Danh sách trận">
          ${venue.matchNumbers.map((number) => `<span class="match-chip">Trận ${escapeHtml(number)}</span>`).join("")}
        </div>
      </article>
    `)
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

    if (!match.score) {
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
  elements.venuesView.classList.toggle("is-active", view === "venues");
  elements.standingsView.classList.toggle("is-active", view === "standings");
}

function bindEvents() {
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
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
    setupFilters();
    renderStats();
    renderNextMatch();
    renderSchedule();
    renderVenues();
    renderStandings();
  } catch (error) {
    console.error(error);
    elements.nextMatch.hidden = true;
    elements.scheduleView.hidden = true;
    elements.venuesView.hidden = true;
    elements.standingsView.hidden = true;
    elements.errorState.hidden = false;
    elements.lastUpdated.textContent = "Không tải được dữ liệu cache";
  }
}

init();
