import React, { useState, useMemo } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import { searchProducts } from '../utils/search'
import { PRODUCTS } from '../data/products'

export default function ProductSearch({ onSelect }) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return []
    return searchProducts(query).slice(0, 6)
  }, [query])

  const handleSelect = (p) => {
    onSelect(p)
    setQuery('')
  }

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="Search products..."
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />
      {results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((p) => (
            <TouchableOpacity key={p.id} style={styles.row} onPress={() => handleSelect(p)}>
              <Text style={styles.pname}>{p.name}</Text>
              <Text style={styles.pmeta}>{p.brand} · ₹{p.price}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdown: {
    backgroundColor: '#fff',
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pname: { fontSize: 14, fontWeight: '600', color: '#111' },
  pmeta: { fontSize: 12, color: '#666', marginTop: 2 },
})
