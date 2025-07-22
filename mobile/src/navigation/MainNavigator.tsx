import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Screens
import { HomeScreen } from '../screens/main/HomeScreen';
import { OpportunitiesScreen } from '../screens/main/OpportunitiesScreen';
import { AnalysisScreen } from '../screens/main/AnalysisScreen';
import { MarketplaceScreen } from '../screens/main/MarketplaceScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

// Detail screens
import { OpportunityDetailScreen } from '../screens/detail/OpportunityDetailScreen';
import { AnalysisDetailScreen } from '../screens/detail/AnalysisDetailScreen';
import { SupplierDetailScreen } from '../screens/detail/SupplierDetailScreen';
import { ChatScreen } from '../screens/main/ChatScreen';
import { NotificationsScreen } from '../screens/main/NotificationsScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';

export type MainTabParamList = {
  HomeTab: undefined;
  OpportunitiesTab: undefined;
  AnalysisTab: undefined;
  MarketplaceTab: undefined;
  ProfileTab: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  OpportunityDetail: { id: string };
  AnalysisDetail: { id: string };
  SupplierDetail: { id: string };
  Chat: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<MainStackParamList>();

function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'OpportunitiesTab':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'AnalysisTab':
              iconName = focused ? 'analytics' : 'analytics-outline';
              break;
            case 'MarketplaceTab':
              iconName = focused ? 'storefront' : 'storefront-outline';
              break;
            case 'ProfileTab':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ tabBarLabel: 'Início' }}
      />
      <Tab.Screen 
        name="OpportunitiesTab" 
        component={OpportunitiesScreen} 
        options={{ tabBarLabel: 'Oportunidades' }}
      />
      <Tab.Screen 
        name="AnalysisTab" 
        component={AnalysisScreen} 
        options={{ tabBarLabel: 'Análises' }}
      />
      <Tab.Screen 
        name="MarketplaceTab" 
        component={MarketplaceScreen} 
        options={{ tabBarLabel: 'Marketplace' }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="OpportunityDetail" 
        component={OpportunityDetailScreen}
        options={{ title: 'Detalhes da Oportunidade' }}
      />
      <Stack.Screen 
        name="AnalysisDetail" 
        component={AnalysisDetailScreen}
        options={{ title: 'Análise Detalhada' }}
      />
      <Stack.Screen 
        name="SupplierDetail" 
        component={SupplierDetailScreen}
        options={{ title: 'Fornecedor' }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{ title: 'Chat' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Notificações' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Configurações' }}
      />
    </Stack.Navigator>
  );
}