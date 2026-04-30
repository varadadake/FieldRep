import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { useVoice } from '@sociovate/samvaad'
import { SHOPS } from '../../src/data/shops'
import { searchShops } from '../../src/utils/search'
import { getShopStatuses, getVisits } from '../../src/utils/storage'
import ShopCard from '../../src/components/ShopCard'

const formatDate = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

export default function ShopList() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [statuses, setStatuses] = useState({})
  const [lastVisits, setLastVisits] = useState({})

  // Global mic on the list page — intents handled by _layout.jsx, so no local callback
  const { isRecording, isProcessing, error, startRecording, stopAndProcess } = useVoice(null)

  const loadData = useCallback(async () => {
    const [s, visits] = await Promise.all([getShopStatuses(), getVisits()])
    setStatuses(s)
    const lv = {}
    for (const v of visits) {
      if (!lv[v.shopId]) lv[v.shopId] = v.timestamp
    }
    setLastVisits(lv)
  }, [])

  useFocusEffect(
    useCallback(() => { loadData() }, [loadData])
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return SHOPS
    return searchShops(query)
  }, [query])

  // Tap toggles record → stop+process
  const handleMicPress = useCallback(() => {
    if (isRecording) stopAndProcess()
    else if (!isProcessing) startRecording()
  }, [isRecording, isProcessing, startRecording, stopAndProcess])

  // Pulse while recording
  const pulse = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start()
    } else {
      pulse.stopAnimation()
      Animated.timing(pulse, { toValue: 1, duration: 100, useNativeDriver: true }).start()
    }
  }, [isRecording])

  const micBg = isRecording ? '#DC2626' : isProcessing ? '#6B7280' : '#2563EB'
  const micIcon = isRecording ? '⏹' : isProcessing ? '⏳' : '🎙'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>FieldRep</Text>
          <Text style={styles.subtitle}>{SHOPS.length} shops on route</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <TouchableOpacity
            style={[styles.micBtn, { backgroundColor: micBg }]}
            onPress={handleMicPress}
            disabled={false}
            activeOpacity={0.75}
          >
            <Text style={styles.micIcon}>{micIcon}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {isRecording && (
        <View style={styles.recordingBar}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Listening — tap the button again to send</Text>
        </View>
      )}

      {isProcessing && (
        <View style={styles.processingBar}>
          <Text style={styles.processingText}>Processing your voice…</Text>
        </View>
      )}

      {error && !isRecording && !isProcessing && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error.message || 'Error — try again'}</Text>
        </View>
      )}

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search shops..."
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ShopCard
            shop={item}
            status={statuses[String(item.id)] || 'pending'}
            lastVisit={formatDate(lastVisits[item.id])}
            onPress={() => router.push(`/order/${item.id}`)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No shops match.</Text>}
        contentContainerStyle={{ paddingVertical: 6, paddingBottom: 20 }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#111' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  micBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  micIcon: { fontSize: 22 },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  recordingText: { fontSize: 13, color: '#991B1B', fontWeight: '600' },
  processingBar: {
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BAE6FD',
  },
  processingText: { fontSize: 13, color: '#0369A1', fontWeight: '600' },
  errorBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  errorText: { fontSize: 13, color: '#991B1B', textAlign: 'center' },
  searchWrap: { paddingHorizontal: 12, paddingVertical: 10 },
  search: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
})
