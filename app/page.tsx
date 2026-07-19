'use client'

import { useState, useRef, useEffect } from 'react'
import { parseCSV, downloadCSV, validateCSVFile, CSVError } from '@/lib/csv'
import { useMessageStorage } from '@/lib/storage'
import { validateReview, MAX_CHARS } from '@/lib/validation'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  label?: string
  confidence?: number
  processingTime?: number
}

interface BatchResult {
  username?: string
  review: string
  sentiment: string
  confidence: number
}

type Tab = 'chat' | 'batch'

export default function ChatPage() {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const { messages: savedMessages, addMessage, clear: clearStorage, isLoaded } = useMessageStorage()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [batchResults, setBatchResults] = useState<BatchResult[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchProgress, setBatchProgress] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const submitButtonRef = useRef<HTMLButtonElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isLoaded) {
      setMessages(savedMessages)
    }
  }, [isLoaded, savedMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setBatchLoading(true)
    setBatchProgress(0)
    setBatchResults([])

    try {
      const fileError = validateCSVFile(file)
      if (fileError) {
        setError(fileError)
        setBatchLoading(false)
        return
      }

      const text = await file.text()
      let reviews
      try {
        reviews = parseCSV(text)
      } catch (err) {
        if (err instanceof CSVError) {
          setError(`CSV parsing error: ${err.message}`)
        } else {
          setError('Failed to parse CSV file. Please check the format.')
        }
        setBatchLoading(false)
        return
      }

      if (reviews.length === 0) {
        setError('No valid reviews found in CSV. Make sure it has "username" and "review" columns.')
        setBatchLoading(false)
        return
      }

      const reviewTexts = reviews.map((r) => r.review)
      setBatchProgress(30)

      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: reviewTexts }),
      })

      setBatchProgress(60)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.error || `Server error: ${response.status}`
        setError(errorMsg)
        setBatchLoading(false)
        return
      }

      const data = await response.json()
      const results: BatchResult[] = data.results.map(
        (result: { label: string; confidence: number; originalIndex: number }) => ({
          username: reviews[result.originalIndex].username,
          review: reviews[result.originalIndex].review,
          sentiment: result.label,
          confidence: result.confidence,
        })
      )

      setBatchResults(results)
      if (data.skipped && data.skipped > 0) {
        setError(`Processed ${results.length} reviews (${data.skipped} skipped due to validation errors)`)
      }
      setBatchProgress(100)
    } catch (err) {
      console.error('Error processing file:', err)
      setError(err instanceof Error ? err.message : 'Failed to process CSV file. Please try again.')
    } finally {
      setBatchLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, displayedText])

  useEffect(() => {
    if (loading || messages.length === 0) {
      setDisplayedText('')
      return
    }

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.sender !== 'bot') {
      setDisplayedText('')
      return
    }

    setDisplayedText('')
    let index = 0

    const typingInterval = setInterval(() => {
      if (index < lastMessage.text.length) {
        setDisplayedText((prev) => prev + lastMessage.text[index])
        index++
      } else {
        clearInterval(typingInterval)
      }
    }, 15)

    return () => clearInterval(typingInterval)
  }, [messages, loading])

  const copyToClipboard = async (text: string, type: 'text' | 'json' = 'text') => {
    try {
      const textToCopy = type === 'json' ? JSON.stringify(text, null, 2) : text
      await navigator.clipboard.writeText(textToCopy)
      setError(null)
    } catch (err) {
      console.error('Failed to copy:', err)
      setError('Failed to copy to clipboard')
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const validation = validateReview(input)
    if (!validation.isValid) {
      setError(validation.message)
      return
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: input,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    addMessage(userMessage)
    setInput('')
    setLoading(true)

    const startTime = performance.now()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()
      const processingTime = Math.round(performance.now() - startTime)

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: data.reply,
        sender: 'bot',
        timestamp: new Date(),
        label: data.label,
        confidence: data.confidence,
        processingTime,
      }

      setMessages((prev) => [...prev, botMessage])
      addMessage(botMessage)
    } catch (err) {
      console.error('Error sending message:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to analyze the review. Please try again.'
      setError(errorMsg)
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: 'Sorry, something went wrong. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      addMessage(errorMessage)
    } finally {
      setLoading(false)
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-950">
      <a
        href="#main-chat"
        className="absolute -top-40 left-4 z-50 rounded px-4 py-2 btn-primary focus:top-4"
      >
        Skip to main content
      </a>

      <header className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Sentiment Classifier</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Analyze movie reviews with AI</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveTab('chat')
                  setError(null)
                }}
                className={`px-4 py-2 font-medium rounded-md transition-colors ${
                  activeTab === 'chat'
                    ? 'btn-primary'
                    : 'btn-ghost text-slate-600 dark:text-slate-400'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => {
                  setActiveTab('batch')
                  setError(null)
                }}
                className={`px-4 py-2 font-medium rounded-md transition-colors ${
                  activeTab === 'batch'
                    ? 'btn-primary'
                    : 'btn-ghost text-slate-600 dark:text-slate-400'
                }`}
              >
                Batch
              </button>
              {activeTab === 'chat' && messages.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('Clear all chat history? This cannot be undone.')) {
                      clearStorage()
                      setMessages([])
                    }
                  }}
                  className="btn-ghost text-xs"
                  title="Clear chat history"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main id="main-chat" className="flex-1 overflow-y-auto px-6 py-6 bg-white dark:bg-slate-950">
        {activeTab === 'batch' ? (
          <div className="mx-auto max-w-4xl">
            {batchResults.length === 0 && !batchLoading ? (
              <div className="flex h-full items-center justify-center px-4 py-8">
                <div className="w-full max-w-md text-center space-y-8">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
                      Batch Processing
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400">
                      Upload a CSV file to analyze multiple reviews
                    </p>
                  </div>
                  <div className="card p-6 text-left space-y-5 border-l-4 border-l-indigo-500 dark:border-l-indigo-400">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">1</span>
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-50">CSV Format</h3>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 ml-8">Prepare your file with these required columns:</p>
                      <div className="ml-8">
                        <div className="inline-flex items-center gap-2 rounded-md border border-dotted border-slate-300 dark:border-slate-700 px-3 py-2">
                          <code className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">username</code>
                          <span className="text-slate-400 dark:text-slate-600">,</span>
                          <code className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">review</code>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex-shrink-0">
                          <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Output includes sentiment classification and confidence scores</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {batchLoading && (
                  <div className="card p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-50">Processing reviews...</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{batchProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300"
                          style={{ width: `${batchProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {batchResults.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                        {batchResults.length} reviews processed
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadCSV(batchResults, 'sentiment_results.csv')}
                          className="btn-secondary text-sm"
                        >
                          Download CSV
                        </button>
                        <button
                          onClick={() => {
                            const json = JSON.stringify(batchResults, null, 2)
                            const blob = new Blob([json], { type: 'application/json' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = 'sentiment_results.json'
                            a.click()
                            URL.revokeObjectURL(url)
                          }}
                          className="btn-secondary text-sm"
                        >
                          Download JSON
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto card">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                            <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Username</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Review</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-50">Sentiment</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-50">Confidence</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-50">Copy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResults.map((result, idx) => (
                            <tr key={idx} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-900 transition-colors">
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{result.username || '-'}</td>
                              <td className="max-w-xs px-4 py-3 truncate text-slate-900 dark:text-slate-50" title={result.review}>
                                {result.review}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`badge ${
                                    result.sentiment === 'Positive'
                                      ? 'badge-success'
                                      : 'badge-error'
                                  }`}
                                >
                                  {result.sentiment}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-slate-900 dark:text-slate-50">{(result.confidence * 100).toFixed(1)}%</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => copyToClipboard(JSON.stringify(result))}
                                  className="btn-ghost text-xs p-1"
                                  title="Copy row as JSON"
                                >
                                  Copy
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center px-4 py-8">
              <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50 mb-2">
                    Analyze Reviews
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Paste a movie review below or try an example
                  </p>
                </div>
                <div className="card p-4 space-y-2">
                  <button
                    onClick={() => setInput("This film was an absolute masterpiece! One of the best movies I've ever seen.")}
                    className="card w-full px-3 py-2 text-left hover:bg-slate-50 dark:bg-slate-900 transition-colors text-sm"
                  >
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">Positive</span>
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">This film was an absolute masterpiece...</div>
                  </button>
                  <button
                    onClick={() => setInput("Terrible movie. Complete waste of time. Bad acting, boring plot.")}
                    className="card w-full px-3 py-2 text-left hover:bg-slate-50 dark:bg-slate-900 transition-colors text-sm"
                  >
                    <span className="font-medium text-red-700 dark:text-red-300">Negative</span>
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">Terrible movie. Complete waste of time...</div>
                  </button>
                  <button
                    onClick={() => setInput("Pretty good overall. Good acting, but the plot was predictable.")}
                    className="card w-full px-3 py-2 text-left hover:bg-slate-50 dark:bg-slate-900 transition-colors text-sm"
                  >
                    <span className="font-medium text-slate-600 dark:text-slate-400">Mixed</span>
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate">Pretty good overall. Good acting...</div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4" role="log" aria-live="polite" aria-label="Chat messages">
              {messages.map((msg, idx) => {
                const isLastMessage = idx === messages.length - 1
                const showStreamingText = isLastMessage && msg.sender === 'bot' && loading
                const textToShow = showStreamingText ? displayedText : msg.text
                const timeStr = msg.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <article
                    key={msg.id}
                    className={`flex animate-fade-in ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    aria-label={`Message from ${msg.sender === 'user' ? 'you' : 'classifier'} at ${timeStr}`}
                  >
                    {msg.sender === 'bot' && msg.label ? (
                      <div className="flex flex-col items-start gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`badge ${
                              msg.label === 'Positive'
                                ? 'badge-success'
                                : 'badge-error'
                            }`}
                            role="status"
                            aria-label={`Sentiment: ${msg.label}`}
                          >
                            {msg.label}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {(msg.confidence! * 100).toFixed(1)}% confidence
                          </span>
                          <button
                            onClick={() => copyToClipboard(`${msg.label}: ${(msg.confidence! * 100).toFixed(2)}% confidence`)}
                            className="btn-ghost text-xs p-1"
                            title="Copy result"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-500">
                          <time dateTime={msg.timestamp.toISOString()}>
                            {timeStr}
                          </time>
                          {msg.processingTime && (
                            <span> · {msg.processingTime}ms</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`max-w-lg rounded-lg px-4 py-3 ${
                          msg.sender === 'user'
                            ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                            : 'card bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{textToShow}</p>
                        {showStreamingText && <span className="animate-pulse" aria-hidden="true">|</span>}
                        <time
                          dateTime={msg.timestamp.toISOString()}
                          className={`mt-2 block text-xs ${
                            msg.sender === 'user' ? 'text-white/70' : 'text-slate-500 dark:text-slate-500'
                          }`}
                        >
                          {timeStr}
                        </time>
                      </div>
                    )}
                  </article>
                )
              })}
              {loading && !messages[messages.length - 1]?.label && (
                <div className="flex animate-fade-in justify-start">
                  <div className="card bg-slate-50 dark:bg-slate-900 px-4 py-3" aria-label="Classifier is analyzing the review">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1" aria-hidden="true">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 dark:bg-indigo-500" style={{ animationDelay: '0ms' }}></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 dark:bg-indigo-500" style={{ animationDelay: '150ms' }}></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-indigo-600 dark:bg-indigo-500" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-500">Analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
            </div>
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-4">
        {activeTab === 'batch' ? (
          <div className="mx-auto max-w-4xl">
            <div className="space-y-3">
              {error && (
                <div role="alert" className="card border border-red-200/50 bg-red-50/50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
                  {error}
                </div>
              )}
              <div className="flex items-center gap-3">
                <label htmlFor="csv-upload" className="sr-only">
                  Upload CSV file with reviews
                </label>
                <div className="relative flex-1">
                  <input
                    ref={fileInputRef}
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={batchLoading}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={batchLoading}
                    className="w-full rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 px-4 py-3 font-medium text-slate-600 dark:text-slate-400 transition-all hover:border-slate-400 dark:hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {batchLoading ? 'Processing...' : 'Click to upload CSV'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500">
                Columns required: username, review
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={sendMessage} className="mx-auto max-w-4xl">
          <div className="space-y-3">
            {error && (
              <div role="alert" className="card border border-red-200/50 bg-red-50/50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-300">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <label htmlFor="review-input" className="sr-only">
                Movie review to analyze
              </label>
              <textarea
                ref={inputRef}
                id="review-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submitButtonRef.current?.click()
                  }
                }}
                placeholder="Paste a movie review here..."
                disabled={loading}
                maxLength={10000}
                className="flex-1 resize-none rounded-lg card px-4 py-3 text-sm placeholder-color-text-tertiary shadow-none focus:ring-2 focus:ring-offset-0 focus:ring-color-brand"
                rows={3}
                aria-describedby="char-count"
              />
              <button
                ref={submitButtonRef}
                type="submit"
                disabled={loading || !validateReview(input).isValid}
                className="btn-primary flex items-center gap-2 px-6 py-3 self-end"
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true"></span>
                    <span>Analyzing</span>
                  </>
                ) : (
                  <span>Classify</span>
                )}
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p id="char-count" className="text-xs text-slate-500 dark:text-slate-500">
                  {validateReview(input).message}
                </p>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-1 transition-all duration-200 ${
                    validateReview(input).isValid && input.length > 0
                      ? 'bg-indigo-600 dark:bg-indigo-500'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}
                  style={{ width: `${Math.min(validateReview(input).percentFull, 100)}%` }}
                />
              </div>
            </div>
          </div>
          </form>
        )}
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        /* Visible focus indicators for keyboard navigation */
        button:focus-visible,
        textarea:focus-visible,
        a:focus-visible {
          outline: 2px solid #7c3aed;
          outline-offset: 2px;
        }

        /* Improve color contrast for disabled state */
        button:disabled {
          opacity: 0.6;
        }

        /* Better button hover/active states */
        button:not(:disabled):active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  )
}
