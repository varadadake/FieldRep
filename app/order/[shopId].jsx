import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SHOPS } from '../../src/data/shops'
import { findProduct } from '../../src/utils/search'
import ProductSearch from '../../src/components/ProductSearch'
import { createVisit, setShopStatus } from '../../src/utils/storage'
import { useVoice } from '@sociovate/samvaad'

const PAYMENT_OPTIONS = [
  { key: 'cash', label: 'Cash' },
  { key: 'credit', label: 'Credit' },
  { key: 'pending', label: 'Pending' },
]

function parsePaymentKey(raw) {
  if (!raw) return null
  const l = raw.toLowerCase()
  if (l.includes('credit') || l.includes('baad') || l.includes('udhaar')) return 'credit'
  if (l.includes('cash') || l.includes('nakit') || l.includes('naqd')) return 'cash'
  if (l.includes('pending')) return 'pending'
  return null
}

function intentItemsToOrderItems(intentItems) {
  return (intentItems || [])
    .map((it) => {
      const nameGuess = it.product || it.product_name || it.name || ''
      const product = findProduct(nameGuess)
      const qty = parseInt(it.qty ?? it.quantity ?? 1, 10)
      return {
        productId: product?.id ?? null,
        productName: product?.name ?? nameGuess,
        qty: isNaN(qty) || qty < 1 ? 1 : qty,
      }
    })
    .filter((it) => it.productName)
}

export default function OrderEntry() {
  const { shopId } = useLocalSearchParams()
  const router = useRouter()
  const shop = useMemo(() => SHOPS.find((s) => String(s.id) === String(shopId)), [shopId])

  const [items, setItems] = useState([])
  const [payment, setPayment] = useState('pending')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // ── Voice ─────────────────────────────────────────────────────────────────
  const handleIntent = useCallback((intent) => {
    if (intent.name !== 'log_order') return
    const newItems = intentItemsToOrderItems(intent.params.items)
    if (newItems.length > 0) setItems(newItems)
    const paymentKey = parsePaymentKey(intent.params.payment)
    if (paymentKey) setPayment(paymentKey)
    showToast(newItems.map((it) => `${it.productName} ×${it.qty}`).join(', ') || 'Order filled — review below')
  }, [])

  const { isRecording, isProcessing, error: voiceError, startRecording, stopAndProcess } = useVoice(handleIntent)

  // Elapsed timer while processing so user sees it's not frozen
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!isProcessing) { setElapsed(0); return }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [isProcessing])

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
          Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start()
    } else {
      pulse.stopAnimation()
      Animated.timing(pulse, { toValue: 1, duration: 150, useNativeDriver: true }).start()
    }
  }, [isRecording])

  // ── Helpers ───────────────────────────────────────────────────────────────
  if (!shop) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ padding: 20 }}>Shop not found.</Text>
      </SafeAreaView>
    )
  }

  const addProduct = (p) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.productId === p.id)
      if (existing) return prev.map((it) => it.productId === p.id ? { ...it, qty: it.qty + 1 } : it)
      return [...prev, { productId: p.id, productName: p.name, qty: 1 }]
    })
  }

  const updateQty = (productId, qty) => {
    const n = parseInt(qty, 10)
    setItems((prev) => prev.map((it) => it.productId === productId ? { ...it, qty: isNaN(n) ? 0 : n } : it))
  }

  const removeItem = (productId) => setItems((prev) => prev.filter((it) => it.productId !== productId))

  const submitOrder = async () => {
    if (items.length === 0 || submitting) return
    setSubmitting(true)
    await createVisit({ shopId: shop.id, shopName: shop.name, outcome: 'order', items: items.filter((it) => it.qty > 0), payment, notes, nextFollowUp: null })
    await setShopStatus(shop.id, 'visited')
    Alert.alert('Order logged ✓', '', [{ text: 'OK', onPress: () => router.back() }])
  }

  const markNoOrder = async () => {
    if (submitting) return
    setSubmitting(true)
    await createVisit({ shopId: shop.id, shopName: shop.name, outcome: 'no_order', items: [], payment: 'pending', notes, nextFollowUp: null })
    await setShopStatus(shop.id, 'visited')
    Alert.alert('Visit logged ✓', '', [{ text: 'OK', onPress: () => router.back() }])
  }

  // ── Derived button state ──────────────────────────────────────────────────
  const btnBg = isRecording ? '#DC2626' : isProcessing ? '#6B7280' : '#16A34A'
  const btnLabel = isRecording ? 'Tap to stop & send' : isProcessing ? `Processing… ${elapsed}s` : 'Tap to speak'
  const btnIcon = isRecording ? '⏹' : isProcessing ? '⏳' : '🎙'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.shopMeta}>{shop.area} · {shop.phone}</Text>
        </View>

        {/* Big mic button — always visible at the top, impossible to miss */}
        <Animated.View style={[styles.micWrap, { transform: [{ scale: pulse }] }]}>
          <TouchableOpacity
            onPress={handleMicPress}
            disabled={submitting}
            activeOpacity={0.75}
            style={[styles.micBtn, { backgroundColor: btnBg }]}
          >
            <Text style={styles.micBtnIcon}>{btnIcon}</Text>
            <Text style={styles.micBtnLabel}>{btnLabel}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Recording indicator bar */}
        {isRecording && (
          <View style={styles.recordingBar}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Listening — speak your order now</Text>
          </View>
        )}

        {/* Error */}
        {voiceError && !isRecording && !isProcessing && (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{voiceError.message || 'Error — try again'}</Text>
          </View>
        )}

        {/* Success toast */}
        {toast && (
          <View style={styles.toastBar}>
            <Text style={styles.toastText}>✓ {toast}</Text>
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Manual product search */}
          <Text style={styles.sectionLabel}>Add Products</Text>
          <ProductSearch onSelect={addProduct} />

          {items.length > 0 && (
            <View style={styles.itemsBox}>
              <Text style={styles.sectionLabel}>Order Items</Text>
              {items.map((it) => (
                <View key={it.productId ?? it.productName} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>{it.productName}</Text>
                  <TextInput
                    style={styles.qtyInput}
                    value={String(it.qty)}
                    onChangeText={(v) => updateQty(it.productId, v)}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity onPress={() => removeItem(it.productId)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.sectionLabel}>Payment</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_OPTIONS.map((opt) => {
              const active = payment === opt.key
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.paymentBtn, active && styles.paymentBtnActive]}
                  onPress={() => setPayment(opt.key)}
                >
                  <Text style={[styles.paymentText, active && styles.paymentTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.sectionLabel}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add a note (optional)"
            value={notes}
            onChangeText={(t) => setNotes(t.slice(0, 200))}
            multiline
            maxLength={200}
          />
          <Text style={styles.charCount}>{notes.length}/200</Text>

          <TouchableOpacity
            style={[styles.primary, (items.length === 0 || isProcessing) && styles.primaryDisabled]}
            onPress={submitOrder}
            disabled={items.length === 0 || submitting || isProcessing}
          >
            <Text style={styles.primaryText}>Submit Order</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondary} onPress={markNoOrder} disabled={submitting}>
            <Text style={styles.secondaryText}>Mark Visit — No Order</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { paddingVertical: 6, alignSelf: 'flex-start' },
  backText: { color: '#2563EB', fontSize: 15, fontWeight: '600' },
  shopName: { fontSize: 22, fontWeight: '800', color: '#111', marginTop: 4 },
  shopMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  // Big mic button — outside the scroll, always visible
  micWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: '#F3F4F6',
  },
  micBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  micBtnIcon: { fontSize: 26 },
  micBtnLabel: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },

  // Recording bar below the button
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  recordingText: { fontSize: 13, color: '#991B1B', fontWeight: '600' },

  errorBar: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  errorText: { color: '#991B1B', fontSize: 13, textAlign: 'center' },

  toastBar: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  toastText: { color: '#166534', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // Shared form styles
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 18,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  itemsBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemName: { flex: 1, fontSize: 14, color: '#111' },
  qtyInput: {
    width: 56,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textAlign: 'center',
    marginHorizontal: 8,
    backgroundColor: '#fff',
    fontSize: 14,
  },
  removeText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  paymentRow: { flexDirection: 'row', gap: 8 },
  paymentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  paymentBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  paymentText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  paymentTextActive: { color: '#fff' },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },
  primary: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryDisabled: { backgroundColor: '#9CA3AF' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryText: { color: '#374151', fontSize: 15, fontWeight: '600' },
})
