import React, { useState } from 'react';
import { Search, Globe, ArrowLeft, ArrowRight, RotateCw, Shield, Smartphone, MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrowserFrameProps {
  url: string;
  children: React.ReactNode;
  onUrlChange?: (url: string) => void;
  extensionIcon?: React.ReactNode;
  onExtensionClick?: () => void;
}

export function BrowserFrame({ url, children, onUrlChange, extensionIcon, onExtensionClick }: BrowserFrameProps) {
  return (
    <div className="flex flex-col h-screen w-full bg-[#1e1e24] text-white overflow-hidden font-sans">
      {/* Browser Chrome */}
      <div className="flex items-center h-12 bg-[#2b2b33] px-2 gap-2 border-b border-black/20 z-50 relative">
        {/* Window Controls */}
        <div className="flex gap-2 px-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 text-gray-400 ml-2">
          <ArrowLeft className="w-4 h-4 hover:text-white cursor-pointer" />
          <ArrowRight className="w-4 h-4 hover:text-white cursor-pointer" />
          <RotateCw className="w-4 h-4 hover:text-white cursor-pointer" />
        </div>

        {/* Address Bar */}
        <div className="flex-1 flex items-center h-8 bg-[#1c1b22] rounded-md px-3 mx-2 border border-[#42414d] group focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
          <Shield className="w-3 h-3 text-gray-500 mr-2" />
          <div className="text-gray-500 text-xs mr-1">https://</div>
          <input 
            type="text" 
            value={url} 
            readOnly
            className="bg-transparent border-none outline-none text-sm text-white w-full font-sans"
          />
          {/* Extension Icon Area */}
          <div className="flex items-center gap-2 ml-2 border-l border-gray-700 pl-2 py-1">
            {extensionIcon && (
              <button 
                onClick={onExtensionClick}
                className="hover:bg-white/10 rounded p-1 transition-colors relative group"
              >
                {extensionIcon}
              </button>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3 text-gray-400 px-2">
          <MoreHorizontal className="w-4 h-4" />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto relative bg-white dark:bg-black scroll-smooth">
        {children}
      </div>
    </div>
  );
}
