import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';

// 极简的全局事件总线
export const toastEvent = {
  emit: (message: string) => document.dispatchEvent(new CustomEvent('cyber-toast', { detail: message })),
};

export default function CyberToast() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      setToast(customEvent.detail);
      setTimeout(() => setToast(null), 3000); // 3秒后自动消失
    };

    document.addEventListener('cyber-toast', handleToast);
    return () => document.removeEventListener('cyber-toast', handleToast);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex items-center gap-3 bg-zinc-900/90 backdrop-blur-xl border border-zinc-700 shadow-2xl rounded-xl px-4 py-3 min-w-[250px]"
          >
            <div className="bg-emerald-500/20 p-1.5 rounded-md text-emerald-500">
              <Terminal size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-mono text-zinc-500 tracking-widest">SYS_MSG</span>
              <span className="text-sm text-zinc-200 font-medium">{toast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}