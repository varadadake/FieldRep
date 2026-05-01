import React, { useState, useMemo } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native'
import { searchProducts } from '../utils/search'

export default function ProductSearch({ onSelect, darkMode = false }) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return []
    return searchProducts(query).slice(0, 6)
  }, [query])

  const handleSelect = (p) => {
    onSelect(p)
    setQuery('')
  }

  if (darkMode) {
    return (
      <View>
        <View style={dark.inputWrap}>
          <Text style={dark.icon}>⊕</Text>
          <TextInput
            style={dark.input}
            placeholder="Search products…"
            placeholderTextColor="#3A3A4A"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            selectionColor="#4F8EF7"
          />
          {query.length > 0 && (
            <Text style={dark.clear} onPress={() => setQuery('')}>✕</Text>
          )}
        </View>
        {results.length > 0 && (
          <View style={dark.dropdown}>
            {results.map((p, idx) => (
              <TouchableOpacity
                key={p.id}
                style={[dark.row, idx < results.length - 1 && dark.rowBorder]}
                onPress={() => handleSelect(p)}
              >
                <View style={dark.rowLeft}>
                  <Text style={dark.pname}>{p.name}</Text>
                  <Text style={dark.pmeta}>{p.brand}</Text>
                </View>
                <Text style={dark.price}>₹{p.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    )
  }

  return (
    <View>
      <TextInput
        style={light.input}
        placeholder="Search products..."
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />
      {results.length > 0 && (
        <View style={light.dropdown}>
          {results.map((p) => (
            <TouchableOpacity key={p.id} style={light.row} onPress={() => handleSelect(p)}>
              <Text style={light.pname}>{p.name}</Text>
              <Text style={light.pmeta}>{p.brand} · ₹{p.price}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const dark = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
  },
  icon: { fontSize: 16, color: '#4A4A5A', marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F5F5F7',
  },
  clear: { fontSize: 12, color: '#4A4A5A', paddingLeft: 8 },
  dropdown: {
    backgroundColor: '#111622',
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  rowLeft: { flex: 1 },
  pname: { fontSize: 14, fontWeight: '600', color: '#D0D0DB' },
  pmeta: { fontSize: 12, color: '#636366', marginTop: 2 },
  price: { fontSize: 13, fontWeight: '700', color: '#4F8EF7' },
})

const light = StyleSheet.create({
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
