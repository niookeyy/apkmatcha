'use client';

type ToastProps = {
  show: boolean;
  type?: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  onClose: () => void;
};

export default function Toast({
  show,
  type = 'success',
  title,
  message,
  onClose,
}: ToastProps) {
  if (!show) return null;

  const colors = {
    success: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: '✓',
    },
    error: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: '✕',
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      icon: '!',
    },
  };

  const style = colors[type];

  return (
    <div className="fixed right-5 top-5 z-[9999] w-full max-w-sm animate-in slide-in-from-top-5">
      <div
        className={`rounded-2xl border bg-white p-4 shadow-2xl ${style.border}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${style.bg} ${style.text} font-bold`}
          >
            {style.icon}
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-[#2f3a25]">{title}</h3>

            <p className="mt-1 text-sm text-[#6f7b62]">
              {message}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-[#8a947d] hover:text-black cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}