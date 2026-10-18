import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useConfirm, useToast } from '../context/NotificationContext';
import type {
  GarageDetailDto,
  GarageSummaryDto,
  GaragePhotoDto,
  GarageDocumentDto,
  GarageProfileEditDto,
  GarageServiceDto,
  ServiceDto,
  ProfileEditRequest,
  DocumentType,
  QuoteRequestDto,
  QuoteOwnerResponseRequest,
} from '../api/types';
import { Modal } from '../components/Modal';
import { StateSelect, CitySelect } from '../components/LocationSelect';
import { getCitiesForState } from '../data/indiaLocations';
import { GarageReviewPosterCard } from '../components/GarageReviewPosterCard';

interface PendingPhoto {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  isCover: boolean;
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

export const OwnerDashboardPage: React.FC = () => {
  const { user, isAdmin, refreshUser } = useAuth();
  const confirm = useConfirm();
  const { showSuccess, showError, showWarning } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const slugParam = searchParams.get('slug') || '';

  const [myGarages, setMyGarages] = useState<GarageSummaryDto[]>([]);
  const [activeGarage, setActiveGarage] = useState<GarageDetailDto | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'edits' | 'photos' | 'documents' | 'services' | 'poster'>('overview');

  // Quotes Management Data
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequestDto[]>([]);
  const [quoteFilter, setQuoteFilter] = useState<'ALL' | 'PENDING' | 'QUOTED' | 'ACCEPTED' | 'HISTORY'>('ALL');
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequestDto | null>(null);
  const [respondAction, setRespondAction] = useState<'REVIEW' | 'QUOTE' | 'DECLINE' | 'COMPLETE' | null>(null);
  const [proposedAmount, setProposedAmount] = useState<number | ''>('');
  const [ownerNotes, setOwnerNotes] = useState('');
  const [ownerActionLoading, setOwnerActionLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  // Loading & Global Status
  const [loading, setLoading] = useState(false);

  // Profile Edits Data
  const [profileEdits, setProfileEdits] = useState<GarageProfileEditDto[]>([]);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAddressLine1, setEditAddressLine1] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Photos Data (Saved & Pending Upload Queue)
  const [photos, setPhotos] = useState<GaragePhotoDto[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<number | null>(null);

  // Documents Data
  const [documents, setDocuments] = useState<GarageDocumentDto[]>([]);
  const [docType, setDocType] = useState<DocumentType>('TRADE_LICENSE');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Services Data
  const [allServices, setAllServices] = useState<ServiceDto[]>([]);
  const [garageServices, setGarageServices] = useState<GarageServiceDto[]>([]);
  const [updatingServiceId, setUpdatingServiceId] = useState<number | null>(null);

  // Load garage details by numeric ID ensuring authorized ownership
  const loadGarageById = useCallback(async (garageId: number) => {
    try {
      setLoading(true);
      // Clean previous sub-resources to avoid stale state between workshops
      setProfileEdits([]);
      setDocuments([]);
      setPendingPhotos([]);

      const data = await api.garageManagement.getMyGarageById(garageId);
      setActiveGarage(data);
      setPhotos(data.photos || []);
      setGarageServices(data.services || []);

      // Populate edit fields default
      setEditName(data.name);
      setEditDescription(data.description || '');
      setEditAddressLine1(data.addressLine1);
      setEditCity(data.city);
      setEditState(data.state);
      setEditPostalCode(data.postalCode);
      setEditPhone(data.phoneNumber);
      setEditEmail(data.email || '');
      setEditWebsite(data.websiteUrl || '');

      // Load sub-resources
      const [editsRes, docsRes, allServicesRes, quotesRes] = await Promise.all([
        api.garageManagement.getProfileEdits(data.id).catch(() => []),
        api.garageManagement.getDocuments(data.id).catch(() => []),
        api.services.list().catch(() => []),
        api.quotes.getForGarage(data.id).catch(() => []),
      ]);

      setProfileEdits(editsRes);
      setDocuments(docsRes);
      setAllServices(allServicesRes);
      setQuoteRequests(quotesRes);
    } catch (err: any) {
      showError(err.message || 'Unable to load workshop details. Ensure you are authorized to manage this workshop.');
      setActiveGarage(null);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    refreshUser().catch(() => {});
    api.garageManagement
      .getMyGarages()
      .then((garages) => {
        setMyGarages(garages || []);
        if (garages && garages.length > 0) {
          const matched = slugParam
            ? garages.find((g) => g.slug === slugParam || String(g.id) === slugParam) || garages[0]
            : garages[0];
          setSearchParams({ slug: matched.slug }, { replace: true });
          loadGarageById(matched.id);
        } else {
          setActiveGarage(null);
        }
      })
      .catch((err: any) => {
        showError(err.message || 'Failed to fetch your registered workshops');
      });
  }, [refreshUser, loadGarageById, showError]);

  useEffect(() => {
    if (slugParam && myGarages.length > 0) {
      const matched = myGarages.find((g) => g.slug === slugParam || String(g.id) === slugParam);
      if (matched && activeGarage?.id !== matched.id) {
        loadGarageById(matched.id);
      }
    }
  }, [slugParam, myGarages, activeGarage?.id, loadGarageById]);

  const handleSelectWorkshop = (g: GarageSummaryDto) => {
    if (activeGarage?.id === g.id) return;
    setSearchParams({ slug: g.slug });
    loadGarageById(g.id);
  };

  // Submit Profile Edit Proposal
  const handleProfileEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGarage) return;

    try {
      setEditSubmitting(true);

      const payload: ProfileEditRequest = {
        proposedName: editName.trim(),
        proposedDescription: editDescription.trim() || undefined,
        proposedAddressLine1: editAddressLine1.trim(),
        proposedCity: editCity.trim(),
        proposedState: editState.trim(),
        proposedPostalCode: editPostalCode.trim(),
        proposedPhoneNumber: editPhone.trim(),
        proposedEmail: editEmail.trim() || undefined,
        proposedWebsiteUrl: editWebsite.trim() || undefined,
      };

      await api.garageManagement.submitProfileEdit(activeGarage.id, payload);
      showSuccess('Profile edit proposal submitted for administrative approval.');
      const edits = await api.garageManagement.getProfileEdits(activeGarage.id);
      setProfileEdits(edits);
    } catch (err: any) {
      showError(err.message || 'Failed to submit profile edit proposal');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      pendingPhotos.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, [pendingPhotos]);

  const handleEditStateChange = (newState: string) => {
    setEditState(newState);
    const validCities = getCitiesForState(newState);
    if (editCity && !validCities.includes(editCity)) {
      setEditCity('');
    }
  };

  // Photo Selection (validates 5MB limit, format, and 7 active photo cap)
  const handleSelectPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !activeGarage) return;

    const files = Array.from(fileList);
    const newPending: PendingPhoto[] = [];
    const MAX_ALLOWED = 7;
    const currentTotal = photos.length + pendingPhotos.length;

    if (photos.length > MAX_ALLOWED) {
      showWarning(
        `This workshop currently has ${photos.length} photos (exceeding the 7-photo limit). You cannot upload new photos until you remove enough photos to bring the total below 7.`
      );
      e.target.value = '';
      return;
    }

    if (photos.length >= MAX_ALLOWED) {
      showWarning(
        'Maximum limit of 7 active photos reached (1 cover photo and up to 6 gallery photos). Please delete an existing photo to upload a new one.'
      );
      e.target.value = '';
      return;
    }

    let oversizeCount = 0;
    let unsupportedCount = 0;
    let limitReached = false;

    for (const file of files) {
      if (currentTotal + newPending.length >= MAX_ALLOWED) {
        limitReached = true;
        break;
      }

      let isInvalid = false;
      let errorMsg: string | undefined;

      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        unsupportedCount++;
        isInvalid = true;
        errorMsg = 'Unsupported format (only JPG, PNG, WebP allowed)';
      } else if (file.size > 5 * 1024 * 1024) {
        oversizeCount++;
        isInvalid = true;
        errorMsg = `Exceeds 5 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
      }

      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
      const isFirst = photos.length === 0 && pendingPhotos.length === 0 && newPending.length === 0 && !isInvalid;

      newPending.push({
        id: `pending-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        previewUrl,
        caption: '',
        isCover: isFirst,
        status: isInvalid ? 'error' : 'idle',
        errorMessage: errorMsg,
      });
    }

    if (limitReached) {
      showWarning(`Maximum limit of ${MAX_ALLOWED} active photos reached (currently have ${photos.length} saved, ${pendingPhotos.length} pending).`);
    } else if (oversizeCount > 0 || unsupportedCount > 0) {
      showWarning(`Some selected photos have validation errors (marked in red below). Click Remove to discard them before uploading.`);
    }

    if (newPending.length > 0) {
      setPendingPhotos((prev) => [...prev, ...newPending]);
    }

    // Reset input so user can choose replacement or select more immediately
    e.target.value = '';
  };

  // Remove a pending photo before uploading
  const handleRemovePendingPhoto = (id: string) => {
    setPendingPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      const updated = prev.filter((p) => p.id !== id);
      const hasSavedCover = photos.some((p) => p.isCover);
      if (!hasSavedCover && target?.isCover && updated.length > 0) {
        const nextValid = updated.find((p) => p.status !== 'error') || updated[0];
        nextValid.isCover = true;
      }
      return updated;
    });
  };

  const handlePendingCaptionChange = (id: string, caption: string) => {
    setPendingPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption } : p))
    );
  };

  const handleSetPendingCover = (id: string) => {
    setPendingPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        isCover: p.id === id,
      }))
    );
  };

  const handleClearAllPending = () => {
    pendingPhotos.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    setPendingPhotos([]);
  };

  // Upload all pending photos sequentially
  const handleUploadPendingPhotos = async () => {
    if (!activeGarage || pendingPhotos.length === 0 || uploadingPhotos) return;

    const invalidCount = pendingPhotos.filter((p) => p.status === 'error').length;
    if (invalidCount > 0) {
      showWarning(`Please remove the ${invalidCount} invalid photo(s) before uploading.`);
      return;
    }

    setUploadingPhotos(true);
    let failures = 0;
    const working = [...pendingPhotos];
    const newlyUploadedPhotos: GaragePhotoDto[] = [];

    for (let i = 0; i < working.length; i++) {
      const item = working[i];
      if (item.status === 'success') continue;

      setUploadProgress(`Uploading ${i + 1} of ${working.length}: ${item.file.name}...`);
      working[i] = { ...item, status: 'uploading', errorMessage: undefined };
      setPendingPhotos([...working]);

      try {
        const isCover = item.isCover || (photos.length === 0 && newlyUploadedPhotos.length === 0);
        const uploaded = await api.garageManagement.uploadPhoto(
          activeGarage.id,
          item.file,
          item.caption.trim() || undefined,
          isCover,
          photos.length + newlyUploadedPhotos.length
        );

        working[i] = { ...item, status: 'success' };
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        newlyUploadedPhotos.push(uploaded);
      } catch (err: any) {
        failures++;
        working[i] = {
          ...item,
          status: 'error',
          errorMessage: err.message || 'Upload failed',
        };
      }
      setPendingPhotos([...working]);
    }

    const remainingPending = working.filter((p) => p.status !== 'success');
    setPendingPhotos(remainingPending);

    if (newlyUploadedPhotos.length > 0) {
      setPhotos((prev) => [...prev, ...newlyUploadedPhotos]);
      showSuccess(
        `${newlyUploadedPhotos.length} workshop photo(s) uploaded successfully.` +
          (failures > 0 ? ` ${failures} photo(s) failed.` : '')
      );
    }

    if (failures > 0) {
      showError(`${failures} photo upload(s) failed. Check details below and retry.`);
    }

    setUploadingPhotos(false);
    setUploadProgress(null);
  };

  // Set Cover Photo (Saved Photo)
  const handleSetCoverPhoto = async (photoId: number) => {
    if (!activeGarage) return;
    try {
      await api.garageManagement.setCoverPhoto(activeGarage.id, photoId);
      setPhotos((prev) =>
        prev.map((p) => ({
          ...p,
          isCover: p.id === photoId,
        }))
      );
      showSuccess('Cover photo updated.');
    } catch (err: any) {
      showError(err.message || 'Failed to set cover photo');
    }
  };

  // Delete Saved Photo from Server
  const handleDeletePhoto = async (photoId: number) => {
    if (!activeGarage || deletingPhotoId != null) return;
    const confirmed = await confirm({
      title: 'Delete Workshop Photo?',
      message: 'Are you sure you want to delete this photo from your workshop gallery? This will permanently remove it from your public listing.',
      confirmText: 'Delete Photo',
      variant: 'danger',
      icon: 'delete',
    });
    if (!confirmed) return;

    try {
      setDeletingPhotoId(photoId);
      await api.garageManagement.deletePhoto(activeGarage.id, photoId);
      setPhotos((prev) => {
        const filtered = prev.filter((p) => p.id !== photoId);
        const wasCover = prev.find((p) => p.id === photoId)?.isCover;
        if (wasCover && filtered.length > 0) {
          filtered[0].isCover = true;
        }
        return filtered;
      });
      const msg = 'Workshop photo removed from gallery.';
      showSuccess(msg);
    } catch (err: any) {
      const msg = err.message || 'Failed to delete photo';
      showError(msg);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  // Document Upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGarage) return;

    try {
      setUploadingDoc(true);
      const newDoc = await api.garageManagement.uploadDocument(activeGarage.id, file, docType);
      setDocuments([...documents, newDoc]);
      showSuccess('Verification document uploaded securely.');
    } catch (err: any) {
      showError(err.message || 'Failed to upload document. Allowed types: PDF, JPG, PNG up to 10MB.');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  // Service toggle & price edit
  const handleToggleService = async (svc: ServiceDto) => {
    if (!activeGarage) return;
    const existing = garageServices.find((gs) => gs.serviceId === svc.id);

    try {
      setUpdatingServiceId(svc.id);
      if (existing) {
        await api.garageManagement.disassociateService(activeGarage.id, svc.id);
        setGarageServices(garageServices.filter((gs) => gs.serviceId !== svc.id));
        showSuccess(`Removed ${svc.name} from offered services.`);
      } else {
        const added = await api.garageManagement.associateService(activeGarage.id, {
          serviceId: svc.id,
          startingPrice: undefined,
          isAvailable: true,
        });
        setGarageServices([...garageServices, added]);
        showSuccess(`Added ${svc.name} to offered services.`);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update service association');
    } finally {
      setUpdatingServiceId(null);
    }
  };

  const handleRefreshQuotes = async () => {
    if (!activeGarage) return;
    try {
      const res = await api.quotes.getForGarage(activeGarage.id);
      setQuoteRequests(res || []);
      if (selectedQuote) {
        const updated = res.find((q) => q.id === selectedQuote.id);
        if (updated) setSelectedQuote(updated);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to refresh quote requests');
    }
  };

  const handleOpenRespondModal = (
    quote: QuoteRequestDto,
    action: 'REVIEW' | 'QUOTE' | 'DECLINE' | 'COMPLETE'
  ) => {
    setSelectedQuote(quote);
    setRespondAction(action);
    if (action === 'QUOTE') {
      setProposedAmount(quote.proposedQuoteAmount || quote.estimatedMinPrice || '');
      setOwnerNotes(quote.ownerNotes || '');
    } else if (action === 'DECLINE') {
      setProposedAmount('');
      setOwnerNotes('');
    } else {
      setProposedAmount('');
      setOwnerNotes('');
    }
  };

  const handleSubmitOwnerResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote || !respondAction) return;

    if (respondAction === 'QUOTE') {
      if (!proposedAmount || Number(proposedAmount) <= 0) {
        showWarning('Please enter a valid positive quotation amount (₹).');
        return;
      }
    }

    try {
      setOwnerActionLoading(true);

      const payload: QuoteOwnerResponseRequest = {
        action: respondAction,
        proposedQuoteAmount: respondAction === 'QUOTE' ? Number(proposedAmount) : undefined,
        ownerNotes: ownerNotes.trim() || undefined,
      };

      const updated = await api.quotes.ownerResponse(selectedQuote.id, payload);
      showSuccess(`Quote ${selectedQuote.referenceNumber} status updated to ${updated.status}.`);
      setSelectedQuote(null);
      setRespondAction(null);
      setProposedAmount('');
      setOwnerNotes('');
      await handleRefreshQuotes();
    } catch (err: any) {
      showError(err.message || 'Failed to submit response');
    } finally {
      setOwnerActionLoading(false);
    }
  };

  const handleSendOwnerReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuote || !replyText.trim()) return;

    try {
      setReplyLoading(true);
      const updated = await api.quotes.addMessage(selectedQuote.id, replyText.trim());
      setSelectedQuote(updated);
      setReplyText('');
      showSuccess('Reply sent to customer.');
      await handleRefreshQuotes();
    } catch (err: any) {
      showError(err.message || 'Failed to send message');
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <div className="container py-8 max-w-5xl">
      <div className="page-header mb-6">
        <h1 className="page-title">Garage Owner Hub</h1>
        <p className="text-secondary text-sm">
          Manage your workshop profile, proposal revisions, photos, and private verification credentials.
        </p>
      </div>

      {/* Your Registered Workshop Selector */}
      {myGarages.length > 0 ? (
        <div className="card p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Your Registered Workshop</h2>
              <p className="text-xs text-secondary mt-0.5">
                Select an authorized workshop to manage its profile, services, photos, and documents
              </p>
            </div>
            <span className="badge badge-secondary text-2xs self-start sm:self-auto">
              {myGarages.length} {myGarages.length === 1 ? 'Workshop' : 'Workshops'}
            </span>
          </div>

          <div
            className="flex flex-wrap gap-2.5 items-center"
            role="tablist"
            aria-label="Your registered workshops"
          >
            {myGarages.map((g) => {
              const isSelected = activeGarage?.id === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleSelectWorkshop(g)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectWorkshop(g);
                    }
                  }}
                  className={`btn text-sm cursor-pointer transition-all ${
                    isSelected
                      ? 'btn-primary shadow-md ring-2 ring-primary/40'
                      : 'btn-outline border-[rgba(235,22,32,0.35)] text-white/90 bg-surface/60 hover:border-primary hover:text-white hover:bg-[rgba(235,22,32,0.1)]'
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                  title={`${g.name} (${g.city}${g.state ? `, ${g.state}` : ''})`}
                  aria-label={`Select workshop ${g.name} in ${g.city}`}
                >
                  <span className="font-bold truncate max-w-[200px] sm:max-w-xs">{g.name}</span>
                  <span className={`text-xs ${isSelected ? 'text-white/90 font-medium' : 'text-secondary'}`}>
                    • {g.city}
                  </span>
                  {g.isVerified && (
                    <span
                      className={`text-2xs px-1.5 py-0.5 rounded-full font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-success/20 text-success'
                      }`}
                      title="Verified Workshop"
                    >
                      ✓
                    </span>
                  )}
                  {isSelected && (
                    <span className="badge bg-white/25 text-white text-2xs font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full ml-0.5">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        !loading && (
          <div className="card p-8 mb-6 text-center">
            <div className="text-4xl mb-3">🏪</div>
            <h2 className="text-lg font-bold mb-2">No Registered Workshops Found</h2>
            <p className="text-sm text-secondary max-w-md mx-auto mb-5">
              You do not currently manage any registered workshops. You can list a new workshop for review or claim an existing workshop you own.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/submit-garage" className="btn btn-primary btn-sm">
                + List a New Workshop
              </Link>
              <Link to="/garages" className="btn btn-secondary btn-sm">
                🔍 Find & Claim Existing Workshop
              </Link>
            </div>
          </div>
        )
      )}

      {loading ? (
        <div className="center-loader py-12">
          <div className="spinner"></div>
          <p className="text-muted mt-2">Loading workshop management console...</p>
        </div>
      ) : activeGarage ? (
        <div>
          {/* Workshop Header Bar */}
          <div className="card p-6 mb-6 flex-between items-center flex-wrap gap-4 bg-surface-raised">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{activeGarage.name}</h2>
                {activeGarage.isVerified && (
                  <span className="badge badge-verified">✓ Verified</span>
                )}
              </div>
              <p className="text-xs text-secondary mt-1">
                📍 {activeGarage.addressLine1}, {activeGarage.city}, {activeGarage.state} | Slug: <code>{activeGarage.slug}</code>
              </p>
            </div>

            <Link
              to={`/garages/${activeGarage.slug}`}
              className="btn btn-outline btn-sm"
              target="_blank"
            >
              View Public Page ↗
            </Link>
          </div>

          {!isAdmin && activeGarage.hasOwner && activeGarage.ownerId && user?.id !== activeGarage.ownerId ? (
            <div className="card p-8 text-center bg-surface-raised mb-6">
              <h3 className="text-lg font-bold text-danger mb-2">Access Restricted (403)</h3>
              <p className="text-secondary text-sm mb-4">
                You are not the authorized owner of <strong>{activeGarage.name}</strong>. Workshop management tools are strictly reserved for the verified owner.
              </p>
              {myGarages.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setSearchParams({ slug: myGarages[0].slug })}
                >
                  Switch to Your Workshop ({myGarages[0].name})
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Navigation Tabs */}
          <div className="tabs mb-6 flex border-b border-border overflow-x-auto">
            <button
              type="button"
              className={`tab-btn px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-secondary'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Overview & Status
            </button>
            <button
              type="button"
              className={`tab-btn px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-1.5 ${
                activeTab === 'quotes' ? 'border-primary text-primary' : 'border-transparent text-secondary'
              }`}
              onClick={() => setActiveTab('quotes')}
            >
              <span>Quote Requests</span>
              <span
                className={`text-2xs px-1.5 py-0.5 rounded-full font-bold ${
                  quoteRequests.filter((q) => q.status === 'PENDING' || q.status === 'UNDER_REVIEW').length > 0
                    ? 'bg-primary text-white'
                    : 'bg-surface text-muted border border-border'
                }`}
              >
                {quoteRequests.length}
              </span>
            </button>
            <button
              type="button"
              className={`tab-btn px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'edits' ? 'border-primary text-primary' : 'border-transparent text-secondary'
              }`}
              onClick={() => setActiveTab('edits')}
            >
              Edit Proposals ({profileEdits.filter((e) => e.status === 'PENDING').length} pending)
            </button>
            <button
              type="button"
              className={`tab-btn px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'photos' ? 'border-primary text-primary' : 'border-transparent text-secondary'
              }`}
              onClick={() => setActiveTab('photos')}
            >
              Photos ({photos.length}/10)
            </button>
            <button
              type="button"
              className={`tab-btn px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'documents' ? 'border-primary text-primary' : 'border-transparent text-secondary'
              }`}
              onClick={() => setActiveTab('documents')}
            >
              Verification Documents ({documents.length})
            </button>
            <button
              type="button"
              className={`tab-btn px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === 'services' ? 'border-primary text-primary' : 'border-transparent text-secondary'
              }`}
              onClick={() => setActiveTab('services')}
            >
              Services ({garageServices.length})
            </button>
            <button
              type="button"
              className={`tab-btn px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-1.5 ${
                activeTab === 'poster' ? 'border-primary text-primary' : 'border-transparent text-secondary'
              }`}
              onClick={() => setActiveTab('poster')}
            >
              <span className="material-symbols-outlined text-base">qr_code_2</span>
              <span>Review Poster &amp; QR</span>
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="section-title text-base mb-4">Approval & Trust Diagnostics</h3>
                <div className="grid grid-2 gap-6 text-sm">
                  <div className="p-4 bg-surface rounded">
                    <span className="text-xs text-muted block">Trust Verification Badge</span>
                    <strong className="text-base text-foreground">
                      {activeGarage.isVerified ? '✓ Verified Partner' : 'Unverified'}
                    </strong>
                    <p className="text-xs text-secondary mt-1">
                      {activeGarage.isVerified
                        ? 'Your business registration has been verified.'
                        : 'Upload business proof in the Verification Documents tab to earn your badge.'}
                    </p>
                  </div>

                  <div className="p-4 bg-surface rounded">
                    <span className="text-xs text-muted block">Direct Contact</span>
                    <strong className="text-base text-foreground">{activeGarage.phoneNumber}</strong>
                    <p className="text-xs text-secondary mt-1">
                      {activeGarage.email || 'No email specified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Quote Requests */}
          {activeTab === 'quotes' && (
            <div className="space-y-6">
              {/* Quotes Header Bar */}
              <div className="card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Customer Quote Requests</span>
                      <span className="badge badge-secondary text-xs">
                        {quoteRequests.length} Total
                      </span>
                    </h3>
                    <p className="text-xs text-secondary mt-0.5">
                      Review vehicle repair requests submitted to {activeGarage.name}, send proposed quotations, and manage repair status.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    onClick={handleRefreshQuotes}
                  >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Refresh List
                  </button>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {[
                    { key: 'ALL', label: 'All Requests', count: quoteRequests.length },
                    {
                      key: 'PENDING',
                      label: 'Needs Action',
                      count: quoteRequests.filter(
                        (q) => q.status === 'PENDING' || q.status === 'UNDER_REVIEW'
                      ).length,
                    },
                    {
                      key: 'QUOTED',
                      label: 'Quoted (Awaiting Customer)',
                      count: quoteRequests.filter((q) => q.status === 'QUOTED').length,
                    },
                    {
                      key: 'ACCEPTED',
                      label: 'Accepted Bookings',
                      count: quoteRequests.filter((q) => q.status === 'ACCEPTED').length,
                    },
                    {
                      key: 'HISTORY',
                      label: 'History (Done / Declined)',
                      count: quoteRequests.filter(
                        (q) =>
                          q.status === 'DECLINED' ||
                          q.status === 'CANCELLED' ||
                          q.status === 'COMPLETED'
                      ).length,
                    },
                  ].map((flt) => {
                    const isSelected = quoteFilter === flt.key;
                    return (
                      <button
                        key={flt.key}
                        type="button"
                        onClick={() => setQuoteFilter(flt.key as any)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-primary border-primary text-white font-bold shadow-sm'
                            : 'bg-surface border-border text-secondary hover:text-white hover:border-primary/40'
                        }`}
                      >
                        <span>{flt.label}</span>
                        <span
                          className={`text-2xs px-1.5 py-0.2 rounded-full ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-surface-raised text-muted'
                          }`}
                        >
                          {flt.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quotes List */}
              {(() => {
                const filtered = quoteRequests.filter((q) => {
                  if (quoteFilter === 'PENDING')
                    return q.status === 'PENDING' || q.status === 'UNDER_REVIEW';
                  if (quoteFilter === 'QUOTED') return q.status === 'QUOTED';
                  if (quoteFilter === 'ACCEPTED') return q.status === 'ACCEPTED';
                  if (quoteFilter === 'HISTORY')
                    return (
                      q.status === 'DECLINED' ||
                      q.status === 'CANCELLED' ||
                      q.status === 'COMPLETED'
                    );
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="card p-10 text-center bg-surface border border-border">
                      <div className="text-3xl mb-2">📋</div>
                      <h4 className="text-base font-bold text-white mb-1">
                        No Quote Requests Found
                      </h4>
                      <p className="text-xs text-secondary max-w-md mx-auto">
                        No customer quote requests match the "{quoteFilter}" filter. When customers
                        request quotes on your public garage profile, they will show up here.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filtered.map((quote) => {
                      const isPending = quote.status === 'PENDING';
                      const isUnderReview = quote.status === 'UNDER_REVIEW';
                      const isQuoted = quote.status === 'QUOTED';
                      const isAccepted = quote.status === 'ACCEPTED';
                      const isCompleted = quote.status === 'COMPLETED';
                      const isDeclined = quote.status === 'DECLINED';
                      const isCancelled = quote.status === 'CANCELLED';

                      return (
                        <div
                          key={quote.id}
                          className="card p-5 bg-surface border border-border space-y-4 hover:border-primary/40 transition-colors"
                        >
                          {/* Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-mono font-bold text-primary text-sm">
                                {quote.referenceNumber}
                              </span>
                              <span className="text-2xs text-muted">
                                Submitted:{' '}
                                {new Date(quote.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            {/* Status Badge */}
                            <div>
                              {isPending && (
                                <span className="badge badge-warning text-xs font-bold uppercase">
                                  Pending Review
                                </span>
                              )}
                              {isUnderReview && (
                                <span className="badge bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold uppercase">
                                  Under Review
                                </span>
                              )}
                              {isQuoted && (
                                <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold uppercase">
                                  Quotation Sent
                                </span>
                              )}
                              {isAccepted && (
                                <span className="badge badge-success text-xs font-bold uppercase">
                                  ✓ Customer Accepted
                                </span>
                              )}
                              {isCompleted && (
                                <span className="badge badge-success text-xs font-bold uppercase">
                                  ✓ Work Completed
                                </span>
                              )}
                              {isDeclined && (
                                <span className="badge badge-danger text-xs font-bold uppercase">
                                  Declined
                                </span>
                              )}
                              {isCancelled && (
                                <span className="badge badge-secondary text-xs font-bold uppercase">
                                  Cancelled
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Customer & Vehicle Info Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                            {/* Customer */}
                            <div className="p-3 bg-surface-raised rounded border border-border">
                              <span className="text-muted block text-2xs uppercase tracking-wider mb-1">
                                Customer Details
                              </span>
                              <div className="font-bold text-white text-sm">
                                {quote.customerName || 'Customer'}
                              </div>
                              <div className="mt-1 space-y-0.5">
                                <a
                                  href={`tel:${quote.contactPhone}`}
                                  className="text-primary font-mono block hover:underline"
                                >
                                  📞 {quote.contactPhone}
                                </a>
                                {quote.contactEmail && (
                                  <a
                                    href={`mailto:${quote.contactEmail}`}
                                    className="text-secondary block truncate hover:underline"
                                  >
                                    ✉️ {quote.contactEmail}
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Vehicle */}
                            <div className="p-3 bg-surface-raised rounded border border-border">
                              <span className="text-muted block text-2xs uppercase tracking-wider mb-1">
                                Vehicle Information
                              </span>
                              <div className="font-bold text-white text-sm">
                                {quote.vehicleMake} {quote.vehicleModel}
                              </div>
                              <div className="text-muted mt-1 space-y-0.5">
                                <div>
                                  Type: <span className="text-white">{quote.vehicleType}</span>
                                  {quote.vehicleYear && ` • Year: ${quote.vehicleYear}`}
                                </div>
                                {quote.fuelType && (
                                  <div>
                                    Fuel: <span className="text-white">{quote.fuelType}</span>
                                  </div>
                                )}
                                {quote.registrationNumber && (
                                  <div className="font-mono text-white">
                                    Reg: {quote.registrationNumber}
                                  </div>
                                )}
                                {quote.odometerReading && (
                                  <div>
                                    Odometer: {quote.odometerReading.toLocaleString('en-IN')} km
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Quotation & Pricing Summary */}
                            <div className="p-3 bg-surface-raised rounded border border-border sm:col-span-2 lg:col-span-1">
                              <span className="text-muted block text-2xs uppercase tracking-wider mb-1">
                                Quotation & Estimates
                              </span>
                              {quote.proposedQuoteAmount ? (
                                <div>
                                  <span className="text-2xs text-muted block">Proposed Quotation:</span>
                                  <span className="text-lg font-mono font-extrabold text-success">
                                    ₹{Number(quote.proposedQuoteAmount).toLocaleString('en-IN')}
                                  </span>
                                  {quote.ownerNotes && (
                                    <p className="text-2xs text-muted mt-1 italic line-clamp-2">
                                      "{quote.ownerNotes}"
                                    </p>
                                  )}
                                </div>
                              ) : quote.estimatedMinPrice ? (
                                <div>
                                  <span className="text-2xs text-muted block">Indicative Starting:</span>
                                  <span className="text-base font-mono font-bold text-primary">
                                    ₹{Number(quote.estimatedMinPrice).toLocaleString('en-IN')}+
                                  </span>
                                  <span className="text-2xs text-muted block mt-0.5">
                                    Based on service catalogue baseline
                                  </span>
                                </div>
                              ) : (
                                <div className="text-muted text-xs italic">
                                  No pricing configured. Manual estimate required.
                                </div>
                              )}

                              {quote.preferredDate && (
                                <div className="mt-2 text-2xs text-secondary border-t border-border pt-1">
                                  Preferred Date: <strong>{quote.preferredDate}</strong>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Requested Services */}
                          {quote.services && quote.services.length > 0 && (
                            <div>
                              <span className="text-2xs text-muted uppercase tracking-wider block mb-1.5 font-semibold">
                                Services Requested ({quote.services.length})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {quote.services.map((srv) => (
                                  <span
                                    key={srv.id}
                                    className="badge badge-secondary text-2xs py-1 px-2.5 font-medium"
                                  >
                                    {srv.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Problem Description & Customer Note */}
                          <div className="p-3.5 bg-surface-raised rounded-lg border border-border text-xs space-y-2">
                            <div>
                              <span className="text-muted font-semibold block text-2xs uppercase tracking-wider">
                                Vehicle Problem / Required Work:
                              </span>
                              <p className="text-white mt-0.5 leading-relaxed">
                                {quote.problemDescription}
                              </p>
                            </div>
                            {quote.customerMessage && (
                              <div className="border-t border-border pt-1.5">
                                <span className="text-muted font-semibold block text-2xs uppercase tracking-wider">
                                  Customer Instructions:
                                </span>
                                <p className="text-secondary mt-0.5 italic">
                                  "{quote.customerMessage}"
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Messages / Communication Preview */}
                          {quote.messages && quote.messages.length > 0 && (
                            <div className="border-t border-border pt-3">
                              <span className="text-2xs text-muted uppercase tracking-wider block mb-2 font-semibold">
                                Communication History ({quote.messages.length})
                              </span>
                              <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-surface-raised rounded border border-border text-2xs">
                                {quote.messages.map((m) => {
                                  const isOwner = m.senderRole === 'OWNER';
                                  return (
                                    <div
                                      key={m.id}
                                      className={`p-2 rounded ${
                                        isOwner
                                          ? 'bg-primary/10 border border-primary/20 text-white ml-4'
                                          : 'bg-surface border border-border text-white mr-4'
                                      }`}
                                    >
                                      <div className="flex justify-between items-center text-3xs text-muted mb-0.5">
                                        <span className="font-bold text-white">
                                          {isOwner ? 'Workshop Owner (You)' : m.senderName}
                                        </span>
                                        <span>
                                          {new Date(m.createdAt).toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      </div>
                                      <div className="text-xs">{m.messageText}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons Strip */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* If PENDING: allow mark review */}
                              {isPending && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-xs inline-flex items-center gap-1 cursor-pointer"
                                  onClick={() => handleOpenRespondModal(quote, 'REVIEW')}
                                >
                                  <span className="material-symbols-outlined text-xs">
                                    visibility
                                  </span>
                                  Mark Under Review
                                </button>
                              )}

                              {/* Allow Quoting if Pending, Under Review, or Quoted */}
                              {(isPending || isUnderReview || isQuoted) && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-xs inline-flex items-center gap-1 cursor-pointer"
                                  onClick={() => handleOpenRespondModal(quote, 'QUOTE')}
                                >
                                  <span className="material-symbols-outlined text-xs">
                                    request_quote
                                  </span>
                                  {isQuoted ? 'Update Quotation' : 'Provide Quotation'}
                                </button>
                              )}

                              {/* If Accepted: Allow marking complete */}
                              {isAccepted && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-xs inline-flex items-center gap-1 cursor-pointer"
                                  onClick={() => handleOpenRespondModal(quote, 'COMPLETE')}
                                >
                                  <span className="material-symbols-outlined text-xs">
                                    check_circle
                                  </span>
                                  Mark Work Completed
                                </button>
                              )}

                              {/* Decline button if not completed, declined, or cancelled */}
                              {!isCompleted && !isDeclined && !isCancelled && (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-xs text-danger inline-flex items-center gap-1 cursor-pointer"
                                  onClick={() => handleOpenRespondModal(quote, 'DECLINE')}
                                >
                                  <span className="material-symbols-outlined text-xs">
                                    cancel
                                  </span>
                                  Decline Request
                                </button>
                              )}
                            </div>

                            {/* Message / Clarification Action */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs inline-flex items-center gap-1 cursor-pointer"
                              onClick={() => {
                                setSelectedQuote(quote);
                                setRespondAction(null);
                                setReplyText('');
                              }}
                            >
                              <span className="material-symbols-outlined text-xs">chat</span>
                              Message Customer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Tab 2: Profile Edit Proposals */}
          {activeTab === 'edits' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="section-title text-base mb-2">Propose Profile Updates</h3>
                <p className="text-xs text-secondary mb-4">
                  To protect public listing integrity, all updates to garage name, location, and contact numbers
                  require administrative review before taking effect.
                </p>

                <form onSubmit={handleProfileEditSubmit} className="space-y-4">
                  <div className="form-group">
                    <label className="form-label">Workshop Name *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      rows={3}
                      className="form-control"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">Address Line 1 *</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        value={editAddressLine1}
                        onChange={(e) => setEditAddressLine1(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">PIN Code *</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        value={editPostalCode}
                        onChange={(e) => setEditPostalCode(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">State *</label>
                      <StateSelect
                        required
                        value={editState}
                        onChange={handleEditStateChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">City *</label>
                      <CitySelect
                        required
                        selectedState={editState}
                        value={editCity}
                        onChange={setEditCity}
                      />
                    </div>
                  </div>

                  <div className="grid grid-3 gap-4">
                    <div className="form-group">
                      <label className="form-label">Phone *</label>
                      <input
                        type="tel"
                        required
                        className="form-control"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Website</label>
                      <input
                        type="url"
                        className="form-control"
                        value={editWebsite}
                        onChange={(e) => setEditWebsite(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={editSubmitting}
                  >
                    {editSubmitting ? 'Submitting Proposal...' : 'Submit Revision for Review'}
                  </button>
                </form>
              </div>

              {/* Past Proposals History */}
              <div className="card p-6">
                <h3 className="section-title text-base mb-4">Proposal History</h3>
                {profileEdits.length === 0 ? (
                  <p className="text-xs text-muted">No profile edit proposals submitted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {profileEdits.map((edit) => (
                      <div key={edit.id} className="p-4 bg-surface rounded text-xs space-y-2">
                        <div className="flex-between items-center">
                          <span className="font-semibold text-foreground">Proposal #{edit.id}</span>
                          <span
                            className={`badge ${
                              edit.status === 'APPROVED'
                                ? 'badge-success'
                                : edit.status === 'PENDING'
                                ? 'badge-warning'
                                : 'badge-danger'
                            }`}
                          >
                            {edit.status}
                          </span>
                        </div>
                        <p className="text-muted">
                          Proposed Name: <strong>{edit.proposedName}</strong> • Submitted:{' '}
                          {new Date(edit.createdAt).toLocaleDateString('en-IN')}
                        </p>
                        {edit.rejectionReason && (
                          <div className="p-2 bg-surface-raised rounded text-danger">
                            <strong>Feedback:</strong> {edit.rejectionReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Photos Management */}
          {activeTab === 'photos' && (
            <div className="card p-6">
              <div className="flex-between items-center mb-4">
                <div>
                  <h3 className="section-title text-base mb-1">Workshop Photo Gallery</h3>
                  <p className="text-xs text-secondary">
                    Upload up to 7 photos of your workshop: 1 cover photo and up to 6 gallery photos (max 5 MB each, JPG/PNG/WebP).
                  </p>
                </div>
                <span className="badge badge-primary text-xs font-mono">
                  {photos.length}/7 Active Photos
                </span>
              </div>

              {photos.length > 7 && (
                <div className="p-3 rounded-lg border border-warning/40 bg-warning/10 text-xs text-warning flex items-start gap-2 mb-4">
                  <span className="material-symbols-outlined text-sm flex-shrink-0 mt-0.5">warning</span>
                  <span>
                    This workshop currently has {photos.length} active photos (exceeding the 7-photo limit). Existing photos are safely preserved, but further uploads are blocked until photos are reduced below 7.
                  </span>
                </div>
              )}

              {/* Upload controls / file selection bar */}
              <div className="p-4 bg-surface rounded mb-6 border border-border">
                <div className="flex-between items-center flex-wrap gap-3">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Add Photos to Gallery</h4>
                    <p className="text-xs text-muted mb-0">
                      Select one or more photos to preview and caption before uploading (Max 7 total).
                    </p>
                  </div>
                  <div>
                    <label
                      className={`btn btn-primary btn-sm cursor-pointer ${
                        uploadingPhotos || photos.length + pendingPhotos.length >= 7 || photos.length > 7
                          ? 'opacity-50 pointer-events-none'
                          : ''
                      }`}
                    >
                      + Select Photos
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        disabled={uploadingPhotos || photos.length + pendingPhotos.length >= 7 || photos.length > 7}
                        onChange={handleSelectPhotos}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Pending Uploads Section (if any selected) */}
              {pendingPhotos.length > 0 && (
                <div className="mb-8 p-4 bg-surface-raised rounded border border-warning">
                  <div className="flex-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-warning text-xs">Pending Upload ({pendingPhotos.length})</span>
                      <span className="text-xs text-muted">Ready to be saved to your workshop gallery</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={handleClearAllPending}
                        disabled={uploadingPhotos}
                      >
                        Clear All
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={handleUploadPendingPhotos}
                        disabled={uploadingPhotos}
                      >
                        {uploadingPhotos ? 'Uploading...' : `Upload All (${pendingPhotos.length})`}
                      </button>
                    </div>
                  </div>

                  {uploadProgress && (
                    <div className="text-xs text-accent font-medium mb-3 flex items-center gap-2">
                      <span className="spinner"></span>
                      <span>{uploadProgress}</span>
                    </div>
                  )}

                  <div className="photo-preview-grid">
                    {pendingPhotos.map((item, index) => (
                      <div
                        key={item.id}
                        className={`photo-preview-card card p-3 border ${
                          item.status === 'error' ? 'border-danger/70 bg-danger/5' : 'border-border bg-surface'
                        } text-xs space-y-2`}
                      >
                        <div className="relative overflow-hidden rounded">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={`Pending preview ${index + 1}`}
                              className="photo-preview-thumb"
                            />
                          ) : (
                            <div className="w-full h-40 bg-surface flex flex-col items-center justify-center text-muted">
                              <span className="material-symbols-outlined text-4xl text-danger">broken_image</span>
                              <span className="text-xs mt-1 text-danger font-medium">Invalid file</span>
                            </div>
                          )}
                          <span className={`badge ${item.status === 'error' ? 'badge-danger' : 'badge-warning'} absolute top-2 left-2 text-xs`}>
                            {item.status === 'error' ? '⚠ Error' : 'Pending'}
                          </span>
                          {item.isCover && (
                            <span className="badge badge-accent absolute top-2 left-16 text-xs">
                              Cover Photo
                            </span>
                          )}

                          {/* Top-right prominent remove cross */}
                          <button
                            type="button"
                            aria-label={`Remove photo ${item.file.name}`}
                            className="btn btn-danger btn-xs absolute top-2 right-2 rounded-full w-7 h-7 flex items-center justify-center p-0 shadow"
                            disabled={uploadingPhotos}
                            onClick={() => handleRemovePendingPhoto(item.id)}
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex-between items-center text-xs">
                          <span className="font-semibold truncate text-foreground flex-1 min-w-0" title={item.file.name}>
                            {item.file.name}
                          </span>
                          <span className="text-muted font-mono ml-2">
                            {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Add optional caption..."
                            className="form-control text-xs"
                            value={item.caption}
                            disabled={uploadingPhotos || item.status === 'error'}
                            onChange={(e) => handlePendingCaptionChange(item.id, e.target.value)}
                          />
                        </div>

                        {item.errorMessage && (
                          <p className="text-danger text-xs mb-0 font-medium">{item.errorMessage}</p>
                        )}

                        <div className="flex-between items-center pt-1 border-t border-border">
                          {!item.isCover && item.status !== 'error' ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              disabled={uploadingPhotos}
                              onClick={() => handleSetPendingCover(item.id)}
                            >
                              Set as Cover
                            </button>
                          ) : (
                            <span className="text-xs text-accent">
                              {item.isCover ? 'Default Cover' : ''}
                            </span>
                          )}

                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            disabled={uploadingPhotos}
                            onClick={() => handleRemovePendingPhoto(item.id)}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved Photos Gallery */}
              <div className="flex-between items-center mb-3">
                <h4 className="text-sm font-semibold">
                  Saved Workshop Photos ({photos.length}/7)
                </h4>
                {photos.length > 0 && (
                  <span className="text-xs text-muted">Live on public workshop listing</span>
                )}
              </div>

              {photos.length === 0 ? (
                <div className="p-8 text-center text-muted border border-dashed border-border rounded">
                  No workshop photos saved on server yet. Click "+ Select Photos" above to add photos.
                </div>
              ) : (
                <div className="photo-gallery-grid">
                  {photos.map((photo) => (
                    <div key={photo.id} className="photo-card card p-2 bg-surface border border-border">
                      <div className="relative aspect-video overflow-hidden rounded mb-2">
                        <img
                          src={api.garages.getPhotoUrl(activeGarage.id, photo.id)}
                          alt={photo.caption || 'Workshop photo'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <span className="badge badge-success absolute top-2 right-2 text-xs">
                          ✓ Saved
                        </span>
                        {photo.isCover && (
                          <span className="badge badge-accent absolute top-2 left-2 text-xs">
                            ★ Cover Photo
                          </span>
                        )}
                      </div>

                      <div className="px-1">
                        {photo.caption ? (
                          <p className="text-xs text-secondary mb-2 truncate" title={photo.caption}>
                            {photo.caption}
                          </p>
                        ) : (
                          <p className="text-xs text-muted mb-2 italic">No caption</p>
                        )}
                      </div>

                      <div className="flex-between items-center pt-2 border-t border-border">
                        {!photo.isCover ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => handleSetCoverPhoto(photo.id)}
                          >
                            Set as Cover
                          </button>
                        ) : (
                          <span className="text-xs text-accent font-medium">Cover</span>
                        )}

                        <button
                          type="button"
                          className="btn btn-danger btn-xs"
                          disabled={deletingPhotoId === photo.id}
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          {deletingPhotoId === photo.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Private Verification Documents */}
          {activeTab === 'documents' && (
            <div className="card p-6">
              <div className="mb-6">
                <h3 className="section-title text-base">Private Verification Documents</h3>
                <p className="text-xs text-secondary mt-1">
                  Upload trade licenses, shop establishment certificates, GST registration, or utility bills.
                  <strong> Documents are strictly private</strong>, accessible only to verified administrators, and are never exposed publicly.
                </p>
              </div>

              {/* Upload Box */}
              <div className="p-4 bg-surface rounded mb-6">
                <h4 className="text-sm font-semibold mb-3">Upload New Verification Document</h4>
                <div className="flex gap-4 items-center flex-wrap">
                  <div className="form-group mb-0">
                    <label className="form-label text-xs">Document Type</label>
                    <select
                      className="form-control text-xs"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as DocumentType)}
                    >
                      <option value="TRADE_LICENSE">Shop / Trade License</option>
                      <option value="GST_CERTIFICATE">GST Certificate</option>
                      <option value="ID_PROOF">Owner National ID Proof</option>
                      <option value="UTILITY_BILL">Workshop Utility Bill</option>
                      <option value="BUSINESS_PAN">Business PAN Card</option>
                      <option value="OTHER">Other Credentials</option>
                    </select>
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label text-xs">Select File (PDF, JPG, PNG)</label>
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png"
                      className="form-control text-xs"
                      disabled={uploadingDoc}
                      onChange={handleDocumentUpload}
                    />
                  </div>
                </div>
              </div>

              {/* Uploaded Documents Table */}
              {documents.length === 0 ? (
                <p className="text-xs text-muted text-center py-6">
                  No verification documents uploaded. Uploading credentials expedites verified badge approval.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Document ID</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Upload Date</th>
                        <th>Admin Feedback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td className="font-mono text-xs">#{doc.id}</td>
                          <td className="text-xs font-semibold">{doc.documentType.replace('_', ' ')}</td>
                          <td>
                            <span
                              className={`badge ${
                                doc.verificationStatus === 'VERIFIED'
                                ? 'badge-success'
                                : doc.verificationStatus === 'PENDING'
                                ? 'badge-warning'
                                : 'badge-danger'
                              }`}
                            >
                              {doc.verificationStatus}
                            </span>
                          </td>
                          <td className="text-xs text-muted">
                            {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="text-xs text-secondary">
                            {doc.rejectionReason || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Services Catalogue */}
          {activeTab === 'services' && (
            <div className="card p-6">
              <div className="mb-6">
                <h3 className="section-title text-base">Workshop Service Offerings</h3>
                <p className="text-xs text-secondary">
                  Toggle services your workshop provides from the master catalogue.
                </p>
              </div>

              <div className="space-y-4">
                {allServices.map((svc) => {
                  const assigned = garageServices.find((gs) => gs.serviceId === svc.id);
                  const isChecked = !!assigned;
                  const isUpdating = updatingServiceId === svc.id;

                  return (
                    <div
                      key={svc.id}
                      className={`p-4 rounded border flex-between items-center ${
                        isChecked ? 'border-primary bg-surface' : 'border-border bg-surface-raised opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{svc.name}</span>
                          <span className="text-xs text-muted">({svc.category.replace('_', ' ')})</span>
                        </div>
                        {svc.description && (
                          <p className="text-xs text-muted mt-1">{svc.description}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        className={`btn btn-sm ${isChecked ? 'btn-danger' : 'btn-primary'}`}
                        disabled={isUpdating}
                        onClick={() => handleToggleService(svc)}
                      >
                        {isUpdating ? 'Updating...' : isChecked ? 'Remove Service' : '+ Offer Service'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 6: Review Poster & QR */}
          {activeTab === 'poster' && (
            <GarageReviewPosterCard garage={activeGarage} />
          )}
        </>
      )}
    </div>
  ) : (
        <div className="card p-12 text-center empty-state">
          <div className="text-3xl mb-2">🔧</div>
          <h3 className="text-base font-bold">Select a Workshop to Manage</h3>
          <p className="text-secondary text-xs mt-1 max-w-md mx-auto">
            Enter your garage's slug above to access profile edit proposals, photo uploads, and verification documents.
          </p>
        </div>
      )}
      {/* Quote Response & Discussion Modal */}
      {selectedQuote && (
        <Modal
          isOpen={Boolean(selectedQuote)}
          onClose={() => {
            setSelectedQuote(null);
            setRespondAction(null);
          }}
          title={
            respondAction === 'QUOTE'
              ? `Provide Quotation — ${selectedQuote.referenceNumber}`
              : respondAction === 'DECLINE'
              ? `Decline Quote Request — ${selectedQuote.referenceNumber}`
              : respondAction === 'REVIEW'
              ? `Mark Under Review — ${selectedQuote.referenceNumber}`
              : respondAction === 'COMPLETE'
              ? `Mark Work Completed — ${selectedQuote.referenceNumber}`
              : `Quote Request Discussion — ${selectedQuote.referenceNumber}`
          }
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Quick Context Card */}
            <div className="p-3 bg-surface rounded border border-border text-xs flex justify-between items-center flex-wrap gap-2">
              <div>
                <span className="text-muted block text-2xs uppercase">Vehicle & Customer</span>
                <span className="font-bold text-white">
                  {selectedQuote.vehicleMake} {selectedQuote.vehicleModel} ({selectedQuote.vehicleType})
                </span>
                <span className="text-muted block">
                  Customer: <strong>{selectedQuote.customerName}</strong> • {selectedQuote.contactPhone}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted block text-2xs uppercase">Current Status</span>
                <span className="badge badge-secondary text-2xs uppercase font-bold">
                  {selectedQuote.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Action 1: Provide / Update Quotation */}
            {respondAction === 'QUOTE' && (
              <form onSubmit={handleSubmitOwnerResponse} className="space-y-4 pt-1">
                <div>
                  <label className="label text-xs">
                    Proposed Quotation Amount (₹) <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      className="input pl-8 text-sm font-mono font-bold"
                      placeholder="e.g. 4500"
                      value={proposedAmount}
                      onChange={(e) => setProposedAmount(e.target.value ? Number(e.target.value) : '')}
                      required
                    />
                  </div>
                  <span className="text-2xs text-muted block mt-1">
                    Enter your total estimated or itemized quote for the requested services and diagnostic repair.
                  </span>
                </div>

                <div>
                  <label className="label text-xs">
                    Scope of Work, Assumptions & Notes (Optional)
                  </label>
                  <textarea
                    className="input text-xs min-h-[90px]"
                    placeholder="Describe included genuine parts, labor, diagnostic work, warranty, or necessary inspection conditions..."
                    value={ownerNotes}
                    onChange={(e) => setOwnerNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    onClick={() => setRespondAction(null)}
                    disabled={ownerActionLoading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary text-xs flex items-center gap-1.5"
                    disabled={ownerActionLoading}
                  >
                    {ownerActionLoading ? (
                      'Sending Quotation...'
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">send</span>
                        Send Quotation to Customer
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Action 2: Decline Request */}
            {respondAction === 'DECLINE' && (
              <form onSubmit={handleSubmitOwnerResponse} className="space-y-4 pt-1">
                <div className="p-3 bg-danger/10 border border-danger/30 rounded text-xs text-danger">
                  ⚠️ Declining this request will inform the customer that your workshop cannot take on this work at this time.
                </div>

                <div>
                  <label className="label text-xs">Reason for Declining (Optional)</label>
                  <textarea
                    className="input text-xs min-h-[80px]"
                    placeholder="e.g. Workshop schedule is currently at full capacity, or specialized parts are unavailable..."
                    value={ownerNotes}
                    onChange={(e) => setOwnerNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    onClick={() => setRespondAction(null)}
                    disabled={ownerActionLoading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger text-xs"
                    disabled={ownerActionLoading}
                  >
                    {ownerActionLoading ? 'Declining...' : 'Confirm Decline'}
                  </button>
                </div>
              </form>
            )}

            {/* Action 3: Mark Under Review */}
            {respondAction === 'REVIEW' && (
              <form onSubmit={handleSubmitOwnerResponse} className="space-y-4 pt-1">
                <p className="text-xs text-secondary">
                  Marking this quote as <strong>Under Review</strong> signals to the customer that your mechanics are reviewing the diagnostic details and preparing an estimate.
                </p>

                <div>
                  <label className="label text-xs">Internal / Customer Note (Optional)</label>
                  <input
                    type="text"
                    className="input text-xs"
                    placeholder="e.g. Checking spare parts inventory..."
                    value={ownerNotes}
                    onChange={(e) => setOwnerNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    onClick={() => setRespondAction(null)}
                    disabled={ownerActionLoading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary text-xs"
                    disabled={ownerActionLoading}
                  >
                    {ownerActionLoading ? 'Updating...' : 'Confirm Under Review'}
                  </button>
                </div>
              </form>
            )}

            {/* Action 4: Complete Work */}
            {respondAction === 'COMPLETE' && (
              <form onSubmit={handleSubmitOwnerResponse} className="space-y-4 pt-1">
                <p className="text-xs text-secondary">
                  Mark this repair job as <strong>Completed</strong>. This moves the booking to your workshop history.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    onClick={() => setRespondAction(null)}
                    disabled={ownerActionLoading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary text-xs"
                    disabled={ownerActionLoading}
                  >
                    {ownerActionLoading ? 'Saving...' : 'Mark Completed'}
                  </button>
                </div>
              </form>
            )}

            {/* Default: Communication Thread & Discussion */}
            {!respondAction && (
              <div className="space-y-3 pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-white">Conversation & Updates</span>
                  <div className="flex gap-1.5">
                    {(selectedQuote.status === 'PENDING' || selectedQuote.status === 'UNDER_REVIEW' || selectedQuote.status === 'QUOTED') && (
                      <button
                        type="button"
                        className="btn btn-primary btn-xs inline-flex items-center gap-1"
                        onClick={() => setRespondAction('QUOTE')}
                      >
                        <span className="material-symbols-outlined text-xs">request_quote</span>
                        {selectedQuote.status === 'QUOTED' ? 'Revise Quote' : 'Provide Quote'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Messages Box */}
                <div className="p-3 bg-surface rounded border border-border max-h-52 overflow-y-auto space-y-2 text-xs">
                  {selectedQuote.messages && selectedQuote.messages.length > 0 ? (
                    selectedQuote.messages.map((m) => {
                      const isOwner = m.senderRole === 'OWNER';
                      return (
                        <div
                          key={m.id}
                          className={`p-2.5 rounded ${
                            isOwner
                              ? 'bg-primary/10 border border-primary/20 text-white ml-6'
                              : 'bg-surface-raised border border-border text-white mr-6'
                          }`}
                        >
                          <div className="flex justify-between items-center text-3xs text-muted mb-1">
                            <span className="font-bold text-white">
                              {isOwner ? 'You (Workshop Owner)' : m.senderName}
                            </span>
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div>{m.messageText}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-xs text-muted">
                      No communication history yet. Send a message to the customer below.
                    </div>
                  )}
                </div>

                {/* Send Reply Input */}
                <form onSubmit={handleSendOwnerReply} className="flex gap-2">
                  <input
                    type="text"
                    className="input text-xs flex-1"
                    placeholder="Type a message or question to the vehicle owner..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={replyLoading}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm flex items-center gap-1"
                    disabled={replyLoading || !replyText.trim()}
                  >
                    {replyLoading ? (
                      'Sending...'
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">send</span>
                        Send
                      </>
                    )}
                  </button>
                </form>

                <div className="flex justify-end pt-2 border-t border-border">
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    onClick={() => {
                      setSelectedQuote(null);
                      setRespondAction(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
