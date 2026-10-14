import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type {
  GarageDetailDto,
  ReviewDto,
  PagedResponse,
  CreateReviewRequest,
} from '../api/types';
import { StarRating } from '../components/StarRating';
import { Pagination } from '../components/Pagination';
import { Alert } from '../components/Alert';
import { Modal } from '../components/Modal';

export const GarageDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated, hasRole, hasPermission } = useAuth();
  const navigate = useNavigate();

  const [garage, setGarage] = useState<GarageDetailDto | null>(null);
  const [reviewsData, setReviewsData] = useState<PagedResponse<ReviewDto> | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [reviewPage, setReviewPage] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [ratingQuality, setRatingQuality] = useState(0);
  const [ratingPricing, setRatingPricing] = useState(0);
  const [ratingTimeline, setRatingTimeline] = useState(0);
  const [ratingCommunication, setRatingCommunication] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Owner Response State
  const [respondingReviewId, setRespondingReviewId] = useState<number | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseSubmitting, setResponseSubmitting] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);

  // Moderator Delete State
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Fetch Garage Details
  const fetchGarage = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.garages.getBySlug(slug);
      setGarage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load garage details');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // Fetch Reviews
  const fetchReviews = useCallback(async (garageId: number, page: number) => {
    try {
      setReviewsLoading(true);
      setReviewsError(null);
      const res = await api.reviews.getForGarage(garageId, {
        page,
        size: 5,
        sortBy: 'createdAt',
        sortDir: 'desc',
      });
      setReviewsData(res);
    } catch (err: any) {
      setReviewsError(err.message || 'Failed to load reviews');
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGarage();
  }, [fetchGarage]);

  useEffect(() => {
    if (garage) {
      fetchReviews(garage.id, reviewPage);
    }
  }, [garage, reviewPage, fetchReviews]);

  // Open Write / Edit Review Modal
  const handleOpenReviewModal = (existing?: ReviewDto) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (existing) {
      setEditingReviewId(existing.id);
      setRatingQuality(existing.serviceQuality ?? existing.ratingServiceQuality ?? 0);
      setRatingPricing(existing.pricing ?? existing.ratingPricing ?? 0);
      setRatingTimeline(existing.timeline ?? existing.ratingTimeline ?? 0);
      setRatingCommunication(existing.communication ?? existing.ratingCommunication ?? 0);
      setReviewTitle(existing.reviewTitle || '');
      setReviewText(existing.reviewText || '');
    } else {
      setEditingReviewId(null);
      setRatingQuality(0);
      setRatingPricing(0);
      setRatingTimeline(0);
      setRatingCommunication(0);
      setReviewTitle('');
      setReviewText('');
    }
    setReviewError(null);
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garage || reviewSubmitting) return;

    if (!ratingQuality || ratingQuality < 1 || ratingQuality > 5) {
      setReviewError('Please provide a rating for Service Quality (1 to 5 stars).');
      return;
    }
    if (!ratingPricing || ratingPricing < 1 || ratingPricing > 5) {
      setReviewError('Please provide a rating for Pricing (1 to 5 stars).');
      return;
    }
    if (!ratingTimeline || ratingTimeline < 1 || ratingTimeline > 5) {
      setReviewError('Please provide a rating for Timeline (1 to 5 stars).');
      return;
    }
    if (!ratingCommunication || ratingCommunication < 1 || ratingCommunication > 5) {
      setReviewError('Please provide a rating for Communication (1 to 5 stars).');
      return;
    }
    if (!reviewText.trim() || reviewText.trim().length < 10) {
      setReviewError('Review content must be at least 10 characters.');
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewError(null);

      const payload: CreateReviewRequest = {
        serviceQuality: ratingQuality,
        pricing: ratingPricing,
        timeline: ratingTimeline,
        communication: ratingCommunication,
        ratingServiceQuality: ratingQuality,
        ratingPricing: ratingPricing,
        ratingTimeline: ratingTimeline,
        ratingCommunication: ratingCommunication,
        reviewTitle: reviewTitle.trim() || undefined,
        reviewText: reviewText.trim(),
      };

      if (editingReviewId) {
        await api.reviews.update(editingReviewId, payload);
        setActionSuccess('Your review was successfully updated.');
      } else {
        await api.reviews.create(garage.id, payload);
        setActionSuccess('Thank you! Your review was submitted successfully.');
      }

      setIsReviewModalOpen(false);
      fetchGarage();
      fetchReviews(garage.id, reviewPage);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Open Claim Modal
  const handleOpenClaimModal = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setClaimMessage('');
    setClaimError(null);
    setIsClaimModalOpen(true);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garage) return;

    if (!claimMessage.trim() || claimMessage.length < 10) {
      setClaimError('Please provide a descriptive verification message (min 10 characters).');
      return;
    }

    try {
      setClaimSubmitting(true);
      setClaimError(null);

      await api.claims.submit(garage.id, claimMessage.trim());
      setActionSuccess('Ownership claim submitted. Our team will audit your credentials shortly.');
      setIsClaimModalOpen(false);
    } catch (err: any) {
      setClaimError(err.message || 'Failed to submit ownership claim');
    } finally {
      setClaimSubmitting(false);
    }
  };

  // Owner Response Submit
  const handleResponseSubmit = async (reviewId: number) => {
    if (!responseText.trim()) {
      setResponseError('Response content cannot be blank.');
      return;
    }

    try {
      setResponseSubmitting(true);
      setResponseError(null);
      await api.reviews.respond(reviewId, responseText.trim());
      setActionSuccess('Your response has been published to this review.');
      setRespondingReviewId(null);
      setResponseText('');
      if (garage) fetchReviews(garage.id, reviewPage);
    } catch (err: any) {
      setResponseError(err.message || 'Failed to submit response');
    } finally {
      setResponseSubmitting(false);
    }
  };

  // Moderate / Delete Review
  const handleDeleteReview = async () => {
    if (!deletingReviewId || !deleteReason.trim()) return;

    try {
      setDeleteSubmitting(true);
      await api.admin.softDeleteReview(deletingReviewId, deleteReason.trim());
      setActionSuccess('Review was removed by moderation.');
      setDeletingReviewId(null);
      setDeleteReason('');
      if (garage) fetchReviews(garage.id, reviewPage);
    } catch (err: any) {
      alert(`Moderation failed: ${err.message}`);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="center-loader py-16">
        <div className="spinner"></div>
        <p className="text-muted mt-2">Loading garage details...</p>
      </div>
    );
  }

  if (error || !garage) {
    return (
      <div className="container py-12">
        <div className="card p-8 text-center max-w-lg mx-auto">
          <h2 className="text-xl font-bold text-danger mb-2">Garage Not Found</h2>
          <p className="text-secondary text-sm mb-6">
            {error || 'The requested garage listing could not be found or has not been approved.'}
          </p>
          <Link to="/garages" className="btn btn-primary">
            ← Back to All Garages
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = hasRole('ROLE_GARAGE_OWNER') || hasRole('ROLE_ADMIN');
  const canModerate = hasRole('ROLE_ADMIN') || hasPermission('CONTENT_MODERATION');

  const photos = garage.photos || [];
  const currentPhoto = photos.length > 0 ? photos[activePhotoIdx] : null;

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <nav className="breadcrumb mb-4 text-xs text-muted" aria-label="Breadcrumb">
        <Link to="/">Home</Link> &gt; <Link to="/garages">Garages</Link> &gt;{' '}
        <span className="text-primary font-medium">{garage.name}</span>
      </nav>

      {actionSuccess && (
        <Alert
          type="success"
          message={actionSuccess}
          onClose={() => setActionSuccess(null)}
          className="mb-6"
        />
      )}

      {/* Hero Header */}
      <div className="garage-detail-header card p-6 mb-8">
        <div className="flex-between items-start flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{garage.name}</h1>
              {garage.isVerified && (
                <span className="badge badge-verified">✓ Verified Garage</span>
              )}
            </div>

            <div className="flex items-center gap-4 flex-wrap text-sm text-secondary">
              <span>📍 {garage.addressLine1}, {garage.city}, {garage.state} {garage.postalCode}</span>
              {garage.phoneNumber && <span>📞 {garage.phoneNumber}</span>}
              {garage.email && <span>✉️ {garage.email}</span>}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleOpenReviewModal()}
            >
              ✍️ Write a Review
            </button>

            {!garage.hasOwner ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleOpenClaimModal}
                title="Are you the owner of this workshop? Claim ownership."
              >
                Claim Listing
              </button>
            ) : (
              <span className="badge badge-success text-xs" title="This workshop has a verified owner">
                ✓ Claimed
              </span>
            )}

            {((user && garage.ownerId && user.id === garage.ownerId) || (isOwner && (!garage.hasOwner || user?.id === garage.ownerId))) && (
              <Link to={`/owner?slug=${garage.slug}`} className="btn btn-outline btn-sm">
                ⚙️ Manage Workshop
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-3 gap-8">
        {/* Main Content (2 cols) */}
        <div className="col-span-2">
          {/* Photo Gallery */}
          <div className="card p-4 mb-8">
            <h3 className="section-title text-base mb-3">Workshop Photos</h3>
            {photos.length > 0 ? (
              <div className="gallery-container">
                <div className="main-photo-wrapper">
                  {currentPhoto && (
                    <img
                      src={api.garages.getPhotoUrl(garage.id, currentPhoto.id)}
                      alt={currentPhoto.caption || `${garage.name} photo`}
                      className="main-gallery-img"
                    />
                  )}
                  {currentPhoto?.isCover && (
                    <span className="badge badge-accent cover-badge">Cover Photo</span>
                  )}
                </div>

                {photos.length > 1 && (
                  <div className="thumbnail-strip mt-3 flex gap-2 overflow-x-auto">
                    {photos.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`thumb-btn ${idx === activePhotoIdx ? 'active' : ''}`}
                        onClick={() => setActivePhotoIdx(idx)}
                      >
                        <img
                          src={api.garages.getPhotoUrl(garage.id, p.id)}
                          alt="thumbnail"
                          className="thumb-img"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state p-8 text-center text-muted">
                No approved photos uploaded for this garage yet.
              </div>
            )}
          </div>

          {/* Active Services Catalogue */}
          <div className="card p-6 mb-8">
            <div className="flex-between items-center mb-4">
              <h3 className="section-title text-base">Offered Services & Pricing</h3>
              <span className="text-xs text-muted">
                {garage.services?.length || 0} services available
              </span>
            </div>

            {garage.services && garage.services.length > 0 ? (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Category</th>
                      <th>Starting Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {garage.services.map((gs) => (
                      <tr key={gs.serviceId}>
                        <td className="font-medium text-foreground">{gs.serviceName}</td>
                        <td className="text-muted text-xs">{gs.category.replace('_', ' ')}</td>
                        <td className="font-mono text-accent">
                          {gs.startingPrice ? `₹${gs.startingPrice.toLocaleString('en-IN')}` : 'Contact for quote'}
                        </td>
                        <td>
                          <span className={`badge ${gs.isAvailable ? 'badge-success' : 'badge-danger'}`}>
                            {gs.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">No specific services registered yet.</p>
            )}
          </div>

          {/* Reviews & Ratings Section */}
          <div className="card p-6 mb-8" id="reviews-section">
            <div className="flex-between items-center mb-6">
              <div>
                <h3 className="section-title text-base">Customer Reviews</h3>
                <p className="text-xs text-muted">
                  Verified feedback from registered vehicle owners
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenReviewModal()}
              >
                + Add Review
              </button>
            </div>

            {reviewsError && (
              <Alert type="error" message={reviewsError} className="mb-4" />
            )}

            {reviewsLoading && !reviewsData && (
              <div className="p-4 text-center text-muted text-sm">Loading reviews...</div>
            )}

            {reviewsData && reviewsData.content.length > 0 ? (
              <div className="reviews-list space-y-6">
                {reviewsData.content.map((rev) => {
                  return (
                    <article key={rev.id} className="review-item card p-4 bg-surface-raised">
                      <div className="flex-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{rev.authorFullName}</span>
                            <StarRating rating={rev.overallRating} size="sm" showNumber={true} />
                          </div>
                          <span className="text-xs text-muted">
                            {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {rev.updatedAt && rev.updatedAt !== rev.createdAt && (
                              <span className="ml-2 text-xs text-muted italic">(edited)</span>
                            )}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {user && (user.id === rev.authorUserId || user.fullName === rev.authorFullName) && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => handleOpenReviewModal(rev)}
                            >
                              ✏️ Edit
                            </button>
                          )}
                          {canModerate && (
                            <button
                              type="button"
                              className="btn btn-danger btn-xs"
                              onClick={() => {
                                setDeletingReviewId(rev.id);
                                setDeleteReason('');
                              }}
                            >
                              Moderate
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Four category ratings */}
                      <div className="grid grid-4 gap-2 text-xs text-muted bg-surface p-2 rounded mb-3">
                        <div>Service Quality: <strong>{rev.ratingServiceQuality ?? rev.serviceQuality ?? '—'}/5</strong></div>
                        <div>Pricing: <strong>{rev.ratingPricing ?? rev.pricing ?? '—'}/5</strong></div>
                        <div>Timeline: <strong>{rev.ratingTimeline ?? rev.timeline ?? '—'}/5</strong></div>
                        <div>Communication: <strong>{rev.ratingCommunication ?? rev.communication ?? '—'}/5</strong></div>
                      </div>

                      {rev.reviewTitle && <h4 className="font-bold text-sm mb-1">{rev.reviewTitle}</h4>}
                      <p className="text-sm text-secondary mb-3">{rev.reviewText}</p>

                      {/* Owner response display */}
                      {rev.response ? (
                        <div className="owner-response-box p-3 mt-3 border-l-2 border-primary bg-surface rounded">
                          <div className="flex-between items-center mb-1">
                            <span className="font-semibold text-xs text-primary">
                              🛠️ Garage Owner Response
                            </span>
                            <span className="text-xs text-muted">
                              {new Date(rev.response.createdAt).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                          <p className="text-xs text-secondary">{rev.response.responseText}</p>
                        </div>
                      ) : isOwner ? (
                        <div className="mt-3">
                          {respondingReviewId === rev.id ? (
                            <div className="response-form-box p-3 bg-surface rounded">
                              <label className="form-label text-xs">Public Response to Customer</label>
                              <textarea
                                className="form-control text-xs mb-2"
                                rows={3}
                                placeholder="Thank the customer or address their concern constructively..."
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                              />
                              {responseError && (
                                <p className="text-danger text-xs mb-2">{responseError}</p>
                              )}
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="btn btn-primary btn-xs"
                                  disabled={responseSubmitting}
                                  onClick={() => handleResponseSubmit(rev.id)}
                                >
                                  {responseSubmitting ? 'Submitting...' : 'Post Response'}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-xs"
                                  onClick={() => setRespondingReviewId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline btn-xs"
                              onClick={() => {
                                setRespondingReviewId(rev.id);
                                setResponseText('');
                                setResponseError(null);
                              }}
                            >
                              💬 Respond to this review
                            </button>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}

                <Pagination
                  page={reviewsData.page}
                  totalPages={reviewsData.totalPages}
                  totalElements={reviewsData.totalElements}
                  onPageChange={(p) => setReviewPage(p)}
                />
              </div>
            ) : (
              <div className="empty-state p-8 text-center text-muted">
                No reviews yet. Be the first customer to share your experience!
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info (1 col) */}
        <div>
          {/* Contact & Address Card */}
          <div className="card p-6 mb-6">
            <h3 className="section-title text-base mb-4">Workshop Information</h3>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted block text-xs">Address</span>
                <span className="font-medium text-foreground">
                  {garage.addressLine1}
                  {garage.addressLine2 && `, ${garage.addressLine2}`}
                  <br />
                  {garage.city}, {garage.state} {garage.postalCode}
                </span>
              </div>

              {garage.phoneNumber && (
                <div>
                  <span className="text-muted block text-xs">Direct Phone</span>
                  <a href={`tel:${garage.phoneNumber}`} className="text-primary font-mono">
                    {garage.phoneNumber}
                  </a>
                </div>
              )}

              {garage.email && (
                <div>
                  <span className="text-muted block text-xs">Business Email</span>
                  <a href={`mailto:${garage.email}`} className="text-primary font-mono text-xs">
                    {garage.email}
                  </a>
                </div>
              )}

              {garage.websiteUrl && (
                <div>
                  <span className="text-muted block text-xs">Website</span>
                  <a
                    href={garage.websiteUrl.startsWith('http') ? garage.websiteUrl : `https://${garage.websiteUrl}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary text-xs underline"
                  >
                    Visit Website ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Location & Map Card */}
          <div className="card p-6 mb-6">
            <h3 className="section-title text-base mb-3">Location & Directions</h3>
            <div className="location-map-wrapper mb-3 rounded overflow-hidden border border-border" style={{ height: '220px', background: 'var(--bg-surface)' }}>
              <iframe
                title={`Map for ${garage.name}`}
                width="100%"
                height="220"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  garage.latitude && garage.longitude
                    ? `${garage.latitude},${garage.longitude}`
                    : garage.googleMapsUrl && !garage.googleMapsUrl.includes('goo.gl')
                    ? garage.googleMapsUrl
                    : `${garage.name}, ${garage.addressLine1}, ${garage.city}`
                )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
            <div className="flex-between items-center text-xs gap-2 flex-wrap">
              <span className="text-muted font-mono">
                {garage.latitude && garage.longitude
                  ? `📍 ${Number(garage.latitude).toFixed(4)}, ${Number(garage.longitude).toFixed(4)}`
                  : `📍 ${garage.city}`}
              </span>
              <a
                href={
                  garage.googleMapsUrl ||
                  (garage.latitude && garage.longitude
                    ? `https://www.google.com/maps/search/?api=1&query=${garage.latitude},${garage.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${garage.name} ${garage.city}`)}`)
                }
                target="_blank"
                rel="noreferrer noopener"
                className="btn btn-secondary btn-xs"
              >
                Open in Google Maps ↗
              </a>
            </div>
          </div>

          {/* Verification Status Card */}
          <div className="card p-6 bg-surface-raised">
            <h4 className="font-bold text-sm mb-2">MeriGarage Trust Standard</h4>
            <p className="text-xs text-secondary leading-relaxed">
              {garage.isVerified
                ? 'This workshop has been officially verified by MeriGarage. Business registration and trade documents have been inspected.'
                : 'This listing is community-submitted. Verification documents are pending submission by the garage owner.'}
            </p>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={editingReviewId ? 'Edit Your Review' : `Review ${garage.name}`}
      >
        <form onSubmit={handleReviewSubmit}>
          {reviewError && <Alert type="error" message={reviewError} className="mb-4" />}

          <div className="grid grid-2 gap-4 mb-4">
            <div className="form-group mb-0">
              <div className="flex-between items-center mb-1">
                <label className="form-label text-xs mb-0">Service Quality *</label>
                <span className="text-xs font-semibold text-accent">
                  {ratingQuality > 0 ? `${ratingQuality} / 5 stars` : 'Not rated'}
                </span>
              </div>
              <StarRating
                rating={ratingQuality}
                interactive={!reviewSubmitting}
                onChange={setRatingQuality}
                size="md"
              />
            </div>

            <div className="form-group mb-0">
              <div className="flex-between items-center mb-1">
                <label className="form-label text-xs mb-0">Pricing *</label>
                <span className="text-xs font-semibold text-accent">
                  {ratingPricing > 0 ? `${ratingPricing} / 5 stars` : 'Not rated'}
                </span>
              </div>
              <StarRating
                rating={ratingPricing}
                interactive={!reviewSubmitting}
                onChange={setRatingPricing}
                size="md"
              />
            </div>

            <div className="form-group mb-0">
              <div className="flex-between items-center mb-1">
                <label className="form-label text-xs mb-0">Timeline *</label>
                <span className="text-xs font-semibold text-accent">
                  {ratingTimeline > 0 ? `${ratingTimeline} / 5 stars` : 'Not rated'}
                </span>
              </div>
              <StarRating
                rating={ratingTimeline}
                interactive={!reviewSubmitting}
                onChange={setRatingTimeline}
                size="md"
              />
            </div>

            <div className="form-group mb-0">
              <div className="flex-between items-center mb-1">
                <label className="form-label text-xs mb-0">Communication *</label>
                <span className="text-xs font-semibold text-accent">
                  {ratingCommunication > 0 ? `${ratingCommunication} / 5 stars` : 'Not rated'}
                </span>
              </div>
              <StarRating
                rating={ratingCommunication}
                interactive={!reviewSubmitting}
                onChange={setRatingCommunication}
                size="md"
              />
            </div>
          </div>

          <div className="form-group mb-3">
            <label className="form-label" htmlFor="rev-title">
              Review Title
            </label>
            <input
              id="rev-title"
              type="text"
              className="form-control"
              placeholder="e.g. Excellent service and honest pricing"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              disabled={reviewSubmitting}
            />
          </div>

          <div className="form-group mb-6">
            <label className="form-label" htmlFor="rev-text">
              Your Review & Experience *
            </label>
            <textarea
              id="rev-text"
              rows={4}
              required
              className="form-control"
              placeholder="Describe your service experience, mechanic communication, turnaround time, etc. (min 10 characters)"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              disabled={reviewSubmitting}
            />
          </div>

          <div className="modal-actions flex-between">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsReviewModalOpen(false)}
              disabled={reviewSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={reviewSubmitting}>
              {reviewSubmitting ? 'Submitting...' : editingReviewId ? 'Update Review' : 'Post Review'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Claim Modal */}
      <Modal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        title={`Claim Ownership: ${garage.name}`}
      >
        <form onSubmit={handleClaimSubmit}>
          {claimError && <Alert type="error" message={claimError} className="mb-4" />}

          <p className="text-xs text-muted mb-4">
            If you own or manage this auto repair garage, submit your verification message below.
            Include trade license or contact credentials. Our administrative team will audit your claim.
          </p>

          <div className="form-group mb-6">
            <label className="form-label" htmlFor="claim-msg">
              Claim Message & Credentials *
            </label>
            <textarea
              id="claim-msg"
              rows={4}
              required
              className="form-control"
              placeholder="Explain your affiliation with this workshop, trade license number, business contact number, etc. (min 10 characters)"
              value={claimMessage}
              onChange={(e) => setClaimMessage(e.target.value)}
            />
          </div>

          <div className="modal-actions flex-between">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsClaimModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={claimSubmitting}>
              {claimSubmitting ? 'Submitting Claim...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Moderation Reason Modal */}
      <Modal
        isOpen={deletingReviewId !== null}
        onClose={() => setDeletingReviewId(null)}
        title="Moderate & Remove Review"
      >
        <div className="space-y-4">
          <p className="text-xs text-secondary">
            Moderating will soft-delete this review from public display. Please enter an audit reason.
          </p>
          <div className="form-group">
            <label className="form-label">Moderation Reason *</label>
            <textarea
              rows={3}
              required
              className="form-control"
              placeholder="e.g. Contains profanity, fraudulent review, duplicate submission"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
          </div>
          <div className="modal-actions flex-between">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeletingReviewId(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              disabled={deleteSubmitting || !deleteReason.trim()}
              onClick={handleDeleteReview}
            >
              {deleteSubmitting ? 'Removing...' : 'Confirm Moderation'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
