/**
 * Vektor Real-Time WebSocket Client.
 * Connects to ws://localhost:8000/ws/disruptions for live sub-second event streaming.
 */

class WebSocketClient {
  constructor() {
    this.ws = null
    this.listeners = new Set()
    this.reconnectTimer = null
    this.pingTimer = null
    this.isConnected = false
    this.url = 'ws://localhost:8000/ws/disruptions'
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.isConnected = true
        console.log('[Vektor WebSocket] Connected to real-time engine.')
        this.startHeartbeat()
        this.notifyListeners({ type: 'STATUS_CHANGE', isConnected: true })
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[Vektor WebSocket] Event received:', data)
          this.notifyListeners(data)

          // Also dispatch as custom window event for easy global listening
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('vektor:live_event', { detail: data }))
          }
        } catch (err) {
          console.warn('[Vektor WebSocket] Error parsing message:', err)
        }
      }

      this.ws.onclose = () => {
        this.isConnected = false
        this.stopHeartbeat()
        this.notifyListeners({ type: 'STATUS_CHANGE', isConnected: false })
        console.log('[Vektor WebSocket] Disconnected. Reconnecting in 3s...')
        this.scheduleReconnect()
      }

      this.ws.onerror = (err) => {
        console.debug('[Vektor WebSocket] Error occurred:', err)
        this.ws.close()
      }
    } catch (err) {
      console.warn('[Vektor WebSocket] Connection initialization failed:', err)
      this.scheduleReconnect()
    }
  }

  startHeartbeat() {
    this.stopHeartbeat()
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }))
      }
    }, 25000)
  }

  stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 3000)
  }

  subscribe(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  notifyListeners(data) {
    this.listeners.forEach((callback) => {
      try {
        callback(data)
      } catch (e) {
        console.error('[Vektor WebSocket] Listener error:', e)
      }
    })
  }
}

export const wsClient = new WebSocketClient()

// Auto-connect on import in browser environment
if (typeof window !== 'undefined') {
  wsClient.connect()
}
