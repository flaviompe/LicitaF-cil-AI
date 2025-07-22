// Admin Dashboard Types
export interface User {
  id: string
  name: string
  email: string
  imageUrl?: string
  role?: 'ADMIN' | 'JURIDICO' | 'COMERCIAL' | 'TECNICO' | 'FINANCEIRO' | 'COLABORADOR'
  createdAt: Date
  updatedAt: Date
}

export interface DashboardStats {
  totalUsers: number
  totalCompanies: number
  totalOpportunities: number
  totalProposals: number
  revenueThisMonth: number
  systemHealth: 'ONLINE' | 'DEGRADED' | 'OFFLINE'
  criticalAlerts: number
  userGrowth: number
  revenueGrowth: number
  opportunityGrowth: number
  aiAccuracy: number
  uptime: number
  responseTime: string
  userSatisfaction: string
}

export interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  current: boolean
  badge?: string | number
  disabled?: boolean
}

export interface TeamItem {
  id: number
  name: string
  href: string
  initial: string
  current: boolean
  memberCount?: number
}

export interface NotificationItem {
  id: number
  message: string
  time: string
  unread: boolean
  type?: 'info' | 'warning' | 'error' | 'success'
  actionUrl?: string
}

export interface SystemMetric {
  name: string
  value: number | string
  format: 'text' | 'percentage' | 'currency' | 'number'
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red'
  trend?: 'up' | 'down' | 'stable'
  trendValue?: number
}

export interface ActivityItem {
  id: string
  action: string
  user: string
  time: string
  type: 'create' | 'update' | 'delete' | 'system'
  metadata?: Record<string, any>
}

export interface ServiceStatus {
  name: string
  status: 'online' | 'offline' | 'degraded'
  value: string
  lastChecked: Date
  responseTime?: number
}

// Component Props
export interface AdminLayoutProps {
  children: React.ReactNode
  user?: User
}

export interface AdminNavigationProps {
  user?: User
  currentPath?: string
}

export interface AdminHeaderProps {
  user?: User
  onMobileMenuClick?: () => void
  notifications?: NotificationItem[]
}

export interface AdminDashboardProps {
  user: User
  stats: DashboardStats
  activities?: ActivityItem[]
  services?: ServiceStatus[]
}

// Utility Types
export type StatCard = {
  id: string
  name: string
  stat: keyof DashboardStats
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  change: keyof DashboardStats
  changeType: 'increase' | 'decrease'
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red'
  format?: 'currency' | 'percentage' | 'number'
}

export type Theme = {
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  border: string
}

export type Permission = 
  | 'VIEW_DASHBOARD'
  | 'MANAGE_USERS'
  | 'MANAGE_COMPANIES'
  | 'MANAGE_OPPORTUNITIES'
  | 'VIEW_ANALYTICS'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_SYSTEM'
  | 'VIEW_REPORTS'
  | 'MANAGE_BILLING'
  | 'MANAGE_LEGAL_AI'

export type RolePermissions = {
  [K in User['role']]: Permission[]
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form Types
export interface AdminSettingsForm {
  siteName: string
  siteDescription: string
  maintenanceMode: boolean
  allowRegistration: boolean
  emailNotifications: boolean
  systemAlerts: boolean
  theme: 'light' | 'dark' | 'auto'
  language: 'pt-BR' | 'en-US'
}

export interface UserManagementForm {
  name: string
  email: string
  role: User['role']
  active: boolean
  permissions: Permission[]
}

// Chart Data Types
export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

export interface TimeSeriesData {
  date: string
  value: number
  category?: string
}

export interface AnalyticsData {
  userRegistrations: TimeSeriesData[]
  revenue: TimeSeriesData[]
  opportunities: TimeSeriesData[]
  usage: ChartDataPoint[]
}