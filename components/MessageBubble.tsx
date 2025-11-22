
import React from 'react';
import { Message } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
}

// Icon Ông Lão (Sage) - Giữ nguyên vẻ hiền hậu
const SageIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <defs>
      <filter id="glow-sage" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <circle cx="50" cy="50" r="45" fill="#065f46" />
    <circle cx="50" cy="45" r="20" fill="#ffedd5" /> {/* Face */}
    <path d="M30,45 Q50,85 70,45" fill="#cbd5e1" /> {/* Beard */}
    <circle cx="50" cy="25" r="12" fill="#cbd5e1" /> {/* Hair Bun */}
    <rect x="35" y="28" width="30" height="5" rx="2" fill="#64748b" /> {/* Headband */}
  </svg>
);

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  // Identify if this is the bot "thinking" (streaming but no content yet)
  const isTyping = !isUser && message.content === '' && message.isStreaming;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4 md:mb-6 animate-fadeIn group`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-2 md:gap-3 items-end`}>
        
        {/* Avatar - Only render for Assistant (Sage) */}
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-md overflow-hidden border-2 transition-transform duration-300 group-hover:scale-110 bg-emerald-50 border-emerald-100">
            <SageIcon />
          </div>
        )}

        {/* Content Bubble */}
        <div 
          className={`flex flex-col px-3.5 py-2.5 md:p-5 shadow-sm text-sm md:text-base relative transition-all duration-300 ${
            isUser 
              ? 'bg-[#0ea5e9] text-white rounded-[1.5rem] rounded-br-none shadow-sky-200 hover:shadow-sky-300' 
              : 'bg-white/90 backdrop-blur-sm border border-stone-200 text-stone-800 rounded-[1.5rem] rounded-bl-none shadow-stone-200 hover:shadow-stone-300'
          }`}
        >
          {isTyping ? (
            <div className="flex items-center gap-1 h-6 px-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-typing-dot" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-typing-dot" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-typing-dot" style={{ animationDelay: '300ms' }} />
            </div>
          ) : isUser ? (
            <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm md:prose-base prose-stone max-w-none prose-p:text-stone-800 prose-headings:text-stone-900 prose-strong:text-stone-900">
               <MarkdownRenderer content={message.content} />
            </div>
          )}
          
          {/* Cursor for when text is appearing */}
          {message.isStreaming && !isUser && !isTyping && (
            <span className="inline-block w-2 h-4 ml-1 align-middle bg-stone-400 animate-pulse"></span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
