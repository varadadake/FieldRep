import Fuse from 'fuse.js'
import { SHOPS } from '../data/shops'
import { PRODUCTS } from '../data/products'

// Strip common Hindi filler from spoken queries
function normalizeQuery(q) {
  if (!q) return ''
  return q
    .toLowerCase()
    .replace(/\b(ka|ki|ke|mein|pe|wala|wali|wale|bhaiya|ji|aur)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Shop aliases: first word alone, name without suffix, full name
function shopAliases(name) {
  const lower = name.toLowerCase()
  const noSuffix = lower
    .replace(/\b(traders|stores|store|provision|kirana|brothers|general)\b/g, '')
    .trim()
  return [lower, noSuffix, lower.split(' ')[0]].filter(Boolean)
}

// Product aliases: short brand name, name without size/weight
function productAliases(name, brand) {
  const lower = name.toLowerCase()
  const noSize = lower.replace(/\s+\d+(\.\d+)?\s*(g|kg|ml|l|gm)\b/gi, '').trim()
  const first = noSize.split(' ')[0]
  return [lower, noSize, first, brand.toLowerCase()].filter(Boolean)
}

const shopsAug = SHOPS.map((s) => ({ ...s, _aliases: shopAliases(s.name).join(' ') }))
const productsAug = PRODUCTS.map((p) => ({ ...p, _aliases: productAliases(p.name, p.brand).join(' ') }))

const shopFuse = new Fuse(shopsAug, {
  keys: [
    { name: 'name', weight: 2 },
    { name: '_aliases', weight: 1.5 },
  ],
  threshold: 0.55,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
})

const productFuse = new Fuse(productsAug, {
  keys: [
    { name: 'name', weight: 2 },
    { name: 'brand', weight: 1 },
    { name: '_aliases', weight: 1.5 },
  ],
  threshold: 0.55,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
})

export const searchShops = (query) => shopFuse.search(normalizeQuery(query)).map((r) => r.item)
export const searchProducts = (query) => productFuse.search(normalizeQuery(query)).map((r) => r.item)

export const findShop = (query) => shopFuse.search(normalizeQuery(query))[0]?.item ?? null
export const findProduct = (query) => productFuse.search(normalizeQuery(query))[0]?.item ?? null
