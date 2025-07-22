import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: any;
  categoryId?: string;
  sound?: string;
  priority?: 'min' | 'low' | 'default' | 'high' | 'max';
}

export interface NotificationCategory {
  identifier: string;
  actions: NotificationAction[];
  options?: {
    categorySummaryFormat?: string;
    customDismissAction?: boolean;
    allowInCarPlay?: boolean;
    showTitle?: boolean;
    showSubtitle?: boolean;
    allowAnnouncement?: boolean;
  };
}

export interface NotificationAction {
  identifier: string;
  buttonTitle: string;
  options?: {
    opensAppToForeground?: boolean;
    isAuthenticationRequired?: boolean;
    isDestructive?: boolean;
  };
}

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Set up notification categories
    await this.setupNotificationCategories();

    // Register for push notifications
    await this.registerForPushNotificationsAsync();

    this.isInitialized = true;
  }

  private async setupNotificationCategories(): Promise<void> {
    const categories: NotificationCategory[] = [
      {
        identifier: 'OPPORTUNITY_ALERT',
        actions: [
          {
            identifier: 'VIEW_OPPORTUNITY',
            buttonTitle: 'Ver Oportunidade',
            options: { opensAppToForeground: true },
          },
          {
            identifier: 'DISMISS',
            buttonTitle: 'Dispensar',
            options: { opensAppToForeground: false },
          },
        ],
      },
      {
        identifier: 'DEADLINE_ALERT',
        actions: [
          {
            identifier: 'VIEW_DETAILS',
            buttonTitle: 'Ver Detalhes',
            options: { opensAppToForeground: true },
          },
          {
            identifier: 'SNOOZE',
            buttonTitle: 'Lembrar Depois',
            options: { opensAppToForeground: false },
          },
        ],
      },
      {
        identifier: 'ANALYSIS_COMPLETE',
        actions: [
          {
            identifier: 'VIEW_ANALYSIS',
            buttonTitle: 'Ver Análise',
            options: { opensAppToForeground: true },
          },
        ],
      },
      {
        identifier: 'CHAT_MESSAGE',
        actions: [
          {
            identifier: 'REPLY',
            buttonTitle: 'Responder',
            options: { opensAppToForeground: true },
          },
          {
            identifier: 'MARK_READ',
            buttonTitle: 'Marcar como Lida',
            options: { opensAppToForeground: false },
          },
        ],
      },
    ];

    await Notifications.setNotificationCategoryAsync(
      categories[0].identifier,
      categories[0].actions,
      categories[0].options
    );

    for (const category of categories) {
      await Notifications.setNotificationCategoryAsync(
        category.identifier,
        category.actions,
        category.options
      );
    }
  }

  private async registerForPushNotificationsAsync(): Promise<void> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;
      
      // Store token locally
      await AsyncStorage.setItem('expoPushToken', token);
      
      console.log('Expo push token:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      await Notifications.setNotificationChannelAsync('opportunities', {
        name: 'Oportunidades',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#5145CD',
        description: 'Notificações sobre novas oportunidades de licitação',
      });

      await Notifications.setNotificationChannelAsync('deadlines', {
        name: 'Prazos',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
        description: 'Alertas sobre prazos de licitações',
      });

      await Notifications.setNotificationChannelAsync('analysis', {
        name: 'Análises',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4ECDC4',
        description: 'Notificações sobre análises concluídas',
      });

      await Notifications.setNotificationChannelAsync('chat', {
        name: 'Chat',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#45B7D1',
        description: 'Mensagens do chat de suporte',
      });
    }
  }

  async getExpoPushToken(): Promise<string | null> {
    if (!this.expoPushToken) {
      this.expoPushToken = await AsyncStorage.getItem('expoPushToken');
    }
    return this.expoPushToken;
  }

  async scheduleNotification(notification: NotificationData, trigger?: Notifications.NotificationTriggerInput): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        categoryIdentifier: notification.categoryId,
        sound: notification.sound || 'default',
        priority: this.mapPriority(notification.priority),
      },
      trigger: trigger || null,
    });

    return notificationId;
  }

  async scheduleOpportunityNotification(opportunity: {
    id: string;
    title: string;
    entity: string;
    deadline: string;
    value: number;
  }): Promise<string> {
    return this.scheduleNotification({
      id: opportunity.id,
      title: 'Nova Oportunidade Encontrada!',
      body: `${opportunity.title} - ${opportunity.entity}`,
      data: {
        type: 'opportunity',
        opportunityId: opportunity.id,
        screen: 'OpportunityDetail',
      },
      categoryId: 'OPPORTUNITY_ALERT',
      priority: 'high',
    });
  }

  async scheduleDeadlineNotification(opportunity: {
    id: string;
    title: string;
    deadline: string;
  }, hoursBeforeDeadline: number = 24): Promise<string> {
    const deadlineDate = new Date(opportunity.deadline);
    const notificationDate = new Date(deadlineDate.getTime() - (hoursBeforeDeadline * 60 * 60 * 1000));

    return this.scheduleNotification({
      id: `deadline_${opportunity.id}`,
      title: 'Prazo se Aproximando!',
      body: `${opportunity.title} - Prazo em ${hoursBeforeDeadline}h`,
      data: {
        type: 'deadline',
        opportunityId: opportunity.id,
        screen: 'OpportunityDetail',
      },
      categoryId: 'DEADLINE_ALERT',
      priority: 'max',
    }, {
      date: notificationDate,
    });
  }

  async scheduleAnalysisCompleteNotification(analysis: {
    id: string;
    title: string;
    score: number;
  }): Promise<string> {
    return this.scheduleNotification({
      id: `analysis_${analysis.id}`,
      title: 'Análise Concluída!',
      body: `${analysis.title} - Score: ${analysis.score}%`,
      data: {
        type: 'analysis',
        analysisId: analysis.id,
        screen: 'AnalysisDetail',
      },
      categoryId: 'ANALYSIS_COMPLETE',
      priority: 'default',
    });
  }

  async scheduleChatNotification(message: {
    id: string;
    sender: string;
    content: string;
  }): Promise<string> {
    return this.scheduleNotification({
      id: `chat_${message.id}`,
      title: `Nova mensagem de ${message.sender}`,
      body: message.content,
      data: {
        type: 'chat',
        messageId: message.id,
        screen: 'Chat',
      },
      categoryId: 'CHAT_MESSAGE',
      priority: 'high',
    });
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }

  async getNotificationPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync();
  }

  async requestPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.requestPermissionsAsync();
  }

  private mapPriority(priority?: 'min' | 'low' | 'default' | 'high' | 'max'): Notifications.AndroidNotificationPriority {
    switch (priority) {
      case 'min':
        return Notifications.AndroidNotificationPriority.MIN;
      case 'low':
        return Notifications.AndroidNotificationPriority.LOW;
      case 'high':
        return Notifications.AndroidNotificationPriority.HIGH;
      case 'max':
        return Notifications.AndroidNotificationPriority.MAX;
      default:
        return Notifications.AndroidNotificationPriority.DEFAULT;
    }
  }

  // Listen for notifications
  addNotificationReceivedListener(listener: (notification: Notifications.Notification) => void): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseReceivedListener(listener: (response: Notifications.NotificationResponse) => void): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  // Remove listeners
  removeNotificationSubscription(subscription: Notifications.Subscription): void {
    Notifications.removeNotificationSubscription(subscription);
  }
}

export default NotificationService.getInstance();