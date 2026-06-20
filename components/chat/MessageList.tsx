'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import type { Message } from '@/core/models/session'

interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0) {
    return (
      <div className="flex w-full h-full items-center justify-center p-8">
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          上传你的第一张照片，开始对话吧
        </p>
      </div>
    )
  }

  return (
    <div 
      className="w-full h-full overflow-y-auto py-4 space-y-1"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          role={msg.role}
          content={msg.content}
          type={msg.messageType}
          timestamp={msg.createdAt}
        />
      ))}
      {isLoading && (
        <div className="flex justify-start mx-4 my-2">
          <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-zinc-100 dark:bg-zinc-800">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
