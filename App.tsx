import React, { useState, useRef, useEffect } from 'react';
import { Message, Emotion } from './types';
import { getChatSession, resetChatSession, initializeGenAI, hasValidSession } from './services/geminiService';
import MessageBubble from './components/MessageBubble';
import ChatInput from './components/ChatInput';
import CharacterAvatar from './components/CharacterAvatar';
import { INITIAL_GREETING, SUGGESTED_QUESTIONS } from './constants';
import { RefreshCw, Mountain, Sparkles, Wind, BookOpen, Binary, Download, Share, PlusSquare, X, QrCode, Copy, Check, Cloud, Terminal, Rocket, Github, Key, ExternalLink, LogOut, ShieldCheck, AlertTriangle } from 'lucide-react';
import { GenerateContentResponse } from '@google/genai';

// Hàm helper để tách cảm xúc ra khỏi nội dung
const parseEmotionFromText = (text: string): { emotion: Emotion | null, cleanText: string } => {
  const regex = /^\[\[(VUI|BUON|GIAN|NGAC_NHIEN|BINH_THUONG)\]\]\s*/i;
  const match = text.match(regex);
  
  if (match) {
    const tag = match[1].toUpperCase();
    let emotion: Emotion = 'neutral';
    
    switch(tag) {
      case 'VUI': emotion = 'happy'; break;
      case 'BUON': emotion = 'sad'; break;
      case 'GIAN': emotion = 'angry'; break;
      case 'NGAC_NHIEN': emotion = 'surprised'; break;
      default: emotion = 'neutral';
    }
    
    return { emotion, cleanText: text.replace(regex, '') };
  }
  
  return { emotion: null, cleanText: text };
};

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const initialParse = parseEmotionFromText(INITIAL_GREETING);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'assistant', content: initialParse.cleanText }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>(initialParse.emotion || 'happy');
  
  // API Key State
  const [hasKey, setHasKey] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);

  // PWA & Share State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- EFFECTS ---

  // Check for API Key on Mount
  useEffect(() => {
    try {
      // Try to initialize. If it fails (throws), we know we need a key.
      getChatSession();
      setHasKey(true);
    } catch (e) {
      console.log("No API Key found, showing modal");
      setHasKey(false);
      setShowKeyModal(true);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // PWA Install Logic
  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // --- HANDLERS ---

  const handleSaveKey = () => {
    if (!tempKey.trim()) return;
    
    // Save to local storage
    localStorage.setItem('GEMINI_API_KEY', tempKey.trim());
    
    // Initialize Service
    initializeGenAI(tempKey.trim());
    
    setHasKey(true);
    setShowKeyModal(false);
    
    // Optional: Reset chat to say hello with new power
    setMessages([{ id: 'init', role: 'assistant', content: "[[VUI]] Hahaha! Linh khí đã nạp đầy, lão thấy tràn trề sinh lực. Tiểu hữu muốn hỏi gì nào?" }]);
    setCurrentEmotion('happy');
  };

  const handleRemoveKey = () => {
    if(confirm("Tiểu hữu muốn vứt bỏ 'Linh Phù' ư? Sau này muốn vào lại phải đi xin lại đó.")) {
      localStorage.removeItem('GEMINI_API_KEY');
      setHasKey(false);
      setShowKeyModal(true);
      setIsMenuOpen(false);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallBtn(false);
    setDeferredPrompt(null);
  };

  const handleSendMessage = async (content: string) => {
    // Security Check: If user accidentally pastes an API key in chat
    if (content.trim().startsWith('AIza')) {
       const warningMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "[[GIAN]] Hỡi ôi! Tiểu hữu cẩn thận! Đó là **API Key** bí mật, sao lại dán vào khung chat thế này? Hãy xóa ngay đi kẻo kẻ gian lấy mất! Key này chỉ dán vào bảng cài đặt (nút hình chìa khóa) thôi nhé!"
       };
       setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: "******** (Đã ẩn Key)" }, warningMsg]);
       setCurrentEmotion('angry');
       return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsStreaming(false);
    setCurrentEmotion('neutral'); 

    try {
      const chat = getChatSession();
      
      const botMessageId = (Date.now() + 1).toString();
      setMessages(prev => [
        ...prev,
        { id: botMessageId, role: 'assistant', content: '', isStreaming: true }
      ]);

      const resultStream = await chat.sendMessageStream({ message: content });

      setIsLoading(false);
      setIsStreaming(true);

      let fullRawText = '';
      let hasDetectedEmotion = false;
      
      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        const chunkText = c.text || '';
        fullRawText += chunkText;
        
        const { emotion, cleanText } = parseEmotionFromText(fullRawText);
        if (emotion && !hasDetectedEmotion) {
          setCurrentEmotion(emotion);
          hasDetectedEmotion = true;
        }

        setMessages(prev => 
          prev.map(msg => 
            msg.id === botMessageId ? { ...msg, content: cleanText } : msg
          )
        );
      }

      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessageId ? { ...msg, isStreaming: false } : msg
        )
      );

    } catch (error: any) {
      console.error("Chat error:", error);
      
      let friendlyError = "";
      const errString = error.toString();
      
      // Determine specific error types
      if (errString.includes("MISSING_API_KEY") || errString.includes("API key")) {
        friendlyError = "[[BUON]] Linh phù (API Key) không thấy đâu cả. Tiểu hữu đã nhập đúng chưa?";
        setShowKeyModal(true);
      } else if (errString.includes("400") || errString.includes("InvalidArgument")) {
        friendlyError = "[[NGAC_NHIEN]] Linh phù (Key) có vẻ không hợp lệ. Tiểu hữu kiểm tra xem có copy thừa dấu cách không?";
        setShowKeyModal(true);
      } else if (errString.includes("403") || errString.includes("PermissionDenied")) {
        friendlyError = "[[BUON]] Linh phù này chưa được kích hoạt hoặc bị cấm cửa rồi. Hãy kiểm tra lại trên Google Cloud nhé.";
      } else if (errString.includes("429") || errString.includes("ResourceExhausted")) {
        friendlyError = "[[MET]] Hộc hộc... Tiểu hữu hỏi nhanh quá, lão thở không kịp (Hết quota miễn phí). Đợi chút nhé.";
      } else if (errString.includes("503") || errString.includes("Unavailable")) {
        friendlyError = "[[MET]] Thiên địa linh khí đang hỗn loạn (Server Google bận), lão cần tịnh tâm một chút. Thử lại sau nhé.";
      } else {
        friendlyError = "[[BUON]] Có luồng tà khí làm nhiễu loạn (Lỗi kết nối). Lão không nghe rõ.";
      }
      
      // Append technical details for easier debugging
      const technicalMessage = `\n\n> *${friendlyError.replace(/\[\[.*?\]\]\s*/, '')}*\n> \n> _Lỗi chi tiết: ${error.message || errString}_`;

      // Remove the 'cleanText' processing for error messages to ensure they show up
      setCurrentEmotion(errString.includes("MET") ? 'neutral' : 'sad'); // Using neutral for tired/exhausted as fallback or sad
      
      setMessages(prev => [
        ...prev, 
        { 
          id: Date.now().toString(), 
          role: 'assistant', 
          content: technicalMessage, 
          isError: true 
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Đạo hữu muốn bắt đầu lại hành trình tu luyện mới chứ?")) {
      resetChatSession();
      const { cleanText, emotion } = parseEmotionFromText(INITIAL_GREETING);
      setMessages([{ id: Date.now().toString(), role: 'assistant', content: cleanText }]);
      setCurrentEmotion(emotion || 'happy');
    }
  };

  const handleLuckyDraw = () => {
    if (isLoading || isStreaming) return;
    const prompts = [
      "Ông gieo cho con một quẻ vui xem hôm nay vận khí thế nào?",
      "Cho con một lời khuyên ngẫu nhiên về cuộc sống đi ạ.",
      "Ông tặng con một câu thơ tiên tri cho tuần này nhé?",
      "Con đang phân vân, ông bốc quẻ chỉ lối cho con với."
    ];
    handleSendMessage(prompts[Math.floor(Math.random() * prompts.length)]);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ông Lão Tiên Nhân',
          text: 'Trò chuyện cùng Ông Lão Tiên Nhân - Một trải nghiệm vui vẻ!',
          url: window.location.href,
        });
      } catch (err) { console.log('Error sharing:', err); }
    } else {
      handleCopyLink();
    }
  };
  
  const isValidKeyFormat = tempKey.trim().startsWith('AIza') && tempKey.trim().length > 20;

  return (
    <div className="flex flex-col md:flex-row h-full mist-bg text-slate-800 relative overflow-hidden font-sans">
      
      {/* --- Atmospheric Background Elements --- */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-white/40 rounded-full blur-3xl animate-float -z-10" />
      <div className="absolute bottom-40 right-20 w-48 h-48 bg-blue-100/40 rounded-full blur-3xl animate-float-delayed -z-10" />
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none z-0">
         <Wind size={120} />
      </div>

      {/* === API KEY MODAL (THE GATEKEEPER) === */}
      {(!hasKey || showKeyModal) && (
        <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
           <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-emerald-100 relative overflow-hidden">
              {/* Decorative Header */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-600"></div>
              
              <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-700 shadow-inner">
                    <Key size={32} />
                 </div>
                 <h2 className="text-2xl font-bold font-serif text-slate-800 mb-2">Nhập "Linh Phù"</h2>
                 <p className="text-slate-600 text-sm">
                   Tiểu hữu đã có <strong>API Key</strong> chưa? Dán vào bên dưới để đánh thức Ông Lão nhé.
                 </p>
              </div>

              <div className="space-y-4">
                 <div className="relative group">
                   <input 
                     type="password" 
                     value={tempKey}
                     onChange={(e) => setTempKey(e.target.value)}
                     placeholder="Dán Key vào đây (Bắt đầu bằng AIza...)"
                     className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none pl-10 transition-colors ${
                       isValidKeyFormat 
                         ? 'border-emerald-500 bg-emerald-50' 
                         : 'border-slate-300 group-focus-within:border-emerald-500'
                     }`}
                   />
                   <Key size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isValidKeyFormat ? 'text-emerald-600' : 'text-slate-400'}`} />
                   
                   {isValidKeyFormat && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 flex items-center gap-1 text-xs font-bold animate-pulse">
                         <ShieldCheck size={16} /> Hợp lệ
                      </div>
                   )}
                 </div>

                 {tempKey.length > 0 && !isValidKeyFormat && (
                   <p className="text-xs text-amber-600 flex items-center gap-1">
                     <AlertTriangle size={12} /> Key thường bắt đầu bằng "AIza..."
                   </p>
                 )}

                 <button 
                   onClick={handleSaveKey}
                   disabled={!isValidKeyFormat}
                   className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                     isValidKeyFormat 
                       ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-emerald-200 hover:scale-[1.02]' 
                       : 'bg-slate-300 cursor-not-allowed'
                   }`}
                 >
                    <Sparkles size={18} />
                    Mở Cổng Tiên Giới
                 </button>

                 {!isValidKeyFormat && (
                    <a 
                      href="https://aistudiocdn.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                    >
                        <ExternalLink size={14} />
                        Chưa có Key? Lấy miễn phí tại đây
                    </a>
                 )}
                 
                 {hasKey && (
                   <button 
                     onClick={() => setShowKeyModal(false)}
                     className="w-full py-2 text-slate-500 text-sm hover:text-slate-800 underline decoration-dotted"
                   >
                     Đóng (Dùng Key cũ)
                   </button>
                 )}
                 
                 <p className="text-[10px] text-center text-slate-400 mt-2 border-t border-slate-100 pt-2">
                   *Key được lưu an toàn trong trình duyệt (LocalStorage) của tiểu hữu.
                 </p>
              </div>
           </div>
        </div>
      )}

      {/* === LEFT SIDE / CHARACTER STAGE === */}
      <div className="w-full md:w-[340px] lg:w-[380px] h-[160px] md:h-full flex-shrink-0 flex flex-col bg-gradient-to-b from-white/40 to-white/10 relative md:border-r border-white/50 shadow-sm md:shadow-lg z-20 transition-all duration-500 backdrop-blur-sm">
        
        {/* Header */}
        <div className="px-4 py-2 md:py-3 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-amber-50 shadow-lg border-2 border-amber-100 transition-colors duration-500 ${currentEmotion === 'angry' ? 'bg-red-800' : 'bg-gradient-to-br from-emerald-700 to-slate-900'}`}>
              <Mountain size={16} className="md:w-[18px]" />
            </div>
            <h1 className="text-base md:text-lg font-bold text-slate-800 font-serif tracking-wide drop-shadow-sm whitespace-nowrap">Tiên Nhân Các</h1>
          </div>
          
          <div className="flex gap-1.5 md:gap-2">
            {/* Install Button */}
            {showInstallBtn && (
              <button onClick={handleInstallClick} className="p-1.5 md:p-2 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-full transition-all shadow-sm border border-emerald-200 animate-pulse">
                <Download size={18} className="md:w-[20px]" />
              </button>
            )}

            {/* Feature Buttons */}
            <button onClick={handleLuckyDraw} disabled={isLoading || isStreaming} className={`p-1.5 md:p-2 text-purple-600 bg-white/60 hover:bg-purple-50 rounded-full transition-all shadow-sm border border-purple-100 ${isLoading ? 'opacity-50' : ''}`}>
               <Binary size={18} className={`md:w-[20px] ${isLoading ? "animate-pulse" : ""}`} />
            </button>

            <button onClick={handleReset} className="p-1.5 md:p-2 text-slate-600 bg-white/60 hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-colors shadow-sm border border-slate-100">
              <RefreshCw size={18} className="md:w-[20px]" />
            </button>
            
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1.5 md:p-2 text-slate-600 bg-white/60 hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-colors shadow-sm border border-slate-100 relative">
              <BookOpen size={18} className="md:w-[20px]" />
              {(showInstallBtn || isIOS) && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping border border-white"></span>}
            </button>
          </div>
        </div>

        {/* MENU MODAL */}
        {isMenuOpen && (
          <div className="absolute top-14 right-2 left-2 md:left-4 md:right-4 md:top-16 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 p-5 z-50 animate-fadeIn ring-1 ring-black/5 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800 mb-2 font-serif text-lg border-b pb-2 flex justify-between items-center">
              Tiên Nhân Tịch
              <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 text-sm hover:text-slate-600 p-1"><X size={18}/></button>
            </h3>
            
            <div className="space-y-4 text-sm text-slate-600">
              {/* API Key Management in Menu */}
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-amber-800 font-medium">
                     <Key size={16} /> Quản lý Linh Phù
                  </div>
                  <div className="flex gap-2">
                    <button 
                        onClick={() => { setShowKeyModal(true); setIsMenuOpen(false); }}
                        className="px-3 py-1 bg-white text-amber-700 border border-amber-200 rounded-lg text-xs hover:bg-amber-100"
                    >
                        Đổi Key
                    </button>
                    <button 
                        onClick={handleRemoveKey}
                        className="px-3 py-1 bg-white text-red-600 border border-red-100 rounded-lg text-xs hover:bg-red-50 flex items-center gap-1"
                    >
                        <LogOut size={12} /> Xóa
                    </button>
                  </div>
              </div>

              {/* Share Section */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100 flex flex-col items-center gap-3">
                 <h4 className="font-bold text-indigo-800 flex items-center gap-2 w-full"><QrCode size={18} /> Truyền Tống Trận</h4>
                 <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                   <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.href)}&bgcolor=ffffff`} alt="QR Code" className="w-28 h-28 object-contain"/>
                 </div>
                 <div className="flex gap-2 w-full">
                    <button onClick={handleNativeShare} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1 hover:bg-indigo-700"><Share size={14} /> Chia sẻ</button>
                    <button onClick={handleCopyLink} className="flex-1 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-medium text-xs flex items-center justify-center gap-1 hover:bg-slate-50">{copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />} {copied ? 'Đã chép' : 'Copy Link'}</button>
                 </div>
              </div>

              {/* Deployment Info */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Rocket size={16} className="text-pink-500" /> Phi Thăng (Deploy)</h4>
                 <div className="space-y-3 text-xs">
                    <div className="bg-white p-2 rounded border border-slate-200">
                       <strong className="text-emerald-600 block mb-1 flex items-center gap-1"><Cloud size={12}/> Netlify</strong>
                       <p className="text-[10px] text-slate-500">Kéo thả folder. Add Key vào Environment var hoặc nhập trực tiếp trên web.</p>
                    </div>
                     <div className="bg-white p-2 rounded border border-slate-200">
                       <strong className="text-slate-900 block mb-1 flex items-center gap-1"><Github size={12}/> GitHub Pages</strong>
                       <p className="text-[10px] text-slate-500">Push code. Set Secret API_KEY trong Settings &rarr; Secrets.</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* Character Container */}
        <div className="flex-1 flex items-center justify-center relative overflow-visible">
           <div className="w-full h-full max-h-[120px] md:max-h-[450px] aspect-square transition-all duration-700 -mt-2 md:mt-0">
              <CharacterAvatar isStreaming={isStreaming} isLoading={isLoading} emotion={currentEmotion} />
           </div>
        </div>
        
        {/* Desktop Quote */}
        <div className="hidden md:block pb-8 text-center px-6">
           <div className="bg-white/30 backdrop-blur-sm p-4 rounded-xl border border-white/40 shadow-sm">
             <p className="text-sm text-stone-600 italic font-serif">"Ngồi ngắm mây trôi, lòng tĩnh tại<br/>Chuyện đời hư ảo, tựa sương mai"</p>
           </div>
        </div>
      </div>

      {/* === CHAT AREA === */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10 h-full">
        <div className="absolute inset-0 bg-white/80 backdrop-blur-md rounded-t-[2rem] md:rounded-3xl shadow-inner md:shadow-2xl border-t border-white/60 md:border border-white/50 flex flex-col overflow-hidden md:m-4 md:ml-0 transition-all duration-300">
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 md:px-8 pt-4 md:pt-8 pb-2 scroll-smooth">
            <div className="max-w-4xl mx-auto flex flex-col gap-2">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          </div>

          {/* Footer */}
          <footer className="flex-shrink-0 px-3 md:px-8 py-3 md:py-4 bg-gradient-to-t from-white/95 to-white/50 backdrop-blur-sm z-40 border-t border-slate-100 md:border-none">
            {messages.length < 3 && !isLoading && !isStreaming && (
              <div className="max-w-4xl mx-auto mb-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button key={idx} onClick={() => handleSendMessage(q)} className="whitespace-nowrap px-3 py-1.5 md:px-4 md:py-2 bg-white/90 border border-emerald-200 rounded-full text-xs md:text-sm text-emerald-800 hover:bg-emerald-50 transition-all shadow-sm flex items-center gap-2 group">
                    <Sparkles size={12} className="text-emerald-500 group-hover:text-emerald-600" /> {q}
                  </button>
                ))}
              </div>
            )}

            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading || isStreaming || !hasKey} />
            
            <div className="text-center mt-3 hidden md:block">
              <span className="text-[10px] text-stone-400 uppercase tracking-widest font-serif">Tiên Nhân Các • 2024</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default App;