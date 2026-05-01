import React, { useEffect, useRef } from 'react'
import { Animated, TouchableOpacity, View, Text, StyleSheet, Easing } from 'react-native'

const ORB = 44

export default function VoiceOrb({ isRecording, isProcessing, onPress }) {
  const ring1Scale = useRef(new Animated.Value(1)).current
  const ring1Opacity = useRef(new Animated.Value(0)).current
  const ring2Scale = useRef(new Animated.Value(1)).current
  const ring2Opacity = useRef(new Animated.Value(0)).current
  const orbScale = useRef(new Animated.Value(1)).current
  const spinVal = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (isRecording) {
      const makeRing = (scale, opacity, delay) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(scale, { toValue: 2.0, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.sequence([
                Animated.timing(opacity, { toValue: 0.45, duration: 80, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 1420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              ]),
            ]),
            Animated.parallel([
              Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
          ])
        )

      const r1 = makeRing(ring1Scale, ring1Opacity, 0)
      const r2 = makeRing(ring2Scale, ring2Opacity, 750)
      const breathe = Animated.loop(
        Animated.sequence([
          Animated.timing(orbScale, { toValue: 1.05, duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(orbScale, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      )
      r1.start(); r2.start(); breathe.start()
      return () => {
        r1.stop(); r2.stop(); breathe.stop()
        ring1Scale.setValue(1); ring1Opacity.setValue(0)
        ring2Scale.setValue(1); ring2Opacity.setValue(0)
        Animated.timing(orbScale, { toValue: 1, duration: 150, useNativeDriver: true }).start()
      }
    }
  }, [isRecording])

  useEffect(() => {
    if (isProcessing) {
      const spin = Animated.loop(
        Animated.timing(spinVal, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
      )
      spin.start()
      return () => { spin.stop(); spinVal.setValue(0) }
    }
  }, [isProcessing])

  useEffect(() => {
    if (!isRecording && !isProcessing) {
      const idle = Animated.loop(
        Animated.sequence([
          Animated.timing(orbScale, { toValue: 1.04, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(orbScale, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      )
      idle.start()
      return () => idle.stop()
    }
  }, [isRecording, isProcessing])

  const spinDeg = spinVal.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const ringColor = isRecording ? 'rgba(255,69,58,0.55)' : 'rgba(79,142,247,0.4)'
  const orbBg = isRecording ? '#FF3B30' : '#1C1C1E'

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      {/* Fixed box so rings center on orb */}
      <View style={styles.box}>
        {/* Rings — centered absolutely */}
        <Animated.View style={[styles.ring, { borderColor: ringColor, opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />
        <Animated.View style={[styles.ring, { borderColor: ringColor, opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />

        {/* Spin arc */}
        {isProcessing && (
          <Animated.View style={[styles.spinArc, { transform: [{ rotate: spinDeg }] }]} />
        )}

        {/* Orb */}
        <Animated.View style={[styles.orb, { backgroundColor: orbBg, transform: [{ scale: orbScale }] }]}>
          <View style={styles.micBody} />
          <View style={styles.micBase} />
        </Animated.View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  box: {
    width: ORB + 40,   // enough room for rings to expand, no wasted space
    height: ORB + 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    borderWidth: 1,
  },
  spinArc: {
    position: 'absolute',
    width: ORB + 12,
    height: ORB + 12,
    borderRadius: (ORB + 12) / 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderTopColor: '#4F8EF7',
  },
  orb: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  micBody: {
    width: 9,
    height: 14,
    borderRadius: 5,
    backgroundColor: '#4F8EF7',
  },
  micBase: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(79,142,247,0.45)',
  },
})
