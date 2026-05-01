import { Tabs } from 'expo-router'
import { Platform } from 'react-native'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F8EF7',
        tabBarInactiveTintColor: '#3A3A4A',
        tabBarStyle: {
          backgroundColor: '#0F1420',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          paddingBottom: Platform.OS === 'ios' ? 4 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 80 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'SHOPS',
          tabBarIcon: ({ color, focused }) => (
            focused
              ? <TabIcon char="⊞" color={color} focused={focused} />
              : <TabIcon char="⊟" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'LOG',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon char="◈" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'MORE',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon char="⋯" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  )
}

import { View, Text, StyleSheet } from 'react-native'

function TabIcon({ char, color, focused }) {
  return (
    <View style={[tabStyles.wrap, focused && tabStyles.wrapActive]}>
      <Text style={[tabStyles.char, { color }]}>{char}</Text>
    </View>
  )
}

const tabStyles = StyleSheet.create({
  wrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  wrapActive: {
    backgroundColor: 'rgba(79,142,247,0.12)',
  },
  char: {
    fontSize: 18,
    lineHeight: 22,
  },
})
