import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, ThumbsUp, Star, X, MessageSquare, Send, ChevronRight } from 'lucide-react';
import { Store } from '../types';
import { supabase } from '../services/supabaseClient';

interface TrustBadgeProps {
  store: Store;
}

interface Review {
  id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({ store }) => {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);

  // Carregar avaliacoes em tempo real
  useEffect(() => {
    loadReviews();
    getCurrentUser();

    // Subscricao realtime para novas avaliacoes
    const channel = supabase
      .channel(`store-reviews-${store.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'avaliacoes',
          filter: `loja_id=eq.${store.id}`,
        },
        () => {
          loadReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [store.id]);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUserId(session.user.id);
    }
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*, profiles(nome)')
        .eq('loja_id', store.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        const mappedReviews: Review[] = data.map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          user_name: r.profiles?.nome || 'Cliente',
          rating: r.nota,
          comment: r.comentario || '',
          created_at: r.created_at,
        }));
        setReviews(mappedReviews);

        // Verificar se usuario atual ja avaliou
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userReview = mappedReviews.find(r => r.user_id === session.user.id);
          setHasReviewed(!!userReview);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar avaliacoes:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (newRating === 0) return;

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        alert('Faca login para avaliar');
        return;
      }

      const { error } = await supabase
        .from('avaliacoes')
        .insert({
          user_id: session.user.id,
          loja_id: store.id,
          nota: newRating,
          comentario: newComment,
        });

      if (!error) {
        setNewRating(0);
        setNewComment('');
        setHasReviewed(true);
        loadReviews();
      }
    } catch (error) {
      console.error('Erro ao enviar avaliacao:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : store.rating.toString();

  return (
    <>
      <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 mt-4 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-500/10 p-2 rounded-xl">
            <ShieldCheck size={20} className="text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-sm">Confiança do Vendedor</h3>
            <p className="text-slate-400 text-xs">Métricas verificadas pela plataforma</p>
          </div>
          <button
            onClick={() => setShowReviewModal(true)}
            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-500/30 transition-colors flex items-center gap-1"
          >
            <Star size={12} />
            {hasReviewed ? 'Ver Avaliações' : 'Avaliar'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-center mb-1">
              <Clock size={16} className="text-emerald-400" />
            </div>
            <span className="block text-white font-bold text-sm">{store.responseTime || 'N/A'}</span>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Resposta</span>
          </div>

          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-center mb-1">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
            </div>
            <span className="block text-white font-bold text-sm">{averageRating}</span>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Avaliação</span>
          </div>

          <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <div className="flex justify-center mb-1">
              <ThumbsUp size={16} className="text-blue-400" />
            </div>
            <span className="block text-white font-bold text-sm">{store.reviewCount}+</span>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Vendas</span>
          </div>
        </div>

        {store.isVerified && (
          <div className="mt-3 flex items-center justify-center gap-2 bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Loja Verificada Oficialmente</span>
          </div>
        )}
      </div>

      {/* Modal de Avaliacoes */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
              <div>
                <h2 className="font-bold text-lg text-white">Avaliações da Loja</h2>
                <p className="text-slate-400 text-xs">{store.name}</p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-2 rounded-full hover:bg-slate-700 transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* Rating Summary */}
              <div className="bg-slate-900/50 rounded-2xl p-4 mb-4 border border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <span className="text-4xl font-bold text-white">{averageRating}</span>
                    <div className="flex gap-0.5 mt-1 justify-center">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={14}
                          className={parseFloat(averageRating) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}
                        />
                      ))}
                    </div>
                    <p className="text-slate-400 text-xs mt-1">{reviews.length} avaliações</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map(rating => {
                      const count = reviews.filter(r => r.rating === rating).length;
                      const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={rating} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-3">{rating}</span>
                          <Star size={10} className="text-yellow-400 fill-yellow-400" />
                          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Add Review Form */}
              {!hasReviewed && (
                <div className="bg-slate-700/30 rounded-2xl p-4 mb-4 border border-slate-600/30">
                  <h3 className="font-bold text-sm text-white mb-3">Avaliar esta loja</h3>

                  {/* Star Rating */}
                  <div className="flex gap-2 mb-3 justify-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setNewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          size={28}
                          className={(hoverRating || newRating) >= star
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-slate-600'
                          }
                        />
                      </button>
                    ))}
                  </div>

                  {/* Comment */}
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Conte sua experiência com esta loja..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500"
                    rows={3}
                  />

                  {/* Submit */}
                  <button
                    onClick={handleSubmitReview}
                    disabled={newRating === 0 || isSubmitting}
                    className="w-full mt-3 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={16} />
                        Enviar Avaliação
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Reviews List */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider">
                  {hasReviewed ? 'Todas as Avaliações' : 'Avaliações Recentes'}
                </h3>

                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare size={40} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400 text-sm">Nenhuma avaliação ainda</p>
                    <p className="text-slate-500 text-xs mt-1">Seja o primeiro a avaliar!</p>
                  </div>
                ) : (
                  reviews.map(review => (
                    <div key={review.id} className="bg-slate-900/30 rounded-xl p-3 border border-slate-700/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">{review.user_name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{review.user_name}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(review.created_at).toLocaleDateString('pt-AO')}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              size={12}
                              className={review.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-slate-300 text-sm mt-2">{review.comment}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
