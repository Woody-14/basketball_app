/**
 * MessagesScreen — Chat with the coach.
 *
 * Simple messaging UI. For now this is a placeholder that will
 * connect to a real backend messaging system later. Shows the
 * structure and design so it's ready when the API is built.
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS, SHADOWS } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';


// Placeholder messages to show the design
const PLACEHOLDER_MESSAGES = [
  {
    id: 1,
    from: 'coach',
    text: 'Welcome to the team! 🏀 I\'ve set up your first workout for this week. Let me know if you have any questions about the drills.',
    time: '2 days ago',
  },
  {
    id: 2,
    from: 'student',
    text: 'Thanks coach! I\'ll check it out today.',
    time: '2 days ago',
  },
  {
    id: 3,
    from: 'coach',
    text: 'Great! Focus on keeping your eyes up during the ball handling drills. That\'s the most important thing at this stage.',
    time: '2 days ago',
  },
];


export default function MessagesScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(PLACEHOLDER_MESSAGES);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef(null);

  function handleSend() {
    if (!inputText.trim()) return;

    const newMessage = {
      id: Date.now(),
      from: 'student',
      text: inputText.trim(),
      time: 'Just now',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');

    // Auto-scroll to bottom
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.info} />
        <Text style={styles.infoText}>
          Messaging is coming soon! This is a preview of how it will look.
        </Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => {
          const isMe = msg.from === 'student';
          return (
            <View
              key={msg.id}
              style={[styles.messageBubbleRow, isMe && styles.messageBubbleRowMe]}
            >
              {!isMe && (
                <View style={styles.coachAvatar}>
                  <Text style={styles.coachAvatarText}>🏀</Text>
                </View>
              )}
              <View style={[
                styles.messageBubble,
                isMe ? styles.bubbleMe : styles.bubbleCoach,
              ]}>
                {!isMe && <Text style={styles.senderName}>Coach</Text>}
                <Text style={[
                  styles.messageText,
                  isMe && styles.messageTextMe,
                ]}>
                  {msg.text}
                </Text>
                <Text style={[
                  styles.messageTime,
                  isMe && styles.messageTimeMe,
                ]}>
                  {msg.time}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textLight}
          multiline
          maxLength={500}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={inputText.trim() ? '#FFF' : COLORS.textLight}
          />
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

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: '#EBF5FB',
    borderBottomWidth: 1,
    borderBottomColor: '#D4E6F1',
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sizes.xs,
    color: COLORS.info,
    fontWeight: '500',
  },

  // Message list
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  messageBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  messageBubbleRowMe: {
    justifyContent: 'flex-end',
  },
  coachAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachAvatarText: {
    fontSize: 16,
  },
  messageBubble: {
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
  messageTime: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textLight,
    marginTop: 6,
  },
  messageTimeMe: {
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
