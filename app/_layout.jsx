import { useEffect, useRef } from 'react'
import { Alert, Platform } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { VoiceSDK } from '@sociovate/samvaad'
import { WebAudioRecorder } from '../src/audio/WebAudioRecorder'
import { findShop } from '../src/utils/search'
import { createVisit, setShopStatus } from '../src/utils/storage'

export default function RootLayout() {
  const router = useRouter()
  const routerRef = useRef(router)
  useEffect(() => { routerRef.current = router }, [router])

  useEffect(() => {
    VoiceSDK.init({
      apiKey: 'sk_test_samvaad',
      apiUrl: 'https://samvaad-api-production.up.railway.app',
      language: 'hinglish',
      timeout: 20000,
      maxRetries: 1,
      hints: [
        'Maggi', 'Parle-G', 'chai', 'biscuit', 'noodles', 'soap', 'oil',
        'Surf Excel', 'Dettol', 'Lays', 'Tata Salt', 'Amul', 'Britannia',
        'Colgate', 'Vim', 'Lifebuoy', 'Kurkure', 'Rin', 'Nescafe',
        'Sharma', 'Raju', 'Patel', 'Singh', 'Gupta', 'Raj', 'Meena',
        'Hari Om', 'Laxmi', 'Suresh', 'Anand', 'Kumar', 'Sai', 'Ganesh',
        'cash', 'nakit', 'naqd', 'udhaar', 'credit', 'baad mein', 'pending',
      ],
      intents: [
        {
          name: 'log_order',
          description: 'Sales rep logs products ordered by a shop. Items is an array of {product, qty}. Payment is one of: cash, credit, pending. shop_name identifies which shop.',
          params: [
            { name: 'shop_name', type: 'string' },
            { name: 'items', type: 'array' },
            { name: 'payment', type: 'string', nullable: true },
          ],
        },
        {
          name: 'mark_visit',
          description: 'Rep marks a shop visit complete with no order. Outcome is "no_order" by default.',
          params: [
            { name: 'shop_name', type: 'string' },
            { name: 'outcome', type: 'string' },
            { name: 'next_date', type: 'date', nullable: true },
          ],
        },
        {
          name: 'open_shop',
          description: 'Navigate to a shop page by name. Use when user says "open X", "go to X", "show X".',
          params: [
            { name: 'shop_name', type: 'string' },
          ],
        },
      ],
    })

    if (Platform.OS === 'web') {
      VoiceSDK.setRecorder(new WebAudioRecorder())
    }

    VoiceSDK.onIntent(async (intent) => {
      console.log('[FieldRep Global] Intent received:', JSON.stringify(intent))

      if (intent.name === 'log_order') {
        // If no shop_name, the order screen's own handler will deal with it
        // (user is already inside a shop). Skip global handling.
        if (!intent.params.shop_name) return

        const shop = findShop(intent.params.shop_name)
        if (!shop) {
          Alert.alert('Shop not found', `Could not match "${intent.params.shop_name}" to any shop on your route.`)
          return
        }

        // Navigate to the order page with pre-filled data as query params.
        // User reviews and submits — no silent order creation.
        const prefill = JSON.stringify({
          items: intent.params.items || [],
          payment: intent.params.payment || null,
        })
        console.log('[FieldRep Global] Navigating to', shop.name, 'with prefill:', prefill)
        routerRef.current.push(`/order/${shop.id}?prefill=${encodeURIComponent(prefill)}`)
      }

      if (intent.name === 'mark_visit') {
        const shop = findShop(intent.params.shop_name)
        if (!shop) {
          Alert.alert('Shop not found', `Could not match "${intent.params.shop_name}" to any shop on your route.`)
          return
        }
        await createVisit({
          shopId: shop.id, shopName: shop.name,
          outcome: intent.params.outcome === 'order' ? 'order' : 'no_order',
          items: [], payment: 'pending', notes: '',
          nextFollowUp: intent.params.next_date ?? null,
        })
        await setShopStatus(shop.id, 'visited')
        Alert.alert('Visit logged', shop.name)
      }

      if (intent.name === 'open_shop') {
        const shop = findShop(intent.params.shop_name)
        if (!shop) {
          Alert.alert('Shop not found', `Could not match "${intent.params.shop_name}" to any shop on your route.`)
          return
        }
        routerRef.current.push(`/order/${shop.id}`)
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
