
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <form 
      onSubmit={handleSubmit} 
      className="relative max-w-3xl mx-auto w-full bg-white rounded-[1.5rem] md:rounded-3xl shadow-lg border border-stone-200 p-1.5 md:p-2 flex items-end gap-2 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500"
    >
      <div className="pl-2 md:pl-3 pb-2.5 md:pb-3 text-stone-400 hidden md:block">
         <Sparkles size={20} />
      </div>
      
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Thưa chuyện cùng Ông Lão..."
        className="w-full bg-transparent border-none focus:ring-0 resize-none py-2.5 md:py-3 pl-3 md:pl-0 text-sm md:text-base text-stone-800 placeholder:text-stone-400 max-h-[100px] md:max-h-[120px] min-h-[24px]"
        rows={1}
        disabled={isLoading}
      />

      <button
        type="button"
        onClick={() => handleSubmit()}
        disabled={!input.trim() || isLoading}
        className={`p-2 md:p-3 rounded-full flex-shrink-0 transition-all duration-200 ${
          input.trim() && !isLoading
            ? 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-md transform hover:scale-105'
            : 'bg-stone-100 text-stone-400 cursor-not-allowed'
        }`}
      >
        <Send size={18} className={input.trim() && !isLoading ? "translate-x-0.5" : ""} />
      </button>
    </form>
  );
};

export default ChatInput;
