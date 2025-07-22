import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Switch,
  List,
  Divider,
  Button,
  HelperText,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNotifications } from '../hooks/useNotifications';
import { theme, spacing } from '../theme';

interface NotificationSettings {
  enabled: boolean;
  opportunities: boolean;
  deadlines: boolean;
  analysis: boolean;
  chat: boolean;
  deadlineHours: number;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  sound: boolean;
  vibration: boolean;
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  opportunities: true,
  deadlines: true,
  analysis: true,
  chat: true,
  deadlineHours: 24,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  sound: true,
  vibration: true,
};

export function NotificationManager() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [deadlineHoursInput, setDeadlineHoursInput] = useState('24');

  const {
    getPermissions,
    requestPermissions,
    getBadgeCount,
    clearBadge,
    cancelAllNotifications,
  } = useNotifications();

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('notificationSettings');
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Erro', 'Não foi possível salvar as configurações');
    }
  };

  const checkPermissions = async () => {
    try {
      const permissions = await getPermissions();
      setPermissionStatus(permissions.status);
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const handleRequestPermissions = async () => {
    try {
      const permissions = await requestPermissions();
      setPermissionStatus(permissions.status);
      
      if (permissions.status === 'granted') {
        Alert.alert('Sucesso', 'Permissões de notificação concedidas!');
      } else {
        Alert.alert(
          'Permissões Negadas',
          'Você pode habilitar as notificações nas configurações do dispositivo.'
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Erro', 'Não foi possível solicitar permissões');
    }
  };

  const handleToggleMain = async (enabled: boolean) => {
    const newSettings = { ...settings, enabled };
    
    if (!enabled) {
      // Cancel all notifications when disabled
      await cancelAllNotifications();
      await clearBadge();
    }
    
    await saveSettings(newSettings);
  };

  const handleToggleCategory = async (category: keyof NotificationSettings, enabled: boolean) => {
    const newSettings = { ...settings, [category]: enabled };
    await saveSettings(newSettings);
  };

  const handleDeadlineHoursChange = async () => {
    const hours = parseInt(deadlineHoursInput, 10);
    if (isNaN(hours) || hours < 1 || hours > 168) {
      Alert.alert('Erro', 'Insira um número válido entre 1 e 168 horas');
      return;
    }
    
    const newSettings = { ...settings, deadlineHours: hours };
    await saveSettings(newSettings);
    setShowDeadlineModal(false);
  };

  const handleClearAllNotifications = async () => {
    Alert.alert(
      'Limpar Notificações',
      'Tem certeza que deseja cancelar todas as notificações agendadas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            await cancelAllNotifications();
            await clearBadge();
            Alert.alert('Sucesso', 'Todas as notificações foram canceladas');
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    try {
      const { scheduleOpportunityNotification } = useNotifications();
      await scheduleOpportunityNotification({
        id: 'test',
        title: 'Teste de Notificação',
        entity: 'LicitaFácil Pro',
        deadline: new Date(Date.now() + 60000).toISOString(),
        value: 100000,
      });
      Alert.alert('Sucesso', 'Notificação de teste enviada!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Erro', 'Não foi possível enviar notificação de teste');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Paragraph>Carregando configurações...</Paragraph>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Configurações de Notificação</Title>
          <Paragraph style={styles.subtitle}>
            Gerencie como você recebe notificações do app
          </Paragraph>
        </Card.Content>
      </Card>

      {permissionStatus !== 'granted' && (
        <Card style={[styles.card, styles.warningCard]}>
          <Card.Content>
            <View style={styles.warningContent}>
              <Ionicons name="warning" size={24} color={theme.colors.error} />
              <View style={styles.warningText}>
                <Title style={styles.warningTitle}>Permissões Necessárias</Title>
                <Paragraph>
                  Para receber notificações, você precisa conceder permissões
                </Paragraph>
              </View>
            </View>
            <Button
              mode="contained"
              onPress={handleRequestPermissions}
              style={styles.permissionButton}
            >
              Solicitar Permissões
            </Button>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <List.Item
            title="Notificações Gerais"
            description="Ativar/desativar todas as notificações"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={settings.enabled}
                onValueChange={handleToggleMain}
                disabled={permissionStatus !== 'granted'}
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Novas Oportunidades"
            description="Notificações sobre novas licitações"
            left={(props) => <List.Icon {...props} icon="search" />}
            right={() => (
              <Switch
                value={settings.opportunities}
                onValueChange={(value) => handleToggleCategory('opportunities', value)}
                disabled={!settings.enabled || permissionStatus !== 'granted'}
              />
            )}
          />
          
          <List.Item
            title="Prazos"
            description={`Alertas ${settings.deadlineHours}h antes do prazo`}
            left={(props) => <List.Icon {...props} icon="clock-alert" />}
            right={() => (
              <Switch
                value={settings.deadlines}
                onValueChange={(value) => handleToggleCategory('deadlines', value)}
                disabled={!settings.enabled || permissionStatus !== 'granted'}
              />
            )}
            onPress={() => setShowDeadlineModal(true)}
          />
          
          <List.Item
            title="Análises Concluídas"
            description="Notificações sobre análises finalizadas"
            left={(props) => <List.Icon {...props} icon="analytics" />}
            right={() => (
              <Switch
                value={settings.analysis}
                onValueChange={(value) => handleToggleCategory('analysis', value)}
                disabled={!settings.enabled || permissionStatus !== 'granted'}
              />
            )}
          />
          
          <List.Item
            title="Chat"
            description="Mensagens do chat de suporte"
            left={(props) => <List.Icon {...props} icon="chat" />}
            right={() => (
              <Switch
                value={settings.chat}
                onValueChange={(value) => handleToggleCategory('chat', value)}
                disabled={!settings.enabled || permissionStatus !== 'granted'}
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Som"
            description="Reproduzir som nas notificações"
            left={(props) => <List.Icon {...props} icon="volume-high" />}
            right={() => (
              <Switch
                value={settings.sound}
                onValueChange={(value) => handleToggleCategory('sound', value)}
                disabled={!settings.enabled || permissionStatus !== 'granted'}
              />
            )}
          />
          
          <List.Item
            title="Vibração"
            description="Vibrar no recebimento de notificações"
            left={(props) => <List.Icon {...props} icon="vibrate" />}
            right={() => (
              <Switch
                value={settings.vibration}
                onValueChange={(value) => handleToggleCategory('vibration', value)}
                disabled={!settings.enabled || permissionStatus !== 'granted'}
              />
            )}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Ações</Title>
          <View style={styles.actionsContainer}>
            <Button
              mode="outlined"
              onPress={handleTestNotification}
              style={styles.actionButton}
              disabled={!settings.enabled || permissionStatus !== 'granted'}
            >
              Testar Notificação
            </Button>
            <Button
              mode="outlined"
              onPress={handleClearAllNotifications}
              style={styles.actionButton}
              buttonColor={theme.colors.errorContainer}
              textColor={theme.colors.error}
            >
              Limpar Todas
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Portal>
        <Modal
          visible={showDeadlineModal}
          onDismiss={() => setShowDeadlineModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Title>Configurar Alerta de Prazo</Title>
          <Paragraph style={styles.modalSubtitle}>
            Defina quantas horas antes do prazo você quer ser notificado
          </Paragraph>
          
          <TextInput
            label="Horas antes do prazo"
            value={deadlineHoursInput}
            onChangeText={setDeadlineHoursInput}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            right={<TextInput.Affix text="horas" />}
          />
          
          <HelperText type="info">
            Valor entre 1 e 168 horas (1 semana)
          </HelperText>
          
          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => setShowDeadlineModal(false)}
              style={styles.modalButton}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleDeadlineHoursChange}
              style={styles.modalButton}
            >
              Salvar
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  warningCard: {
    backgroundColor: theme.colors.errorContainer,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  warningText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  warningTitle: {
    fontSize: 16,
    color: theme.colors.error,
  },
  permissionButton: {
    backgroundColor: theme.colors.error,
  },
  subtitle: {
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  modal: {
    backgroundColor: theme.colors.surface,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: 12,
  },
  modalSubtitle: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
  modalButton: {
    marginLeft: spacing.sm,
  },
});