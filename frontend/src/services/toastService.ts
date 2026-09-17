/**
 * Standard Toast Notification System for IntelliBus AI
 */

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
}

type ToastListener = (toasts: ToastMessage[]) => void

class ToastServiceManager {
  private toasts: ToastMessage[] = []
  private listeners: Set<ToastListener> = new Set()

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener)
    listener(this.toasts)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((l) => l([...this.toasts]))
  }

  public show(type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string): void {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: ToastMessage = { id, type, title, message }
    this.toasts.push(toast)
    this.notify()

    setTimeout(() => {
      this.dismiss(id)
    }, 4000)
  }

  public success(title: string, message?: string): void {
    this.show('success', title, message)
  }

  public error(title: string, message?: string): void {
    this.show('error', title, message)
  }

  public info(title: string, message?: string): void {
    this.show('info', title, message)
  }

  public warning(title: string, message?: string): void {
    this.show('warning', title, message)
  }

  public dismiss(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id)
    this.notify()
  }
}

export const toast = new ToastServiceManager()
