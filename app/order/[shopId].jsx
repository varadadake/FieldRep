import React, { useState, useMemo, useRef } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SHOPS } from '../../src/data/shops'
import ProductSearch from '../../src/components/ProductSearch'
import { createVisit, setShopStatus } from '../../src/utils/storage'

const PAYMENT_OPTIONS = [
  { key: 'cash', label: 'Cash Collected' },
  { key: 'credit', label: 'Credit (Pay Later)' },
  { key: 'pending', label: 'Pending' },
]

export default function OrderEntry() {
  const { shopId } = useLocalSearchParams()
  const router = useRouter()
  const shop = useMemo(() => SHOPS.find((s) => String(s.id) === String(shopId)), [shopId])

  const [items, setItems] = useState([])
  const [payment, setPayment] = useState('pending')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      if (existing) {
        return prev.map((it) =>
          it.productId === p.id ? { ...it, qty: it.qty + 1 } : it
        )
      }
      return [...prev, { productId: p.id, productName: p.name, qty: 1 }]
    })
  }

  const updateQty = (productId, qty) => {
    const n = parseInt(qty, 10)
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId ? { ...it, qty: isNaN(n) ? 0 : n } : it
      )
    )
  }

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId))
  }

  const submitOrder = async () => {
    if (items.length === 0 || submitting) return
    setSubmitting(true)
    await createVisit({
      shopId: shop.id,
      shopName: shop.name,
      outcome: 'order',
      items: items.filter((it) => it.qty > 0),
      payment,
      notes,
      nextFollowUp: null,
    })
    await setShopStatus(shop.id, 'visited')
    Alert.alert('Order logged ✓', '', [
      { text: 'OK', onPress: () => router.back() },
    ])
  }

  const markNoOrder = async () => {
    if (submitting) return
    setSubmitting(true)
    await createVisit({
      shopId: shop.id,
      shopName: shop.name,
      outcome: 'no_order',
      items: [],
      payment: 'pending',
      notes,
      nextFollowUp: null,
    })
    await setShopStatus(shop.id, 'visited')
    Alert.alert('Visit logged ✓', '', [
      { text: 'OK', onPress: () => router.back() },
    ])
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.shopMeta}>
            {shop.area} · {shop.phone}
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Add Products</Text>
          <ProductSearch onSelect={addProduct} />

          {items.length > 0 && (
            <View style={styles.itemsBox}>
              <Text style={styles.sectionLabel}>Order Items</Text>
              {items.map((it) => (
                <View key={it.productId} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {it.productName}
                  </Text>
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

          <Text style={styles.sectionLabel}>Payment Status</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_OPTIONS.map((opt) => {
              const active = payment === opt.key
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.paymentBtn, active && styles.paymentBtnActive]}
                  onPress={() => setPayment(opt.key)}
                >
                  <Text style={[styles.paymentText, active && styles.paymentTextActive]}>
                    {opt.label}
                  </Text>
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
            style={[styles.primary, items.length === 0 && styles.primaryDisabled]}
            onPress={submitOrder}
            disabled={items.length === 0 || submitting}
          >
            <Text style={styles.primaryText}>Submit Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondary}
            onPress={markNoOrder}
            disabled={submitting}
          >
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  },
  removeText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paymentBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    marginBottom: 8,
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
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryDisabled: { backgroundColor: '#9CA3AF' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryText: { color: '#111', fontSize: 15, fontWeight: '600' },
})
