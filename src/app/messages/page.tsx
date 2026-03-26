'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MessageCircle,
  Send,
  Loader2,
  ArrowLeft,
  Package,
  Image as ImageIcon,
  Phone,
  MoreVertical,
  Search
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

async function fetchChats() {
  const res = await fetch('/api/chat')
  if (!res.ok) throw new Error('Failed to fetch chats')
  return res.json()
}

async function fetchChat(chatId: string) {
  const res = await fetch(`/api/chat/${chatId}`)
  if (!res.ok) throw new Error('Failed to fetch chat')
  return res.json()
}

async function sendMessage(data: { chatId: string; content: string }) {
  const res = await fetch(`/api/chat/${data.chatId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: data.content }),
  })
  if (!res.ok) throw new Error('Failed to send message')
  return res.json()
}

function MessagesContent() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const storeId = searchParams.get('store')
  const productId = searchParams.get('product')

  const { data: chatsData, isLoading: chatsLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: fetchChats,
  })

  const { data: chatData, isLoading: chatLoading } = useQuery({
    queryKey: ['chat', selectedChatId],
    queryFn: () => fetchChat(selectedChatId!),
    enabled: !!selectedChatId,
  })

  const sendMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: () => {
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['chat', selectedChatId] })
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
  })

  const chats = chatsData?.chats || []
  const selectedChat = chatData?.chat
  const messages = selectedChat?.messages || []
  const otherParticipant = chatData?.otherParticipant

  const filteredChats = chats.filter((chat: any) => {
    if (!searchQuery) return true
    const name = chat.otherParticipant?.name || ''
    const lastMessage = chat.messages?.[0]?.content || ''
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Auto-select chat if store/product query param
    if (storeId && chats.length > 0) {
      const matchingChat = chats.find((c: any) => c.store?.id === storeId)
      if (matchingChat) {
        setSelectedChatId(matchingChat.id)
      }
    }
  }, [storeId, chats])

  const handleSend = () => {
    if (!message.trim() || !selectedChatId) return
    sendMutation.mutate({ chatId: selectedChatId, content: message.trim() })
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 h-[calc(100vh-73px)]">
          {/* Chats List */}
          <div className="border-r bg-white dark:bg-gray-800">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Chat List */}
            <ScrollArea className="h-[calc(100%-73px)]">
              {chatsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="text-center p-8">
                  <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No conversations yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Start shopping to chat with sellers
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredChats.map((chat: any) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChatId(chat.id)}
                      className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedChatId === chat.id ? 'bg-gray-50 dark:bg-gray-700' : ''
                      }`}
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={chat.otherParticipant?.avatar} />
                        <AvatarFallback>
                          {chat.otherParticipant?.name?.charAt(0) || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">
                            {chat.otherParticipant?.name || 'Unknown'}
                          </p>
                          {chat.messages?.[0] && (
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(chat.messages[0].createdAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        {chat.product && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {chat.product.name}
                          </p>
                        )}
                        {chat.messages?.[0] && (
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {chat.messages[0].content}
                          </p>
                        )}
                      </div>
                      {chat.unreadCount > 0 && (
                        <Badge className="bg-primary text-white">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Window */}
          <div className="md:col-span-2 flex flex-col bg-gray-50 dark:bg-gray-900">
            {selectedChatId && chatLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : selectedChatId && selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="bg-white dark:bg-gray-800 border-b p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={otherParticipant?.avatar} />
                      <AvatarFallback>
                        {otherParticipant?.name?.charAt(0) || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{otherParticipant?.name}</p>
                      {chatData.product && (
                        <Link
                          href={`/products/${chatData.product.slug}`}
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Package className="w-3 h-3" />
                          {chatData.product.name}
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {otherParticipant?.store && (
                      <Link href={`/stores/${otherParticipant.store.slug}`}>
                        <Button variant="outline" size="sm">
                          View Store
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg: any) => {
                      const isMine = msg.userId === user?.id
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] ${
                              isMine
                                ? 'bg-primary text-white rounded-l-2xl rounded-tr-2xl'
                                : 'bg-white dark:bg-gray-800 rounded-r-2xl rounded-tl-2xl'
                            } px-4 py-2`}
                          >
                            {msg.type === 'IMAGE' && msg.fileUrl && (
                              <img
                                src={msg.fileUrl}
                                alt="Shared image"
                                className="max-w-full rounded-lg mb-2"
                              />
                            )}
                            <p className={isMine ? '' : 'text-gray-900 dark:text-gray-100'}>
                              {msg.content}
                            </p>
                            <p className={`text-xs mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="bg-white dark:bg-gray-800 border-t p-4">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      className="flex-1"
                    />
                    <Button onClick={handleSend} disabled={!message.trim() || sendMutation.isPending}>
                      {sendMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium">Select a conversation</h3>
                  <p className="text-gray-500 mt-1">
                    Choose a chat from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MessagesLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesLoading />}>
      <MessagesContent />
    </Suspense>
  )
}
