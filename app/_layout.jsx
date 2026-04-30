import { useEffect } from 'react'
import { Alert, Platform } from 'react-native'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { VoiceSDK } from '@sociovate/samvaad'
import { WebAudioRecorder } from '../src/audio/WebAudioRecorder'
import { findShop, findProduct } from '../src/utils/search'
import { createVisit, setShopStatus } from '../src/utils/storage'

export default function RootLayout() {
  useEffect(() => {
    VoiceSDK.init({
      apiKey: 'sk_test_samvaad',
      apiUrl: 'https://samvaad-api-production.up.railway.app',
      language: 'hinglish',
      timeout: 20000,
      maxRetries: 1,
      // Hints help Sarvam STT recognise domain-specific words accurately
      hints: [
        'Maggi', 'Parle-G', 'chai', 'biscuit', 'noodles', 'soap', 'oil',
        'cash', 'nakit', 'naqd', 'udhaar', 'credit', 'baad mein', 'pending',
      ],
      intents: [
        {
          name: 'log_order',
          description: 'Sales rep logs products ordered by a shop. Items is an array of {product, qty}. Payment is one of: cash, credit, pending.',
          params: [
            { name: 'shop_name', type: 'string' },
            { name: 'items', type: 'array' },
            { name: 'payment', type: 'string', nullable: true },
          ],
        },
        {
          name: 'mark_visit',
          description: 'Rep marks a shop visit complete with no order',
          params: [
            { name: 'shop_name', type: 'string' },
            { name: 'outcome', type: 'string' },
            { name: 'next_date', type: 'date', nullable: true },
          ],
        },
      ],
    })

    // Web-only: inject the app-bundle audio recorder so we don't depend on
    // whatever Metro may have cached from the SDK folder.
    // Use the public setRecorder() API — not an internal property.
    // TODO: remove this after running `expo start --clear` confirms the SDK's
    // own audio-recorder.js is being picked up fresh.
    if (Platform.OS === 'web') {
      VoiceSDK.setRecorder(new WebAudioRecorder())
    }

    VoiceSDK.onIntent(async (intent) => {
      if (intent.name === 'log_order') {
        // Order screen handles this when user is already inside a shop.
        // Only handle here when shop_name is spoken (global voice command).
        if (!intent.params.shop_name) return
        const shop = findShop(intent.params.shop_name)
        if (!shop) {
          Alert.alert('Shop not found', `Could not find "${intent.params.shop_name}"`)
          return
        }
        const items = (intent.params.items || []).map((it) => {
          const product = findProduct(it.product || it.name || it.product_name || '')
          return {
            productId: product?.id ?? null,
            productName: product?.name ?? (it.product || it.name || it.product_name || 'Unknown'),
            qty: Number(it.qty ?? it.quantity ?? 1),
          }
        })
        await createVisit({
          shopId: shop.id, shopName: shop.name, outcome: 'order',
          items, payment: intent.params.payment || 'pending',
          notes: '', nextFollowUp: null,
        })
        await setShopStatus(shop.id, 'visited')
        Alert.alert('Order logged ✓', `${shop.name} — ${items.length} item(s)`)
      }

      if (intent.name === 'mark_visit') {
        const shop = findShop(intent.params.shop_name)
        if (!shop) {
          Alert.alert('Shop not found', `Could not find "${intent.params.shop_name}"`)
          return
        }
        await createVisit({
          shopId: shop.id, shopName: shop.name,
          outcome: intent.params.outcome === 'order' ? 'order' : 'no_order',
          items: [], payment: 'pending', notes: '',
          nextFollowUp: intent.params.next_date ?? null,
        })
        await setShopStatus(shop.id, 'visited')
        Alert.alert('Visit logged ✓', shop.name)
      }
    })

    VoiceSDK.onError((error) => {
      console.error(`[Samvaad ${error.code}] ${error.message}`)
    })
  }, [])

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="order/[shopId]" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  )
}
