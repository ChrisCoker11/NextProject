const BASE = 'https://www.thesportsdb.com/api/v1/json/123'

const SPORTS_KEYWORDS = /\b(score|scores|game|games|match|matches|fixture|fixtures|result|results|next game|last game|standings|season|league|vs|versus|win|won|lost|lose|beat|defeated|played|upcoming|schedule)\b/i

// Common short team names → full names TheSportsDB recognises
const TEAM_ALIASES: Record<string, string> = {
  lakers: 'LA Lakers',
  clippers: 'LA Clippers',
  knicks: 'New York Knicks',
  bulls: 'Chicago Bulls',
  celtics: 'Boston Celtics',
  warriors: 'Golden State Warriors',
  heat: 'Miami Heat',
  nets: 'Brooklyn Nets',
  suns: 'Phoenix Suns',
  bucks: 'Milwaukee Bucks',
  nuggets: 'Denver Nuggets',
  '76ers': 'Philadelphia 76ers',
  sixers: 'Philadelphia 76ers',
  raptors: 'Toronto Raptors',
  mavs: 'Dallas Mavericks',
  mavericks: 'Dallas Mavericks',
  spurs: 'San Antonio Spurs',
  rockets: 'Houston Rockets',
  thunder: 'Oklahoma City Thunder',
  blazers: 'Portland Trail Blazers',
  jazz: 'Utah Jazz',
  // NFL
  patriots: 'New England Patriots',
  chiefs: 'Kansas City Chiefs',
  cowboys: 'Dallas Cowboys',
  eagles: 'Philadelphia Eagles',
  packers: 'Green Bay Packers',
  // Soccer
  arsenal: 'Arsenal',
  chelsea: 'Chelsea',
  liverpool: 'Liverpool',
  'man united': 'Manchester United',
  'man city': 'Manchester City',
  barcelona: 'FC Barcelona',
  'real madrid': 'Real Madrid',
}

async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return {}
  return res.json()
}

function extractTeamCandidates(message: string): string[] {
  const lower = message.toLowerCase()
  const found: string[] = []

  // Check aliases first
  for (const [alias, fullName] of Object.entries(TEAM_ALIASES)) {
    if (lower.includes(alias)) {
      found.push(fullName)
    }
  }

  // Also try capitalized words from the original message
  const capitalized = message.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) ?? []
  for (const c of capitalized) {
    if (!found.includes(c)) found.push(c)
  }

  return found.slice(0, 3)
}

export async function getSportsContext(message: string): Promise<string | null> {
  if (!SPORTS_KEYWORDS.test(message)) return null

  const candidates = extractTeamCandidates(message)
  if (candidates.length === 0) return null

  const lines: string[] = []

  for (const candidate of candidates) {
    try {
      const searchData = await fetchJSON(`${BASE}/searchteams.php?t=${encodeURIComponent(candidate)}`)
      const team = searchData.teams?.[0]
      if (!team) continue

      const [lastData, nextData] = await Promise.all([
        fetchJSON(`${BASE}/eventslast.php?id=${team.idTeam}`),
        fetchJSON(`${BASE}/eventsnext.php?id=${team.idTeam}`),
      ])

      const recent = lastData.results?.slice(0, 5) ?? []
      const upcoming = nextData.events?.slice(0, 5) ?? []

      if (!recent.length && !upcoming.length) continue

      lines.push(`\n[${team.strTeam} — ${team.strLeague}]`)

      if (recent.length) {
        lines.push('Recent results:')
        for (const e of recent) {
          const score = e.intHomeScore != null && e.intAwayScore != null
            ? `${e.intHomeScore}-${e.intAwayScore}`
            : 'score unavailable'
          lines.push(`  ${e.strEvent}: ${score} (${e.dateEvent})`)
        }
      }

      if (upcoming.length) {
        lines.push('Upcoming fixtures:')
        for (const e of upcoming) {
          lines.push(`  ${e.strEvent} — ${e.dateEvent}${e.strTime ? ' at ' + e.strTime : ''}`)
        }
      }
    } catch {
      // skip failed lookups silently
    }
  }

  if (!lines.length) return null

  return `LIVE SPORTS DATA (fetched right now from TheSportsDB — this is more up to date than your training data, use it to answer the question):\n${lines.join('\n')}`
}