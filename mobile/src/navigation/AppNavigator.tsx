import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '../store';
import { verifyToken } from '../store/slices/authSlice';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { LoadingScreen } from '../screens/LoadingScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';

const Stack = createStackNavigator();

export function AppNavigator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [isFirstLaunch, setIsFirstLaunch] = React.useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is authenticated on app launch
    dispatch(verifyToken());
    
    // Check if it's first launch (you can implement AsyncStorage logic here)
    checkFirstLaunch();
  }, [dispatch]);

  const checkFirstLaunch = async () => {
    try {
      // You can implement AsyncStorage logic here to check if it's first launch
      // For now, we'll assume it's not first launch
      setIsFirstLaunch(false);
    } catch (error) {
      setIsFirstLaunch(false);
    }
  };

  if (isLoading || isFirstLaunch === null) {
    return <LoadingScreen />;
  }

  if (isFirstLaunch) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Auth" component={AuthNavigator} />
          <Stack.Screen name="Main" component={MainNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}