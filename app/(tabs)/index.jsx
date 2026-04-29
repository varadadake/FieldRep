import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { VoiceSDK } from '@sociovate/samvaad'
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
  const [recording, setRecording] = useState(false)

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
    useCallback(() => {
      loadData()
    }, [loadData])
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return SHOPS
    return searchShops(query)
  }, [query])

  const startVoice = () => {
    setRecording(true)
    VoiceSDK.startRecording()
  }

  const stopVoice = () => {
    setRecording(false)
    VoiceSDK.stopRecordingAndProcess()
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>FieldRep</Text>
          <Text style={styles.subtitle}>{SHOPS.length} shops on route</Text>
        </View>
        <TouchableOpacity
          style={[styles.micBtn, recording && styles.micBtnActive]}
          onPressIn={startVoice}
          onPressOut={stopVoice}
        >
          <Text style={styles.micIcon}>{recording ? '⏹' : '🎙'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search shops..."
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
      </View>
      {recording && (
        <View style={styles.listeningBar}>
          <Text style={styles.listeningText}>Listening... release when done</Text>
        </View>
      )}
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
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  micBtnActive: { backgroundColor: '#DC2626' },
  micIcon: { fontSize: 22 },
  listeningBar: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    alignItems: 'center',
  },
  listeningText: { color: '#DC2626', fontWeight: '600', fontSize: 13 },
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
