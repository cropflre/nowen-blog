import { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { toastEvent } from './CyberToast';

interface TerminalBlockProps {
  code: string;
  language?: string;
}

export default function TerminalBlock({ code, language = 'text' }: TerminalBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toastEvent.emit(`CODE_BLOCK copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  // 简单的语法高亮（极客风）
  const highlightCode = (text: string) => {
    return text.split('\n').map((line, i) => (
      <div key={i} className="flex">
        <span className="select-none text-zinc-600 w-8 text-right pr-4 shrink-0">
          {i + 1}
        </span>
        <span className="text-zinc-300">{line || '\u00A0'}</span>
      </div>
    ));
  };

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-zinc-800/60 bg-[#0a0a0f]">
      {/* 头部栏 */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800/40">
        <div className="flex items-center gap-3">
          {/* macOS 窗口按钮 */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-zinc-800 hover:bg-red-500/80 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-zinc-800 hover:bg-amber-500/80 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-zinc-800 hover:bg-emerald-500/80 transition-colors" />
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Terminal size={12} />
            <span className="text-xs font-mono">{language}</span>
          </div>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors px-2 py-1 rounded hover:bg-zinc-800/50"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400">copied_</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>copy_</span>
            </>
          )}
        </button>
      </div>

      {/* 代码区 */}
      <div className="p-4 overflow-x-auto font-mono text-sm leading-relaxed">
        <pre className="m-0">
          <code>{highlightCode(code)}</code>
        </pre>
      </div>
    </div>
  );
}
