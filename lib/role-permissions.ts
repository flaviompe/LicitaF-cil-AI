// Sistema de permissões e controle de acesso por perfil
export type UserRole = 'USER' | 'ADMIN' | 'JURIDICO' | 'COMERCIAL' | 'TECNICO' | 'FINANCEIRO' | 'COLABORADOR_EXTERNO'

export interface RolePermissions {
  canViewOpportunities: boolean
  canManageOpportunities: boolean
  canViewProposals: boolean
  canManageProposals: boolean
  canViewCertificates: boolean
  canManageCertificates: boolean
  canViewFinancials: boolean
  canManageFinancials: boolean
  canViewAnalytics: boolean
  canViewUsers: boolean
  canManageUsers: boolean
  canViewLegalDocuments: boolean
  canManageLegalDocuments: boolean
  canViewTechnicalSpecs: boolean
  canManageTechnicalSpecs: boolean
  canAccessAI: boolean
  canManageSystem: boolean
  dashboardModules: string[]
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
  ADMIN: {
    canViewOpportunities: true,
    canManageOpportunities: true,
    canViewProposals: true,
    canManageProposals: true,
    canViewCertificates: true,
    canManageCertificates: true,
    canViewFinancials: true,
    canManageFinancials: true,
    canViewAnalytics: true,
    canViewUsers: true,
    canManageUsers: true,
    canViewLegalDocuments: true,
    canManageLegalDocuments: true,
    canViewTechnicalSpecs: true,
    canManageTechnicalSpecs: true,
    canAccessAI: true,
    canManageSystem: true,
    dashboardModules: ['overview', 'opportunities', 'proposals', 'certificates', 'financials', 'analytics', 'users', 'legal', 'technical', 'ai-assistant', 'system']
  },

  JURIDICO: {
    canViewOpportunities: true,
    canManageOpportunities: false,
    canViewProposals: true,
    canManageProposals: false,
    canViewCertificates: true,
    canManageCertificates: true,
    canViewFinancials: false,
    canManageFinancials: false,
    canViewAnalytics: true,
    canViewUsers: false,
    canManageUsers: false,
    canViewLegalDocuments: true,
    canManageLegalDocuments: true,
    canViewTechnicalSpecs: false,
    canManageTechnicalSpecs: false,
    canAccessAI: true,
    canManageSystem: false,
    dashboardModules: ['overview', 'opportunities', 'proposals', 'certificates', 'legal', 'ai-assistant', 'analytics']
  },

  COMERCIAL: {
    canViewOpportunities: true,
    canManageOpportunities: true,
    canViewProposals: true,
    canManageProposals: true,
    canViewCertificates: true,
    canManageCertificates: false,
    canViewFinancials: true,
    canManageFinancials: false,
    canViewAnalytics: true,
    canViewUsers: false,
    canManageUsers: false,
    canViewLegalDocuments: false,
    canManageLegalDocuments: false,
    canViewTechnicalSpecs: true,
    canManageTechnicalSpecs: false,
    canAccessAI: true,
    canManageSystem: false,
    dashboardModules: ['overview', 'opportunities', 'proposals', 'certificates', 'financials', 'technical', 'ai-assistant', 'analytics']
  },

  TECNICO: {
    canViewOpportunities: true,
    canManageOpportunities: false,
    canViewProposals: true,
    canManageProposals: false,
    canViewCertificates: true,
    canManageCertificates: false,
    canViewFinancials: false,
    canManageFinancials: false,
    canViewAnalytics: true,
    canViewUsers: false,
    canManageUsers: false,
    canViewLegalDocuments: false,
    canManageLegalDocuments: false,
    canViewTechnicalSpecs: true,
    canManageTechnicalSpecs: true,
    canAccessAI: true,
    canManageSystem: false,
    dashboardModules: ['overview', 'opportunities', 'proposals', 'technical', 'ai-assistant', 'analytics']
  },

  FINANCEIRO: {
    canViewOpportunities: true,
    canManageOpportunities: false,
    canViewProposals: true,
    canManageProposals: false,
    canViewCertificates: true,
    canManageCertificates: false,
    canViewFinancials: true,
    canManageFinancials: true,
    canViewAnalytics: true,
    canViewUsers: false,
    canManageUsers: false,
    canViewLegalDocuments: false,
    canManageLegalDocuments: false,
    canViewTechnicalSpecs: false,
    canManageTechnicalSpecs: false,
    canAccessAI: true,
    canManageSystem: false,
    dashboardModules: ['overview', 'opportunities', 'proposals', 'certificates', 'financials', 'ai-assistant', 'analytics']
  },

  COLABORADOR_EXTERNO: {
    canViewOpportunities: true,
    canManageOpportunities: false,
    canViewProposals: false,
    canManageProposals: false,
    canViewCertificates: false,
    canManageCertificates: false,
    canViewFinancials: false,
    canManageFinancials: false,
    canViewAnalytics: false,
    canViewUsers: false,
    canManageUsers: false,
    canViewLegalDocuments: false,
    canManageLegalDocuments: false,
    canViewTechnicalSpecs: false,
    canManageTechnicalSpecs: false,
    canAccessAI: true,
    canManageSystem: false,
    dashboardModules: ['overview', 'opportunities', 'ai-assistant']
  },

  USER: {
    canViewOpportunities: true,
    canManageOpportunities: true,
    canViewProposals: true,
    canManageProposals: true,
    canViewCertificates: true,
    canManageCertificates: true,
    canViewFinancials: true,
    canManageFinancials: true,
    canViewAnalytics: true,
    canViewUsers: false,
    canManageUsers: false,
    canViewLegalDocuments: true,
    canManageLegalDocuments: true,
    canViewTechnicalSpecs: true,
    canManageTechnicalSpecs: true,
    canAccessAI: true,
    canManageSystem: false,
    dashboardModules: ['overview', 'opportunities', 'proposals', 'certificates', 'financials', 'legal', 'technical', 'ai-assistant', 'analytics']
  }
}

export function hasPermission(userRole: UserRole, permission: keyof RolePermissions): boolean {
  return rolePermissions[userRole][permission] as boolean
}

export function canAccessModule(userRole: UserRole, module: string): boolean {
  return rolePermissions[userRole].dashboardModules.includes(module)
}

export function getAvailableModules(userRole: UserRole): string[] {
  return rolePermissions[userRole].dashboardModules
}