import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
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
} from '../api/types';
import { Alert } from '../components/Alert';

export const OwnerDashboardPage: React.FC = () => {
  const { user, isAdmin, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const slugParam = searchParams.get('slug') || '';

  const [myGarages, setMyGarages] = useState<GarageSummaryDto[]>([]);
  const [garageInput, setGarageInput] = useState(slugParam);
  const [activeGarage, setActiveGarage] = useState<GarageDetailDto | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'edits' | 'photos' | 'documents' | 'services'>('overview');

  // Loading & Global Status
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

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

  // Photos Data
  const [photos, setPhotos] = useState<GaragePhotoDto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Documents Data
  const [documents, setDocuments] = useState<GarageDocumentDto[]>([]);
  const [docType, setDocType] = useState<DocumentType>('TRADE_LICENSE');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Services Data
  const [allServices, setAllServices] = useState<ServiceDto[]>([]);
  const [garageServices, setGarageServices] = useState<GarageServiceDto[]>([]);
  const [updatingServiceId, setUpdatingServiceId] = useState<number | null>(null);

  // Load garage details
  const loadGarage = useCallback(async (slug: string) => {
    if (!slug.trim()) return;
    try {
      setLoading(true);
      setGlobalError(null);
      const data = await api.garages.getBySlug(slug.trim());
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
      const [editsRes, docsRes, allServicesRes] = await Promise.all([
        api.garageManagement.getProfileEdits(data.id).catch(() => []),
        api.garageManagement.getDocuments(data.id).catch(() => []),
        api.services.list().catch(() => []),
      ]);

      setProfileEdits(editsRes);
      setDocuments(docsRes);
      setAllServices(allServicesRes);
    } catch (err: any) {
      setGlobalError(err.message || 'Unable to load workshop details. Ensure the garage slug is correct.');
      setActiveGarage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser().catch(() => {});
    api.garageManagement
      .getMyGarages()
      .then((garages) => {
        setMyGarages(garages || []);
        if (!slugParam && garages && garages.length > 0) {
          setGarageInput(garages[0].slug);
          setSearchParams({ slug: garages[0].slug });
        }
      })
      .catch(() => {});
  }, [slugParam, setSearchParams, refreshUser]);

  useEffect(() => {
    if (slugParam) {
      setGarageInput(slugParam);
      loadGarage(slugParam);
    }
  }, [slugParam, loadGarage]);

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (garageInput.trim()) {
      setSearchParams({ slug: garageInput.trim() });
    }
  };

  // Submit Profile Edit Proposal
  const handleProfileEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGarage) return;

    try {
      setEditSubmitting(true);
      setGlobalError(null);

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
      setGlobalSuccess('Profile edit proposal submitted for administrative approval.');
      const edits = await api.garageManagement.getProfileEdits(activeGarage.id);
      setProfileEdits(edits);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to submit profile edit proposal');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGarage) return;

    try {
      setUploadingPhoto(true);
      setPhotoError(null);
      const isCover = photos.length === 0;
      const newPhoto = await api.garageManagement.uploadPhoto(
        activeGarage.id,
        file,
        photoCaption.trim() || undefined,
        isCover
      );
      setPhotos([...photos, newPhoto]);
      setPhotoCaption('');
      setGlobalSuccess('Workshop photo uploaded successfully.');
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to upload photo. Max size is 5MB.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // Photo Cover Set
  const handleSetCoverPhoto = async (photoId: number) => {
    if (!activeGarage) return;
    try {
      await api.garageManagement.setCoverPhoto(activeGarage.id, photoId);
      setPhotos(
        photos.map((p) => ({
          ...p,
          isCover: p.id === photoId,
        }))
      );
      setGlobalSuccess('Cover photo updated.');
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to set cover photo');
    }
  };

  // Photo Delete
  const handleDeletePhoto = async (photoId: number) => {
    if (!activeGarage || !window.confirm('Delete this photo?')) return;
    try {
      await api.garageManagement.deletePhoto(activeGarage.id, photoId);
      setPhotos(photos.filter((p) => p.id !== photoId));
      setGlobalSuccess('Photo removed.');
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to delete photo');
    }
  };

  // Document Upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeGarage) return;

    try {
      setUploadingDoc(true);
      setDocError(null);
      const newDoc = await api.garageManagement.uploadDocument(activeGarage.id, file, docType);
      setDocuments([...documents, newDoc]);
      setGlobalSuccess('Verification document uploaded securely.');
    } catch (err: any) {
      setDocError(err.message || 'Failed to upload document. Allowed types: PDF, JPG, PNG up to 10MB.');
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
        setGlobalSuccess(`Removed ${svc.name} from offered services.`);
      } else {
        const added = await api.garageManagement.associateService(activeGarage.id, {
          serviceId: svc.id,
          startingPrice: undefined,
          isAvailable: true,
        });
        setGarageServices([...garageServices, added]);
        setGlobalSuccess(`Added ${svc.name} to offered services.`);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to update service association');
    } finally {
      setUpdatingServiceId(null);
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

      {/* Workshop Slug Selector & Quick Select */}
      <div className="card p-4 mb-6">
        {myGarages.length > 0 && (
          <div className="mb-4 pb-3 border-b border-border">
            <span className="text-xs font-semibold text-secondary block mb-2">
              Your Registered Workshops:
            </span>
            <div className="flex gap-2 flex-wrap">
              {myGarages.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`btn btn-xs ${activeGarage?.slug === g.slug ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setGarageInput(g.slug);
                    setSearchParams({ slug: g.slug });
                  }}
                >
                  🛠️ {g.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleLookupSubmit} className="flex gap-3 items-center flex-wrap">
          <label htmlFor="garage-slug-input" className="text-sm font-semibold whitespace-nowrap">
            Workshop Identifier (Slug):
          </label>
          <input
            id="garage-slug-input"
            type="text"
            className="form-control flex-1 max-w-md"
            placeholder="e.g. speedline-auto-workshop"
            value={garageInput}
            onChange={(e) => setGarageInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Load Workshop
          </button>
        </form>
      </div>

      {globalSuccess && (
        <Alert
          type="success"
          message={globalSuccess}
          onClose={() => setGlobalSuccess(null)}
          className="mb-4"
        />
      )}
      {globalError && (
        <Alert
          type="error"
          message={globalError}
          onClose={() => setGlobalError(null)}
          className="mb-4"
        />
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
                      <label className="form-label">City *</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        value={editCity}
                        onChange={(e) => setEditCity(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">State *</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        value={editState}
                        onChange={(e) => setEditState(e.target.value)}
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
                  <h3 className="section-title text-base">Workshop Photo Gallery</h3>
                  <p className="text-xs text-secondary">
                    Upload up to 10 high-resolution photos of your garage entrance, workshop bays, and diagnostic equipment.
                  </p>
                </div>
              </div>

              {photoError && <Alert type="error" message={photoError} className="mb-4" />}

              {/* Upload controls */}
              <div className="p-4 bg-surface rounded mb-6 flex gap-4 items-center flex-wrap">
                <div className="form-group mb-0 flex-1">
                  <label className="form-label text-xs">Photo Caption (Optional)</label>
                  <input
                    type="text"
                    className="form-control text-xs"
                    placeholder="e.g. Workshop Entrance, Hydraulic Lift"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                  />
                </div>
                <div>
                  <label className="btn btn-primary btn-sm cursor-pointer mt-4">
                    {uploadingPhoto ? 'Uploading...' : '+ Upload Photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingPhoto || photos.length >= 10}
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>
              </div>

              {photos.length === 0 ? (
                <div className="p-8 text-center text-muted border border-dashed border-border rounded">
                  No workshop photos uploaded yet. (Max 10 photos, JPG/PNG, 5MB max).
                </div>
              ) : (
                <div className="grid grid-3 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="photo-card card p-2 bg-surface">
                      <div className="relative aspect-video overflow-hidden rounded mb-2">
                        <img
                          src={api.garages.getPhotoUrl(activeGarage.id, photo.id)}
                          alt={photo.caption || 'Workshop photo'}
                          className="w-full h-full object-cover"
                        />
                        {photo.isCover && (
                          <span className="badge badge-accent absolute top-2 left-2">
                            Cover Photo
                          </span>
                        )}
                      </div>

                      {photo.caption && (
                        <p className="text-xs text-muted mb-2 truncate">{photo.caption}</p>
                      )}

                      <div className="flex-between items-center pt-2">
                        {!photo.isCover ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => handleSetCoverPhoto(photo.id)}
                          >
                            Set as Cover
                          </button>
                        ) : (
                          <span className="text-xs text-accent">Default Cover</span>
                        )}

                        <button
                          type="button"
                          className="btn btn-danger btn-xs"
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          Delete
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
                {docError && <Alert type="error" message={docError} className="mt-3" />}
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
    </div>
  );
};
