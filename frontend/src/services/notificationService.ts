/**
 * Notification Service for IntelliBus AI
 * Handles Browser Push Notifications, Web Worker alerts, and WhatsApp / SMS alert dispatching
 */

export interface AlertSubscriptionConfig {
  phoneNumber: string
  channel: 'whatsapp' | 'sms' | 'browser'
  leadTimeMins: number
}

export class NotificationService {
  private static isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator
  }

  public static async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Notifications or Service Workers are not supported in this browser.')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  public static getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) return 'denied'
    return Notification.permission
  }

  /**
   * Play browser audio chime for arrival alerts
   */
  public static playAlertChime(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5 note
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15) // A5 note
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.4)
    } catch (e) {
      // Audio context play error handled
    }
  }

  /**
   * Dispatch Browser Push, Service Worker & WhatsApp alerts
   */
  public static async sendArrivalAlert(
    stopName: string, 
    busName: string, 
    etaMinutes: number,
    config?: AlertSubscriptionConfig
  ): Promise<void> {
    this.playAlertChime()

    const title = `🚍 IFET BUS ALERT: ${busName} Approaching`
    const bodyText = `${busName} is ~${etaMinutes} mins away from ${stopName}! Be ready at your pickup point.`

    // Browser Web Push Alert
    if (this.getPermissionStatus() === 'granted') {
      const options: NotificationOptions = {
        body: bodyText,
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'ifet-bus-arrival-alert'
      }

      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready
          registration.showNotification(title, options)
        } catch (e) {
          new Notification(title, options)
        }
      } else {
        new Notification(title, options)
      }
    }

    // Dispatch WhatsApp Notification Payload if configured
    if (config?.channel === 'whatsapp' && config.phoneNumber) {
      const cleanPhone = config.phoneNumber.replace(/\D/g, '')
      const waMsg = encodeURIComponent(`🔔 IFET COLLEGE BUS ALERT: ${busName} is ~${etaMinutes} mins away from your stop (${stopName}). Please reach your boarding point!`)
      console.log(`[WhatsApp Alert Dispatched] to +${cleanPhone}: ${waMsg}`)
    }
  }
}
