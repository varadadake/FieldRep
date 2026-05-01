import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Animated,
  Platform,
  StatusBar,
  Easing,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useVoice } from '@sociovate/samvaad'
import { SHOPS } from '../../src/data/shops'
import { searchShops } from '../../src/utils/search'
import { getShopStatuses, getVisits } from '../../src/utils/storage'
import ShopCard from '../../src/components/ShopCard'
import VoiceOrb from '../../src/components/VoiceOrb'

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

  const { isRecording, isProcessing, startRecording, stopAndProcess } = useVoice(null)

  const loadData = useCallback(async () => {
    const [s, visits] = await Promise.all([getShopStatuses(), getVisits()])
    setStatuses(s)
    const lv = {}
    for (const v of visits) {
      if (!lv[v.shopId]) lv[v.shopId] = v.timestamp
    }
    setLastVisits(lv)
  }, [])

  useFocusEffect(useCallback(() => { loadData() }, [loadData]))

  const filtered = useMemo(() => {
    if (!query.trim()) return SHOPS
    return searchShops(query)
  }, [query])

  const handleMicPress = useCallback(() => {
    if (isRecording) stopAndProcess()
    else if (!isProcessing) startRecording()
  }, [isRecording, isProcessing, startRecording, stopAndProcess])

  // Stats
  const visitedCount = Object.values(statuses).filter(s => s === 'visited').length
  const pendingCount = SHOPS.length - visitedCount

  // Status bar banner fade
  const bannerOpacity = useRef(new Animated.Value(0)).current
  const bannerY = useRef(new Animated.Value(-8)).current

  useEffect(() => {
    if (isRecording || isProcessing) {
      Animated.parallel([
        Animated.spring(bannerOpacity, { toValue: 1, useNativeDriver: true, speed: 20 }),
        Animated.spring(bannerY, { toValue: 0, useNativeDriver: true, speed: 20 }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(bannerOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(bannerY, { toValue: -8, duration: 300, useNativeDriver: true }),
      ]).start()
    }
  }, [isRecording, isProcessing])

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080C14" />
      <LinearGradient
        colors={['#080C14', '#0D1220', '#080C14']}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle radial glow top-center */}
      <View style={styles.topGlow} />

      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Header — orb lives here inline */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>FieldRep</Text>
            <Text style={styles.subtitle}>Today's Route</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statNum}>{visitedCount}</Text>
              <Text style={styles.statLabel}>done</Text>
            </View>
            <View style={[styles.statChip, styles.statChipPending]}>
              <Text style={[styles.statNum, { color: '#FFD60A' }]}>{pendingCount}</Text>
              <Text style={[styles.statLabel, { color: 'rgba(255,214,10,0.6)' }]}>left</Text>
            </View>
          </View>

          {/* Orb — inline, no own row */}
          <VoiceOrb
            isRecording={isRecording}
            isProcessing={isProcessing}
            onPress={handleMicPress}
          />
        </View>

        {/* State banner */}
        <Animated.View style={[
          styles.banner,
          {
            opacity: bannerOpacity,
            transform: [{ translateY: bannerY }],
            backgroundColor: isRecording ? 'rgba(255,59,48,0.12)' : 'rgba(79,142,247,0.12)',
            borderColor: isRecording ? 'rgba(255,59,48,0.25)' : 'rgba(79,142,247,0.25)',
          }
        ]}>
          <View style={[styles.bannerDot, { backgroundColor: isRecording ? '#FF3B30' : '#4F8EF7' }]} />
          <Text style={[styles.bannerText, { color: isRecording ? '#FF6B6B' : '#7BA8FF' }]}>
            {isRecording ? 'Listening — tap to send' : 'Processing…'}
          </Text>
        </Animated.View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.search}
            placeholder="Search shops…"
            placeholderTextColor="#4A4A55"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            selectionColor="#4F8EF7"
          />
          {query.length > 0 && (
            <Text style={styles.searchClear} onPress={() => setQuery('')}>✕</Text>
          )}
        </View>

        {/* List */}
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
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>◉</Text>
              <Text style={styles.empty}>No shops match</Text>
            </View>
          }
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080C14' },
  safe: { flex: 1 },
  topGlow: {
    position: 'absolute',
    top: -80,
    left: '20%',
    width: '60%',
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(79,142,247,0.08)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 2,
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#F5F5F7',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 13,
    color: '#636366',
    marginTop: 1,
    letterSpacing: 0.2,
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  statChip: {
    alignItems: 'center',
    backgroundColor: 'rgba(48,209,88,0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(48,209,88,0.15)',
  },
  statChipPending: {
    backgroundColor: 'rgba(255,214,10,0.08)',
    borderColor: 'rgba(255,214,10,0.15)',
  },
  statNum: { fontSize: 17, fontWeight: '800', color: '#30D158' },
  statLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(48,209,88,0.6)', letterSpacing: 0.5 },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  bannerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  bannerText: { fontSize: 13, fontWeight: '600' },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: { fontSize: 18, color: '#636366', marginRight: 8, marginTop: 1 },
  search: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F5F5F7',
  },
  searchClear: { fontSize: 13, color: '#636366', paddingLeft: 8 },

  // Empty
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 32, color: '#2A2A35', marginBottom: 12 },
  empty: { fontSize: 14, color: '#3A3A45' },
})
