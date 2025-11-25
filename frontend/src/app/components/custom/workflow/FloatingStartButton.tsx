"use client";

interface FloatingStartButtonProps {
  onClick: () => void;
}

export function FloatingStartButton({ onClick }: FloatingStartButtonProps) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer rounded-lg fixed top-8 left-8 bg-blue-500 hover:bg-blue-600 text-white p-4 shadow-lg hover:shadow-xl transition-all duration-200 z-40 flex items-center justify-center group"
      title="Start Workflow"
    >
      Start Workflow
    </button>
  );
}
