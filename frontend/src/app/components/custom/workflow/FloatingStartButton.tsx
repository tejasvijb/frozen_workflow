"use client";

import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingStartButtonProps {
  onClick: () => void;
}

export function FloatingStartButton({ onClick }: FloatingStartButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 z-40 flex items-center justify-center group"
      title="Start Workflow"
    >
      <Plus size={24} className="group-hover:scale-110 transition-transform" />
    </button>
  );
}
