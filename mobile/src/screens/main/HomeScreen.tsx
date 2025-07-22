import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
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
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';

import { MainStackParamList } from '../../navigation/MainNavigator';
import { theme, spacing } from '../../theme';
import { useAppSelector } from '../../store';

type HomeScreenNavigationProp = StackNavigationProp<MainStackParamList>;

const { width } = Dimensions.get('window');

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAppSelector((state) => state.auth);
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  }, []);

  const stats = {
    totalOpportunities: 1245,
    activeAnalyses: 23,
    wonBids: 8,
    successRate: 34.8,
  };

  const recentOpportunities = [
    {
      id: '1',
      title: 'Fornecimento de Material de Escritório',
      entity: 'Prefeitura Municipal de São Paulo',
      value: 150000,
      deadline: '2024-01-30',
      status: 'open',
    },
    {
      id: '2',
      title: 'Serviços de Limpeza e Conservação',
      entity: 'Governo do Estado de SP',
      value: 800000,
      deadline: '2024-02-05',
      status: 'closing',
    },
    {
      id: '3',
      title: 'Aquisição de Equipamentos de TI',
      entity: 'Ministério da Educação',
      value: 2500000,
      deadline: '2024-02-15',
      status: 'open',
    },
  ];

  const chartData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        data: [15, 25, 18, 32, 28, 35],
        color: (opacity = 1) => `rgba(81, 69, 205, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const handleNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleOpportunityDetail = (id: string) => {
    navigation.navigate('OpportunityDetail', { id });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return theme.colors.primary;
      case 'closing':
        return theme.colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'closing':
        return 'Encerrando';
      default:
        return 'Fechado';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Title style={styles.welcomeTitle}>
              Olá, {user?.name?.split(' ')[0]}!
            </Title>
            <Paragraph style={styles.welcomeSubtitle}>
              Vamos encontrar novas oportunidades hoje?
            </Paragraph>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon="bell"
              size={24}
              iconColor={theme.colors.onSurface}
              onPress={handleNotifications}
            />
            <IconButton
              icon="cog"
              size={24}
              iconColor={theme.colors.onSurface}
              onPress={handleSettings}
            />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <Surface style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="search" size={24} color={theme.colors.primary} />
                <Text style={styles.statNumber}>{stats.totalOpportunities}</Text>
                <Text style={styles.statLabel}>Oportunidades</Text>
              </View>
            </Surface>
            <Surface style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="analytics" size={24} color={theme.colors.secondary} />
                <Text style={styles.statNumber}>{stats.activeAnalyses}</Text>
                <Text style={styles.statLabel}>Análises Ativas</Text>
              </View>
            </Surface>
          </View>
          <View style={styles.statsRow}>
            <Surface style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="trophy" size={24} color={theme.colors.tertiary} />
                <Text style={styles.statNumber}>{stats.wonBids}</Text>
                <Text style={styles.statLabel}>Licitações Ganhas</Text>
              </View>
            </Surface>
            <Surface style={styles.statCard}>
              <View style={styles.statContent}>
                <Ionicons name="trending-up" size={24} color={theme.colors.primary} />
                <Text style={styles.statNumber}>{stats.successRate}%</Text>
                <Text style={styles.statLabel}>Taxa de Sucesso</Text>
              </View>
            </Surface>
          </View>
        </View>

        {/* Performance Chart */}
        <Card style={styles.chartCard}>
          <Card.Content>
            <Title style={styles.chartTitle}>Performance dos Últimos 6 Meses</Title>
            <LineChart
              data={chartData}
              width={width - 64}
              height={220}
              chartConfig={{
                backgroundColor: theme.colors.surface,
                backgroundGradientFrom: theme.colors.surface,
                backgroundGradientTo: theme.colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(81, 69, 205, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: theme.colors.primary,
                },
              }}
              bezier
              style={styles.chart}
            />
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.quickActionsCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Ações Rápidas</Title>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => navigation.navigate('OpportunitiesTab')}
              >
                <Ionicons name="search" size={32} color={theme.colors.primary} />
                <Text style={styles.quickActionText}>Buscar Oportunidades</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => navigation.navigate('AnalysisTab')}
              >
                <Ionicons name="analytics" size={32} color={theme.colors.secondary} />
                <Text style={styles.quickActionText}>Nova Análise</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => navigation.navigate('Chat')}
              >
                <Ionicons name="chatbubble" size={32} color={theme.colors.tertiary} />
                <Text style={styles.quickActionText}>Chat Suporte</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => navigation.navigate('MarketplaceTab')}
              >
                <Ionicons name="storefront" size={32} color={theme.colors.primary} />
                <Text style={styles.quickActionText}>Marketplace</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Opportunities */}
        <Card style={styles.recentCard}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>Oportunidades Recentes</Title>
              <Button
                mode="text"
                onPress={() => navigation.navigate('OpportunitiesTab')}
                labelStyle={styles.seeAllButton}
              >
                Ver todas
              </Button>
            </View>
            {recentOpportunities.map((opportunity) => (
              <TouchableOpacity
                key={opportunity.id}
                style={styles.opportunityItem}
                onPress={() => handleOpportunityDetail(opportunity.id)}
              >
                <View style={styles.opportunityContent}>
                  <View style={styles.opportunityHeader}>
                    <Text style={styles.opportunityTitle} numberOfLines={2}>
                      {opportunity.title}
                    </Text>
                    <Badge
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(opportunity.status) },
                      ]}
                    >
                      {getStatusText(opportunity.status)}
                    </Badge>
                  </View>
                  <Text style={styles.opportunityEntity}>
                    {opportunity.entity}
                  </Text>
                  <View style={styles.opportunityFooter}>
                    <Text style={styles.opportunityValue}>
                      R$ {opportunity.value.toLocaleString('pt-BR')}
                    </Text>
                    <Text style={styles.opportunityDeadline}>
                      Prazo: {new Date(opportunity.deadline).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
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
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    padding: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    marginHorizontal: spacing.xs,
    elevation: 2,
    borderRadius: 12,
  },
  statContent: {
    alignItems: 'center',
    padding: spacing.md,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  chartCard: {
    margin: spacing.md,
    marginTop: 0,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  quickActionsCard: {
    margin: spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  quickAction: {
    width: '48%',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  recentCard: {
    margin: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllButton: {
    color: theme.colors.primary,
  },
  opportunityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  opportunityContent: {
    flex: 1,
  },
  opportunityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  opportunityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  opportunityEntity: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  opportunityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  opportunityValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  opportunityDeadline: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
});