import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useConfirm, useAuthRequired, useToast } from '../context/NotificationContext';
import type {
  GarageDetailDto,
  ReviewDto,
  PagedResponse,
  CreateReviewRequest,
  DocumentType,
} from '../api/types';
import { StarRating } from '../components/StarRating';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { QuoteRequestModal } from '../components/QuoteRequestModal';
import { AuthRequiredWarning } from '../components/AuthRequiredWarning';
import { GarageReviewPosterModal } from '../components/GarageReviewPosterModal';
import { UserAvatar } from '../components/UserAvatar';
import { consumePendingAction } from '../utils/pendingActionStorage';
import { safeTrackLeadEvent, getActiveSearchSession } from '../utils/searchSession';

export const GarageDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated, hasRole, hasPermission } = useAuth();
  const location = useLocation();
  const confirm = useConfirm();
  const requestAuth = useAuthRequired();
  const { showSuccess, showError, showWarning } = useToast();

  const [garage, setGarage] = useState<GarageDetailDto | null>(null);
  const [reviewsData, setReviewsData] = useState<PagedResponse<ReviewDto> | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [reviewPage, setReviewPage] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quote Request Modal State
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteInitialState, setQuoteInitialState] = useState<Record<string, any> | undefined>(undefined);

  // Review Poster Modal State
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAuthWarning, setReviewAuthWarning] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [ratingQuality, setRatingQuality] = useState(0);
  const [ratingPricing, setRatingPricing] = useState(0);
  const [ratingTimeline, setRatingTimeline] = useState(0);
  const [ratingCommunication, setRatingCommunication] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [ratingErrors, setRatingErrors] = useState<{
    quality?: string;
    pricing?: string;
    timeline?: string;
    communication?: string;
    text?: string;
  }>({});

  // Claim Modal State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimAuthWarning, setClaimAuthWarning] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimantName, setClaimantName] = useState('');
  const [claimantPhone, setClaimantPhone] = useState('');
  const [claimantEmail, setClaimantEmail] = useState('');
  const [businessRegNumber, setBusinessRegNumber] = useState('');
  const [claimDocType, setClaimDocType] = useState<DocumentType>('OWNERSHIP_PROOF');
  const [claimFile, setClaimFile] = useState<File | null>(null);
  const [claimSubmitting, setClaimSubmitting] = useState(false);

  // Owner Response State
  const [respondingReviewId, setRespondingReviewId] = useState<number | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseSubmitting, setResponseSubmitting] = useState(false);

  // Moderator Delete State
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Workshop Owner Report Review State
  const [reportingReview, setReportingReview] = useState<ReviewDto | null>(null);
  const [reportReason, setReportReason] = useState<string>('OFFENSIVE_CONTENT');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Fetch Garage Details
  const fetchGarage = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.garages.getBySlug(slug);
      setGarage(data);
      if (data) {
        const session = getActiveSearchSession();
        safeTrackLeadEvent('GARAGE_PROFILE_VIEWED', {
          garageId: data.id,
          garageSlug: data.slug,
          city: data.city,
          state: data.state,
          serviceSlug: session?.serviceSlug,
          serviceName: session?.serviceName,
          vehicleType: session?.vehicleType,
          vehicleMake: session?.vehicleMake,
          vehicleModel: session?.vehicleModel,
          source: 'garage_profile',
          metadata: { garageName: data.name },
        });
      }
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
      const res = await api.reviews.getForGarage(garageId, {
        page,
        size: 5,
        sortBy: 'createdAt',
        sortDir: 'desc',
      });
      setReviewsData(res);
    } catch (err: any) {
      showError(err.message || 'Failed to load reviews');
    } finally {
      setReviewsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchGarage();
  }, [fetchGarage]);

  useEffect(() => {
    if (garage) {
      fetchReviews(garage.id, reviewPage);
    }
  }, [garage, reviewPage, fetchReviews]);

  // Auto-open review modal if directed via QR code or direct review action link (?action=review)
  useEffect(() => {
    if (garage) {
      const sp = new URLSearchParams(location.search);
      if (
        sp.get('action') === 'review' ||
        sp.get('review') === 'true' ||
        location.hash === '#review'
      ) {
        setIsReviewModalOpen(true);
      }
    }
  }, [garage, location.search, location.hash]);

  // Check for restored protected action after returning from login
  useEffect(() => {
    const restored =
      (location.state?.restoredAction as any) ||
      consumePendingAction(window.location.pathname);

    if (!restored) return;

    if (restored.actionType === 'QUOTE_REQUEST') {
      if (restored.formState) {
        setQuoteInitialState(restored.formState);
      }
      setIsQuoteModalOpen(true);
    } else if (
      restored.actionType === 'WRITE_REVIEW' ||
      restored.actionType === 'EDIT_REVIEW'
    ) {
      if (restored.formState) {
        const fs = restored.formState;
        if (fs.ratingQuality) setRatingQuality(fs.ratingQuality);
        if (fs.ratingPricing) setRatingPricing(fs.ratingPricing);
        if (fs.ratingTimeline) setRatingTimeline(fs.ratingTimeline);
        if (fs.ratingCommunication) setRatingCommunication(fs.ratingCommunication);
        if (fs.reviewTitle) setReviewTitle(fs.reviewTitle);
        if (fs.reviewText) setReviewText(fs.reviewText);
        if (fs.editingReviewId) setEditingReviewId(fs.editingReviewId);
      }
      setIsReviewModalOpen(true);
    } else if (restored.actionType === 'CLAIM_GARAGE') {
      if (restored.formState) {
        const fs = restored.formState;
        if (fs.claimantName) setClaimantName(fs.claimantName);
        if (fs.claimantPhone) setClaimantPhone(fs.claimantPhone);
        if (fs.claimantEmail) setClaimantEmail(fs.claimantEmail);
        if (fs.businessRegNumber) setBusinessRegNumber(fs.businessRegNumber);
        if (fs.claimDocType) setClaimDocType(fs.claimDocType);
        if (fs.claimMessage) setClaimMessage(fs.claimMessage);
      }
      setIsClaimModalOpen(true);
    }
  }, [location.state]);

  // Open Write / Edit Review Modal
  const handleOpenReviewModal = (existing?: ReviewDto) => {
    setReviewAuthWarning(false);
    if (existing) {
      setEditingReviewId(existing.id);
      setRatingQuality(existing.ratingServiceQuality ?? existing.serviceQuality ?? 0);
      setRatingPricing(existing.ratingPricing ?? existing.pricing ?? 0);
      setRatingTimeline(existing.ratingTimeline ?? existing.timeline ?? 0);
      setRatingCommunication(existing.ratingCommunication ?? existing.communication ?? 0);
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
    setRatingErrors({});
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garage || reviewSubmitting) return;

    if (!isAuthenticated) {
      setReviewAuthWarning(true);
      requestAuth({
        title: 'Sign In Required',
        message: editingReviewId
          ? 'You must be signed in before editing a review.'
          : 'You must be signed in before writing a review.',
        portal: 'customer',
        actionType: editingReviewId ? 'EDIT_REVIEW' : 'WRITE_REVIEW',
        returnUrl: window.location.pathname + window.location.search,
        formState: {
          ratingQuality,
          ratingPricing,
          ratingTimeline,
          ratingCommunication,
          reviewTitle,
          reviewText,
          editingReviewId,
        },
      });
      return;
    }

    const errors: {
      quality?: string;
      pricing?: string;
      timeline?: string;
      communication?: string;
      text?: string;
    } = {};

    if (!ratingQuality || ratingQuality < 1 || ratingQuality > 5) {
      errors.quality = 'Please select a rating for Service Quality (1 to 5 stars).';
    }
    if (!ratingPricing || ratingPricing < 1 || ratingPricing > 5) {
      errors.pricing = 'Please select a rating for Pricing & Transparency (1 to 5 stars).';
    }
    if (!ratingTimeline || ratingTimeline < 1 || ratingTimeline > 5) {
      errors.timeline = 'Please select a rating for Delivery Timeline (1 to 5 stars).';
    }
    if (!ratingCommunication || ratingCommunication < 1 || ratingCommunication > 5) {
      errors.communication = 'Please select a rating for Communication (1 to 5 stars).';
    }
    if (!reviewText.trim()) {
      errors.text = 'Please enter your detailed experience feedback.';
    }

    if (Object.keys(errors).length > 0) {
      setRatingErrors(errors);
      showWarning('Please complete all 4 required rating categories and write your review feedback.');
      return;
    }

    try {
      setReviewSubmitting(true);
      setRatingErrors({});

      const payload: CreateReviewRequest = {
        ratingServiceQuality: ratingQuality,
        ratingPricing: ratingPricing,
        ratingTimeline: ratingTimeline,
        ratingCommunication: ratingCommunication,
        serviceQuality: ratingQuality,
        pricing: ratingPricing,
        timeline: ratingTimeline,
        communication: ratingCommunication,
        reviewTitle: reviewTitle.trim() || undefined,
        reviewText: reviewText.trim(),
      };

      if (editingReviewId) {
        await api.reviews.update(editingReviewId, payload);
        showSuccess('Your review was updated successfully.');
      } else {
        await api.reviews.create(garage.id, payload);
        showSuccess('Thank you! Your review has been submitted.');
      }

      setIsReviewModalOpen(false);
      setReviewPage(0);
      fetchReviews(garage.id, 0);
      fetchGarage();
    } catch (err: any) {
      const msg = err.message || 'Failed to submit review. You may have already reviewed this workshop.';
      showError(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Open Claim Modal
  const handleOpenClaimModal = () => {
    setClaimAuthWarning(false);
    setClaimMessage('');
    setClaimantName(user?.fullName || '');
    setClaimantEmail(user?.email || '');
    setClaimantPhone(user?.phoneNumber || '');
    setBusinessRegNumber('');
    setClaimDocType('OWNERSHIP_PROOF');
    setClaimFile(null);
    setIsClaimModalOpen(true);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garage || claimSubmitting) return;

    if (!isAuthenticated) {
      setClaimAuthWarning(true);
      requestAuth({
        title: 'Sign In Required',
        message: 'You must be signed in before submitting this claim.',
        portal: 'garage',
        actionType: 'CLAIM_GARAGE',
        returnUrl: window.location.pathname + window.location.search,
        formState: {
          claimantName,
          claimantPhone,
          claimantEmail,
          businessRegNumber,
          claimDocType,
          claimMessage,
        },
      });
      return;
    }

    if (!claimMessage.trim()) {
      showWarning('Please provide an ownership statement explaining your legal or operational relationship to this workshop.');
      return;
    }
    if (!claimFile) {
      showWarning('Please select and upload a verification document (e.g. Ownership Deed, Electricity/Utility Bill, Trade License, or GST Certificate).');
      return;
    }
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const fileName = claimFile.name.toLowerCase();
    const isAllowedExt = allowedExtensions.some((ext) => fileName.endsWith(ext));
    if (!isAllowedExt) {
      showError('Invalid file type. Only PDF, JPEG, and PNG documents are accepted for ownership verification.');
      return;
    }
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (claimFile.size > MAX_SIZE) {
      showError('File exceeds the maximum allowed size of 10 MB. Please upload a smaller document.');
      return;
    }

    try {
      setClaimSubmitting(true);
      await api.claims.submit(garage.id, {
        claimMessage: claimMessage.trim(),
        claimantName: claimantName.trim() || undefined,
        claimantPhone: claimantPhone.trim() || undefined,
        claimantEmail: claimantEmail.trim() || undefined,
        businessRegNumber: businessRegNumber.trim() || undefined,
        documentTypes: [claimDocType],
        documents: [claimFile],
      });
      setIsClaimModalOpen(false);
      showSuccess('Your ownership claim and verification document have been submitted to administrators for verification.');
    } catch (err: any) {
      const msg = err.message || 'Failed to submit ownership claim.';
      showError(msg);
    } finally {
      setClaimSubmitting(false);
    }
  };

  // Owner Response Submit
  const handleResponseSubmit = async (reviewId: number) => {
    if (!responseText.trim() || responseSubmitting) return;
    try {
      setResponseSubmitting(true);
      await api.reviews.respond(reviewId, responseText.trim());
      setRespondingReviewId(null);
      setResponseText('');
      showSuccess('Your response to the customer has been posted.');
      if (garage) fetchReviews(garage.id, reviewPage);
    } catch (err: any) {
      const msg = err.message || 'Failed to post response.';
      showError(msg);
    } finally {
      setResponseSubmitting(false);
    }
  };

  // Moderator Delete Review
  const handleDeleteReview = async () => {
    if (!deletingReviewId || deleteSubmitting) return;
    const confirmed = await confirm({
      title: 'Moderate and Delete Review?',
      message: 'Are you sure you want to delete this customer review? It will be permanently removed from the public workshop page and logged in the moderation audit trail.',
      confirmText: 'Delete Review',
      variant: 'danger',
      icon: 'gavel',
    });
    if (!confirmed) return;

    try {
      setDeleteSubmitting(true);
      await api.admin.softDeleteReview(deletingReviewId, deleteReason.trim() || 'Moderated by admin');
      setDeletingReviewId(null);
      setDeleteReason('');
      showSuccess('Review moderated and deleted.');
      if (garage) fetchReviews(garage.id, reviewPage);
    } catch (err: any) {
      const msg = err.message || 'Failed to delete review.';
      showError(msg);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Workshop Owner Report Review Submit
  const handleOpenReportModal = (rev: ReviewDto) => {
    setReportingReview(rev);
    setReportReason('OFFENSIVE_CONTENT');
    setReportDetails('');
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingReview || !garage || reportSubmitting) return;
    try {
      setReportSubmitting(true);
      await api.reviews.report(garage.id, reportingReview.id, {
        reportReason,
        details: reportDetails.trim() || undefined,
      });
      setReportingReview(null);
      showSuccess('Your review report has been submitted to platform administrators for investigation.');
    } catch (err: any) {
      const msg = err.message || 'Failed to submit review report.';
      showError(msg);
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-16 text-center">
        <div className="center-loader">
          <div className="spinner"></div>
          <p className="text-muted mt-3 text-sm">Loading workshop profile...</p>
        </div>
      </div>
    );
  }

  if (error || !garage) {
    return (
      <div className="container py-16 text-center">
        <div className="card p-12 max-w-lg mx-auto">
          <span className="material-symbols-outlined text-4xl text-primary mb-3">error</span>
          <h2 className="text-xl font-bold mb-2">Workshop Not Found</h2>
          <p className="text-secondary text-sm mb-6">
            {error || 'The requested workshop profile does not exist.'}
          </p>
          <Link to="/garages" className="btn btn-primary">
            Return to Garages
          </Link>
        </div>
      </div>
    );
  }

  const isOwner =
    user &&
    (garage.ownerId === user.id ||
      hasRole('ROLE_GARAGE_OWNER') ||
      hasRole('ROLE_ADMIN'));
  const canModerate =
    hasRole('ROLE_ADMIN') || hasPermission('CONTENT_MODERATION');

  const photos = garage.photos || [];
  const currentPhoto = photos.length > 0 ? photos[activePhotoIdx] || photos[0] : null;

  // Clean phone number for WhatsApp & Tel
  const cleanPhone = garage.phoneNumber ? garage.phoneNumber.replace(/[^\d]/g, '') : '';
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  // Compute category rating averages from reviews data
  const overallAvg =
    reviewsData && reviewsData.content.length > 0
      ? (
          reviewsData.content.reduce((acc, r) => acc + (r.overallRating || 0), 0) /
          reviewsData.content.length
        ).toFixed(1)
      : null;

  return (
    <div className="container py-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-muted mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link>
        <span>&gt;</span>
        <Link to="/garages" className="hover:text-primary transition-colors">Garages</Link>
        <span>&gt;</span>
        <span className="text-white font-semibold">{garage.name}</span>
      </nav>

      {/* Hero Workshop Banner (Stitch autocare_motors_profile_redesign) */}
      <div className="card p-8 mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl lg:text-4xl font-extrabold text-white">{garage.name}</h1>
              {garage.isVerified && (
                <span className="badge badge-verified">
                  <span className="material-symbols-outlined text-xs">verified</span> Verified Workshop
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 flex-wrap text-sm text-secondary">
              {overallAvg && (
                <span className="flex items-center gap-1 font-bold text-white">
                  <span className="material-symbols-outlined text-primary text-base">star</span>
                  <span>{overallAvg}</span>
                  <span className="text-muted font-normal">({reviewsData?.totalElements || 0} reviews)</span>
                </span>
              )}
              <span>📍 {garage.addressLine1}, {garage.city}, {garage.state} {garage.postalCode}</span>
            </div>

            {garage.description && (
              <p className="text-secondary text-sm max-w-3xl leading-relaxed mt-2">
                {garage.description}
              </p>
            )}
          </div>

          {/* Action Button Strip */}
          <div className="flex gap-3 flex-wrap items-center mt-3 lg:mt-0">
            {/* Get a Quote Action */}
            <button
              type="button"
              className="btn btn-primary inline-flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
              onClick={() => setIsQuoteModalOpen(true)}
              id="get-a-quote-btn"
            >
              <span className="material-symbols-outlined text-base">request_quote</span>
              Get a Quote
            </button>

            {garage.phoneNumber && (
              <a
                href={`tel:${garage.phoneNumber}`}
                className="btn btn-secondary inline-flex items-center gap-2"
                id="call-workshop-btn"
              >
                <span className="material-symbols-outlined text-base">call</span>
                Call Workshop
              </a>
            )}

            {cleanPhone && (
              <a
                href={`https://wa.me/${waPhone}`}
                target="_blank"
                rel="noreferrer noopener"
                className="btn btn-secondary inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
                id="whatsapp-inquiry-btn"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                WhatsApp
              </a>
            )}

            <button
              type="button"
              className="btn btn-secondary inline-flex items-center gap-2 cursor-pointer"
              onClick={() => handleOpenReviewModal()}
              id="write-review-btn"
            >
              <span className="material-symbols-outlined text-base">rate_review</span>
              Write Review
            </button>

            <button
              type="button"
              className="btn btn-secondary inline-flex items-center gap-2 cursor-pointer"
              onClick={() => setIsPosterModalOpen(true)}
              title="Generate or print official QR Review Poster for this workshop"
              id="get-poster-btn"
            >
              <span className="material-symbols-outlined text-base">qr_code_2</span>
              QR Poster
            </button>

            {!garage.hasOwner ? (
              <button
                type="button"
                className="btn btn-outline inline-flex items-center gap-2 cursor-pointer"
                onClick={handleOpenClaimModal}
                title="Are you the owner of this workshop? Claim ownership."
                id="claim-listing-btn"
              >
                Claim Listing
              </button>
            ) : (
              <span className="badge badge-success inline-flex items-center gap-1 text-xs py-2 px-3 font-semibold" title="This workshop has an audited owner">
                ✓ Claimed Listing
              </span>
            )}

            {((user && garage.ownerId && user.id === garage.ownerId) ||
              (isOwner && (!garage.hasOwner || user?.id === garage.ownerId))) && (
              <Link to={`/owner?slug=${garage.slug}`} className="btn btn-outline inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-base">settings</span>
                Manage Hub
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Gallery, Catalogue, Reviews (Left 2 cols) vs Sidebar (Right 1 col) */}
      <div className="grid grid-3 gap-8">
        {/* Left Column: Media Gallery, Services, Reviews */}
        <div className="col-span-2 space-y-8">
          {/* Photo Gallery */}
          <div className="card p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>Workshop Gallery & Facilities</span>
              <span className="text-xs text-muted font-normal">{photos.length} photos</span>
            </h3>

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
                    <span className="badge badge-verified cover-badge">
                      <span className="material-symbols-outlined text-xs">star</span> Cover Photo
                    </span>
                  )}
                </div>

                {photos.length > 1 && (
                  <div className="thumbnail-strip">
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
                <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">add_a_photo</span>
                <p>No photos uploaded for this workshop yet.</p>
              </div>
            )}
          </div>

          {/* Active Services Catalogue & Pricing */}
          <div className="card p-6">
            <div className="flex-between items-center mb-4 flex-wrap gap-2">
              <div>
                <h3 className="text-lg font-bold text-white">Services & Starting Estimates</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Itemized pricing and service availability verified with this workshop.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-secondary text-xs">
                  {garage.services?.length || 0} Listed Services
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-xs inline-flex items-center gap-1 cursor-pointer"
                  onClick={() => setIsQuoteModalOpen(true)}
                >
                  <span className="material-symbols-outlined text-xs">request_quote</span>
                  Get a Quote
                </button>
              </div>
            </div>

            {garage.services && garage.services.length > 0 ? (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Service Name</th>
                      <th>Category</th>
                      <th>Starting Price</th>
                      <th>Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {garage.services.map((gs) => (
                      <tr key={gs.serviceId}>
                        <td className="font-bold text-white">{gs.serviceName}</td>
                        <td className="text-muted text-xs">
                          {gs.category?.replace(/_/g, ' ') || 'Service'}
                        </td>
                        <td className="font-mono text-primary font-bold">
                          {gs.startingPrice
                            ? `₹${gs.startingPrice.toLocaleString('en-IN')}`
                            : 'Quote on Spec'}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              gs.isAvailable ? 'badge-success' : 'badge-danger'
                            }`}
                          >
                            {gs.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-secondary">
                No specific services registered yet. Contact the workshop directly for a custom inspection quote.
              </p>
            )}
          </div>

          {/* Customer Reviews & Detailed Ratings Section */}
          <div className="card p-6" id="reviews-section">
            <div className="flex-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Customer Reviews</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Audited customer ratings from verified vehicle owners
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenReviewModal()}
              >
                + Write a Review
              </button>
            </div>

            {reviewsLoading && !reviewsData && (
              <div className="center-loader py-8">
                <div className="spinner"></div>
                <p className="text-muted mt-2 text-sm">Loading reviews...</p>
              </div>
            )}

            {reviewsData && reviewsData.content.length > 0 ? (
              <div className="space-y-6">
                {reviewsData.content.map((rev) => (
                  <article
                    key={rev.id}
                    className="card p-5 bg-surface-raised border border-border"
                  >
                    <div className="flex-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="review-avatar-ring">
                          <UserAvatar
                            photoUrl={
                              rev.authorProfilePhotoUrl ||
                              (user && (user.id === rev.authorUserId || user.fullName === rev.authorFullName) ? user.profilePhotoUrl : undefined) ||
                              (rev.authorUserId ? `/api/users/${rev.authorUserId}/photo` : undefined)
                            }
                            name={rev.authorFullName}
                            size="md"
                            showBorder={false}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{rev.authorFullName}</span>
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
                      </div>

                      <div className="flex gap-2">
                        {user &&
                          (user.id === rev.authorUserId ||
                            user.fullName === rev.authorFullName) && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => handleOpenReviewModal(rev)}
                            >
                              ✏️ Edit
                            </button>
                          )}
                        {isOwner && user && user.id !== rev.authorUserId && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs text-warning hover:text-white"
                            onClick={() => handleOpenReportModal(rev)}
                            title="Report this review for policy violation"
                          >
                            🚩 Report
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

                    {/* 4 Multi-criteria Ratings Pill Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-secondary bg-elevated p-3 rounded-xl mb-3 border border-border">
                      <div>
                        Quality: <strong className="text-white">{rev.ratingServiceQuality ?? rev.serviceQuality ?? '—'}/5</strong>
                      </div>
                      <div>
                        Pricing: <strong className="text-white">{rev.ratingPricing ?? rev.pricing ?? '—'}/5</strong>
                      </div>
                      <div>
                        Timeline: <strong className="text-white">{rev.ratingTimeline ?? rev.timeline ?? '—'}/5</strong>
                      </div>
                      <div>
                        Communication: <strong className="text-white">{rev.ratingCommunication ?? rev.communication ?? '—'}/5</strong>
                      </div>
                    </div>

                    {rev.reviewTitle && (
                      <h4 className="font-bold text-sm text-white mb-1.5">{rev.reviewTitle}</h4>
                    )}
                    <p className="text-sm text-secondary leading-relaxed mb-3">{rev.reviewText}</p>

                    {/* Owner Public Response */}
                    {rev.response ? (
                      <div className="p-3.5 mt-3 border-l-2 border-primary bg-card rounded-r-xl">
                        <div className="flex-between items-center mb-1">
                          <span className="font-bold text-xs text-primary flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">storefront</span>
                            Workshop Owner Response
                          </span>
                          <span className="text-xs text-muted">
                            {new Date(rev.response.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <p className="text-xs text-secondary leading-relaxed">
                          {rev.response.responseText}
                        </p>
                      </div>
                    ) : isOwner ? (
                      <div className="mt-3">
                        {respondingReviewId === rev.id ? (
                          <div className="p-3 bg-card rounded-xl border border-border">
                            <label className="form-label text-xs">
                              Public Response to Motorist
                            </label>
                            <textarea
                              className="form-control text-xs mb-2"
                              rows={3}
                              placeholder="Thank the customer or address their concern constructively..."
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="btn btn-primary btn-xs"
                                disabled={responseSubmitting}
                                onClick={() => handleResponseSubmit(rev.id)}
                              >
                                {responseSubmitting ? 'Posting...' : 'Post Response'}
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
                            }}
                          >
                            💬 Respond to this review
                          </button>
                        )}
                      </div>
                    ) : null}
                  </article>
                ))}

                <Pagination
                  page={reviewsData.page}
                  totalPages={reviewsData.totalPages}
                  totalElements={reviewsData.totalElements}
                  onPageChange={(p) => setReviewPage(p)}
                />
              </div>
            ) : (
              <div className="empty-state p-8 text-center text-muted">
                <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">rate_review</span>
                <p className="text-sm">No reviews yet. Be the first customer to share your experience!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Contact, Live Map, Trust Standard */}
        <div className="space-y-6">
          {/* Workshop Contact Details Card */}
          <div className="card p-6">
            <h3 className="text-base font-bold text-white mb-4 pb-2 border-b border-border">
              Workshop Contact & Info
            </h3>

            <div className="space-y-3.5 text-sm">
              <div>
                <span className="text-muted block text-xs mb-0.5">Physical Address</span>
                <span className="font-semibold text-white">
                  {garage.addressLine1}
                  {garage.addressLine2 && `, ${garage.addressLine2}`}
                  <br />
                  {garage.city}, {garage.state} {garage.postalCode}
                </span>
              </div>

              {garage.phoneNumber && (
                <div>
                  <span className="text-muted block text-xs mb-0.5">Phone Number</span>
                  <a href={`tel:${garage.phoneNumber}`} className="text-primary font-mono font-bold">
                    📞 {garage.phoneNumber}
                  </a>
                </div>
              )}

              {cleanPhone && (
                <div>
                  <span className="text-muted block text-xs mb-0.5">WhatsApp Inquiry</span>
                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-emerald-400 font-mono font-bold text-xs hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">chat</span>
                    Direct Message
                  </a>
                </div>
              )}

              {garage.email && (
                <div>
                  <span className="text-muted block text-xs mb-0.5">Business Email</span>
                  <a href={`mailto:${garage.email}`} className="text-primary font-mono text-xs">
                    ✉️ {garage.email}
                  </a>
                </div>
              )}

              {garage.websiteUrl && (
                <div>
                  <span className="text-muted block text-xs mb-0.5">Official Website</span>
                  <a
                    href={
                      garage.websiteUrl.startsWith('http')
                        ? garage.websiteUrl
                        : `https://${garage.websiteUrl}`
                    }
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-primary text-xs underline"
                  >
                    {garage.websiteUrl} ↗
                  </a>
                </div>
              )}

              {/* Sidebar Quick Quote Action */}
              <div className="pt-3 border-t border-border mt-3">
                <button
                  type="button"
                  className="btn btn-primary w-full inline-flex items-center justify-center gap-2 text-xs py-2.5 cursor-pointer shadow-sm hover:shadow-md"
                  onClick={() => setIsQuoteModalOpen(true)}
                  id="sidebar-get-quote-btn"
                >
                  <span className="material-symbols-outlined text-sm">request_quote</span>
                  Request an Online Quote
                </button>
              </div>
            </div>
          </div>

          {/* Location & Directions Card */}
          <div className="card p-6">
            <h3 className="text-base font-bold text-white mb-3">Location & Directions</h3>
            <div
              className="location-map-wrapper mb-3 rounded-xl overflow-hidden border border-border"
              style={{ height: '220px', background: 'var(--bg-elevated)' }}
            >
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
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${garage.name} ${garage.city}`
                      )}`)
                }
                target="_blank"
                rel="noreferrer noopener"
                className="btn btn-secondary btn-xs"
              >
                Open in Google Maps ↗
              </a>
            </div>
          </div>

          {/* Trust Guarantee Standard */}
          <div className="card p-6 bg-surface-raised">
            <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
              <span className="material-symbols-outlined text-primary text-lg">verified_user</span>
              MeriGarage Verified Shield
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              {garage.isVerified
                ? 'This workshop has been officially verified by MeriGarage. Business registration and trade documents have been audited.'
                : 'This listing is community-submitted. Official trade verification documents are pending submission by the garage owner.'}
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
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-elevated border border-border">
              <div className="review-avatar-ring" style={{ width: '38px', height: '38px' }}>
                <UserAvatar
                  photoUrl={user.profilePhotoUrl || (user.id ? `/api/users/${user.id}/photo` : undefined)}
                  name={user.fullName}
                  size="sm"
                  showBorder={false}
                />
              </div>
              <div className="text-xs">
                <span className="text-muted block text-2xs">{editingReviewId ? 'Editing review as' : 'Writing review as'}</span>
                <span className="font-bold text-white">{user.fullName || user.email}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-secondary">
            Rate your experience across all 4 automotive care pillars:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-elevated p-4 rounded-xl border border-border">
            <div>
              <div className="flex-between items-center mb-1">
                <label className="form-label text-xs mb-0">Service Quality *</label>
                <span className="text-[11px] text-muted">{ratingQuality > 0 ? `${ratingQuality}/5` : 'Required'}</span>
              </div>
              <StarRating
                rating={ratingQuality}
                interactive={true}
                onChange={(v) => {
                  setRatingQuality(v);
                  setRatingErrors((prev) => ({ ...prev, quality: undefined }));
                }}
                size="md"
              />
              {ratingErrors.quality && (
                <p className="text-danger text-xs mt-1">{ratingErrors.quality}</p>
              )}
            </div>

            <div>
              <div className="flex-between items-center mb-1">
                <label className="form-label text-xs mb-0">Pricing & Transparency *</label>
                <span className="text-[11px] text-muted">{ratingPricing > 0 ? `${ratingPricing}/5` : 'Required'}</span>
              </div>
              <StarRating
                rating={ratingPricing}
                interactive={true}
                onChange={(v) => {
                  setRatingPricing(v);
                  setRatingErrors((prev) => ({ ...prev, pricing: undefined }));
                }}
                size="md"
              />
              {ratingErrors.pricing && (
                <p className="text-danger text-xs mt-1">{ratingErrors.pricing}</p>
              )}
            </div>

            <div>
              <div className="flex-between items-center mb-1">
                <label className="form-label text-xs mb-0">Delivery Timeline *</label>
                <span className="text-[11px] text-muted">{ratingTimeline > 0 ? `${ratingTimeline}/5` : 'Required'}</span>
              </div>
              <StarRating
                rating={ratingTimeline}
                interactive={true}
                onChange={(v) => {
                  setRatingTimeline(v);
                  setRatingErrors((prev) => ({ ...prev, timeline: undefined }));
                }}
                size="md"
              />
              {ratingErrors.timeline && (
                <p className="text-danger text-xs mt-1">{ratingErrors.timeline}</p>
              )}
            </div>

            <div>
              <div className="flex-between items-center mb-1">
                <label className="form-label text-xs mb-0">Communication *</label>
                <span className="text-[11px] text-muted">{ratingCommunication > 0 ? `${ratingCommunication}/5` : 'Required'}</span>
              </div>
              <StarRating
                rating={ratingCommunication}
                interactive={true}
                onChange={(v) => {
                  setRatingCommunication(v);
                  setRatingErrors((prev) => ({ ...prev, communication: undefined }));
                }}
                size="md"
              />
              {ratingErrors.communication && (
                <p className="text-danger text-xs mt-1">{ratingErrors.communication}</p>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rev-title">
              Review Headline (Optional)
            </label>
            <input
              id="rev-title"
              type="text"
              placeholder="e.g. Excellent AC repair and fair billing"
              className="form-control"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rev-text">
              Detailed Experience *
            </label>
            <textarea
              id="rev-text"
              rows={4}
              required
              placeholder="Describe the diagnosis, parts replaced, cleanliness of workshop, and overall professionalism..."
              className="form-control"
              value={reviewText}
              onChange={(e) => {
                setReviewText(e.target.value);
                setRatingErrors((prev) => ({ ...prev, text: undefined }));
              }}
            />
            {ratingErrors.text && (
              <p className="text-danger text-xs mt-1">{ratingErrors.text}</p>
            )}
          </div>

          {/* Inline Auth Warning when unauthenticated visitor attempts review submission */}
          {reviewAuthWarning && !isAuthenticated && (
            <div className="pt-1">
              <AuthRequiredWarning
                message={
                  editingReviewId
                    ? 'You must be signed in before editing a review.'
                    : 'You must be signed in before writing a review.'
                }
                portal="customer"
                actionType={editingReviewId ? 'EDIT_REVIEW' : 'WRITE_REVIEW'}
                returnUrl={window.location.pathname + window.location.search}
                formState={{
                  ratingQuality,
                  ratingPricing,
                  ratingTimeline,
                  ratingCommunication,
                  reviewTitle,
                  reviewText,
                  editingReviewId,
                }}
              />
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsReviewModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={reviewSubmitting}
            >
              {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Claim Workshop Modal */}
      <Modal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        title={`Claim Ownership: ${garage.name}`}
      >
        <form onSubmit={handleClaimSubmit} className="space-y-4">

          <div className="bg-elevated p-3 rounded-lg border border-border text-xs text-secondary leading-relaxed">
            <strong className="text-white block mb-1">Ownership Verification Process</strong>
            Submitting a claim requires verifiable proof of business authorization. MeriGarage administrators inspect all business documents before transferring workshop ownership. Proof files remain strictly private and will never be shared publicly.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label" htmlFor="claimant-name">
                Claimant Name *
              </label>
              <input
                id="claimant-name"
                type="text"
                required
                placeholder="Full Legal Name"
                className="form-control"
                value={claimantName}
                onChange={(e) => setClaimantName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="claimant-phone">
                Contact Phone Number *
              </label>
              <input
                id="claimant-phone"
                type="tel"
                required
                placeholder="+91 98765 43210"
                className="form-control"
                value={claimantPhone}
                onChange={(e) => setClaimantPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label" htmlFor="claimant-email">
                Claimant Account Email
              </label>
              <input
                id="claimant-email"
                type="email"
                readOnly
                className="form-control opacity-70 cursor-not-allowed"
                value={claimantEmail}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="business-reg">
                Trade / Registration No. (Optional)
              </label>
              <input
                id="business-reg"
                type="text"
                placeholder="GSTIN, Shop Act, or Udyam Reg #"
                className="form-control"
                value={businessRegNumber}
                onChange={(e) => setBusinessRegNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label" htmlFor="claim-doc-type">
                Document Type *
              </label>
              <select
                id="claim-doc-type"
                className="form-control"
                value={claimDocType}
                onChange={(e) => setClaimDocType(e.target.value as DocumentType)}
              >
                <option value="OWNERSHIP_PROOF">Proof of Ownership / Lease / Utility Bill</option>
                <option value="TRADE_LICENSE">Trade / Municipal License</option>
                <option value="GST_CERTIFICATE">GST Registration Certificate</option>
                <option value="ID_PROOF">Authorized Signatory Government ID</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="claim-doc-file">
                Upload Verification Document *
              </label>
              <input
                id="claim-doc-file"
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg"
                className="form-control file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-surface file:text-white"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    setClaimFile(files[0]);
                  } else {
                    setClaimFile(null);
                  }
                }}
              />
              <span className="text-2xs text-muted mt-1 block">
                Allowed formats: PDF, JPEG, PNG (Max 10 MB).
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="claim-msg">
              Ownership Statement & Authorisation Rationale *
            </label>
            <textarea
              id="claim-msg"
              rows={4}
              required
              placeholder="State your role (e.g. Managing Partner, Proprietor) and explain your relationship to this workshop."
              className="form-control"
              value={claimMessage}
              onChange={(e) => setClaimMessage(e.target.value)}
            />
          </div>

          {/* Inline Auth Warning when unauthenticated visitor attempts claim submission */}
          {claimAuthWarning && !isAuthenticated && (
            <div className="pt-1">
              <AuthRequiredWarning
                message="You must be signed in before submitting a garage claim."
                portal="garage"
                actionType="CLAIM_GARAGE"
                returnUrl={window.location.pathname + window.location.search}
                formState={{
                  claimantName,
                  claimantPhone,
                  claimantEmail,
                  businessRegNumber,
                  claimDocType,
                  claimMessage,
                }}
              />
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsClaimModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={claimSubmitting}
            >
              {claimSubmitting ? 'Submitting Claim...' : 'Submit Claim & Documents'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Moderator Delete Review Confirmation Modal */}
      <Modal
        isOpen={deletingReviewId !== null}
        onClose={() => setDeletingReviewId(null)}
        title="Moderate & Delete Review"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Are you sure you want to delete this review? This action cannot be undone.
          </p>
          <div className="form-group">
            <label className="form-label" htmlFor="delete-reason">
              Moderation Reason (Optional)
            </label>
            <input
              id="delete-reason"
              type="text"
              placeholder="e.g. Inappropriate language, spam, or verified false claim"
              className="form-control"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
          </div>

          <div className="modal-actions">
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
              disabled={deleteSubmitting}
              onClick={handleDeleteReview}
            >
              {deleteSubmitting ? 'Deleting...' : 'Delete Review'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Workshop Owner Report Review Modal */}
      <Modal
        isOpen={!!reportingReview}
        onClose={() => setReportingReview(null)}
        title="Report Customer Review"
      >
        {reportingReview && (
          <form onSubmit={handleReportSubmit} className="space-y-4 text-xs">
            <p className="text-secondary leading-relaxed">
              If you believe this review violates MeriGarage content policies (e.g. offensive language, fake or competitor posting, or extortion), report it to the platform administration for moderation.
            </p>

            <div className="p-3 bg-secondary/10 rounded-xl border border-border/20">
              <span className="text-2xs text-muted block mb-0.5">
                Reported Review by <strong>{reportingReview.authorFullName}</strong>:
              </span>
              <p className="text-white italic text-2xs line-clamp-3">"{reportingReview.reviewText}"</p>
            </div>

            <div>
              <label className="label text-xs">Reason for Reporting</label>
              <select
                className="input input-sm w-full"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                <option value="OFFENSIVE_CONTENT">Abusive, Profane or Offensive Content</option>
                <option value="SPAM_OR_FAKE">Spam, Promotional, or Fake Review</option>
                <option value="CONFLICT_OF_INTEREST">Conflict of Interest or Competitor Post</option>
                <option value="HARASSMENT">Harassment, Defamation, or Extortion</option>
                <option value="OTHER">Other Policy Violation</option>
              </select>
            </div>

            <div>
              <label className="label text-xs">
                Additional Context / Evidence <span className="text-muted">(Optional)</span>
              </label>
              <textarea
                className="input input-sm w-full h-24 text-xs"
                placeholder="Explain why this review is fraudulent or abusive (e.g. customer never visited, no job card on record)..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                maxLength={1000}
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setReportingReview(null)}
                disabled={reportSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-warning btn-sm"
                disabled={reportSubmitting}
              >
                {reportSubmitting ? 'Submitting Report...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Quote Request Modal */}
      {garage && (
        <QuoteRequestModal
          isOpen={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          garage={garage}
          initialFormState={quoteInitialState}
          onSuccess={() => {
            setIsQuoteModalOpen(false);
          }}
        />
      )}

      {/* Workshop Review Poster Modal */}
      {garage && (
        <GarageReviewPosterModal
          isOpen={isPosterModalOpen}
          onClose={() => setIsPosterModalOpen(false)}
          garage={garage}
        />
      )}
    </div>
  );
};
