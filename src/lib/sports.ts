const BASE = 'https://www.thesportsdb.com/api/v1/json/123'

const SPORTS_KEYWORDS = /\b(score|scores|game|games|match|matches|fixture|fixtures|result|results|next game|last game|standings|season|league|vs|versus|win|won|lost|lose|beat|defeated|played|upcoming|schedule)\b/i

async function fetchJSON(url: string) {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return {}
  return res.json()
}

export async function getSportsContext(message: string): Promise<string | null> {
  if (!SPORTS_KEYWORDS.test(message)) return null

  // Extract capitalized words/phrases as potential team names
  const candidates = message.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) ?? []
  if (candidates.length === 0) return null

  const lines: string[] = []

  for (const candidate of candidates.slice(0, 3)) {
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

  return `The following sports data was fetched from TheSportsDB:\n${lines.join('\n')}\n\nUse this data to answer the user's question accurately.`
}