/**
 * MessagesPage.jsx — Coach-to-student messaging
 *
 * Two-panel layout:
 *   Left  — scrollable student roster
 *   Right — selected student's conversation + send input
 *
 * Polls for new messages every 5 s while a conversation is open.
 */

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Users } from 'lucide-react'
import {
  getStudents,
  getConversation,
  sendMessageToStudent,
  markConversationRead,
} from '../services/api'
import { useToast } from '../App'


function formatTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMins = Math.floor((now - date) / 60000)
  const diffHours = Math.floor((now - date) / 3600000)
  const diffDays = Math.floor((now - date) / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function initials(s) {
  return `${s.first_name?.[0] ?? ''}${s.last_name?.[0] ?? ''}`.toUpperCase()
}


export default function MessagesPage() {
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)
  const pollRef = useRef(null)
  const showToast = useToast()

  // Load student roster once on mount
  useEffect(() => {
    getStudents()
      .then(setStudents)
      .catch(() => showToast('Failed to load students', 'error'))
      .finally(() => setLoadingStudents(false))
  }, [])

  // When selected student changes: load conversation + start polling
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)

    if (!selectedStudent) {
      setMessages([])
      return
    }

    loadMessages(true)
    markConversationRead(selectedStudent.id).catch(() => {})
    pollRef.current = setInterval(() => loadMessages(false), 5000)

    return () => clearInterval(pollRef.current)
  }, [selectedStudent?.id])

  async function loadMessages(showSpinner = true) {
    if (!selectedStudent) return
    if (showSpinner) setLoadingMessages(true)
    try {
      const data = await getConversation(selectedStudent.id)
      setMessages(Array.isArray(data) ? data : [])
      if (showSpinner) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }
        }, 100)
      }
    } catch (err) {
      if (showSpinner) showToast('Failed to load messages', 'error')
    } finally {
      if (showSpinner) setLoadingMessages(false)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    const text = inputText.trim()
    if (!text || sending || !selectedStudent) return

    setSending(true)
    setInputText('')
    try {
      const newMsg = await sendMessageToStudent(selectedStudent.id, text)
      setMessages(prev => [...prev, newMsg])
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 100)
    } catch (err) {
      setInputText(text)
      showToast(err.message || 'Failed to send message', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="messages-layout">

      {/* ── Left panel: student list ── */}
      <div className="messages-sidebar">
        <div className="messages-sidebar-header">
          <Users size={15} />
          <span>Students</span>
        </div>

        {loadingStudents ? (
          <p className="text-secondary" style={{ padding: '16px', fontSize: '13px' }}>
            Loading…
          </p>
        ) : students.length === 0 ? (
          <p className="text-secondary" style={{ padding: '16px', fontSize: '13px' }}>
            No students yet.
          </p>
        ) : (
          <div className="messages-student-list">
            {students.map(s => (
              <button
                key={s.id}
                className={`messages-student-item ${selectedStudent?.id === s.id ? 'active' : ''}`}
                onClick={() => setSelectedStudent(s)}
              >
                <div className="msg-avatar msg-avatar-sm">{initials(s)}</div>
                <div className="messages-student-info">
                  <div className="messages-student-name">
                    {s.first_name} {s.last_name}
                  </div>
                  <div className="messages-student-meta">
                    {s.position || 'No position'} · {s.subscription_tier || 'base'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Right panel: conversation ── */}
      <div className="messages-conversation">
        {!selectedStudent ? (
          <div className="messages-empty-state">
            <MessageSquare size={44} strokeWidth={1.5} />
            <h3>Select a student</h3>
            <p className="text-secondary">
              Choose a student from the list to view their conversation.
            </p>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="messages-conv-header">
              <div className="msg-avatar">{initials(selectedStudent)}</div>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </div>
                <div className="text-sm text-secondary">{selectedStudent.email}</div>
              </div>
            </div>

            {/* Message list */}
            <div className="messages-list" ref={scrollRef}>
              {loadingMessages ? (
                <div className="messages-loading">Loading messages…</div>
              ) : messages.length === 0 ? (
                <div className="messages-no-messages">
                  <MessageSquare size={32} strokeWidth={1.5} />
                  <p>No messages yet — start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender?.role === 'coach'
                  return (
                    <div key={msg.id} className={`msg-row ${isMe ? 'msg-row-me' : ''}`}>
                      {!isMe && (
                        <div className="msg-avatar msg-avatar-sm">
                          {initials(selectedStudent)}
                        </div>
                      )}
                      <div className={`msg-bubble ${isMe ? 'msg-bubble-me' : 'msg-bubble-them'}`}>
                        <div className="msg-text">{msg.content}</div>
                        <div className="msg-time">{formatTime(msg.created_at)}</div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Input bar */}
            <form className="messages-input-bar" onSubmit={handleSend}>
              <input
                className="messages-input"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={`Message ${selectedStudent.first_name}…`}
                disabled={sending}
                autoComplete="off"
              />
              <button
                type="submit"
                className="messages-send-btn"
                disabled={!inputText.trim() || sending}
              >
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
