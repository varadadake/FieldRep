import Fuse from 'fuse.js'
import { SHOPS } from '../data/shops'
import { PRODUCTS } from '../data/products'

const shopFuse = new Fuse(SHOPS, {
  keys: ['name'],
  threshold: 0.4,
  includeScore: true,
})

const productFuse = new Fuse(PRODUCTS, {
  keys: ['name', 'brand'],
  threshold: 0.4,
  includeScore: true,
})

export const searchShops = (query) => shopFuse.search(query).map((r) => r.item)
export const searchProducts = (query) => productFuse.search(query).map((r) => r.item)

export const findShop = (query) => shopFuse.search(query)[0]?.item ?? null
export const findProduct = (query) => productFuse.search(query)[0]?.item ?? null
