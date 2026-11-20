import React, { useState } from 'react';
import { X, Star, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItemId: string;
  productName: string;
  productImage?: string | null;
  onReviewSubmitted: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  orderItemId,
  productName,
  productImage,
  onReviewSubmitted,
}) => {
  const { token } = useAuth();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const getApiUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please provide a short comment describing your experience.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${getApiUrl()}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderItemId,
          rating,
          comment: comment.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to submit review');
      }

      setSuccess(true);
      setTimeout(() => {
        onReviewSubmitted();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error submitting review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white border border-[#e5e7eb] rounded-2xl p-6 md:p-8 shadow-xl text-[#171717]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#6b7280] hover:text-[#171717] rounded-full hover:bg-[#fafafa] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#fafafa] border border-[#e5e7eb] text-[#171717] mx-auto flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-[#171717]">Review Submitted!</h3>
            <p className="text-xs text-[#6b7280] max-w-xs mx-auto">
              Thank you for sharing your feedback. Your verified purchase review will appear after moderation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#6b7280]">
                Verified Purchase
              </span>
              <h3 className="text-xl font-semibold text-[#171717] tracking-tight mt-0.5">Rate & Review Product</h3>
            </div>

            {/* Product thumbnail */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#fafafa] border border-[#e5e7eb]">
              {productImage ? (
                <img
                  src={productImage}
                  alt={productName}
                  className="w-12 h-12 rounded-md object-cover border border-[#e5e7eb] flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-white border border-[#e5e7eb] flex items-center justify-center flex-shrink-0 text-[#9ca3af] font-semibold text-xs">
                  UB
                </div>
              )}
              <div className="truncate">
                <p className="font-medium text-[#171717] text-xs truncate">{productName}</p>
                <p className="text-[11px] text-[#6b7280]">Delivered order verified</p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-[#dc2626] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Star Rating Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#171717]">Overall Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 focus:outline-none transition cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-[#e5e7eb] hover:text-[#d1d5db]'
                        }`}
                      />
                    </button>
                  );
                })}
                <span className="ml-2 text-xs font-medium text-[#6b7280]">
                  {rating === 5 ? 'Excellent (5/5)' : `${rating} of 5 Stars`}
                </span>
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#171717]">Your Feedback</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What did you like or dislike about this product? How was the quality?"
                rows={4}
                required
                className="w-full rounded-lg bg-white border border-[#e5e7eb] p-3 text-xs text-[#171717] focus:outline-none focus:border-[#171717] transition resize-none placeholder:text-[#9ca3af]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] hover:text-[#171717] text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-full bg-[#171717] hover:bg-black text-white font-medium text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
