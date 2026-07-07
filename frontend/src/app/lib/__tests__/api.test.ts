/**
 * Tests for the frontend API client (lib/api.ts).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchGreeting,
  sendMessage,
  evaluateQuiz,
  executeCode,
  getPptDownloadUrl,
  getWordDownloadUrl,
} from '../api'

// Type the global fetch mock
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

beforeEach(() => {
  mockFetch.mockReset()
})

describe('fetchGreeting', () => {
  it('constructs the correct URL with query params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ greeting: 'Hello', suggestions: [] }),
    })

    await fetchGreeting('sess-1', 'middle')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toContain('/api/greeting')
    expect(url).toContain('session_id=sess-1')
    expect(url).toContain('grade=middle')
  })

  it('returns parsed JSON on success', async () => {
    const data = { greeting: '你好！', suggestions: [{ text: '学AI', action: 'teach', topic: 'AI基础' }], grade: 'middle', stats: {} }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => data,
    })

    const result = await fetchGreeting('test', 'primary_low')
    expect(result).toEqual(data)
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    await expect(fetchGreeting('test', 'middle')).rejects.toThrow('Greeting API error')
  })
})

describe('sendMessage', () => {
  it('sends POST with correct body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ intent: 'chat', grade: 'middle', topic: 'AI', type: 'chat', message: '你好！' }),
    })

    await sendMessage({ session_id: 's1', message: '你好', grade: 'middle' })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/chat')
    expect(options.method).toBe('POST')
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
    const body = JSON.parse(options.body as string)
    expect(body.session_id).toBe('s1')
    expect(body.message).toBe('你好')
    expect(body.grade).toBe('middle')
  })

  it('returns parsed ChatResponse on success', async () => {
    const response = {
      intent: 'quiz',
      grade: 'high',
      topic: '神经网络',
      type: 'quiz',
      message: '来做题吧！',
      quiz: { questions: [{ type: 'choice', question: 'Q?', options: ['A', 'B'], answer: 'A', explanation: 'E' }] },
    }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => response })

    const result = await sendMessage({ session_id: 's1', message: '出题', grade: 'high' })
    expect(result.type).toBe('quiz')
    expect(result.quiz).toBeDefined()
    expect(result.quiz!.questions).toHaveLength(1)
  })

  it('throws with status code on error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    })

    await expect(
      sendMessage({ session_id: 's1', message: 'test', grade: 'middle' })
    ).rejects.toThrow('Chat API error (503)')
  })
})

describe('evaluateQuiz', () => {
  it('sends the quiz evaluation request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ is_correct: true, correct_answer: 'A', explanation: 'ok', feedback: '正确！' }),
    })

    const result = await evaluateQuiz({
      question: { answer: 'A' },
      answer: 'A',
      session_id: 's1',
      topic: 'AI',
    })

    expect(result.is_correct).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/quiz/eval')
    expect(options.method).toBe('POST')
  })

  it('throws on error response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'Bad request' })

    await expect(
      evaluateQuiz({ question: {}, answer: 'A', session_id: 's1', topic: '' })
    ).rejects.toThrow('Quiz eval API error (400)')
  })
})

describe('executeCode', () => {
  it('sends code execution request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, stdout: 'Hello', stderr: '' }),
    })

    const result = await executeCode({ code: 'print("hello")' })

    expect(result.success).toBe(true)
    expect(result.stdout).toBe('Hello')
  })

  it('throws on error response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422, text: async () => 'Invalid' })

    await expect(executeCode({ code: '' })).rejects.toThrow('Code exec API error (422)')
  })
})

describe('download URLs', () => {
  it('getPptDownloadUrl returns correct path', () => {
    expect(getPptDownloadUrl('AI基础', 'middle')).toBe('/api/resources/ppt')
  })

  it('getWordDownloadUrl returns correct path', () => {
    expect(getWordDownloadUrl('AI基础', 'middle')).toBe('/api/resources/word')
  })
})
