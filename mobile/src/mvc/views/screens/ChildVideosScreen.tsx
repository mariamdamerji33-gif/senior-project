import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import YoutubeIframe from 'react-native-youtube-iframe'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ParentActivitiesParamList } from '../../../navigation/parentDrawerTypes'
import { DAILY_CLIP_ORDER, type DailyClipId } from '../../../config/dailySupportedVideoUrls'
import { buildDailyClips, CHILD_VIDEOS_UI } from '../../../config/dailySupportedVideos'
import { useLanguage } from '../../controllers/LanguageController'
import { useSetChildActivityScreenTitle } from '../../../navigation/childActivityScreenTitles'

type Props = NativeStackScreenProps<ParentActivitiesParamList, 'ChildVideos'>

export function ChildVideosScreen({ route, navigation }: Props) {
  useSetChildActivityScreenTitle(navigation, 'ChildVideos')
  const childName = route.params?.childName || 'Child'
  const { language, isArabic } = useLanguage()
  const { width } = useWindowDimensions()
  const ui = CHILD_VIDEOS_UI[language]
  const clips = useMemo(() => buildDailyClips(language), [language])

  const todayIndex = new Date().getDay()
  const dailyVideo = clips[todayIndex] ?? clips[0]
  const [selectedId, setSelectedId] = useState<DailyClipId>(() => DAILY_CLIP_ORDER[todayIndex] ?? DAILY_CLIP_ORDER[0])
  const selectedVideo = clips.find((c) => c.id === selectedId) ?? dailyVideo

  const [videoError, setVideoError] = useState<string | null>(null)
  const playerWidth = Math.min(width - 60, 560)
  const playerHeight = Math.max(205, Math.round(playerWidth * 0.5625))

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={[styles.subtitle, isArabic && styles.rtlText]}>{ui.screenSubtitle(childName)}</Text>
        <Text style={[styles.disclaimer, isArabic && styles.rtlText]}>{ui.disclaimer}</Text>

        <View style={styles.dailyCard}>
          <Text style={[styles.dailyLabel, !isArabic && styles.uppercase, isArabic && styles.rtlText]}>{ui.dailyLabel}</Text>
          <Text style={[styles.dailyTitle, isArabic && styles.rtlText]}>
            {dailyVideo.day}: {dailyVideo.title}
          </Text>
          <Text style={[styles.durationPill, isArabic && styles.rtlText]}>
            {ui.durationLabel}: {dailyVideo.source.durationLabel}
          </Text>
          <Text style={[styles.dailyText, isArabic && styles.rtlText]}>{dailyVideo.description}</Text>
          <Text style={[styles.dailyPracticeText, isArabic && styles.rtlText]}>
            {ui.practiceLabel}: {dailyVideo.practice}
          </Text>
          <Text style={[styles.dailyTip, isArabic && styles.rtlText]}>{dailyVideo.grownUpTip}</Text>
          <Pressable
            style={styles.dailyBtn}
            onPress={() => {
              setVideoError(null)
              setSelectedId(dailyVideo.id)
            }}
          >
            <Text style={styles.dailyBtnText}>{ui.playToday}</Text>
          </Pressable>
        </View>

        <View style={styles.playerCard}>
          <YoutubeIframe
            key={selectedVideo.id}
            height={playerHeight}
            width={playerWidth}
            videoId={selectedVideo.source.youtubeId}
            initialPlayerParams={{
              controls: true,
              rel: false,
              preventFullScreen: false,
              start: selectedVideo.source.startSeconds,
              end: selectedVideo.source.endSeconds,
              showClosedCaptions: true,
              playerLang: language,
            }}
            viewContainerStyle={styles.video}
            onReady={() => setVideoError(null)}
            onError={() => setVideoError(ui.loadError)}
          />
          {videoError ? <Text style={[styles.videoError, isArabic && styles.rtlText]}>{videoError}</Text> : null}
          <Text style={[styles.nowPlaying, !isArabic && styles.uppercase, isArabic && styles.rtlText]}>{ui.nowPlaying}</Text>
          <Text style={[styles.videoTitle, isArabic && styles.rtlText]}>{selectedVideo.title}</Text>
          <Text style={[styles.videoDuration, isArabic && styles.rtlText]}>
            {ui.durationLabel}: {selectedVideo.source.durationLabel}
          </Text>
          <Text style={[styles.practiceText, isArabic && styles.rtlText]}>
            {ui.practiceLabel}: {selectedVideo.practice}
          </Text>
          <Text style={[styles.videoTip, isArabic && styles.rtlText]}>{selectedVideo.grownUpTip}</Text>
        </View>

        <Text style={[styles.weekHeading, isArabic && styles.rtlText]}>{ui.weekPlan}</Text>
        <View style={styles.list}>
          {clips.map((video) => {
            const isSelected = video.id === selectedVideo.id
            const isToday = video.id === dailyVideo.id
            return (
              <Pressable
                key={video.id}
                style={[styles.videoCard, isSelected && styles.videoCardActive, isToday && styles.videoCardToday]}
                onPress={() => {
                  setVideoError(null)
                  setSelectedId(video.id)
                }}
              >
                <View style={styles.cardTopRow}>
                  <Text style={[styles.cardDay, !isArabic && styles.uppercase, isArabic && styles.rtlText]}>{video.day}</Text>
                  {isToday ? <Text style={styles.todayBadge}>{ui.todayBadge}</Text> : null}
                </View>
                <Text style={[styles.cardTitle, isSelected && styles.cardTitleActive, isArabic && styles.rtlText]}>
                  {video.title}
                </Text>
                <Text style={[styles.cardDuration, isArabic && styles.rtlText]}>
                  {ui.durationLabel}: {video.source.durationLabel}
                </Text>
                <Text style={[styles.cardText, isArabic && styles.rtlText]}>{video.description}</Text>
                <Text style={[styles.cardPractice, isArabic && styles.rtlText]}>
                  {ui.practiceLabel}: {video.practice}
                </Text>
                <Text style={[styles.cardTip, isArabic && styles.rtlText]}>{video.grownUpTip}</Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  wrap: { padding: 18, gap: 12 },
  subtitle: { color: '#534c62', marginBottom: 2, lineHeight: 22, fontWeight: '700' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  disclaimer: {
    fontSize: 12,
    color: '#6b6280',
    lineHeight: 18,
    backgroundColor: '#f2eff9',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfd6ee',
  },
  dailyCard: {
    backgroundColor: '#211a2e',
    borderRadius: 18,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#302844',
  },
  uppercase: { textTransform: 'uppercase' },
  dailyLabel: { color: '#c4b5fd', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  dailyTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  durationPill: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '900',
  },
  dailyText: { color: '#ddd6fe', lineHeight: 20 },
  dailyPracticeText: { color: '#fff', lineHeight: 20, fontWeight: '900', marginTop: 4 },
  practiceText: { color: '#3b3150', lineHeight: 20, fontWeight: '800', marginTop: 6 },
  dailyTip: { color: '#c4b5fd', fontSize: 12, lineHeight: 17, marginTop: 4, opacity: 0.95 },
  dailyBtn: { marginTop: 6, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center' },
  dailyBtnText: { color: '#6d46d4', fontWeight: '900' },
  playerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 12,
    shadowColor: '#4c3575',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  video: { alignSelf: 'center', overflow: 'hidden', borderRadius: 12, backgroundColor: '#171326' },
  videoError: { marginTop: 8, color: '#b45309', fontWeight: '700', fontSize: 13, lineHeight: 18 },
  nowPlaying: { marginTop: 10, color: '#6d46d4', fontSize: 12, fontWeight: '800' },
  videoTitle: { marginTop: 2, color: '#211a2e', fontWeight: '800', fontSize: 17 },
  videoDuration: { marginTop: 4, color: '#6d46d4', fontSize: 12, fontWeight: '900' },
  videoTip: { marginTop: 6, color: '#7c7392', fontSize: 12, lineHeight: 17 },
  weekHeading: { fontSize: 15, fontWeight: '800', color: '#17131f', marginTop: 4 },
  list: { gap: 10 },
  videoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dfd6ee',
    padding: 14,
  },
  videoCardActive: { borderColor: '#6d46d4', backgroundColor: '#f1ecff' },
  videoCardToday: { borderColor: '#22c55e', borderWidth: 2 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardDay: { color: '#6d46d4', fontSize: 12, fontWeight: '900', marginBottom: 4 },
  todayBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: '#166534',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardTitle: { color: '#17131f', fontWeight: '800' },
  cardTitleActive: { color: '#6d46d4' },
  cardDuration: { color: '#6d46d4', marginTop: 4, fontSize: 12, fontWeight: '900' },
  cardText: { color: '#7c7392', marginTop: 4, lineHeight: 19 },
  cardPractice: { color: '#3b3150', marginTop: 8, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  cardTip: { color: '#9c94b0', marginTop: 8, fontSize: 12, lineHeight: 17 },
})
