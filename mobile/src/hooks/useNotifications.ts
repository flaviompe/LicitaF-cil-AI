import { useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import NotificationService from '../services/notifications';
import { useAppDispatch, useAppSelector } from '../store';
import { updateNotificationToken } from '../store/slices/authSlice';
import { MainStackParamList } from '../navigation/MainNavigator';

type NavigationProp = StackNavigationProp<MainStackParamList>;

export interface NotificationHookOptions {
  enabled?: boolean;
  autoNavigate?: boolean;
  onNotificationReceived?: (notification: Notifications.Notification) => void;
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void;
}

export function useNotifications(options: NotificationHookOptions = {}) {
  const {
    enabled = true,
    autoNavigate = true,
    onNotificationReceived,
    onNotificationResponse,
  } = options;

  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  const initializeNotifications = useCallback(async () => {
    if (!enabled) return;

    try {
      // Initialize notification service
      await NotificationService.initialize();

      // Get and update push token
      const token = await NotificationService.getExpoPushToken();
      if (token && user?.id) {
        dispatch(updateNotificationToken(token));
      }

      // Clear badge on app start
      await NotificationService.clearBadge();
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }, [enabled, user?.id, dispatch]);

  const handleNotificationReceived = useCallback((notification: Notifications.Notification) => {
    console.log('Notification received:', notification);
    
    // Call custom handler if provided
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }

    // Update badge count
    NotificationService.getBadgeCount().then((count) => {
      NotificationService.setBadgeCount(count + 1);
    });
  }, [onNotificationReceived]);

  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    console.log('Notification response:', response);
    
    // Call custom handler if provided
    if (onNotificationResponse) {
      onNotificationResponse(response);
    }

    // Handle auto navigation
    if (autoNavigate) {
      const { data } = response.notification.request.content;
      
      switch (data?.type) {
        case 'opportunity':
          if (data.opportunityId) {
            navigation.navigate('OpportunityDetail', { id: data.opportunityId });
          }
          break;
        case 'analysis':
          if (data.analysisId) {
            navigation.navigate('AnalysisDetail', { id: data.analysisId });
          }
          break;
        case 'chat':
          navigation.navigate('Chat');
          break;
        default:
          if (data?.screen) {
            navigation.navigate(data.screen, data.params || {});
          }
          break;
      }
    }

    // Handle specific actions
    const actionIdentifier = response.actionIdentifier;
    
    switch (actionIdentifier) {
      case 'VIEW_OPPORTUNITY':
      case 'VIEW_DETAILS':
      case 'VIEW_ANALYSIS':
        // Already handled by auto navigation
        break;
      case 'SNOOZE':
        // Schedule a reminder for later
        scheduleSnoozeReminder(response.notification.request.content);
        break;
      case 'MARK_READ':
        // Mark message as read
        markChatMessageAsRead(response.notification.request.content.data);
        break;
      case 'REPLY':
        navigation.navigate('Chat');
        break;
    }

    // Clear badge when notification is handled
    NotificationService.clearBadge();
  }, [autoNavigate, navigation, onNotificationResponse]);

  const scheduleSnoozeReminder = useCallback(async (content: Notifications.NotificationContent) => {
    const snoozeTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    
    await NotificationService.scheduleNotification({
      id: `snooze_${content.data?.opportunityId}`,
      title: content.title || 'Lembrete',
      body: content.body || 'Você tem um prazo se aproximando',
      data: content.data,
      categoryId: 'DEADLINE_ALERT',
      priority: 'high',
    }, {
      date: snoozeTime,
    });
  }, []);

  const markChatMessageAsRead = useCallback(async (data: any) => {
    // Here you would typically make an API call to mark the message as read
    console.log('Marking message as read:', data.messageId);
  }, []);

  // Public methods for scheduling notifications
  const scheduleOpportunityNotification = useCallback(async (opportunity: {
    id: string;
    title: string;
    entity: string;
    deadline: string;
    value: number;
  }) => {
    return await NotificationService.scheduleOpportunityNotification(opportunity);
  }, []);

  const scheduleDeadlineNotification = useCallback(async (opportunity: {
    id: string;
    title: string;
    deadline: string;
  }, hoursBeforeDeadline: number = 24) => {
    return await NotificationService.scheduleDeadlineNotification(opportunity, hoursBeforeDeadline);
  }, []);

  const scheduleAnalysisCompleteNotification = useCallback(async (analysis: {
    id: string;
    title: string;
    score: number;
  }) => {
    return await NotificationService.scheduleAnalysisCompleteNotification(analysis);
  }, []);

  const scheduleChatNotification = useCallback(async (message: {
    id: string;
    sender: string;
    content: string;
  }) => {
    return await NotificationService.scheduleChatNotification(message);
  }, []);

  const cancelNotification = useCallback(async (notificationId: string) => {
    await NotificationService.cancelNotification(notificationId);
  }, []);

  const cancelAllNotifications = useCallback(async () => {
    await NotificationService.cancelAllNotifications();
  }, []);

  const getBadgeCount = useCallback(async () => {
    return await NotificationService.getBadgeCount();
  }, []);

  const setBadgeCount = useCallback(async (count: number) => {
    await NotificationService.setBadgeCount(count);
  }, []);

  const clearBadge = useCallback(async () => {
    await NotificationService.clearBadge();
  }, []);

  const getPermissions = useCallback(async () => {
    return await NotificationService.getNotificationPermissions();
  }, []);

  const requestPermissions = useCallback(async () => {
    return await NotificationService.requestPermissions();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Initialize notifications
    initializeNotifications();

    // Set up listeners
    notificationListener.current = NotificationService.addNotificationReceivedListener(
      handleNotificationReceived
    );

    responseListener.current = NotificationService.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      if (notificationListener.current) {
        NotificationService.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        NotificationService.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [enabled, initializeNotifications, handleNotificationReceived, handleNotificationResponse]);

  return {
    // Notification scheduling methods
    scheduleOpportunityNotification,
    scheduleDeadlineNotification,
    scheduleAnalysisCompleteNotification,
    scheduleChatNotification,
    
    // Notification management methods
    cancelNotification,
    cancelAllNotifications,
    
    // Badge management
    getBadgeCount,
    setBadgeCount,
    clearBadge,
    
    // Permission methods
    getPermissions,
    requestPermissions,
    
    // Utility methods
    initializeNotifications,
  };
}