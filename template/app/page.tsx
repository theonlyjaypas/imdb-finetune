'use client'

import { useState, useRef, useEffect } from 'react'
import { parseCSV, downloadCSV, validateCSVFile, CSVError } from '@/lib/csv'

interface Message {
  id: string
  text: string
  sender: 'user' | 'bot'
  timestamp: Date
  label?: string
  confidence?: number
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!input.trim()) {
      setError('Please enter a review to analyze')
      return
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: input,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        text: data.reply,
        sender: 'bot',
        timestamp: new Date(),
        label: data.label,
        confidence: data.confidence,
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to analyze the review. Please try again.')
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        text: 'Sorry, something went wrong. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-slate-50 via-violet-50 to-slate-50 transition-colors duration-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <a
        href="#main-chat"
        className="absolute -top-40 left-4 z-50 rounded bg-violet-600 px-4 py-2 text-white focus:top-4"
      >
        Skip to main content
      </a>

      <header className="border-b border-violet-200/40 bg-white/95 px-6 py-6 shadow-sm backdrop-blur-md transition-colors duration-200 dark:border-violet-800/30 dark:bg-slate-950/95">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg" aria-hidden="true">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sentiment Classifier</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Analyze movie reviews with AI-powered sentiment detection</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setActiveTab('chat')
                  setError(null)
                }}
                className={`rounded-lg px-4 py-2 font-medium transition-all ${
                  activeTab === 'chat'
                    ? 'bg-violet-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => {
                  setActiveTab('batch')
                  setError(null)
                }}
                className={`rounded-lg px-4 py-2 font-medium transition-all ${
                  activeTab === 'batch'
                    ? 'bg-violet-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                Batch (CSV)
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-chat" className="flex-1 overflow-y-auto px-6 py-6 transition-colors duration-200 dark:bg-slate-900/50">
        {activeTab === 'batch' ? (
          <div className="mx-auto max-w-4xl">
            {batchResults.length === 0 && !batchLoading ? (
              <div className="flex h-full items-center justify-center px-4 py-8">
                <div className="w-full max-w-md text-center">
                  <div className="mb-8 flex justify-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-cyan-100 shadow-xl dark:from-violet-900/40 dark:to-cyan-900/40" aria-hidden="true">
                      <svg className="h-12 w-12 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="mb-8 space-y-2">
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white">
                      Batch Processing
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                      Upload a CSV file to analyze multiple reviews at once
                    </p>
                  </div>
                  <div className="mx-auto space-y-4">
                    <div className="rounded-2xl border border-violet-200/40 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-violet-800/30 dark:bg-slate-800/40">
                      <p className="mb-4 inline-block rounded-full bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">CSV Format</p>
                      <ul className="space-y-2 text-left">
                        <li className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 text-sm text-slate-700 dark:from-blue-900/20 dark:to-indigo-900/20 dark:text-slate-300">
                          <span className="font-medium text-blue-700 dark:text-blue-400">Required:</span> Columns: <code className="text-xs font-mono">username, review</code>
                        </li>
                        <li className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-slate-700 dark:from-amber-900/20 dark:to-orange-900/20 dark:text-slate-300">
                          <span className="font-medium text-amber-700 dark:text-amber-400">Example:</span> username,review
                        </li>
                        <li className="rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3 text-sm text-slate-700 dark:from-emerald-900/20 dark:to-green-900/20 dark:text-slate-300">
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">Output:</span> CSV with sentiment & confidence%
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {batchLoading && (
                  <div className="rounded-xl border border-violet-200/40 bg-white/70 p-6 dark:border-violet-800/30 dark:bg-slate-800/40">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Processing reviews...</span>
                        <span className="text-sm font-medium text-violet-600 dark:text-violet-400">{batchProgress}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-300"
                          style={{ width: `${batchProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {batchResults.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Results: {batchResults.length} reviews processed
                      </h3>
                      <button
                        onClick={() => downloadCSV(batchResults, 'sentiment_results.csv')}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 font-medium text-white shadow-md transition-all hover:shadow-lg hover:from-green-600 hover:to-emerald-600 active:scale-95"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download CSV
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-violet-200/40 bg-white/70 shadow-md dark:border-violet-800/30 dark:bg-slate-800/40">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-violet-200/40 bg-gradient-to-r from-violet-50 to-cyan-50 dark:border-violet-800/30 dark:from-slate-800/60 dark:to-slate-700/60">
                            <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Username</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-50">Review</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-50">Sentiment</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-50">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResults.map((result, idx) => (
                            <tr key={idx} className="border-b border-violet-100/40 dark:border-violet-800/20">
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{result.username || '-'}</td>
                              <td className="max-w-xs px-4 py-3 truncate text-slate-700 dark:text-slate-300" title={result.review}>
                                {result.review}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                    result.sentiment === 'Positive'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  }`}
                                >
                                  {result.sentiment === 'Positive' ? (
                                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  ) : (
                                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                  {result.sentiment}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300">{(result.confidence * 100).toFixed(1)}%</td>
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
              <div className="w-full max-w-md text-center">
                <div className="mb-8 flex justify-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-cyan-100 shadow-xl dark:from-violet-900/40 dark:to-cyan-900/40" aria-hidden="true">
                    <svg className="h-12 w-12 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16a2 2 0 002 2h6a2 2 0 002-2V4M7 4h10m-7 16h4M9 2h6M9 2v2h6V2" />
                    </svg>
                  </div>
                </div>
                <div className="mb-8 space-y-2">
                  <h2 className="text-4xl font-bold text-slate-900 dark:text-white">
                    Sentiment Classifier
                  </h2>
                  <p className="text-lg text-slate-600 dark:text-slate-400">
                    Analyze movie reviews with AI
                  </p>
                </div>
                <div className="mx-auto space-y-4">
                  <div className="rounded-2xl border border-violet-200/40 bg-white/70 p-6 shadow-sm backdrop-blur-sm dark:border-violet-800/30 dark:bg-slate-800/40">
                    <p className="mb-4 inline-block rounded-full bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">Example Reviews</p>
                    <ul className="space-y-2 text-left">
                      <li className="rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 text-sm text-slate-700 dark:from-green-900/20 dark:to-emerald-900/20 dark:text-slate-300">
                        <span className="font-medium text-green-700 dark:text-green-400">Positive:</span> &quot;This film was an absolute masterpiece.&quot;
                      </li>
                      <li className="rounded-lg bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 text-sm text-slate-700 dark:from-red-900/20 dark:to-rose-900/20 dark:text-slate-300">
                        <span className="font-medium text-red-700 dark:text-red-400">Negative:</span> &quot;Terrible movie.&quot;
                      </li>
                      <li className="rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3 text-sm text-slate-700 dark:from-amber-900/20 dark:to-yellow-900/20 dark:text-slate-300">
                        <span className="font-medium text-amber-700 dark:text-amber-400">Mixed:</span> &quot;Pretty good, but not great.&quot;
                      </li>
                    </ul>
                  </div>
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
                      <div className="flex flex-col items-start gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div
                            className={`inline-flex items-center justify-center gap-1.5 rounded-full w-32 h-10 text-xs font-semibold shadow-sm transition-all ${
                              msg.label === 'Positive'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}
                            role="status"
                            aria-label={`Sentiment: ${msg.label}`}
                          >
                            {msg.label === 'Positive' ? (
                              <svg className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="truncate">{msg.label}</span>
                          </div>
                          <div className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-100 to-blue-100 w-48 h-10 text-xs font-semibold text-cyan-700 shadow-md dark:from-cyan-900/40 dark:to-blue-900/40 dark:text-cyan-300" aria-label={`Confidence: ${(msg.confidence! * 100).toFixed(2)}%`}>
                            <div className="h-3 w-3 rounded-full bg-cyan-500 dark:bg-cyan-400 flex-shrink-0" aria-hidden="true"></div>
                            <span className="truncate">{(msg.confidence! * 100).toFixed(2)}% confidence</span>
                          </div>
                        </div>
                        <time
                          dateTime={msg.timestamp.toISOString()}
                          className="text-xs text-slate-500 dark:text-slate-400"
                        >
                          {timeStr}
                        </time>
                      </div>
                    ) : (
                      <div
                        className={`max-w-lg rounded-2xl px-5 py-4 shadow-md transition-all duration-300 focus-within:ring-2 focus-within:ring-offset-2 ${
                          msg.sender === 'user'
                            ? 'bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg focus-within:ring-violet-400 focus-within:ring-offset-violet-100 dark:focus-within:ring-offset-slate-950'
                            : 'bg-white text-slate-900 shadow-md dark:bg-slate-800/80 dark:text-slate-50 focus-within:ring-violet-500 dark:focus-within:ring-violet-400 focus-within:ring-offset-2 dark:focus-within:ring-offset-slate-950'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{textToShow}</p>
                        {showStreamingText && <span className="animate-pulse" aria-hidden="true">|</span>}
                        <time
                          dateTime={msg.timestamp.toISOString()}
                          className={`mt-3 block text-xs ${
                            msg.sender === 'user' ? 'text-violet-100' : 'text-slate-500'
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
                  <div className="rounded-2xl bg-white px-5 py-4 shadow-md dark:bg-slate-800/80" aria-label="Classifier is analyzing the review">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5" aria-hidden="true">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-violet-500 dark:bg-violet-400" style={{ animationDelay: '0ms' }}></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-violet-500 dark:bg-violet-400" style={{ animationDelay: '150ms' }}></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-violet-500 dark:bg-violet-400" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Analyzing...</span>
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

      <footer className="border-t border-violet-200/40 bg-white/95 px-6 py-6 shadow-lg backdrop-blur-md transition-colors duration-200 dark:border-violet-800/30 dark:bg-slate-950/95">
        {activeTab === 'batch' ? (
          <div className="mx-auto max-w-4xl">
            <div className="space-y-3">
              {error && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 px-5 py-3 font-medium text-violet-700 transition-all hover:border-violet-400 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-700/50 dark:bg-violet-950/20 dark:text-violet-300 dark:hover:border-violet-600 dark:hover:bg-violet-900/30"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {batchLoading ? 'Processing...' : 'Click to upload CSV'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                CSV should have columns: username, review
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={sendMessage} className="mx-auto max-w-4xl">
          <div className="space-y-3">
            {error && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300">
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
                className="flex-1 resize-none rounded-xl border-2 border-violet-200/40 bg-white px-5 py-3.5 text-slate-900 placeholder-slate-500 shadow-md transition-all duration-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/30 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 dark:border-violet-800/30 dark:bg-slate-800/50 dark:text-slate-50 dark:placeholder-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-500/20 dark:disabled:bg-slate-900/30"
                rows={3}
                aria-describedby="char-count"
              />
              <button
                ref={submitButtonRef}
                type="submit"
                disabled={loading || !input.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:from-violet-600 hover:to-cyan-600 active:scale-95 focus:ring-2 focus:ring-violet-500/30 focus:ring-offset-2 focus:outline-none disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none disabled:cursor-not-allowed dark:focus:ring-offset-slate-950"
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true"></span>
                    <span>Analyzing</span>
                  </>
                ) : (
                  <>
                    <span>Classify</span>
                    <span aria-hidden="true"></span>
                  </>
                )}
              </button>
            </div>
            <p id="char-count" className="text-xs text-slate-500 dark:text-slate-400">
              {input.length} characters
            </p>
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
