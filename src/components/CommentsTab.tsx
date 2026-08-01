import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';
import { Send, Trash2 } from 'lucide-react';

export function CommentsTab({ requestId }: { requestId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useStore();
  const endRef = useRef<HTMLDivElement>(null);

  const fetchComments = async () => {
    try {
      const res = await api.get(`/comments/${requestId}`);
      setComments(res.data);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 5000); // Simple polling
    return () => clearInterval(interval);
  }, [requestId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      await api.post(`/comments/${requestId}`, {
        content: newComment,
        userId: user.uid
      });
      setNewComment('');
      fetchComments();
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment', err);
    }
  };

  if (loading) {
    return <div className="p-4 text-[var(--text-secondary)] text-sm">Loading comments...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <div className="text-center text-[var(--text-secondary)] text-sm py-8">
            No comments yet. Start the discussion!
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className={`flex gap-3 ${comment.userId === user?.uid ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shrink-0 font-bold text-sm">
                {comment.user?.displayName?.[0]?.toUpperCase() || comment.user?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className={`flex flex-col ${comment.userId === user?.uid ? 'items-end' : 'items-start'} max-w-[80%]`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {comment.user?.displayName || comment.user?.email}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={`p-3 rounded-xl text-sm break-words relative group ${
                  comment.userId === user?.uid 
                    ? 'bg-[var(--primary)] text-white rounded-tr-none' 
                    : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-none'
                }`}>
                  {comment.content}
                  
                  {comment.userId === user?.uid && (
                    <button 
                      onClick={() => handleDelete(comment.id)}
                      className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 text-red-500 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--primary)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            disabled={!user}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || !user}
            className="p-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[#e65a2d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
