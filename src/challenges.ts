// The challenge library and the rules for dealing three a day.
// Ids are permanent: never reuse or renumber one, history points at them.
import { AREAS, type AreaId } from './areas'

export interface Challenge {
  id: string
  area: AreaId
  text: string
  xp: number
}

export const CHALLENGES_PER_DAY = 3
/** A challenge won't come back until this many days have passed. */
export const REPEAT_GAP_DAYS = 14

const c = (id: string, area: AreaId, xp: number, text: string): Challenge => ({ id, area, xp, text })

export const CHALLENGES: Challenge[] = [
  // ---- Health and Physical (moderate). These began as one area and keep their
  // original 'phy-' ids; each is now filed under health or fitness. ----
  c('phy-01', 'fitness', 30, 'Walk for 30 minutes without your phone in your hand'),
  c('phy-02', 'fitness', 30, 'Do 50 push-ups across the day, in as many sets as it takes'),
  c('phy-03', 'fitness', 30, 'Do 75 bodyweight squats before dinner'),
  c('phy-04', 'fitness', 20, 'Stretch for 10 minutes before bed'),
  c('phy-05', 'health', 30, 'Finish your shower with 60 seconds of cold water'),
  c('phy-06', 'health', 30, 'No added sugar today'),
  c('phy-07', 'health', 20, 'Drink water only today. Coffee and tea are fine, nothing sweetened'),
  c('phy-08', 'fitness', 20, 'Take the stairs every time today'),
  c('phy-09', 'fitness', 30, 'Hold a plank for a total of 3 minutes today'),
  c('phy-10', 'health', 30, 'Be in bed, lights out, 30 minutes earlier than usual'),
  c('phy-11', 'health', 30, 'Eat nothing after 7 pm'),
  c('phy-12', 'fitness', 20, 'Stand up and move for 5 minutes every hour you are at a desk'),
  c('phy-13', 'fitness', 40, 'Get your heart rate up for 20 minutes straight: run, bike, row or ruck'),
  c('phy-14', 'health', 30, 'Eat a vegetable with every meal today'),
  c('phy-15', 'health', 20, 'Get 10 minutes of sunlight outside before noon'),
  c('phy-16', 'health', 30, 'No fast food and no eating out today'),
  c('phy-17', 'fitness', 30, 'Do 40 lunges and 40 sit-ups'),
  c('phy-18', 'fitness', 40, 'Walk or run 2 miles today'),
  c('phy-19', 'health', 20, 'No screens for the last 30 minutes before sleep'),
  c('phy-20', 'fitness', 30, 'Do 10 minutes of mobility work as soon as you get up'),

  // ---- Mental ----
  c('men-01', 'mental', 30, 'Read 20 pages of a real book'),
  c('men-02', 'mental', 40, 'Do 45 minutes of deep work on one thing, phone in another room'),
  c('men-03', 'mental', 30, 'No social media until after lunch'),
  c('men-04', 'mental', 20, "Write down tomorrow's three most important tasks before you stop today"),
  c('men-05', 'mental', 30, 'Learn one thing well enough to explain it to someone, then explain it'),
  c('men-06', 'mental', 30, 'Listen to a full sermon, lecture or long-form podcast with no multitasking'),
  c('men-07', 'mental', 20, 'Clear one space: your desk, your car or your inbox'),
  c('men-08', 'mental', 30, 'Do the task you have been avoiding first, before anything else'),
  c('men-09', 'mental', 30, 'Write one page by hand about a problem you are stuck on'),
  c('men-10', 'mental', 40, 'No entertainment screens today: no shows, no games, no scrolling'),
  c('men-11', 'mental', 20, 'Do one thing at a time today. Close every tab you are not using'),
  c('men-12', 'mental', 30, 'Spend 20 minutes practising a skill you want to be better at'),
  c('men-13', 'mental', 20, 'Read one long article from start to finish without switching away'),
  c('men-14', 'mental', 30, 'Keep your phone out of the bedroom tonight'),
  c('men-15', 'mental', 20, 'Memorize something short: a quote, a poem stanza or a phone number'),
  c('men-16', 'mental', 30, 'Plan the next seven days on paper'),
  c('men-17', 'mental', 30, 'Turn off every non-essential notification on your phone'),
  c('men-18', 'mental', 20, 'Write down three things you learned today'),
  c('men-19', 'mental', 30, 'Take a 20-minute walk with no audio and let your mind work'),
  c('men-20', 'mental', 40, 'Finish one thing you have left half-done'),

  // ---- Spiritual (scripture, prayer, fasting, memorizing, silence, gratitude, journaling) ----
  c('spi-01', 'spiritual', 30, 'Read a full chapter of Scripture slowly, twice'),
  c('spi-02', 'spiritual', 30, 'Pray for 15 minutes without asking for anything for yourself'),
  c('spi-03', 'spiritual', 40, 'Skip one meal today and spend that time in prayer'),
  c('spi-04', 'spiritual', 30, 'Memorize one verse and say it from memory tonight'),
  c('spi-05', 'spiritual', 30, 'Sit in complete silence for 10 minutes. No phone, no music, no agenda'),
  c('spi-06', 'spiritual', 20, 'Write down ten things you are grateful for'),
  c('spi-07', 'spiritual', 30, 'Journal one honest page about where you are with God right now'),
  c('spi-08', 'spiritual', 20, 'Read a Psalm out loud'),
  c('spi-09', 'spiritual', 30, 'Pray by name for five people'),
  c('spi-10', 'spiritual', 40, 'Fast from your phone until noon and give the first hour to Scripture and prayer'),
  c('spi-11', 'spiritual', 20, 'Review a verse you memorized before and write it out from memory'),
  c('spi-12', 'spiritual', 30, 'Read one chapter of a Gospel and write down one thing Jesus did or said'),
  c('spi-13', 'spiritual', 20, 'Before each meal today, stop and give thanks out loud'),
  c('spi-14', 'spiritual', 30, 'Take a 15-minute prayer walk'),
  c('spi-15', 'spiritual', 30, 'Write out a prayer by hand'),
  c('spi-16', 'spiritual', 30, 'Read a chapter of Proverbs and pick one verse to act on today'),
  c('spi-17', 'spiritual', 40, 'Fast from all entertainment today and give the evening to Scripture'),
  c('spi-18', 'spiritual', 20, 'End the day in silence: five minutes reviewing where you saw God at work'),
  c('spi-19', 'spiritual', 30, 'Journal about one thing you need to confess or let go of'),
  c('spi-20', 'spiritual', 20, 'Thank God for three hard things and what they are producing in you'),

  // ---- Relational ----
  c('rel-01', 'relational', 30, 'Call someone you have neglected. A call, not a text'),
  c('rel-02', 'relational', 20, 'Tell someone specifically what you appreciate about them'),
  c('rel-03', 'relational', 30, 'Have one meal today with no phone on the table'),
  c('rel-04', 'relational', 20, 'Send a handwritten note or a thoughtful message to encourage someone'),
  c('rel-05', 'relational', 30, 'Ask someone a real question and listen without turning it back to yourself'),
  c('rel-06', 'relational', 40, 'Apologize to someone you owe an apology'),
  c('rel-07', 'relational', 30, 'Do something for someone in your home without being asked or mentioning it'),
  c('rel-08', 'relational', 20, 'Learn the name of someone you see regularly and use it'),
  c('rel-09', 'relational', 30, 'Give someone 20 minutes of undivided attention'),
  c('rel-10', 'relational', 30, 'Reach out to someone who is going through something hard'),
  c('rel-11', 'relational', 40, 'Have the conversation you have been putting off'),
  c('rel-12', 'relational', 20, 'Start a conversation with someone you would normally walk past'),
  c('rel-13', 'relational', 30, 'Put a date on the calendar with someone who matters'),
  c('rel-14', 'relational', 20, 'Do not complain about anyone today'),
  c('rel-15', 'relational', 30, 'Ask someone you trust where you could grow, and just listen'),
  c('rel-16', 'relational', 20, 'Thank someone who rarely gets thanked'),
  c('rel-17', 'relational', 30, 'Check in on an older relative or a mentor'),
  c('rel-18', 'relational', 30, 'Serve someone today in a way that costs you time'),
  c('rel-19', 'relational', 20, 'Speak well of someone when they are not in the room'),
  c('rel-20', 'relational', 30, 'Invite someone to something: coffee, a meal, a walk or church'),

  // ---- Physical: more fitness ----
  c('fit-01', 'fitness', 30, 'Do 100 jumping jacks, broken up however you need'),
  c('fit-02', 'fitness', 40, 'Do a 20-minute strength session: push, pull, legs and core'),
  c('fit-03', 'fitness', 30, 'Carry something heavy for 10 minutes: a loaded pack, groceries or a kid'),
  c('fit-04', 'fitness', 20, 'Hang from a bar or do wall sits for a total of 2 minutes'),
  c('fit-05', 'fitness', 30, 'Take a brisk 15-minute walk after two of your meals today'),
  c('fit-06', 'fitness', 30, 'Do 30 burpees before the day ends'),
  c('fit-07', 'fitness', 20, 'Park at the far end of every lot today and walk'),

  // ---- Health: more rest, food and recovery ----
  c('hea-01', 'health', 30, 'Sleep at least 7 hours tonight. Set the alarm to go to bed, not just to get up'),
  c('hea-02', 'health', 20, 'Drink a full glass of water before each meal'),
  c('hea-03', 'health', 30, 'Get 30 grams of protein at breakfast'),
  c('hea-04', 'health', 20, 'No caffeine after noon'),
  c('hea-05', 'health', 30, 'Eat every meal today sitting down with no screen'),
  c('hea-06', 'health', 20, 'Stop eating when you are satisfied, not full, at every meal'),
  c('hea-07', 'health', 30, 'No alcohol and no soda today'),
  c('hea-08', 'health', 20, 'Take five slow breaths before each meal and before bed'),
  c('hea-09', 'health', 30, 'Cook one meal from whole ingredients'),
  c('hea-10', 'health', 20, 'Book or check off one overdue appointment: doctor, dentist or eye exam'),
]

export const CHALLENGE_BY_ID = new Map(CHALLENGES.map((ch) => [ch.id, ch]))

/** Whole days since 1970, independent of time zone and daylight saving. */
function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

/**
 * Which areas get a challenge on a given date. Three a day, stepping through the
 * five areas, so every area comes up three times in any five days.
 */
export function areasForDay(key: string): AreaId[] {
  const start = (dayNumber(key) * CHALLENGES_PER_DAY) % AREAS.length
  return Array.from({ length: CHALLENGES_PER_DAY }, (_, i) => AREAS[(start + i) % AREAS.length].id)
}

/** A random challenge from an area, avoiding recently used ones when possible. */
export function pickChallenge(
  area: AreaId,
  avoid: Set<string>,
  random: () => number = Math.random,
): Challenge {
  const pool = CHALLENGES.filter((ch) => ch.area === area)
  const fresh = pool.filter((ch) => !avoid.has(ch.id))
  const from = fresh.length > 0 ? fresh : pool
  return from[Math.floor(random() * from.length)]
}
