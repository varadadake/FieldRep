import React, { useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { getVisits } from '../../src/utils/storage'

const PAYMENT_LABELS = {
  cash: 'Cash Collected',
  credit: 'Credit (Pay Later)',
  pending: 'Payment Pending',
}

const formatTime = (iso) => {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function VisitLog() {
  const [visits, setVisits] = useState([])

  useFocusEffect(
    useCallback(() => {
      getVisits().then(setVisits)
    }, [])
  )

  const visited = visits.length
  const orders = visits.filter((v) => v.outcome === 'order').length
  const noOrders = visits.filter((v) => v.outcome === 'no_order').length

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Visits</Text>
        <Text style={styles.summary}>
          {visited} visited · {orders} orders · {noOrders} no order
        </Text>
      </View>
      <FlatList
        data={visits}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowTop}>
              <Text style={styles.shopName}>{item.shopName}</Text>
              <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
            </View>
            <Text style={styles.outcome}>
              {item.outcome === 'order' ? 'Order logged' : 'No order'}
            </Text>
            {item.outcome === 'order' && item.items?.length > 0 && (
              <View style={styles.items}>
                {item.items.map((it) => (
                  <Text key={it.productId} style={styles.itemLine}>
                    • {it.productName} ×{it.qty}
                  </Text>
                ))}
              </View>
            )}
            <Text style={styles.payment}>
              {PAYMENT_LABELS[item.payment] || 'Payment Pending'}
            </Text>
            {item.notes ? <Text style={styles.notes}>“{item.notes}”</Text> : null}
            {item.nextFollowUp ? (
              <Text style={styles.followup}>
                Next follow-up: {new Date(item.nextFollowUp).toLocaleDateString()}
              </Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No visits logged yet.</Text>}
        contentContainerStyle={{ paddingVertical: 6, paddingBottom: 20 }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: '800', color: '#111' },
  summary: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginVertical: 6,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopName: { fontSize: 16, fontWeight: '700', color: '#111' },
  time: { fontSize: 12, color: '#6B7280' },
  outcome: { fontSize: 13, color: '#2563EB', marginTop: 4, fontWeight: '600' },
  items: { marginTop: 6 },
  itemLine: { fontSize: 13, color: '#374151', marginVertical: 1 },
  payment: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  notes: { fontSize: 13, color: '#374151', marginTop: 6, fontStyle: 'italic' },
  followup: { fontSize: 12, color: '#991B1B', marginTop: 4 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
})
