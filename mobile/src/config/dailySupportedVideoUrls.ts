/**
 * Seven short weekly lessons for the child video screen.
 *
 * These use YouTube IDs because Expo's native Video player cannot play normal
 * YouTube pages. The screen renders them through a WebView iframe and limits
 * longer videos to a focused 2-3 minute segment with start/end seconds.
 */
export type DailyClipId =
  | 'regulation'
  | 'predictable-start'
  | 'routine-story'
  | 'feelings-names'
  | 'sounds-words'
  | 'social-practice'
  | 'celebration'

export const DAILY_CLIP_ORDER: DailyClipId[] = [
  'regulation',
  'predictable-start',
  'routine-story',
  'feelings-names',
  'sounds-words',
  'social-practice',
  'celebration',
]

export type DailyVideoSource = {
  youtubeId: string
  startSeconds?: number
  endSeconds?: number
  durationLabel: string
}

export const DAILY_VIDEO_SOURCES: Record<DailyClipId, DailyVideoSource> = {
  // Sunday
  regulation: { youtubeId: 'icxBzytbt8Y', durationLabel: '1:56' },
  // Monday
  'predictable-start': { youtubeId: 'cxXd44yA23g', startSeconds: 0, endSeconds: 150, durationLabel: '2:30' },
  // Tuesday
  'routine-story': { youtubeId: 'Z9Quf7xRWPE', startSeconds: 0, endSeconds: 150, durationLabel: '2:30' },
  // Wednesday
  'feelings-names': { youtubeId: 'Nbo8Q7-APwE', durationLabel: '2:22' },
  // Thursday
  'sounds-words': { youtubeId: '1i78qSqUDqI', startSeconds: 0, endSeconds: 165, durationLabel: '2:45' },
  // Friday
  'social-practice': { youtubeId: '4h6Fdy5mNQQ', startSeconds: 0, endSeconds: 165, durationLabel: '2:45' },
  // Saturday
  celebration: { youtubeId: 'uqjMf6_qLHk', durationLabel: '1:01' },
}

export function resolveDailyVideoSource(id: DailyClipId): DailyVideoSource {
  return DAILY_VIDEO_SOURCES[id]
}
