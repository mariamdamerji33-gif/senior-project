import { StyleSheet, Text, View } from 'react-native'
import { getActivityResultCopy } from '../../../config/parentFlowsLocale'
import { useLanguage } from '../../controllers/LanguageController'

type Props = {
  score: number
  date: string
}

export function ActivityResultCard({ score, date }: Props) {
  const { language, isArabic } = useLanguage()
  const copy = getActivityResultCopy(language)

  return (
    <View style={styles.card}>
      <Text style={[styles.title, isArabic && styles.rtl]}>{copy.title}</Text>
      <Text style={[styles.score, isArabic && styles.rtl]}>{copy.score(score)}</Text>
      <Text style={[styles.date, isArabic && styles.rtl]}>{date}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  rtl: { textAlign: 'right', writingDirection: 'rtl', alignSelf: 'stretch' },
  title: { color: '#64748b', fontWeight: '600' },
  score: { color: '#0f172a', fontWeight: '700' },
  date: { color: '#64748b' },
})
