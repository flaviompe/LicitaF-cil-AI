import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Surface,
  Text,
  Badge,
  IconButton,
  Divider,
  FAB,
  Chip,
  List,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { MainStackParamList } from '../../navigation/MainNavigator';
import { theme, spacing } from '../../theme';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationManager } from '../../components/NotificationManager';

type NotificationsScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Notifications'>;

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'opportunity' | 'deadline' | 'analysis' | 'chat' | 'system';
  category: string;
  timestamp: string;
  read: boolean;
  data?: any;
  actions?: NotificationAction[];
}

interface NotificationAction {
  id: string;
  title: string;
  type: 'primary' | 'secondary' | 'destructive';
  action: () => void;
}

export function NotificationsScreen() {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'opportunity' | 'deadline' | 'analysis' | 'chat'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const { clearBadge, getBadgeCount } = useNotifications();

  // Mock data - in a real app, this would come from an API
  const mockNotifications: NotificationItem[] = [
    {
      id: '1',
      title: 'Nova Oportunidade Disponível',
      body: 'Fornecimento de Material de Escritório - Prefeitura de São Paulo',
      type: 'opportunity',
      category: 'Oportunidades',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      read: false,
      data: { opportunityId: '1' },
    },
    {
      id: '2',
      title: 'Prazo se Aproximando',
      body: 'Serviços de Limpeza - Prazo em 24h',
      type: 'deadline',
      category: 'Prazos',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      read: false,
      data: { opportunityId: '2' },
    },
    {
      id: '3',
      title: 'Análise Concluída',
      body: 'Equipamentos de TI - Score: 85%',
      type: 'analysis',
      category: 'Análises',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      read: true,
      data: { analysisId: '3' },
    },
    {
      id: '4',
      title: 'Nova Mensagem',
      body: 'Suporte: Como podemos ajudar com sua análise?',
      type: 'chat',
      category: 'Chat',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      read: true,
      data: { messageId: '4' },
    },
    {
      id: '5',
      title: 'Sistema Atualizado',
      body: 'Nova versão disponível com melhorias na análise de editais',
      type: 'system',
      category: 'Sistema',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      read: true,
    },
  ];

  useEffect(() => {
    loadNotifications();
    clearBadge();
  }, []);

  const loadNotifications = async () => {
    // In a real app, this would fetch from an API
    setNotifications(mockNotifications);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, []);

  const filteredNotifications = React.useMemo(() => {
    let filtered = notifications;

    switch (filter) {
      case 'unread':
        filtered = notifications.filter(n => !n.read);
        break;
      case 'opportunity':
        filtered = notifications.filter(n => n.type === 'opportunity');
        break;
      case 'deadline':
        filtered = notifications.filter(n => n.type === 'deadline');
        break;
      case 'analysis':
        filtered = notifications.filter(n => n.type === 'analysis');
        break;
      case 'chat':
        filtered = notifications.filter(n => n.type === 'chat');
        break;
      default:
        filtered = notifications;
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [notifications, filter]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationPress = (notification: NotificationItem) => {
    if (selectionMode) {
      toggleSelection(notification.id);
      return;
    }

    // Mark as read
    markAsRead(notification.id);

    // Navigate based on notification type
    switch (notification.type) {
      case 'opportunity':
        if (notification.data?.opportunityId) {
          navigation.navigate('OpportunityDetail', { 
            id: notification.data.opportunityId 
          });
        }
        break;
      case 'deadline':
        if (notification.data?.opportunityId) {
          navigation.navigate('OpportunityDetail', { 
            id: notification.data.opportunityId 
          });
        }
        break;
      case 'analysis':
        if (notification.data?.analysisId) {
          navigation.navigate('AnalysisDetail', { 
            id: notification.data.analysisId 
          });
        }
        break;
      case 'chat':
        navigation.navigate('Chat');
        break;
      default:
        break;
    }
  };

  const handleNotificationLongPress = (notification: NotificationItem) => {
    setSelectionMode(true);
    setSelectedNotifications([notification.id]);
  };

  const toggleSelection = (id: string) => {
    setSelectedNotifications(prev =>
      prev.includes(id)
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markSelectedAsRead = () => {
    setNotifications(prev =>
      prev.map(n => 
        selectedNotifications.includes(n.id) ? { ...n, read: true } : n
      )
    );
    setSelectedNotifications([]);
    setSelectionMode(false);
  };

  const deleteSelected = () => {
    Alert.alert(
      'Excluir Notificações',
      `Deseja excluir ${selectedNotifications.length} notificação(ões)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            setNotifications(prev =>
              prev.filter(n => !selectedNotifications.includes(n.id))
            );
            setSelectedNotifications([]);
            setSelectionMode(false);
          },
        },
      ]
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    Alert.alert(
      'Limpar Todas',
      'Deseja excluir todas as notificações?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: () => setNotifications([]),
        },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return 'search';
      case 'deadline':
        return 'clock-alert';
      case 'analysis':
        return 'analytics';
      case 'chat':
        return 'chat';
      case 'system':
        return 'information';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'opportunity':
        return theme.colors.primary;
      case 'deadline':
        return theme.colors.error;
      case 'analysis':
        return theme.colors.tertiary;
      case 'chat':
        return theme.colors.secondary;
      case 'system':
        return theme.colors.outline;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  if (showSettings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.settingsHeader}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => setShowSettings(false)}
          />
          <Title>Configurações</Title>
        </View>
        <NotificationManager />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Title style={styles.headerTitle}>
            Notificações
            {unreadCount > 0 && (
              <Badge style={styles.unreadBadge}>{unreadCount}</Badge>
            )}
          </Title>
          <View style={styles.headerActions}>
            <IconButton
              icon="cog"
              size={24}
              onPress={() => setShowSettings(true)}
            />
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            style={styles.filterChip}
          >
            Todas
          </Chip>
          <Chip
            selected={filter === 'unread'}
            onPress={() => setFilter('unread')}
            style={styles.filterChip}
          >
            Não lidas ({unreadCount})
          </Chip>
          <Chip
            selected={filter === 'opportunity'}
            onPress={() => setFilter('opportunity')}
            style={styles.filterChip}
          >
            Oportunidades
          </Chip>
          <Chip
            selected={filter === 'deadline'}
            onPress={() => setFilter('deadline')}
            style={styles.filterChip}
          >
            Prazos
          </Chip>
          <Chip
            selected={filter === 'analysis'}
            onPress={() => setFilter('analysis')}
            style={styles.filterChip}
          >
            Análises
          </Chip>
          <Chip
            selected={filter === 'chat'}
            onPress={() => setFilter('chat')}
            style={styles.filterChip}
          >
            Chat
          </Chip>
        </ScrollView>
      </View>

      {/* Selection Mode Header */}
      {selectionMode && (
        <Surface style={styles.selectionHeader}>
          <View style={styles.selectionContent}>
            <IconButton
              icon="close"
              size={24}
              onPress={() => {
                setSelectionMode(false);
                setSelectedNotifications([]);
              }}
            />
            <Text style={styles.selectionText}>
              {selectedNotifications.length} selecionada(s)
            </Text>
            <View style={styles.selectionActions}>
              <IconButton
                icon="email-check"
                size={24}
                onPress={markSelectedAsRead}
                disabled={selectedNotifications.length === 0}
              />
              <IconButton
                icon="delete"
                size={24}
                onPress={deleteSelected}
                disabled={selectedNotifications.length === 0}
              />
            </View>
          </View>
        </Surface>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Title style={styles.emptyTitle}>
              {filter === 'all' ? 'Nenhuma notificação' : 'Nenhuma notificação encontrada'}
            </Title>
            <Paragraph style={styles.emptySubtitle}>
              {filter === 'all' 
                ? 'Você receberá notificações sobre oportunidades, prazos e análises aqui'
                : 'Tente alterar o filtro para ver mais notificações'
              }
            </Paragraph>
          </View>
        ) : (
          filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              onPress={() => handleNotificationPress(notification)}
              onLongPress={() => handleNotificationLongPress(notification)}
              style={[
                styles.notificationItem,
                !notification.read && styles.unreadNotification,
                selectedNotifications.includes(notification.id) && styles.selectedNotification,
              ]}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Ionicons
                    name={getNotificationIcon(notification.type)}
                    size={20}
                    color={getNotificationColor(notification.type)}
                  />
                  <View style={styles.notificationMeta}>
                    <Text style={styles.notificationCategory}>
                      {notification.category}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatDistanceToNow(new Date(notification.timestamp), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </Text>
                  </View>
                  {selectionMode && (
                    <IconButton
                      icon={selectedNotifications.includes(notification.id) ? 'check-circle' : 'circle-outline'}
                      size={20}
                      iconColor={selectedNotifications.includes(notification.id) ? theme.colors.primary : theme.colors.onSurfaceVariant}
                      onPress={() => toggleSelection(notification.id)}
                    />
                  )}
                </View>
                <Text style={styles.notificationTitle}>
                  {notification.title}
                </Text>
                <Text style={styles.notificationBody}>
                  {notification.body}
                </Text>
                {!notification.read && (
                  <View style={styles.unreadIndicator} />
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Quick Actions */}
      {!selectionMode && notifications.length > 0 && (
        <View style={styles.quickActions}>
          <Button
            mode="text"
            onPress={markAllAsRead}
            disabled={unreadCount === 0}
            style={styles.quickAction}
          >
            Marcar todas como lidas
          </Button>
          <Button
            mode="text"
            onPress={clearAll}
            textColor={theme.colors.error}
            style={styles.quickAction}
          >
            Limpar todas
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  unreadBadge: {
    marginLeft: spacing.xs,
    backgroundColor: theme.colors.error,
  },
  headerActions: {
    flexDirection: 'row',
  },
  filterContainer: {
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  filterChip: {
    marginRight: spacing.xs,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  selectionHeader: {
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  selectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectionText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectionActions: {
    flexDirection: 'row',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: spacing.md,
    color: theme.colors.onSurfaceVariant,
  },
  emptySubtitle: {
    textAlign: 'center',
    marginTop: spacing.sm,
    color: theme.colors.onSurfaceVariant,
  },
  notificationItem: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: 8,
    elevation: 1,
    position: 'relative',
  },
  unreadNotification: {
    backgroundColor: theme.colors.primaryContainer,
  },
  selectedNotification: {
    backgroundColor: theme.colors.secondaryContainer,
  },
  notificationContent: {
    padding: spacing.md,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  notificationMeta: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  notificationCategory: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  notificationTime: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  notificationBody: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  unreadIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  quickAction: {
    flex: 1,
  },
});