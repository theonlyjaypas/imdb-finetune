import { useState, useEffect, useCallback } from 'react'

export interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  label?: string
  confidence?: number
}

const STORAGE_KEY = 'chat_messages'
const MAX_MESSAGES = 500
const STORAGE_VERSION = 1

interface StorageMessage {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: string
  label?: string
  confidence?: number
}

interface StorageData {
  version: number
  messages: StorageMessage[]
}

/**
 * Hook for persisting chat messages to localStorage
 * Automatically saves on every message and restores on mount
 */
export function useMessageStorage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data: StorageData = JSON.parse(stored)
        if (data.version === STORAGE_VERSION && Array.isArray(data.messages)) {
          const restored = data.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
          setMessages(restored)
        }
      }
    } catch (error) {
      console.error('Failed to restore messages from storage:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  const persistMessages = useCallback((msgs: Message[]) => {
    try {
      const storedMessages: StorageMessage[] = msgs.map((msg) => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp.toISOString(),
        label: msg.label,
        confidence: msg.confidence,
      }))
      const data: StorageData = {
        version: STORAGE_VERSION,
        messages: storedMessages,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing oldest messages')
        if (msgs.length > 50) {
          const trimmed = msgs.slice(-50)
          persistMessages(trimmed)
        }
      } else {
        console.error('Failed to persist messages:', error)
      }
    }
  }, [])

  const addMessage = useCallback(
    (message: Message) => {
      setMessages((prev) => {
        const updated = [...prev, message]
        const trimmed = updated.slice(-MAX_MESSAGES)
        persistMessages(trimmed)
        return trimmed
      })
    },
    [persistMessages]
  )

  const clear = useCallback(() => {
    setMessages([])
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear storage:', error)
    }
  }, [])

  const updateMessage = useCallback(
    (id: string, updates: Partial<Message>) => {
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === id ? { ...msg, ...updates } : msg
        )
        persistMessages(updated)
        return updated
      })
    },
    [persistMessages]
  )

  return {
    messages,
    addMessage,
    clear,
    updateMessage,
    isLoaded,
  }
}

/**
 * Clear all stored chat messages
 */
export function clearChatStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear chat storage:', error)
  }
}
