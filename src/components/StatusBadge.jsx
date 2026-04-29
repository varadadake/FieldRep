import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

const LABELS = {
  visited: 'Visited',
  pending: 'Pending',
  followup: 'Follow-up Due',
}

const COLORS = {
  visited: { bg: '#DCFCE7', fg: '#166534' },
  pending: { bg: '#FEF3C7', fg: '#92400E' },
  followup: { bg: '#FEE2E2', fg: '#991B1B' },
}

export default function StatusBadge({ status = 'pending' }) {
  const c = COLORS[status] || COLORS.pending
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{LABELS[status] || 'Pending'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
})
