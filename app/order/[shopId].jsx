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
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SHOPS } from '../../src/data/shops'
import { findProduct } from '../../src/utils/search'
import ProductSearch from '../../src/components/ProductSearch'
import { createVisit, setShopStatus } from '../../src/utils/storage'
import { useVoice } from '@sociovate/samvaad'
import VoiceOrb from '../../src/components/VoiceOrb'

const PAYMENT_OPTIONS = [
  { key: 'cash', label: 'Cash', icon: '✦', color: '#30D158' },
  { key: 'credit', label: 'Credit', icon: '◈', color: '#4F8EF7' },
  { key: 'pending', label: 'Pending', icon: '◎', color: '#FFD60A' },
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
  const { shopId, prefill } = useLocalSearchParams()
  const router = useRouter()
  const shop = useMemo(() => SHOPS.find((s) => String(s.id) === String(shopId)), [shopId])

  const [items, setItems] = useState([])
  const [payment, setPayment] = useState('pending')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  const prefillApplied = useRef(false)
  useEffect(() => {
    if (prefill && !prefillApplied.current) {
      prefillApplied.current = true
      try {
        const data = JSON.parse(prefill)
        const newItems = intentItemsToOrderItems(data.items)
        if (newItems.length > 0) setItems(newItems)
        const paymentKey = parsePaymentKey(data.payment)
        if (paymentKey) setPayment(paymentKey)
        const summary = newItems.map((it) => `${it.productName} ×${it.qty}`).join(', ')
        showToast(summary || 'Order pre-filled — review below')
      } catch (e) {}
    }
  }, [prefill])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const handleIntent = useCallback((intent) => {
    if (intent.name !== 'log_order') return
    const newItems = intentItemsToOrderItems(intent.params.items)
    if (newItems.length > 0) setItems(newItems)
    const paymentKey = parsePaymentKey(intent.params.payment)
    if (paymentKey) setPayment(paymentKey)
    showToast(newItems.map((it) => `${it.productName} ×${it.qty}`).join(', ') || 'Order filled')
  }, [])

  const { isRecording, isProcessing, startRecording, stopAndProcess } = useVoice(handleIntent)

  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!isProcessing) { setElapsed(0); return }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [isProcessing])

  const handleMicPress = useCallback(() => {
    if (isRecording) stopAndProcess()
    else if (!isProcessing) startRecording()
  }, [isRecording, isProcessing, startRecording, stopAndProcess])

  if (!shop) {
    return (
      <View style={styles.root}>
        <Text style={{ color: '#fff', padding: 20 }}>Shop not found.</Text>
      </View>
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
    await createVisit({
      shopId: shop.id, shopName: shop.name, outcome: 'order',
      items: items.filter((it) => it.qty > 0), payment, notes, nextFollowUp: null,
    })
    await setShopStatus(shop.id, 'visited')
    Alert.alert('Order logged ✓', '', [{ text: 'OK', onPress: () => router.back() }])
  }

  const markNoOrder = async () => {
    if (submitting) return
    setSubmitting(true)
    await createVisit({
      shopId: shop.id, shopName: shop.name, outcome: 'no_order',
      items: [], payment: 'pending', notes, nextFollowUp: null,
    })
    await setShopStatus(shop.id, 'visited')
    Alert.alert('Visit logged ✓', '', [{ text: 'OK', onPress: () => router.back() }])
  }

  const totalItems = items.reduce((s, it) => s + it.qty, 0)

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#080C14" />
      <LinearGradient colors={['#080C14', '#0D1220', '#080C14']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.shopName} numberOfLines={1}>{shop.name}</Text>
              <Text style={styles.shopMeta}>{shop.area}</Text>
            </View>
            <VoiceOrb
              isRecording={isRecording}
              isProcessing={isProcessing}
              onPress={handleMicPress}
            />
            {totalItems > 0 && (
              <View style={styles.itemCount}>
                <Text style={styles.itemCountText}>{totalItems}</Text>
              </View>
            )}
          </View>

          {/* Toast */}
          {toast && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>✓ {toast}</Text>
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 60 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Order items */}
            {items.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>ORDER ITEMS</Text>
                <View style={styles.card}>
                  {items.map((it, idx) => (
                    <View
                      key={it.productId ?? it.productName}
                      style={[styles.itemRow, idx < items.length - 1 && styles.itemRowBorder]}
                    >
                      <View style={styles.itemBullet} />
                      <Text style={styles.itemName} numberOfLines={1}>{it.productName}</Text>
                      <TextInput
                        style={styles.qtyInput}
                        value={String(it.qty)}
                        onChangeText={(v) => updateQty(it.productId, v)}
                        keyboardType="number-pad"
                        selectionColor="#4F8EF7"
                      />
                      <TouchableOpacity onPress={() => removeItem(it.productId)} style={styles.removeBtn}>
                        <Text style={styles.removeText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Product search */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ADD PRODUCTS</Text>
              <ProductSearch onSelect={addProduct} darkMode />
            </View>

            {/* Payment */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PAYMENT</Text>
              <View style={styles.paymentRow}>
                {PAYMENT_OPTIONS.map((opt) => {
                  const active = payment === opt.key
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.payBtn,
                        active && { backgroundColor: `${opt.color}18`, borderColor: opt.color },
                      ]}
                      onPress={() => setPayment(opt.key)}
                    >
                      <Text style={{ color: active ? opt.color : '#4A4A55', fontSize: 14, marginBottom: 3 }}>
                        {opt.icon}
                      </Text>
                      <Text style={[styles.payBtnText, active && { color: opt.color }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>NOTES</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add a note (optional)"
                placeholderTextColor="#3A3A4A"
                value={notes}
                onChangeText={(t) => setNotes(t.slice(0, 200))}
                multiline
                maxLength={200}
                selectionColor="#4F8EF7"
              />
              <Text style={styles.charCount}>{notes.length}/200</Text>
            </View>

            {/* Actions */}
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.primaryBtn, (items.length === 0 || isProcessing) && styles.primaryBtnDisabled]}
                onPress={submitOrder}
                disabled={items.length === 0 || submitting || isProcessing}
              >
                <LinearGradient
                  colors={items.length === 0 ? ['#1A1A25', '#1A1A25'] : ['#4F8EF7', '#2D6EE8']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGrad}
                >
                  <Text style={styles.primaryText}>
                    {items.length === 0 ? 'Add items to submit' : `Submit Order · ${totalItems} items`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={markNoOrder} disabled={submitting}>
                <Text style={styles.secondaryText}>Mark Visit — No Order</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080C14' },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { paddingRight: 12, paddingVertical: 4 },
  backText: { color: '#4F8EF7', fontSize: 20, fontWeight: '400' },
  headerCenter: { flex: 1 },
  shopName: { fontSize: 18, fontWeight: '800', color: '#F5F5F7', letterSpacing: -0.5 },
  shopMeta: { fontSize: 12, color: '#636366', marginTop: 1 },
  itemCount: {
    backgroundColor: '#4F8EF7',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCountText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  toast: {
    backgroundColor: 'rgba(48,209,88,0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(48,209,88,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  toastText: { color: '#30D158', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4A4A5A',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  itemBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4F8EF7',
  },
  itemName: { flex: 1, fontSize: 14, color: '#D0D0DB' },
  qtyInput: {
    width: 52,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#F5F5F7',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  removeBtn: { padding: 4 },
  removeText: { color: '#FF453A', fontSize: 14, fontWeight: '600' },

  paymentRow: { flexDirection: 'row', gap: 8 },
  payBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  payBtnText: { fontSize: 13, fontWeight: '700', color: '#4A4A55' },

  notesInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    minHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    fontSize: 14,
    color: '#D0D0DB',
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: '#3A3A4A', textAlign: 'right', marginTop: 4 },

  primaryBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnGrad: { paddingVertical: 18, alignItems: 'center', borderRadius: 14 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },

  secondaryBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  secondaryText: { color: '#636366', fontSize: 15, fontWeight: '600' },
})
