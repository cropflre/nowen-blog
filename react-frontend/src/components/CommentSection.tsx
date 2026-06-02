import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Reply, User, Mail, Globe, Clock } from 'lucide-react';
import { api } from '../api';
import type { Comment, CommentFormData } from '../types';

interface CommentSectionProps {
  postId: number;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function CommentItem({ comment, onReply }: { comment: Comment; onReply: (parentId: number) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative border-l-2 border-[var(--color-border-surface)] pl-4 py-3 hover:border-emerald-500/40 transition-colors"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-7 h-7 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center">
          <User size={14} className="text-[var(--color-text-muted)]" />
        </div>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{comment.nickname}</span>
        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)] font-mono">
          <Clock size={10} />
          {formatDate(comment.created_at)}
        </span>
      </div>
      <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">{comment.content}</p>
      <button
        onClick={() => onReply(comment.id)}
        className="mt-2 flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Reply size={12} />
        Reply
      </button>
    </motion.div>
  );
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<CommentFormData>({
    nickname: '',
    email: '',
    website: '',
    content: '',
    parent_id: null,
  });

  const loadComments = useCallback(async () => {
    try {
      const res = await api.getComments(postId);
      setComments(res.data.comments);
      setTotal(res.data.total);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleReply = (parentId: number) => {
    setReplyTo(parentId);
    setForm(prev => ({ ...prev, parent_id: parentId }));
    // Focus the textarea
    document.getElementById('comment-textarea')?.focus();
  };

  const cancelReply = () => {
    setReplyTo(null);
    setForm(prev => ({ ...prev, parent_id: null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nickname.trim() || !form.content.trim()) return;

    setSubmitting(true);
    try {
      await api.createComment(postId, form);
      setSubmitted(true);
      setForm({ nickname: '', email: '', website: '', content: '', parent_id: null });
      setReplyTo(null);
    } catch (err) {
      alert((err as Error).message || 'Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-16 border-t border-[var(--color-border-surface)] pt-10">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare size={18} className="text-emerald-400" />
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{t("comments.title")}</h2>
        <span className="text-xs font-mono text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] px-2 py-0.5 rounded">
          {total}
        </span>
      </div>

      {/* Comment Form */}
      {submitted ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-lg"
        >
          <p className="text-sm text-emerald-400 font-mono">Comment submitted. Awaiting moderation.</p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Post another comment
          </button>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="mb-10 space-y-4">
          {/* Reply indicator */}
          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-xs text-blue-400"
              >
                <Reply size={12} />
                <span>Replying to comment #{replyTo}</span>
                <button type="button" onClick={cancelReply} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] ml-2">
                  &times; Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder={t("comments.nicknamePlaceholder")}
                value={form.nickname}
                onChange={e => setForm(prev => ({ ...prev, nickname: e.target.value }))}
                required
                maxLength={50}
                className="w-full pl-9 pr-3 py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border-surface)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="email"
                placeholder={t("comments.emailPlaceholder")}
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full pl-9 pr-3 py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border-surface)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
            <div className="relative">
              <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="url"
                placeholder={t("comments.websitePlaceholder")}
                value={form.website}
                onChange={e => setForm(prev => ({ ...prev, website: e.target.value }))}
                className="w-full pl-9 pr-3 py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border-surface)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>

          <div className="relative">
            <textarea
              id="comment-textarea"
              placeholder={t("comments.writeComment")}
              value={form.content}
              onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
              required
              maxLength={2000}
              rows={4}
              className="w-full px-4 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-surface)] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
            />
            <span className="absolute bottom-3 right-3 text-[10px] font-mono text-[var(--color-text-muted)]">
              {form.content.length}/2000
            </span>
          </div>

          <div className="flex justify-end">
            <motion.button
              type="submit"
              disabled={submitting || !form.nickname.trim() || !form.content.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-mono hover:bg-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              ) : (
                <Send size={14} />
              )}
              {submitting ? 'Submitting...' : 'Post Comment'}
            </motion.button>
          </div>
        </form>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse border-l-2 border-[var(--color-border-surface)] pl-4 py-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-7 h-7 rounded-full bg-[var(--color-bg-secondary)]" />
                <div className="h-3 w-20 rounded bg-[var(--color-bg-secondary)]" />
              </div>
              <div className="h-3 w-3/4 rounded bg-[var(--color-bg-secondary)]" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare size={32} className="mx-auto mb-3 text-[var(--color-text-muted)] opacity-30" />
          <p className="text-sm text-[var(--color-text-muted)] font-mono">No comments yet. Be the first to share your thoughts.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} onReply={handleReply} />
          ))}
        </div>
      )}
    </section>
  );
}
