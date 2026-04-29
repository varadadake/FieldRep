import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import StatusBadge from './StatusBadge'

export default function ShopCard({ shop, status, lastVisit, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{shop.name}</Text>
          <Text style={styles.area}>{shop.area}</Text>
          <Text style={styles.last}>
            Last visit: {lastVisit ? lastVisit : 'Never'}
          </Text>
        </View>
        <StatusBadge status={status || 'pending'} />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: { fontSize: 16, fontWeight: '700', color: '#111' },
  area: { fontSize: 13, color: '#555', marginTop: 2 },
  last: { fontSize: 12, color: '#888', marginTop: 4 },
})
