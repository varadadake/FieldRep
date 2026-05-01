import React, { useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'

const STATUS_CONFIG = {
  visited: { label: 'Visited', dot: '#30D158', bg: 'rgba(48,209,88,0.12)', text: '#30D158' },
  pending: { label: 'Pending', dot: '#FFD60A', bg: 'rgba(255,214,10,0.10)', text: '#FFD60A' },
  followup: { label: 'Follow-up', dot: '#FF453A', bg: 'rgba(255,69,58,0.12)', text: '#FF453A' },
}

const getInitials = (name) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

export default function ShopCard({ shop, status, lastVisit, onPress }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const scale = useRef(new Animated.Value(1)).current

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start()
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start()

  return (
    <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={[styles.strip, { backgroundColor: config.dot }]} />
        <View style={[styles.avatar, { backgroundColor: config.bg }]}>
          <Text style={[styles.avatarText, { color: config.dot }]}>{getInitials(shop.name)}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.name} numberOfLines={1}>{shop.name}</Text>
          <Text style={styles.area}>{shop.area}</Text>
          <Text style={styles.visit}>
            {lastVisit ? `Last visit ${lastVisit}` : 'Not yet visited'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
          <View style={[styles.dot, { backgroundColor: config.dot }]} />
          <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 5,
    paddingVertical: 14,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  strip: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: '800' },
  content: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#F5F5F7', letterSpacing: -0.3 },
  area: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  visit: { fontSize: 11, color: '#636366', marginTop: 3 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
})
