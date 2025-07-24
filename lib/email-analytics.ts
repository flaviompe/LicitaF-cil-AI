'use server'

export interface EmailTrackingEvent {
  id: string
  emailId: string
  userId?: string
  userEmail: string
  eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed'
  timestamp: Date
  metadata?: {
    ipAddress?: string
    userAgent?: string
    linkUrl?: string
    linkText?: string
    bounceReason?: string
    complaintReason?: string
    deviceType?: 'desktop' | 'mobile' | 'tablet'
    location?: {
      country?: string
      city?: string
    }
  }
}

export interface EmailCampaign {
  id: string
  name: string
  description?: string
  templateId: string
  createdBy: string
  createdAt: Date
  scheduledAt?: Date
  sentAt?: Date
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
  recipientCount: number
  
  // Targeting
  recipientFilter?: {
    userIds?: string[]
    segments?: string[]
    opportunityFilters?: Record<string, any>
  }
  
  // Campaign settings
  settings: {
    trackOpens: boolean
    trackClicks: boolean
    suppressBounces: boolean
    batchSize: number
    delayBetweenBatches: number // in seconds
  }
}

export interface EmailMetrics {
  emailId: string
  campaignId?: string
  templateId?: string
  userId?: string
  userEmail: string
  
  // Delivery metrics
  sentAt?: Date
  deliveredAt?: Date
  failedAt?: Date
  failureReason?: string
  
  // Engagement metrics
  opened: boolean
  openedAt?: Date
  openCount: number
  
  clicked: boolean
  clickedAt?: Date
  clickCount: number
  uniqueClickCount: number
  clickedLinks: string[]
  
  // Negative metrics
  bounced: boolean
  bouncedAt?: Date
  bounceType?: 'soft' | 'hard'
  bounceReason?: string
  
  complained: boolean
  complainedAt?: Date
  
  unsubscribed: boolean
  unsubscribedAt?: Date
}

export interface AnalyticsReport {
  period: {
    start: Date
    end: Date
  }
  
  // Overall metrics
  totalEmails: number
  totalDelivered: number
  totalOpened: number
  totalClicked: number
  totalBounced: number
  totalComplaints: number
  totalUnsubscribes: number
  
  // Rates
  deliveryRate: number
  openRate: number
  clickRate: number
  bounceRate: number
  complaintRate: number
  unsubscribeRate: number
  
  // Engagement metrics
  clickToOpenRate: number
  avgTimeToOpen?: number // in minutes
  avgTimeToClick?: number // in minutes
  
  // Breakdown by category
  byTemplate: Record<string, {
    sent: number
    opened: number
    clicked: number
    openRate: number
    clickRate: number
  }>
  
  byCampaign: Record<string, {
    sent: number
    opened: number
    clicked: number
    openRate: number
    clickRate: number
  }>
  
  byDay: Array<{
    date: string
    sent: number
    opened: number
    clicked: number
    bounced: number
  }>
  
  // Top performing content
  topLinks: Array<{
    url: string
    text: string
    clicks: number
    uniqueClicks: number
  }>
  
  // Device breakdown
  deviceStats: {
    desktop: number
    mobile: number
    tablet: number
    unknown: number
  }
  
  // Geographic data
  topCountries: Array<{
    country: string
    opens: number
    clicks: number
  }>
}

class EmailAnalyticsService {
  private events: EmailTrackingEvent[] = []
  private metrics: Map<string, EmailMetrics> = new Map()
  private campaigns: Map<string, EmailCampaign> = new Map()

  constructor() {
    this.loadData()
  }

  private async loadData() {
    // In production, this would load from database
    console.log('Loading email analytics data...')
  }

  // Event tracking
  async trackEvent(event: Omit<EmailTrackingEvent, 'id' | 'timestamp'>): Promise<string> {
    const trackingEvent: EmailTrackingEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event
    }

    this.events.push(trackingEvent)
    
    // Update metrics
    await this.updateMetrics(trackingEvent)
    
    // Keep only recent events in memory (last 10000)
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000)
    }

    await this.saveEvent(trackingEvent)
    return trackingEvent.id
  }

  private async updateMetrics(event: EmailTrackingEvent) {
    let metrics = this.metrics.get(event.emailId)
    
    if (!metrics) {
      metrics = {
        emailId: event.emailId,
        userEmail: event.userEmail,
        userId: event.userId,
        
        opened: false,
        openCount: 0,
        clicked: false,
        clickCount: 0,
        uniqueClickCount: 0,
        clickedLinks: [],
        
        bounced: false,
        complained: false,
        unsubscribed: false
      }
    }

    switch (event.eventType) {
      case 'sent':
        metrics.sentAt = event.timestamp
        break
        
      case 'delivered':
        metrics.deliveredAt = event.timestamp
        break
        
      case 'opened':
        if (!metrics.opened) {
          metrics.opened = true
          metrics.openedAt = event.timestamp
        }
        metrics.openCount++
        break
        
      case 'clicked':
        if (!metrics.clicked) {
          metrics.clicked = true
          metrics.clickedAt = event.timestamp
        }
        metrics.clickCount++
        
        if (event.metadata?.linkUrl) {
          if (!metrics.clickedLinks.includes(event.metadata.linkUrl)) {
            metrics.clickedLinks.push(event.metadata.linkUrl)
            metrics.uniqueClickCount++
          }
        }
        break
        
      case 'bounced':
        metrics.bounced = true
        metrics.bouncedAt = event.timestamp
        metrics.bounceType = event.metadata?.bounceReason?.includes('permanent') ? 'hard' : 'soft'
        metrics.bounceReason = event.metadata?.bounceReason
        break
        
      case 'complained':
        metrics.complained = true
        metrics.complainedAt = event.timestamp
        break
        
      case 'unsubscribed':
        metrics.unsubscribed = true
        metrics.unsubscribedAt = event.timestamp
        break
    }

    this.metrics.set(event.emailId, metrics)
    await this.saveMetrics(metrics)
  }

  // Analytics queries
  async getEmailMetrics(emailId: string): Promise<EmailMetrics | null> {
    return this.metrics.get(emailId) || null
  }

  async getUserMetrics(userId: string): Promise<{
    totalSent: number
    totalOpened: number
    totalClicked: number
    openRate: number
    clickRate: number
    lastActivity?: Date
  }> {
    const userMetrics = Array.from(this.metrics.values()).filter(m => m.userId === userId)
    
    const totalSent = userMetrics.length
    const totalOpened = userMetrics.filter(m => m.opened).length
    const totalClicked = userMetrics.filter(m => m.clicked).length
    
    const lastActivity = userMetrics
      .map(m => m.clickedAt || m.openedAt)
      .filter(date => date)
      .sort((a, b) => b!.getTime() - a!.getTime())[0]

    return {
      totalSent,
      totalOpened,
      totalClicked,
      openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
      clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
      lastActivity
    }
  }

  async getTemplateMetrics(templateId: string, days = 30): Promise<{
    totalSent: number
    totalOpened: number
    totalClicked: number
    openRate: number
    clickRate: number
    avgTimeToOpen?: number
    avgTimeToClick?: number
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const templateMetrics = Array.from(this.metrics.values()).filter(m => 
      m.templateId === templateId && m.sentAt && m.sentAt >= since
    )

    const totalSent = templateMetrics.length
    const openedMetrics = templateMetrics.filter(m => m.opened)
    const clickedMetrics = templateMetrics.filter(m => m.clicked)

    // Calculate average time to open/click
    const openTimes = openedMetrics
      .filter(m => m.sentAt && m.openedAt)
      .map(m => m.openedAt!.getTime() - m.sentAt!.getTime())
    
    const clickTimes = clickedMetrics
      .filter(m => m.sentAt && m.clickedAt)
      .map(m => m.clickedAt!.getTime() - m.sentAt!.getTime())

    return {
      totalSent,
      totalOpened: openedMetrics.length,
      totalClicked: clickedMetrics.length,
      openRate: totalSent > 0 ? (openedMetrics.length / totalSent) * 100 : 0,
      clickRate: totalSent > 0 ? (clickedMetrics.length / totalSent) * 100 : 0,
      avgTimeToOpen: openTimes.length > 0 ? openTimes.reduce((a, b) => a + b, 0) / openTimes.length / 60000 : undefined,
      avgTimeToClick: clickTimes.length > 0 ? clickTimes.reduce((a, b) => a + b, 0) / clickTimes.length / 60000 : undefined
    }
  }

  async generateReport(
    startDate: Date,
    endDate: Date,
    filters?: {
      templateId?: string
      campaignId?: string
      userId?: string
    }
  ): Promise<AnalyticsReport> {
    const filteredEvents = this.events.filter(event => {
      if (event.timestamp < startDate || event.timestamp > endDate) return false
      if (filters?.userId && event.userId !== filters.userId) return false
      return true
    })

    const filteredMetrics = Array.from(this.metrics.values()).filter(metrics => {
      if (!metrics.sentAt || metrics.sentAt < startDate || metrics.sentAt > endDate) return false
      if (filters?.templateId && metrics.templateId !== filters.templateId) return false
      if (filters?.campaignId && metrics.campaignId !== filters.campaignId) return false
      if (filters?.userId && metrics.userId !== filters.userId) return false
      return true
    })

    const totalEmails = filteredMetrics.length
    const totalDelivered = filteredMetrics.filter(m => m.deliveredAt).length
    const totalOpened = filteredMetrics.filter(m => m.opened).length
    const totalClicked = filteredMetrics.filter(m => m.clicked).length
    const totalBounced = filteredMetrics.filter(m => m.bounced).length
    const totalComplaints = filteredMetrics.filter(m => m.complained).length
    const totalUnsubscribes = filteredMetrics.filter(m => m.unsubscribed).length

    // Calculate rates
    const deliveryRate = totalEmails > 0 ? (totalDelivered / totalEmails) * 100 : 0
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0
    const clickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0
    const bounceRate = totalEmails > 0 ? (totalBounced / totalEmails) * 100 : 0
    const complaintRate = totalDelivered > 0 ? (totalComplaints / totalDelivered) * 100 : 0
    const unsubscribeRate = totalDelivered > 0 ? (totalUnsubscribes / totalDelivered) * 100 : 0
    const clickToOpenRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0

    // Generate breakdowns
    const byTemplate = this.generateTemplateBreakdown(filteredMetrics)
    const byCampaign = this.generateCampaignBreakdown(filteredMetrics)
    const byDay = this.generateDailyBreakdown(filteredMetrics, startDate, endDate)
    const topLinks = this.generateTopLinks(filteredEvents)
    const deviceStats = this.generateDeviceStats(filteredEvents)
    const topCountries = this.generateCountryStats(filteredEvents)

    return {
      period: { start: startDate, end: endDate },
      totalEmails,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalBounced,
      totalComplaints,
      totalUnsubscribes,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      complaintRate: Math.round(complaintRate * 100) / 100,
      unsubscribeRate: Math.round(unsubscribeRate * 100) / 100,
      clickToOpenRate: Math.round(clickToOpenRate * 100) / 100,
      byTemplate,
      byCampaign,
      byDay,
      topLinks,
      deviceStats,
      topCountries
    }
  }

  private generateTemplateBreakdown(metrics: EmailMetrics[]): Record<string, any> {
    const breakdown: Record<string, { sent: number, opened: number, clicked: number }> = {}
    
    metrics.forEach(m => {
      if (!m.templateId) return
      
      if (!breakdown[m.templateId]) {
        breakdown[m.templateId] = { sent: 0, opened: 0, clicked: 0 }
      }
      
      breakdown[m.templateId].sent++
      if (m.opened) breakdown[m.templateId].opened++
      if (m.clicked) breakdown[m.templateId].clicked++
    })

    // Add rates
    return Object.fromEntries(
      Object.entries(breakdown).map(([templateId, stats]) => [
        templateId,
        {
          ...stats,
          openRate: stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 10000) / 100 : 0,
          clickRate: stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 10000) / 100 : 0
        }
      ])
    )
  }

  private generateCampaignBreakdown(metrics: EmailMetrics[]): Record<string, any> {
    const breakdown: Record<string, { sent: number, opened: number, clicked: number }> = {}
    
    metrics.forEach(m => {
      if (!m.campaignId) return
      
      if (!breakdown[m.campaignId]) {
        breakdown[m.campaignId] = { sent: 0, opened: 0, clicked: 0 }
      }
      
      breakdown[m.campaignId].sent++
      if (m.opened) breakdown[m.campaignId].opened++
      if (m.clicked) breakdown[m.campaignId].clicked++
    })

    return Object.fromEntries(
      Object.entries(breakdown).map(([campaignId, stats]) => [
        campaignId,
        {
          ...stats,
          openRate: stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 10000) / 100 : 0,
          clickRate: stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 10000) / 100 : 0
        }
      ])
    )
  }

  private generateDailyBreakdown(metrics: EmailMetrics[], startDate: Date, endDate: Date): any[] {
    const dailyStats: Record<string, { sent: number, opened: number, clicked: number, bounced: number }> = {}
    
    // Initialize all days in range
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      dailyStats[dateStr] = { sent: 0, opened: 0, clicked: 0, bounced: 0 }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Populate with actual data
    metrics.forEach(m => {
      if (!m.sentAt) return
      
      const dateStr = m.sentAt.toISOString().split('T')[0]
      if (dailyStats[dateStr]) {
        dailyStats[dateStr].sent++
        if (m.opened) dailyStats[dateStr].opened++
        if (m.clicked) dailyStats[dateStr].clicked++
        if (m.bounced) dailyStats[dateStr].bounced++
      }
    })

    return Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  private generateTopLinks(events: EmailTrackingEvent[]): any[] {
    const linkStats: Record<string, { clicks: number, uniqueClicks: Set<string>, text?: string }> = {}
    
    events
      .filter(e => e.eventType === 'clicked' && e.metadata?.linkUrl)
      .forEach(e => {
        const url = e.metadata!.linkUrl!
        
        if (!linkStats[url]) {
          linkStats[url] = { 
            clicks: 0, 
            uniqueClicks: new Set(),
            text: e.metadata?.linkText
          }
        }
        
        linkStats[url].clicks++
        if (e.userEmail) {
          linkStats[url].uniqueClicks.add(e.userEmail)
        }
      })

    return Object.entries(linkStats)
      .map(([url, stats]) => ({
        url,
        text: stats.text || url,
        clicks: stats.clicks,
        uniqueClicks: stats.uniqueClicks.size
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10)
  }

  private generateDeviceStats(events: EmailTrackingEvent[]): any {
    const stats = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 }
    
    events
      .filter(e => e.eventType === 'opened')
      .forEach(e => {
        const deviceType = e.metadata?.deviceType || 'unknown'
        stats[deviceType]++
      })

    return stats
  }

  private generateCountryStats(events: EmailTrackingEvent[]): any[] {
    const countryStats: Record<string, { opens: number, clicks: number }> = {}
    
    events
      .filter(e => (e.eventType === 'opened' || e.eventType === 'clicked') && e.metadata?.location?.country)
      .forEach(e => {
        const country = e.metadata!.location!.country!
        
        if (!countryStats[country]) {
          countryStats[country] = { opens: 0, clicks: 0 }
        }
        
        if (e.eventType === 'opened') countryStats[country].opens++
        if (e.eventType === 'clicked') countryStats[country].clicks++
      })

    return Object.entries(countryStats)
      .map(([country, stats]) => ({ country, ...stats }))
      .sort((a, b) => (b.opens + b.clicks) - (a.opens + a.clicks))
      .slice(0, 10)
  }

  // Campaign management
  async createCampaign(campaign: Omit<EmailCampaign, 'id' | 'createdAt'>): Promise<string> {
    const id = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newCampaign: EmailCampaign = {
      id,
      createdAt: new Date(),
      ...campaign
    }

    this.campaigns.set(id, newCampaign)
    await this.saveCampaign(newCampaign)
    
    return id
  }

  async getCampaign(id: string): Promise<EmailCampaign | null> {
    return this.campaigns.get(id) || null
  }

  async getAllCampaigns(filters?: { 
    status?: EmailCampaign['status']
    createdBy?: string 
  }): Promise<EmailCampaign[]> {
    let campaigns = Array.from(this.campaigns.values())
    
    if (filters?.status) {
      campaigns = campaigns.filter(c => c.status === filters.status)
    }
    
    if (filters?.createdBy) {
      campaigns = campaigns.filter(c => c.createdBy === filters.createdBy)
    }
    
    return campaigns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async updateCampaign(id: string, updates: Partial<EmailCampaign>): Promise<boolean> {
    const campaign = this.campaigns.get(id)
    if (!campaign) return false

    const updated = { ...campaign, ...updates }
    this.campaigns.set(id, updated)
    await this.saveCampaign(updated)
    
    return true
  }

  // Real-time tracking
  generateTrackingPixel(emailId: string): string {
    return `${process.env.NEXTAUTH_URL}/api/emails/track/open?emailId=${emailId}&t=${Date.now()}`
  }

  generateTrackingLink(emailId: string, originalUrl: string, linkText?: string): string {
    const params = new URLSearchParams({
      emailId,
      url: originalUrl,
      t: Date.now().toString()
    })
    
    if (linkText) {
      params.set('text', linkText)
    }
    
    return `${process.env.NEXTAUTH_URL}/api/emails/track/click?${params.toString()}`
  }

  async getRealtimeStats(): Promise<{
    emailsSentToday: number
    emailsOpenedToday: number
    emailsClickedToday: number
    recentActivity: EmailTrackingEvent[]
  }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayEvents = this.events.filter(e => e.timestamp >= today)
    
    return {
      emailsSentToday: todayEvents.filter(e => e.eventType === 'sent').length,
      emailsOpenedToday: todayEvents.filter(e => e.eventType === 'opened').length,
      emailsClickedToday: todayEvents.filter(e => e.eventType === 'clicked').length,
      recentActivity: this.events.slice(-20).reverse()
    }
  }

  // A/B Testing support
  async createABTest(config: {
    name: string
    campaignId: string
    variants: Array<{
      id: string
      name: string
      templateId: string
      percentage: number
    }>
    metric: 'open_rate' | 'click_rate' | 'conversion_rate'
    duration: number // in hours
  }): Promise<string> {
    // Implementation for A/B testing
    const testId = `ab_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    // This would be implemented based on requirements
    return testId
  }

  // Data persistence (placeholder methods)
  private async saveEvent(event: EmailTrackingEvent): Promise<void> {
    // Save to database
    console.log(`Saving tracking event: ${event.eventType} for email ${event.emailId}`)
  }

  private async saveMetrics(metrics: EmailMetrics): Promise<void> {
    // Save to database
    console.log(`Saving metrics for email ${metrics.emailId}`)
  }

  private async saveCampaign(campaign: EmailCampaign): Promise<void> {
    // Save to database
    console.log(`Saving campaign: ${campaign.name}`)
  }
}

// Singleton instance
let analyticsService: EmailAnalyticsService | null = null

export const getEmailAnalyticsService = (): EmailAnalyticsService => {
  if (!analyticsService) {
    analyticsService = new EmailAnalyticsService()
  }
  return analyticsService
}

// Helper functions
export const trackEmailSent = async (emailId: string, userId: string, userEmail: string): Promise<void> => {
  const service = getEmailAnalyticsService()
  await service.trackEvent({
    emailId,
    userId,
    userEmail,
    eventType: 'sent'
  })
}

export const trackEmailOpened = async (
  emailId: string, 
  userEmail: string, 
  metadata?: { ipAddress?: string, userAgent?: string, deviceType?: string }
): Promise<void> => {
  const service = getEmailAnalyticsService()
  await service.trackEvent({
    emailId,
    userEmail,
    eventType: 'opened',
    metadata
  })
}

export const trackEmailClicked = async (
  emailId: string,
  userEmail: string,
  linkUrl: string,
  linkText?: string,
  metadata?: { ipAddress?: string, userAgent?: string, deviceType?: string }
): Promise<void> => {
  const service = getEmailAnalyticsService()
  await service.trackEvent({
    emailId,
    userEmail,
    eventType: 'clicked',
    metadata: {
      ...metadata,
      linkUrl,
      linkText
    }
  })
}

export const generateEmailReport = async (
  startDate: Date,
  endDate: Date,
  filters?: { templateId?: string, campaignId?: string, userId?: string }
): Promise<AnalyticsReport> => {
  const service = getEmailAnalyticsService()
  return service.generateReport(startDate, endDate, filters)
}

export type { 
  EmailTrackingEvent, 
  EmailCampaign, 
  EmailMetrics, 
  AnalyticsReport 
}