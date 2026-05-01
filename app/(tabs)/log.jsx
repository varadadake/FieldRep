import React, { useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect } from 'expo-router'
import { getVisits } from '../../src/utils/storage'

const PAYMENT_CONFIG = {
  cash: { label: 'Cash', color: '#30D158', icon: '✦' },
  credit: { label: 'Credit', color: '#4F8EF7', icon: '◈' },
  pending: { label: 'Pending', color: '#FFD60A', icon: '◎' },
}

const formatTime = (iso) => {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

const formatDate = (iso) => {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return 'Today'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

export default function VisitLog() {
  const [visits, setVisits] = useState([])

  useFocusEffect(
    useCallback(() => { getVisits().then(setVisits) }, [])
  )

  const visited = visits.length
  const orders = visits.filter((v) => v.outcome === 'order').length
  const noOrders = visits.filter((v) => v.outcome === 'no_order').length

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080C14" />
      <LinearGradient colors={['#080C14', '#0D1220', '#080C14']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Visit Log</Text>
          <Text style={styles.date}>{formatDate(new Date().toISOString())}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{visited}</Text>
            <Text style={styles.statLabel}>Visited</Text>
          </View>
          <View style={[styles.statCard, { borderColor: 'rgba(48,209,88,0.2)' }]}>
            <Text style={[styles.statNum, { color: '#30D158' }]}>{orders}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={[styles.statCard, { borderColor: 'rgba(255,69,58,0.2)' }]}>
            <Text style={[styles.statNum, { color: '#FF453A' }]}>{noOrders}</Text>
            <Text style={styles.statLabel}>No Order</Text>
          </View>
        </View>

        <FlatList
          data={visits}
          keyExtractor={(v) => v.id}
          renderItem={({ item }) => {
            const pay = PAYMENT_CONFIG[item.payment] || PAYMENT_CONFIG.pending
            const isOrder = item.outcome === 'order'
            return (
              <View style={styles.card}>
                {/* Top row */}
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.outcomeTag, {
                      backgroundColor: isOrder ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.08)',
                    }]}>
                      <Text style={[styles.outcomeText, { color: isOrder ? '#30D158' : '#FF453A' }]}>
                        {isOrder ? '↑ Order' : '— No order'}
                      </Text>
                    </View>
                    <Text style={styles.shopName}>{item.shopName}</Text>
                  </View>
                  <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
                </View>

                {/* Items */}
                {isOrder && item.items?.length > 0 && (
                  <View style={styles.itemsWrap}>
                    {item.items.map((it, i) => (
                      <View key={i} style={styles.itemRow}>
                        <View style={styles.itemDot} />
                        <Text style={styles.itemName}>{it.productName}</Text>
                        <Text style={styles.itemQty}>×{it.qty}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Footer */}
                <View style={styles.cardFooter}>
                  <View style={[styles.payBadge, { backgroundColor: `${pay.color}15` }]}>
                    <Text style={{ color: pay.color, fontSize: 10, fontWeight: '700' }}>
                      {pay.icon} {pay.label}
                    </Text>
                  </View>
                  {item.nextFollowUp && (
                    <Text style={styles.followup}>
                      ↻ {new Date(item.nextFollowUp).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                    </Text>
                  )}
                  {item.notes ? (
                    <Text style={styles.notes} numberOfLines={1}>"{item.notes}"</Text>
                  ) : null}
                </View>
              </View>
            )
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>◎</Text>
              <Text style={styles.empty}>No visits yet today</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  title: { fontSize: 30, fontWeight: '800', color: '#F5F5F7', letterSpacing: -1 },
  date: { fontSize: 13, color: '#636366', marginBottom: 3 },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statNum: { fontSize: 24, fontWeight: '800', color: '#F5F5F7' },
  statLabel: { fontSize: 11, color: '#636366', marginTop: 2, fontWeight: '600', letterSpacing: 0.3 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 5,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardLeft: { flex: 1 },
  outcomeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 5,
  },
  outcomeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  shopName: { fontSize: 16, fontWeight: '700', color: '#F5F5F7', letterSpacing: -0.3 },
  time: { fontSize: 12, color: '#636366' },

  itemsWrap: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 5,
  },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4F8EF7' },
  itemName: { flex: 1, fontSize: 13, color: '#C0C0CC' },
  itemQty: { fontSize: 13, fontWeight: '700', color: '#4F8EF7' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  payBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  followup: { fontSize: 11, color: '#FF9F0A', fontWeight: '600' },
  notes: { fontSize: 12, color: '#636366', fontStyle: 'italic', flex: 1 },

  emptyWrap: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 36, color: '#2A2A35', marginBottom: 12 },
  empty: { fontSize: 14, color: '#3A3A45' },
})
