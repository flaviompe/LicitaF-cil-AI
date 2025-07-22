'use server'

export interface EmailPreferences {
  userId: string
  emailAddress: string
  
  // General preferences
  enabled: boolean
  frequency: 'immediate' | 'daily' | 'weekly' | 'never'
  
  // Notification types
  notifications: {
    newOpportunities: boolean
    certificateExpiry: boolean
    proposalStatus: boolean
    systemUpdates: boolean
    marketingEmails: boolean
    weeklyDigest: boolean
    monthlyReport: boolean
  }
  
  // Opportunity filters
  opportunityFilters: {
    minValue?: number
    maxValue?: number
    sectors: string[]
    states: string[]
    cities: string[]
    modalities: string[]
    urgentOnly: boolean
  }
  
  // Timing preferences
  timing: {
    timezone: string
    preferredTime: string // HH:MM format
    quietHours: {
      enabled: boolean
      start: string // HH:MM
      end: string // HH:MM
    }
    weekends: boolean
  }
  
  // Format preferences
  format: {
    language: 'pt-BR' | 'en-US'
    template: 'minimal' | 'detailed' | 'digest'
    includeAttachments: boolean
  }
  
  // Unsubscribe tokens
  unsubscribeToken: string
  unsubscribeDate?: Date
  
  // Tracking
  createdAt: Date
  updatedAt: Date
  lastEmailSent?: Date
  emailCount: number
  openCount: number
  clickCount: number
}

export interface EmailPreferenceUpdate {
  enabled?: boolean
  frequency?: EmailPreferences['frequency']
  notifications?: Partial<EmailPreferences['notifications']>
  opportunityFilters?: Partial<EmailPreferences['opportunityFilters']>
  timing?: Partial<EmailPreferences['timing']>
  format?: Partial<EmailPreferences['format']>
}

class EmailPreferencesService {
  private preferences: Map<string, EmailPreferences> = new Map()

  constructor() {
    // In a real application, this would load from database
    this.loadPreferences()
  }

  private async loadPreferences() {
    // Placeholder for database loading
    // In production, this would load from your database
  }

  private generateUnsubscribeToken(): string {
    return `unsub_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`
  }

  async createDefaultPreferences(userId: string, emailAddress: string): Promise<EmailPreferences> {
    const preferences: EmailPreferences = {
      userId,
      emailAddress,
      enabled: true,
      frequency: 'immediate',
      
      notifications: {
        newOpportunities: true,
        certificateExpiry: true,
        proposalStatus: true,
        systemUpdates: true,
        marketingEmails: false,
        weeklyDigest: true,
        monthlyReport: true
      },
      
      opportunityFilters: {
        sectors: [],
        states: [],
        cities: [],
        modalities: [],
        urgentOnly: false
      },
      
      timing: {
        timezone: 'America/Sao_Paulo',
        preferredTime: '09:00',
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '07:00'
        },
        weekends: false
      },
      
      format: {
        language: 'pt-BR',
        template: 'detailed',
        includeAttachments: false
      },
      
      unsubscribeToken: this.generateUnsubscribeToken(),
      createdAt: new Date(),
      updatedAt: new Date(),
      emailCount: 0,
      openCount: 0,
      clickCount: 0
    }

    this.preferences.set(userId, preferences)
    await this.savePreferences(preferences)
    
    return preferences
  }

  async getPreferences(userId: string): Promise<EmailPreferences | null> {
    let preferences = this.preferences.get(userId)
    
    if (!preferences) {
      // Try to load from database
      preferences = await this.loadUserPreferences(userId)
      if (preferences) {
        this.preferences.set(userId, preferences)
      }
    }
    
    return preferences || null
  }

  async updatePreferences(userId: string, updates: EmailPreferenceUpdate): Promise<EmailPreferences | null> {
    const existing = await this.getPreferences(userId)
    if (!existing) return null

    const updated: EmailPreferences = {
      ...existing,
      ...updates,
      notifications: updates.notifications 
        ? { ...existing.notifications, ...updates.notifications }
        : existing.notifications,
      opportunityFilters: updates.opportunityFilters
        ? { ...existing.opportunityFilters, ...updates.opportunityFilters }
        : existing.opportunityFilters,
      timing: updates.timing
        ? { ...existing.timing, ...updates.timing }
        : existing.timing,
      format: updates.format
        ? { ...existing.format, ...updates.format }
        : existing.format,
      updatedAt: new Date()
    }

    this.preferences.set(userId, updated)
    await this.savePreferences(updated)
    
    return updated
  }

  async shouldSendEmail(
    userId: string, 
    emailType: keyof EmailPreferences['notifications'],
    opportunity?: {
      value?: number
      sector?: string
      state?: string
      city?: string
      modality?: string
      urgent?: boolean
    }
  ): Promise<{ shouldSend: boolean, reason?: string }> {
    const preferences = await this.getPreferences(userId)
    
    if (!preferences) {
      return { shouldSend: false, reason: 'No preferences found' }
    }

    if (!preferences.enabled) {
      return { shouldSend: false, reason: 'Email notifications disabled' }
    }

    if (preferences.frequency === 'never') {
      return { shouldSend: false, reason: 'Frequency set to never' }
    }

    if (!preferences.notifications[emailType]) {
      return { shouldSend: false, reason: `${emailType} notifications disabled` }
    }

    // Check timing constraints
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    if (preferences.timing.quietHours.enabled) {
      const quietStart = preferences.timing.quietHours.start
      const quietEnd = preferences.timing.quietHours.end
      
      if (this.isInQuietHours(currentTime, quietStart, quietEnd)) {
        return { shouldSend: false, reason: 'In quiet hours' }
      }
    }

    if (!preferences.timing.weekends && this.isWeekend(now)) {
      return { shouldSend: false, reason: 'Weekend emails disabled' }
    }

    // Check opportunity filters if applicable
    if (opportunity && emailType === 'newOpportunities') {
      const filterResult = this.checkOpportunityFilters(preferences.opportunityFilters, opportunity)
      if (!filterResult.matches) {
        return { shouldSend: false, reason: filterResult.reason }
      }
    }

    // Check frequency constraints
    if (preferences.frequency !== 'immediate') {
      const lastSent = preferences.lastEmailSent
      if (lastSent && !this.shouldSendBasedOnFrequency(lastSent, preferences.frequency)) {
        return { shouldSend: false, reason: `Frequency constraint: ${preferences.frequency}` }
      }
    }

    return { shouldSend: true }
  }

  private isInQuietHours(currentTime: string, quietStart: string, quietEnd: string): boolean {
    const current = this.timeToMinutes(currentTime)
    const start = this.timeToMinutes(quietStart)
    const end = this.timeToMinutes(quietEnd)
    
    if (start < end) {
      // Same day quiet hours (e.g., 22:00 to 23:00)
      return current >= start && current <= end
    } else {
      // Overnight quiet hours (e.g., 22:00 to 07:00)
      return current >= start || current <= end
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay()
    return day === 0 || day === 6 // Sunday or Saturday
  }

  private checkOpportunityFilters(
    filters: EmailPreferences['opportunityFilters'], 
    opportunity: any
  ): { matches: boolean, reason?: string } {
    if (filters.minValue && opportunity.value < filters.minValue) {
      return { matches: false, reason: 'Below minimum value threshold' }
    }

    if (filters.maxValue && opportunity.value > filters.maxValue) {
      return { matches: false, reason: 'Above maximum value threshold' }
    }

    if (filters.sectors.length > 0 && !filters.sectors.includes(opportunity.sector)) {
      return { matches: false, reason: 'Sector not in preferences' }
    }

    if (filters.states.length > 0 && !filters.states.includes(opportunity.state)) {
      return { matches: false, reason: 'State not in preferences' }
    }

    if (filters.cities.length > 0 && !filters.cities.includes(opportunity.city)) {
      return { matches: false, reason: 'City not in preferences' }
    }

    if (filters.modalities.length > 0 && !filters.modalities.includes(opportunity.modality)) {
      return { matches: false, reason: 'Modality not in preferences' }
    }

    if (filters.urgentOnly && !opportunity.urgent) {
      return { matches: false, reason: 'Only urgent opportunities preferred' }
    }

    return { matches: true }
  }

  private shouldSendBasedOnFrequency(lastSent: Date, frequency: EmailPreferences['frequency']): boolean {
    const now = new Date()
    const diffMs = now.getTime() - lastSent.getTime()
    
    switch (frequency) {
      case 'daily':
        return diffMs >= 24 * 60 * 60 * 1000 // 24 hours
      case 'weekly':
        return diffMs >= 7 * 24 * 60 * 60 * 1000 // 7 days
      default:
        return true
    }
  }

  async recordEmailSent(userId: string): Promise<void> {
    const preferences = await this.getPreferences(userId)
    if (!preferences) return

    preferences.lastEmailSent = new Date()
    preferences.emailCount++
    preferences.updatedAt = new Date()

    this.preferences.set(userId, preferences)
    await this.savePreferences(preferences)
  }

  async recordEmailOpened(userId: string): Promise<void> {
    const preferences = await this.getPreferences(userId)
    if (!preferences) return

    preferences.openCount++
    preferences.updatedAt = new Date()

    this.preferences.set(userId, preferences)
    await this.savePreferences(preferences)
  }

  async recordEmailClicked(userId: string): Promise<void> {
    const preferences = await this.getPreferences(userId)
    if (!preferences) return

    preferences.clickCount++
    preferences.updatedAt = new Date()

    this.preferences.set(userId, preferences)
    await this.savePreferences(preferences)
  }

  async unsubscribeByToken(token: string): Promise<{ success: boolean, userId?: string }> {
    for (const [userId, preferences] of this.preferences.entries()) {
      if (preferences.unsubscribeToken === token) {
        preferences.enabled = false
        preferences.unsubscribeDate = new Date()
        preferences.updatedAt = new Date()
        
        await this.savePreferences(preferences)
        return { success: true, userId }
      }
    }

    // Try to find in database if not in memory
    const userIdFromDb = await this.findUserByUnsubscribeToken(token)
    if (userIdFromDb) {
      const preferences = await this.getPreferences(userIdFromDb)
      if (preferences) {
        preferences.enabled = false
        preferences.unsubscribeDate = new Date()
        preferences.updatedAt = new Date()
        
        await this.savePreferences(preferences)
        return { success: true, userId: userIdFromDb }
      }
    }

    return { success: false }
  }

  async resubscribe(userId: string): Promise<boolean> {
    const preferences = await this.getPreferences(userId)
    if (!preferences) return false

    preferences.enabled = true
    preferences.unsubscribeDate = undefined
    preferences.unsubscribeToken = this.generateUnsubscribeToken() // Generate new token
    preferences.updatedAt = new Date()

    this.preferences.set(userId, preferences)
    await this.savePreferences(preferences)
    
    return true
  }

  async getEmailStats(userId: string): Promise<{
    totalSent: number
    totalOpened: number
    totalClicked: number
    openRate: number
    clickRate: number
    lastEmailSent?: Date
  } | null> {
    const preferences = await this.getPreferences(userId)
    if (!preferences) return null

    const openRate = preferences.emailCount > 0 
      ? (preferences.openCount / preferences.emailCount) * 100
      : 0

    const clickRate = preferences.emailCount > 0
      ? (preferences.clickCount / preferences.emailCount) * 100
      : 0

    return {
      totalSent: preferences.emailCount,
      totalOpened: preferences.openCount,
      totalClicked: preferences.clickCount,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      lastEmailSent: preferences.lastEmailSent
    }
  }

  async getAllPreferences(): Promise<EmailPreferences[]> {
    return Array.from(this.preferences.values())
  }

  async getUsersForDigest(frequency: 'daily' | 'weekly'): Promise<EmailPreferences[]> {
    const allPreferences = await this.getAllPreferences()
    
    return allPreferences.filter(pref => 
      pref.enabled &&
      pref.frequency === frequency &&
      pref.notifications.weeklyDigest
    )
  }

  async exportPreferences(userId: string): Promise<any> {
    const preferences = await this.getPreferences(userId)
    if (!preferences) return null

    return {
      ...preferences,
      // Remove sensitive data
      unsubscribeToken: undefined
    }
  }

  async importPreferences(userId: string, data: any): Promise<boolean> {
    try {
      const existing = await this.getPreferences(userId)
      if (!existing) return false

      const updated: EmailPreferences = {
        ...existing,
        ...data,
        userId, // Ensure userId cannot be changed
        unsubscribeToken: existing.unsubscribeToken, // Keep existing token
        updatedAt: new Date()
      }

      this.preferences.set(userId, updated)
      await this.savePreferences(updated)
      
      return true
    } catch {
      return false
    }
  }

  // Database operations (to be implemented with actual database)
  private async loadUserPreferences(userId: string): Promise<EmailPreferences | null> {
    // Placeholder for database loading
    return null
  }

  private async savePreferences(preferences: EmailPreferences): Promise<void> {
    // Placeholder for database saving
    console.log(`Saving preferences for user ${preferences.userId}`)
  }

  private async findUserByUnsubscribeToken(token: string): Promise<string | null> {
    // Placeholder for database query
    return null
  }
}

// Singleton instance
let preferencesService: EmailPreferencesService | null = null

export const getEmailPreferencesService = (): EmailPreferencesService => {
  if (!preferencesService) {
    preferencesService = new EmailPreferencesService()
  }
  return preferencesService
}

// Helper functions
export const shouldSendOpportunityEmail = async (
  userId: string,
  opportunity: {
    value?: number
    sector?: string
    state?: string
    city?: string
    modality?: string
    urgent?: boolean
  }
): Promise<boolean> => {
  const service = getEmailPreferencesService()
  const result = await service.shouldSendEmail(userId, 'newOpportunities', opportunity)
  return result.shouldSend
}

export const createUserEmailPreferences = async (
  userId: string,
  emailAddress: string
): Promise<EmailPreferences> => {
  const service = getEmailPreferencesService()
  return service.createDefaultPreferences(userId, emailAddress)
}

export const updateUserEmailPreferences = async (
  userId: string,
  updates: EmailPreferenceUpdate
): Promise<EmailPreferences | null> => {
  const service = getEmailPreferencesService()
  return service.updatePreferences(userId, updates)
}

export const handleEmailUnsubscribe = async (token: string): Promise<{ success: boolean, userId?: string }> => {
  const service = getEmailPreferencesService()
  return service.unsubscribeByToken(token)
}

export type { EmailPreferences, EmailPreferenceUpdate }