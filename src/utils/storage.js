import AsyncStorage from '@react-native-async-storage/async-storage'

export const getVisits = async () => {
  const raw = await AsyncStorage.getItem('fieldrep_visits')
  return raw ? JSON.parse(raw) : []
}

export const createVisit = async ({ shopId, shopName, outcome, items, payment, notes, nextFollowUp }) => {
  const visits = await getVisits()
  const newVisit = {
    id: `v_${Date.now()}`,
    shopId,
    shopName,
    outcome,
    items,
    payment,
    notes,
    nextFollowUp: nextFollowUp ?? null,
    timestamp: new Date().toISOString(),
  }
  await AsyncStorage.setItem('fieldrep_visits', JSON.stringify([newVisit, ...visits]))
  return newVisit
}

export const getShopStatuses = async () => {
  const raw = await AsyncStorage.getItem('fieldrep_shopStatus')
  return raw ? JSON.parse(raw) : {}
}

export const setShopStatus = async (shopId, status) => {
  const statuses = await getShopStatuses()
  statuses[String(shopId)] = status
  await AsyncStorage.setItem('fieldrep_shopStatus', JSON.stringify(statuses))
}
