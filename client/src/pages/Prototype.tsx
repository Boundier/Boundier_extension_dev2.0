import React, { useState, useEffect, useRef } from 'react';
import { BrowserFrame } from '@/components/BrowserFrame';
import { ScanButton } from '@/components/Boundier/ScanButton';
import { BoundierOverlay } from '@/components/Boundier/Overlay';
import { BoundierPopup } from '@/components/Boundier/Popup';
import { analyzeText, determineDominantHook, generateInterpretation, ScanResult } from '@/lib/boundier-logic';
import { MessageSquare, Repeat2, Heart, Share, MoreHorizontal, Image as ImageIcon, Globe } from 'lucide-react';
import logo from '@assets/icon48_1764702653662.png';

const MOCK_POSTS = [
  {
    id: 1,
    author: "TruthSeeker99",
    handle: "@realtruth",
    time: "2m",
    content: "This is absolutely INSANE. They are destroying everything we built. It's a total DISASTER and everyone knows it. Why is no one talking about this betrayal? We are being humiliated on the world stage!",
    likes: "12K",
    reposts: "4.5K",
    comments: "892",
    highlight: true
  },
  {
    id: 2,
    author: "TechDaily",
    handle: "@techdaily",
    time: "15m",
    content: "New update rolling out for the platform today. Includes minor bug fixes and performance improvements. Check the changelog for details.",
    likes: "120",
    reposts: "12",
    comments: "5",
    highlight: false
  },
  {
    id: 3,
    author: "CryptoKing",
    handle: "@cryptoking",
    time: "1h",
    content: "WAKE UP. The market is rigged. This proves it definitively. There is NO DEBATE anymore. You are being scammed and they are laughing at you. Total OBLITERATION coming for non-believers.",
    likes: "8.2K",
    reposts: "3K",
    comments: "1.2K",
    highlight: true
  },
  {
    id: 4,
    author: "DailyMotivation",
    handle: "@dailymotivation",
    time: "2h",
    content: "Keep pushing forward. Your dreams are valid. #motivation #hustle",
    likes: "500",
    reposts: "50",
    comments: "20",
    highlight: false
  },
  {
    id: 5,
    author: "PoliticalWatch",
    handle: "@polwatch",
    time: "3h",
    content: "SHOCKING footage exposed today. They tried to hide it but we caught them. This is the end for their narrative. ABSOLUTELY BRUTAL takedown. You need to see this NOW.",
    likes: "25K",
    reposts: "10K",
    comments: "5K",
    highlight: true
  }
];

export default function Prototype() {
  const [url, setUrl] = useState('https://x.com/home');
  const [isExtensionPopupOpen, setIsExtensionPopupOpen] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [activeScanResult, setActiveScanResult] = useState<ScanResult | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  
  // Simulation State
  const [isScanButtonVisible, setIsScanButtonVisible] = useState(false);
  const [dwellTime, setDwellTime] = useState(0);
  const [activePostId, setActivePostId] = useState<number | null>(null);
  
  // Refs for scroll tracking
  const feedRef = useRef<HTMLDivElement>(null);
  const postRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Intersection Observer to track which post is "active" (in view)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = Number(entry.target.getAttribute('data-id'));
            setActivePostId(id);
            setDwellTime(0); // Reset dwell time when looking at new post
          }
        });
      },
      { threshold: 0.7 } // 70% of post must be visible
    );

    Object.values(postRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Dwell time tracker
  useEffect(() => {
    if (!activePostId) return;

    const timer = setInterval(() => {
      setDwellTime((prev) => {
        const newTime = prev + 1;
        checkTriggerConditions(activePostId, newTime);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activePostId]);

  // Logic to check if we should show the scan button
  const checkTriggerConditions = (postId: number, time: number) => {
    const post = MOCK_POSTS.find(p => p.id === postId);
    if (!post) return;

    const metrics = analyzeText(post.content, time, 0);
    
    // Trigger Condition: Emotional Pressure >= 0.6 AND Fixation >= 0.6
    // For demo purposes, we lower the threshold slightly or ensure the mock data hits it
    // Fixation of 0.6 roughly equals 36 seconds (if cap is 60). 
    // For the demo, let's speed it up: 5 seconds = high fixation
    const demoFixation = Math.min(time / 5, 1); 
    
    if (metrics.emotionalPressure >= 0.6 && demoFixation >= 0.8) {
      setIsScanButtonVisible(true);
    } else {
       // Only hide if we move away, handled by setActivePostId resetting logic usually
       // But for this demo, we keep it visible once triggered for that post until manual dismiss or scroll far away
    }
  };

  const handleScanClick = () => {
    if (!activePostId) return;
    const post = MOCK_POSTS.find(p => p.id === activePostId);
    if (!post) return;

    const metrics = analyzeText(post.content, dwellTime, 0);
    const hook = determineDominantHook(post.content);
    
    // Boost metrics for the demo feel if they are too low
    const result: ScanResult = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      influence: Math.max(metrics.influence, 0.72), // Artificial floor for demo
      distortion: Math.max(metrics.distortion, 0.65),
      echoDrift: Math.max(metrics.echoDrift, 0.4),
      dominantHook: hook,
      interpretation: generateInterpretation({ ...metrics, influence: Math.max(metrics.influence, 0.72) }, hook)
    };

    setScanHistory(prev => [result, ...prev].slice(0, 10));
    setActiveScanResult(result);
    setIsOverlayOpen(true);
    setIsScanButtonVisible(false);
  };

  const handleClearHistory = () => {
    setScanHistory([]);
  };

  return (
    <BrowserFrame 
      url={url} 
      onUrlChange={setUrl}
      extensionIcon={
        <div className="relative">
          <img src={logo} alt="Boundier" className="w-5 h-5 rounded" />
          {isScanButtonVisible && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </div>
      }
      onExtensionClick={() => setIsExtensionPopupOpen(!isExtensionPopupOpen)}
    >
      {/* Extension UI Layers */}
      <ScanButton isVisible={isScanButtonVisible} onClick={handleScanClick} />
      <BoundierOverlay isOpen={isOverlayOpen} result={activeScanResult} onClose={() => setIsOverlayOpen(false)} />
      <BoundierPopup 
        isOpen={isExtensionPopupOpen} 
        history={scanHistory} 
        onClearHistory={handleClearHistory}
        onClose={() => setIsExtensionPopupOpen(false)}
      />

      {/* Mock Content - Twitter/X Style Feed */}
      <div className="min-h-screen bg-black text-white flex justify-center" ref={feedRef}>
        <div className="w-full max-w-[600px] border-x border-gray-800 min-h-screen">
          
          {/* Header */}
          <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4">
            <h2 className="font-bold text-xl">For You</h2>
          </div>

          {/* Compose Box */}
          <div className="p-4 border-b border-gray-800 flex gap-4">
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600" />
             <div className="flex-1">
                <div className="bg-transparent text-xl text-gray-500 mb-4">What is happening?!</div>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2 text-blue-400">
                    <ImageIcon size={20} />
                    <Globe size={20} />
                  </div>
                  <button className="bg-blue-500 text-white font-bold rounded-full px-4 py-2 text-sm opacity-50 cursor-not-allowed">Post</button>
                </div>
             </div>
          </div>

          {/* Feed Items */}
          {MOCK_POSTS.map((post) => (
            <div 
              key={post.id}
              data-id={post.id}
              ref={el => {
                postRefs.current[post.id] = el;
              }}
              className="p-4 border-b border-gray-800 hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold hover:underline">{post.author}</span>
                    <span className="text-gray-500">{post.handle}</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-gray-500 hover:underline">{post.time}</span>
                    <div className="ml-auto text-gray-500">
                      <MoreHorizontal size={16} />
                    </div>
                  </div>
                  
                  <div className="text-[15px] leading-normal whitespace-pre-wrap mb-3 text-gray-100">
                    {post.content}
                  </div>

                  <div className="flex justify-between text-gray-500 max-w-md mt-3">
                    <div className="flex items-center gap-1 hover:text-blue-400 group">
                      <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                        <MessageSquare size={16} />
                      </div>
                      <span className="text-xs">{post.comments}</span>
                    </div>
                    <div className="flex items-center gap-1 hover:text-green-400 group">
                      <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                        <Repeat2 size={16} />
                      </div>
                      <span className="text-xs">{post.reposts}</span>
                    </div>
                    <div className="flex items-center gap-1 hover:text-pink-400 group">
                      <div className="p-2 rounded-full group-hover:bg-pink-500/10 transition-colors">
                        <Heart size={16} />
                      </div>
                      <span className="text-xs">{post.likes}</span>
                    </div>
                     <div className="flex items-center gap-1 hover:text-blue-400 group">
                      <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-colors">
                        <Share size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading Spinner */}
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>

        </div>
      </div>
    </BrowserFrame>
  );
}
