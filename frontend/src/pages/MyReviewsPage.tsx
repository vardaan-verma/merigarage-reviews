import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { UserReviewDto, UpdateReviewRequest } from '../api/types';
import { Modal } from '../components/Modal';
import { useToast } from '../context/NotificationContext';

export const MyReviewsPage: React.FC = () => {
  const { showSuccess, showError, showWarning } = useToast();
  const [reviews, setReviews] = useState<UserReviewDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editingReview, setEditingReview] = useState<UserReviewDto | null>(null);
  const [editRatingQuality, setEditRatingQuality] = useState<number>(5);
  const [editRatingPricing, setEditRatingPricing] = useState<number>(5);
  const [editRatingTimeline, setEditRatingTimeline] = useState<number>(5);
  const [editRatingCommunication, setEditRatingCommunication] = useState<number>(5);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.reviews.getMyReviews();
      setReviews(data);
    } catch (err: any) {
      const msg = err.message || 'Failed to load your reviews.';
      showError(msg);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const openEditModal = (review: UserReviewDto) => {
    setEditingReview(review);
    setEditRatingQuality(review.ratingServiceQuality || 5);
    setEditRatingPricing(review.ratingPricing || 5);
    setEditRatingTimeline(review.ratingTimeline || 5);
    setEditRatingCommunication(review.ratingCommunication || 5);
    setEditTitle(review.reviewTitle || '');
    setEditText(review.reviewText);
  };

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview) return;
    if (!editText.trim()) {
      showWarning('Review text cannot be blank.');
      return;
    }

    try {
      setUpdating(true);
      const updatePayload: UpdateReviewRequest = {
        serviceQuality: editRatingQuality,
        pricing: editRatingPricing,
        timeline: editRatingTimeline,
        communication: editRatingCommunication,
        ratingServiceQuality: editRatingQuality,
        ratingPricing: editRatingPricing,
        ratingTimeline: editRatingTimeline,
        ratingCommunication: editRatingCommunication,
        reviewTitle: editTitle.trim() || undefined,
        reviewText: editText.trim(),
      };
      await api.reviews.update(editingReview.id, updatePayload);
      const msg = 'Your review has been updated successfully.';
      showSuccess(msg);
      setEditingReview(null);
      fetchReviews();
    } catch (err: any) {
      const msg = err.message || 'Failed to update review.';
      showError(msg);
    } finally {
      setUpdating(false);
    }
  };

  const uniqueGaragesCount = new Set(reviews.map((r) => r.garageId)).size;
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + (Number(r.overallRating) || 0), 0) / reviews.length
        ).toFixed(1)
      : '0.0';

  return (
    <div className="container py-8 max-w-5xl">
      <div className="page-header mb-8 flex-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Submitted Reviews</h1>
          <p className="text-secondary text-sm mt-1">
            Track, inspect, and update your verified customer reviews for automotive workshops.
          </p>
        </div>
        <Link to="/garages" className="btn btn-primary btn-sm flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">search</span>
          Explore Workshops
        </Link>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5 border border-border flex items-center gap-4 bg-surface-raised">
          <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">rate_review</span>
          </div>
          <div>
            <span className="text-2xs text-muted font-bold uppercase tracking-wider block">
              Total Reviews
            </span>
            <span className="text-2xl font-black text-white">{reviews.length}</span>
          </div>
        </div>

        <div className="card p-5 border border-border flex items-center gap-4 bg-surface-raised">
          <div className="w-12 h-12 rounded-xl bg-accent/20 text-accent flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">storefront</span>
          </div>
          <div>
            <span className="text-2xs text-muted font-bold uppercase tracking-wider block">
              Workshops Reviewed
            </span>
            <span className="text-2xl font-black text-white">{uniqueGaragesCount}</span>
          </div>
        </div>

        <div className="card p-5 border border-border flex items-center gap-4 bg-surface-raised">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">star</span>
          </div>
          <div>
            <span className="text-2xs text-muted font-bold uppercase tracking-wider block">
              Average Rating Given
            </span>
            <span className="text-2xl font-black text-white">{avgRating} / 5</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="center-loader py-16">
          <div className="spinner"></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="card p-12 text-center border border-border">
          <div className="w-16 h-16 rounded-full bg-surface-raised border border-border mx-auto flex items-center justify-center text-secondary mb-4">
            <span className="material-symbols-outlined text-3xl">reviews</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Reviews Submitted Yet</h2>
          <p className="text-secondary text-sm max-w-md mx-auto mb-6">
            You haven't written any workshop reviews yet. Share your automotive repair experiences to help other vehicle owners find trustworthy garages.
          </p>
          <Link to="/garages" className="btn btn-primary btn-sm inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">search</span>
            Find a Workshop to Review
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="card p-6 border border-border hover:border-border/80 transition-all">
              <div className="flex-between items-start flex-wrap gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      to={r.garageSlug ? `/garages/${r.garageSlug}` : `/garages`}
                      className="text-lg font-bold text-white hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{r.garageName}</span>
                      <span className="material-symbols-outlined text-xs text-secondary">open_in_new</span>
                    </Link>
                    {r.garageCity && (
                      <span className="text-2xs font-mono text-muted">({r.garageCity})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-2xs text-muted">
                    <span>Submitted on {new Date(r.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span
                      className={`badge badge-xs font-mono ${
                        r.status === 'PUBLISHED'
                          ? 'badge-success'
                          : r.status === 'PENDING'
                          ? 'badge-pending'
                          : 'badge-secondary'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 rounded-full text-yellow-400 font-bold text-sm">
                    <span>★</span>
                    <span>{Number(r.overallRating).toFixed(1)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditModal(r)}
                    className="btn btn-secondary btn-xs flex items-center gap-1"
                    title="Edit your review"
                  >
                    <span className="material-symbols-outlined text-xs">edit</span>
                    Edit
                  </button>
                </div>
              </div>

              {/* Sub-ratings breakdown */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="badge badge-secondary text-2xs">
                  Quality: {r.ratingServiceQuality || '—'}/5
                </span>
                <span className="badge badge-secondary text-2xs">
                  Pricing: {r.ratingPricing || '—'}/5
                </span>
                <span className="badge badge-secondary text-2xs">
                  Timeline: {r.ratingTimeline || '—'}/5
                </span>
                <span className="badge badge-secondary text-2xs">
                  Communication: {r.ratingCommunication || '—'}/5
                </span>
              </div>

              {r.reviewTitle && (
                <h4 className="font-semibold text-white text-sm mb-1">{r.reviewTitle}</h4>
              )}
              <p className="text-secondary text-sm leading-relaxed whitespace-pre-line">
                {r.reviewText}
              </p>

              {/* Garage Owner Response if present */}
              {r.response && (
                <div className="mt-4 p-4 rounded bg-primary/5 border border-primary/20 text-xs">
                  <div className="flex items-center gap-1.5 text-primary font-bold mb-1">
                    <span className="material-symbols-outlined text-sm">reply</span>
                    <span>Response from Workshop Owner</span>
                  </div>
                  <p className="text-secondary leading-relaxed">{r.response.responseText}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Review Modal */}
      <Modal
        isOpen={!!editingReview}
        onClose={() => setEditingReview(null)}
        title={`Edit Review for ${editingReview?.garageName || 'Workshop'}`}
      >
        {editingReview && (
          <form onSubmit={handleUpdateReview} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Service Quality (1-5)</label>
                <select
                  className="input w-full"
                  value={editRatingQuality}
                  onChange={(e) => setEditRatingQuality(Number(e.target.value))}
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Good</option>
                  <option value={3}>3 - Average</option>
                  <option value={2}>2 - Poor</option>
                  <option value={1}>1 - Terrible</option>
                </select>
              </div>

              <div>
                <label className="label">Pricing & Value (1-5)</label>
                <select
                  className="input w-full"
                  value={editRatingPricing}
                  onChange={(e) => setEditRatingPricing(Number(e.target.value))}
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Good</option>
                  <option value={3}>3 - Average</option>
                  <option value={2}>2 - Poor</option>
                  <option value={1}>1 - Terrible</option>
                </select>
              </div>

              <div>
                <label className="label">Timeline & Promptness (1-5)</label>
                <select
                  className="input w-full"
                  value={editRatingTimeline}
                  onChange={(e) => setEditRatingTimeline(Number(e.target.value))}
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Good</option>
                  <option value={3}>3 - Average</option>
                  <option value={2}>2 - Poor</option>
                  <option value={1}>1 - Terrible</option>
                </select>
              </div>

              <div>
                <label className="label">Communication (1-5)</label>
                <select
                  className="input w-full"
                  value={editRatingCommunication}
                  onChange={(e) => setEditRatingCommunication(Number(e.target.value))}
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Good</option>
                  <option value={3}>3 - Average</option>
                  <option value={2}>2 - Poor</option>
                  <option value={1}>1 - Terrible</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Review Headline (Optional)</label>
              <input
                type="text"
                className="input w-full"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. Prompt service and transparent pricing"
              />
            </div>

            <div>
              <label className="label">
                Review Experience <span className="text-danger">*</span>
              </label>
              <textarea
                required
                rows={4}
                className="input w-full"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Describe the automotive work performed..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setEditingReview(null)}
                disabled={updating}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={updating}>
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
export default MyReviewsPage;
