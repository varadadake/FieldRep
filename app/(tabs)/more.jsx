import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function More() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>More</Text>
      <View style={styles.body}>
        <Text style={styles.text}>Settings and additional features coming soon.</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', paddingHorizontal: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#111', paddingTop: 8 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#6B7280', fontSize: 14 },
})
