/**
 * MessagesScreen — Direct chat between the student and their coach.
 *
 * Polls for new messages every 5 seconds while the screen is open.
 * Marks incoming messages as read on focus.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { getMessages, sendMessage, markMessagesRead } from '../services/api';


// Format a UTC timestamp into a human-readable relative string
function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}


export default function MessagesScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      loadMessages(true);
      // Mark inbound messages as read in the background
      markMessagesRead().catch(() => {});

      // Poll for new messages every 5 s while screen is focused
      const interval = setInterval(() => loadMessages(false), 5000);
      return () => clearInterval(interval);
    }, [])
  );

  async function loadMessages(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await getMessages();
      setMessages(Array.isArray(data) ? data : []);
      // Scroll to bottom after the first load
      if (showSpinner) {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 150);
      }
    } catch (err) {
      if (showSpinner) setError('Could not load messages. Check your connection.');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');

    try {
      const newMsg = await sendMessage(text);
      setMessages(prev => [...prev, newMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      // Restore the text so the user can retry
      setInputText(text);
    } finally {
      setSending(false);
    }
  }

  // ---- Render ----

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="wifi-outline" size={40} color={COLORS.textLight} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadMessages(true)}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Message list */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={52} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Send a message to start the conversation with your coach.
            </Text>
          </View>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            const senderName = msg.sender?.role === 'coach'
              ? 'Coach'
              : msg.sender?.first_name || 'You';

            return (
              <View
                key={msg.id}
                style={[styles.row, isMe && styles.rowMe]}
              >
                {!isMe && (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>🏀</Text>
                  </View>
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleCoach]}>
                  {!isMe && (
                    <Text style={styles.senderName}>{senderName}</Text>
                  )}
                  <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                    {msg.content}
                  </Text>
                  <Text style={[styles.timeText, isMe && styles.timeTextMe]}>
                    {formatTime(msg.created_at)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Message your coach..."
          placeholderTextColor={COLORS.textLight}
          multiline
          maxLength={500}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.textLight} />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#FFF' : COLORS.textLight}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.bg,
  },
  errorText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  retryBtn: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: FONTS.sizes.body,
  },

  // Message list
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
    maxWidth: 260,
  },

  // Message rows
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  rowMe: {
    justifyContent: 'flex-end',
  },

  // Avatar (coach side only)
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
  },

  // Bubbles
  bubble: {
    maxWidth: '75%',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  bubbleCoach: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: RADIUS.sm,
    ...SHADOWS.sm,
  },
  bubbleMe: {
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: RADIUS.sm,
  },
  senderName: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.accent,
    marginBottom: 4,
  },
  messageText: {
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    lineHeight: 22,
  },
  messageTextMe: {
    color: '#FFF',
  },
  timeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    marginTop: 6,
  },
  timeTextMe: {
    color: 'rgba(255,255,255,0.6)',
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    paddingBottom: 36,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: FONTS.sizes.body,
    color: COLORS.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.bg,
  },
});
