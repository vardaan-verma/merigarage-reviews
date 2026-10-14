import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type {
  GarageSummaryDto,
  GarageProfileEditDto,
  GarageClaimDto,
  GarageDocumentDto,
  ServiceDto,
  ServiceCategory,
} from '../api/types';
import { Alert } from '../components/Alert';
import { Modal } from '../components/Modal';

export const AdminDashboardPage: React.FC = () => {
  const { user, hasRole, hasPermission } = useAuth();

  const isAdmin = hasRole('ROLE_ADMIN');
  const hasExplicitPerms = !!(user?.permissions && user.permissions.length > 0);
  const canApproveGarages = hasPermission('GARAGE_APPROVAL') || (isAdmin && !hasExplicitPerms);
  const canManageClaims = hasPermission('CLAIM_MANAGEMENT') || (isAdmin && !hasExplicitPerms);
  const canReviewDocs = hasPermission('VERIFICATION_REVIEW') || (isAdmin && !hasExplicitPerms);
  const canModerateContent = hasPermission('CONTENT_MODERATION') || (isAdmin && !hasExplicitPerms);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'garages' | 'edits' | 'claims' | 'documents' | 'moderation' | 'services'>(
    canApproveGarages ? 'garages' : canManageClaims ? 'claims' : canReviewDocs ? 'documents' : 'moderation'
  );

  // Global feedback (for top-level actions / success)
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  // Tab 1: Pending Garages
  const [pendingGarages, setPendingGarages] = useState<GarageSummaryDto[]>([]);
  const [loadingGarages, setLoadingGarages] = useState(false);
  const [garagesError, setGaragesError] = useState<string | null>(null);

  // Tab 2: Pending Edits
  const [pendingEdits, setPendingEdits] = useState<GarageProfileEditDto[]>([]);
  const [loadingEdits, setLoadingEdits] = useState(false);
  const [editsError, setEditsError] = useState<string | null>(null);

  // Tab 3: Pending Claims
  const [pendingClaims, setPendingClaims] = useState<GarageClaimDto[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [claimsError, setClaimsError] = useState<string | null>(null);

  // Tab 4: Verification Documents
  const [docGarageIdInput, setDocGarageIdInput] = useState('');
  const [loadedDocs, setLoadedDocs] = useState<GarageDocumentDto[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  // Tab 5: Content Moderation
  const [modReviewId, setModReviewId] = useState('');
  const [modReason, setModReason] = useState('');
  const [modSubmitting, setModSubmitting] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  // Tab 6: Master Services
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState<ServiceCategory>('PERIODIC_MAINTENANCE');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [creatingService, setCreatingService] = useState(false);

  // Generic Decision Modal State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [actionRequiredNotes, setActionRequiredNotes] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const onConfirmRef = useRef<((notes: string) => Promise<void>) | null>(null);

  // Fetch pending garages
  const fetchPendingGarages = useCallback(async () => {
    if (!canApproveGarages) return;
    try {
      setLoadingGarages(true);
      setGaragesError(null);
      const data = await api.admin.getPendingGarages();
      setPendingGarages(data || []);
    } catch (err: any) {
      setGaragesError(err.message || 'Failed to load pending garages');
    } finally {
      setLoadingGarages(false);
    }
  }, [canApproveGarages]);

  // Fetch pending profile edits
  const fetchPendingEdits = useCallback(async () => {
    if (!canApproveGarages) return;
    try {
      setLoadingEdits(true);
      setEditsError(null);
      const data = await api.admin.getPendingProfileEdits();
      setPendingEdits(data || []);
    } catch (err: any) {
      setEditsError(err.message || 'Failed to load pending profile edits');
    } finally {
      setLoadingEdits(false);
    }
  }, [canApproveGarages]);

  // Fetch pending claims
  const fetchPendingClaims = useCallback(async () => {
    if (!canManageClaims) return;
    try {
      setLoadingClaims(true);
      setClaimsError(null);
      const data = await api.admin.getPendingClaims();
      setPendingClaims(data || []);
    } catch (err: any) {
      setClaimsError(err.message || 'Failed to load pending claims');
    } finally {
      setLoadingClaims(false);
    }
  }, [canManageClaims]);

  // Fetch services
  const fetchServices = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoadingServices(true);
      setServicesError(null);
      const data = await api.services.list();
      setServices(data || []);
    } catch (err: any) {
      setServicesError(err.message || 'Failed to load services catalogue');
    } finally {
      setLoadingServices(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchPendingGarages();
    fetchPendingEdits();
    fetchPendingClaims();
    fetchServices();
  }, [fetchPendingGarages, fetchPendingEdits, fetchPendingClaims, fetchServices]);

  // Open Decision Modal
  const openDecisionModal = (
    title: string,
    description: string,
    requireNotes: boolean,
    onConfirm: (notes: string) => Promise<void>
  ) => {
    onConfirmRef.current = onConfirm;
    setActionTitle(title);
    setActionDescription(description);
    setActionRequiredNotes(requireNotes);
    setActionNotes('');
    setModalError(null);
    setActionModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (actionRequiredNotes && !actionNotes.trim()) {
      setModalError('Please provide decision notes.');
      return;
    }
    if (!onConfirmRef.current) return;

    try {
      setActionSubmitting(true);
      setModalError(null);
      setGlobalError(null);
      await onConfirmRef.current(actionNotes.trim());
      setActionModalOpen(false);
      setGlobalSuccess('Administrative decision processed successfully.');
    } catch (err: any) {
      setModalError(err.message || 'Action failed.');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Garages Actions
  const handleApproveGarage = (g: GarageSummaryDto) => {
    openDecisionModal(
      `Approve Garage: ${g.name}`,
      'This garage listing will be marked as APPROVED and become publicly searchable.',
      false,
      async (notes) => {
        await api.admin.approveGarage(g.id, notes);
        fetchPendingGarages();
      }
    );
  };

  const handleRejectGarage = (g: GarageSummaryDto) => {
    openDecisionModal(
      `Reject Garage: ${g.name}`,
      'Please state why this listing was rejected. The submitter will receive this feedback.',
      true,
      async (notes) => {
        await api.admin.rejectGarage(g.id, notes);
        fetchPendingGarages();
      }
    );
  };

  const handleToggleVerified = async (g: GarageSummaryDto) => {
    try {
      await api.admin.setVerified(g.id, !g.isVerified, 'Admin verification toggle');
      setGlobalSuccess(`Updated verification status for ${g.name}.`);
      fetchPendingGarages();
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to update verification status');
    }
  };

  // Profile Edits Actions
  const handleApproveEdit = (edit: GarageProfileEditDto) => {
    openDecisionModal(
      `Approve Profile Edit #${edit.id}`,
      `Approve proposed changes for Garage #${edit.garageId}: new name "${edit.proposedName}".`,
      false,
      async (notes) => {
        await api.admin.approveProfileEdit(edit.id, notes);
        fetchPendingEdits();
      }
    );
  };

  const handleRejectEdit = (edit: GarageProfileEditDto) => {
    openDecisionModal(
      `Reject Profile Edit #${edit.id}`,
      'Please provide the reason for rejecting this profile modification.',
      true,
      async (notes) => {
        await api.admin.rejectProfileEdit(edit.id, notes);
        fetchPendingEdits();
      }
    );
  };

  // Claims Actions
  const handleApproveClaim = (claim: GarageClaimDto) => {
    openDecisionModal(
      `Approve Ownership Claim #${claim.id}`,
      `Grant ownership of "${claim.garageName}" (Garage #${claim.garageId}) to User #${claim.claimantUserId} (${claim.claimantEmail}).`,
      false,
      async (notes) => {
        await api.admin.approveClaim(claim.id, notes);
        fetchPendingClaims();
      }
    );
  };

  const handleRejectClaim = (claim: GarageClaimDto) => {
    openDecisionModal(
      `Reject Ownership Claim #${claim.id}`,
      'Please provide the reason for rejecting this ownership claim.',
      true,
      async (notes) => {
        await api.admin.rejectClaim(claim.id, notes);
        fetchPendingClaims();
      }
    );
  };

  // Document Review Actions
  const handleLoadGarageDocs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const gId = parseInt(docGarageIdInput.trim(), 10);
    if (!gId) return;

    try {
      setLoadingDocs(true);
      setDocsError(null);
      const docs = await api.admin.getDocumentsForGarage(gId);
      setLoadedDocs(docs || []);
    } catch (err: any) {
      setDocsError(err.message || 'Failed to load garage verification documents');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleReviewDocument = async (docId: number, status: 'VERIFIED' | 'REJECTED') => {
    const reason = status === 'REJECTED' ? prompt('Enter rejection reason:') : undefined;
    if (status === 'REJECTED' && !reason) return;

    try {
      await api.admin.reviewDocument(docId, status, reason || undefined);
      setGlobalSuccess(`Document status updated to ${status}.`);
      if (docGarageIdInput) {
        const docs = await api.admin.getDocumentsForGarage(parseInt(docGarageIdInput, 10));
        setLoadedDocs(docs || []);
      }
    } catch (err: any) {
      setDocsError(err.message || 'Failed to update document status');
    }
  };

  // Moderation Soft Delete
  const handleModerateReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const revId = parseInt(modReviewId.trim(), 10);
    if (!revId || !modReason.trim()) return;

    try {
      setModSubmitting(true);
      setModerationError(null);
      await api.admin.softDeleteReview(revId, modReason.trim());
      setGlobalSuccess(`Review #${revId} was successfully soft-deleted.`);
      setModReviewId('');
      setModReason('');
    } catch (err: any) {
      setModerationError(err.message || 'Moderation action failed');
    } finally {
      setModSubmitting(false);
    }
  };

  // Create Service
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    try {
      setCreatingService(true);
      await api.admin.createService({
        name: newServiceName.trim(),
        category: newServiceCategory,
        description: newServiceDesc.trim() || undefined,
        isActive: true,
      });
      setGlobalSuccess('New master service created successfully.');
      setNewServiceName('');
      setNewServiceDesc('');
      fetchServices();
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to create service');
    } finally {
      setCreatingService(false);
    }
  };

  return (
    <div className="container py-8 max-w-6xl">
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Administrator Management Console</h1>
          <span className="badge badge-danger">Authorized</span>
        </div>
        <p className="text-secondary text-sm">
          Platform-level governance, garage listing audits, ownership transfer review, and content moderation.
        </p>
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

      {/* Admin Tabs */}
      <div className="tabs mb-6 flex border-b border-border overflow-x-auto">
        {canApproveGarages && (
          <button
            type="button"
            className={`tab-btn px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'garages' ? 'border-primary text-primary' : 'border-transparent text-secondary'
            }`}
            onClick={() => setActiveTab('garages')}
          >
            Pending Garages {garagesError ? '(!)' : `(${pendingGarages.length})`}
          </button>
        )}

        {canApproveGarages && (
          <button
            type="button"
            className={`tab-btn px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'edits' ? 'border-primary text-primary' : 'border-transparent text-secondary'
            }`}
            onClick={() => setActiveTab('edits')}
          >
            Profile Edits {editsError ? '(!)' : `(${pendingEdits.length})`}
          </button>
        )}

        {canManageClaims && (
          <button
            type="button"
            className={`tab-btn px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'claims' ? 'border-primary text-primary' : 'border-transparent text-secondary'
            }`}
            onClick={() => setActiveTab('claims')}
          >
            Ownership Claims {claimsError ? '(!)' : `(${pendingClaims.length})`}
          </button>
        )}

        {canReviewDocs && (
          <button
            type="button"
            className={`tab-btn px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'documents' ? 'border-primary text-primary' : 'border-transparent text-secondary'
            }`}
            onClick={() => setActiveTab('documents')}
          >
            Document Verification {docsError ? '(!)' : ''}
          </button>
        )}

        {canModerateContent && (
          <button
            type="button"
            className={`tab-btn px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'moderation' ? 'border-primary text-primary' : 'border-transparent text-secondary'
            }`}
            onClick={() => setActiveTab('moderation')}
          >
            Review Moderation {moderationError ? '(!)' : ''}
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            className={`tab-btn px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === 'services' ? 'border-primary text-primary' : 'border-transparent text-secondary'
            }`}
            onClick={() => setActiveTab('services')}
          >
            Master Services {servicesError ? '(!)' : `(${services.length})`}
          </button>
        )}
      </div>

      {/* Tab 1: Pending Garages */}
      {activeTab === 'garages' && (
        <div className="card p-6">
          <div className="flex-between items-center mb-4">
            <h3 className="section-title text-base">Pending Workshop Listings Queue</h3>
            <button type="button" className="btn btn-secondary btn-xs" onClick={fetchPendingGarages}>
              Refresh
            </button>
          </div>

          {garagesError && (
            <div className="mb-4 p-4 border border-danger/30 rounded bg-danger/5">
              <Alert type="error" message={garagesError} className="mb-3" />
              <button type="button" className="btn btn-primary btn-xs" onClick={fetchPendingGarages}>
                Retry Loading Pending Garages
              </button>
            </div>
          )}

          {loadingGarages ? (
            <div className="center-loader py-8">
              <div className="spinner"></div>
            </div>
          ) : !garagesError && pendingGarages.length === 0 ? (
            <p className="text-xs text-muted text-center py-8">
              No pending garage submissions awaiting review. Queue is clear!
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Garage Name</th>
                    <th>Location</th>
                    <th>Phone</th>
                    <th>Verified Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingGarages.map((g) => (
                    <tr key={g.id}>
                      <td className="font-mono text-xs">#{g.id}</td>
                      <td>
                        <strong>{g.name}</strong>
                        <span className="block text-xs text-muted">Slug: {g.slug}</span>
                      </td>
                      <td className="text-xs">
                        {g.addressLine1}, {g.city}, {g.state}
                      </td>
                      <td className="font-mono text-xs">{g.phoneNumber}</td>
                      <td>
                        <button
                          type="button"
                          className={`badge cursor-pointer ${g.isVerified ? 'badge-verified' : 'badge-warning'}`}
                          onClick={() => handleToggleVerified(g)}
                          title="Click to toggle verified badge"
                        >
                          {g.isVerified ? '✓ Verified' : 'Unverified'}
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn btn-success btn-xs"
                            onClick={() => handleApproveGarage(g)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={() => handleRejectGarage(g)}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Profile Edits */}
      {activeTab === 'edits' && (
        <div className="card p-6">
          <div className="flex-between items-center mb-4">
            <h3 className="section-title text-base">Pending Profile Modification Proposals</h3>
            <button type="button" className="btn btn-secondary btn-xs" onClick={fetchPendingEdits}>
              Refresh
            </button>
          </div>

          {editsError && (
            <div className="mb-4 p-4 border border-danger/30 rounded bg-danger/5">
              <Alert type="error" message={editsError} className="mb-3" />
              <button type="button" className="btn btn-primary btn-xs" onClick={fetchPendingEdits}>
                Retry Loading Profile Edits
              </button>
            </div>
          )}

          {loadingEdits ? (
            <div className="center-loader py-8">
              <div className="spinner"></div>
            </div>
          ) : !editsError && pendingEdits.length === 0 ? (
            <p className="text-xs text-muted text-center py-8">
              No pending profile edits to review.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingEdits.map((edit) => (
                <div key={edit.id} className="p-4 bg-surface rounded text-xs space-y-2">
                  <div className="flex-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        Proposal #{edit.id} for Garage #{edit.garageId}
                      </h4>
                      <span className="text-muted">
                        Submitted: {new Date(edit.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-success btn-xs"
                        onClick={() => handleApproveEdit(edit)}
                      >
                        Approve Revisions
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        onClick={() => handleRejectEdit(edit)}
                      >
                        Reject Revisions
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-2 gap-4 p-3 bg-surface-raised rounded">
                    <div>
                      <span className="text-muted block">Proposed Name:</span>
                      <strong>{edit.proposedName}</strong>
                    </div>
                    <div>
                      <span className="text-muted block">Proposed Location:</span>
                      <span>
                        {edit.proposedAddressLine1}, {edit.proposedCity}, {edit.proposedState} {edit.proposedPostalCode}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block">Proposed Phone:</span>
                      <span className="font-mono">{edit.proposedPhoneNumber}</span>
                    </div>
                    <div>
                      <span className="text-muted block">Proposed Email:</span>
                      <span className="font-mono">{edit.proposedEmail || '—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Ownership Claims */}
      {activeTab === 'claims' && (
        <div className="card p-6">
          <div className="flex-between items-center mb-4">
            <h3 className="section-title text-base">Pending Ownership Claims Queue</h3>
            <button type="button" className="btn btn-secondary btn-xs" onClick={fetchPendingClaims}>
              Refresh
            </button>
          </div>

          {claimsError && (
            <div className="mb-4 p-4 border border-danger/30 rounded bg-danger/5">
              <Alert type="error" message={claimsError} className="mb-3" />
              <button type="button" className="btn btn-primary btn-xs" onClick={fetchPendingClaims}>
                Retry Loading Claims Queue
              </button>
            </div>
          )}

          {loadingClaims ? (
            <div className="center-loader py-8">
              <div className="spinner"></div>
            </div>
          ) : !claimsError && pendingClaims.length === 0 ? (
            <p className="text-xs text-muted text-center py-8">
              No ownership claims awaiting review.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingClaims.map((claim) => (
                <div key={claim.id} className="p-4 bg-surface rounded text-xs space-y-3">
                  <div className="flex-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        Claim #{claim.id} — "{claim.garageName}" (Garage #{claim.garageId})
                      </h4>
                      <span className="text-muted">
                        Claimant: User #{claim.claimantUserId} ({claim.claimantEmail}) •{' '}
                        {new Date(claim.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-success btn-xs"
                        onClick={() => handleApproveClaim(claim)}
                      >
                        Approve Transfer
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        onClick={() => handleRejectClaim(claim)}
                      >
                        Reject Claim
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-surface-raised rounded">
                    <span className="text-muted block mb-1">Claim Statement & Credentials:</span>
                    <p className="text-secondary leading-relaxed">{claim.claimMessage}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Verification Documents */}
      {activeTab === 'documents' && (
        <div className="card p-6">
          <div className="mb-6">
            <h3 className="section-title text-base">Inspect Private Verification Credentials</h3>
            <p className="text-xs text-secondary mt-1">
              Enter the numeric Garage ID to securely stream and audit trade licenses, tax documents, or identity proofs.
            </p>
          </div>

          <form onSubmit={handleLoadGarageDocs} className="flex gap-3 items-center flex-wrap mb-6">
            <label className="text-xs font-semibold">Garage ID:</label>
            <input
              type="number"
              required
              className="form-control text-xs max-w-xs"
              placeholder="e.g. 1"
              value={docGarageIdInput}
              onChange={(e) => setDocGarageIdInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={loadingDocs}>
              {loadingDocs ? 'Loading...' : 'Load Documents'}
            </button>
          </form>

          {docsError && (
            <div className="mb-4 p-4 border border-danger/30 rounded bg-danger/5">
              <Alert type="error" message={docsError} className="mb-3" />
              <button type="button" className="btn btn-primary btn-xs" onClick={() => handleLoadGarageDocs()}>
                Retry Loading Documents
              </button>
            </div>
          )}

          {loadedDocs.length === 0 ? (
            <p className="text-xs text-muted text-center py-6">
              No documents loaded. Enter a valid Garage ID to inspect.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Doc ID</th>
                    <th>Document Type</th>
                    <th>File Name & Size</th>
                    <th>Status</th>
                    <th>Download</th>
                    <th>Audit Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadedDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td className="font-mono text-xs">#{doc.id}</td>
                      <td className="text-xs font-semibold">{doc.documentType.replace('_', ' ')}</td>
                      <td className="text-xs">
                        {doc.originalFileName} ({Math.round(doc.fileSizeBytes / 1024)} KB)
                      </td>
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
                      <td>
                        <a
                          href={api.admin.getDocumentDownloadUrl(doc.id)}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="btn btn-outline btn-xs"
                        >
                          Download ↗
                        </a>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn btn-success btn-xs"
                            onClick={() => handleReviewDocument(doc.id, 'VERIFIED')}
                          >
                            Verify
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={() => handleReviewDocument(doc.id, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Review Moderation */}
      {activeTab === 'moderation' && (
        <div className="card p-6 max-w-xl">
          <div className="mb-4">
            <h3 className="section-title text-base">Content Moderation & Soft-Delete</h3>
            <p className="text-xs text-secondary mt-1">
              Remove offensive, abusive, or fraudulent reviews from public display.
            </p>
          </div>

          {moderationError && (
            <Alert type="error" message={moderationError} className="mb-4" />
          )}

          <form onSubmit={handleModerateReviewSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label text-xs">Review ID *</label>
              <input
                type="number"
                required
                className="form-control text-xs"
                placeholder="e.g. 42"
                value={modReviewId}
                onChange={(e) => setModReviewId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label text-xs">Audit Deletion Reason *</label>
              <textarea
                rows={3}
                required
                className="form-control text-xs"
                placeholder="e.g. Violates community terms, profanity, spam solicitation"
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-danger btn-sm"
              disabled={modSubmitting}
            >
              {modSubmitting ? 'Processing...' : 'Execute Soft-Delete'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 6: Master Services */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Add Service Box */}
          <div className="card p-6">
            <h3 className="section-title text-base mb-3">Add Master Catalogue Service</h3>
            <form onSubmit={handleCreateService} className="grid grid-3 gap-4 items-end">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Service Name *</label>
                <input
                  type="text"
                  required
                  className="form-control text-xs"
                  placeholder="e.g. Brake Fluid Flush"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs">Category *</label>
                <select
                  className="form-control text-xs"
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value as ServiceCategory)}
                >
                  <option value="PERIODIC_MAINTENANCE">Periodic Maintenance</option>
                  <option value="BODY_AND_PAINT">Body & Paint</option>
                  <option value="WHEELS_AND_TYRES">Wheels & Tyres</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="MECHANICAL_REPAIR">Mechanical Repair</option>
                </select>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs">Description</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  placeholder="Brief description"
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                />
              </div>

              <div className="col-span-3">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={creatingService}
                >
                  {creatingService ? 'Creating...' : '+ Create Master Service'}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Catalogue Table */}
          <div className="card p-6">
            <div className="flex-between items-center mb-4">
              <h3 className="section-title text-base">Existing Standard Services</h3>
              <button type="button" className="btn btn-secondary btn-xs" onClick={fetchServices}>
                Refresh
              </button>
            </div>

            {servicesError && (
              <div className="mb-4 p-4 border border-danger/30 rounded bg-danger/5">
                <Alert type="error" message={servicesError} className="mb-3" />
                <button type="button" className="btn btn-primary btn-xs" onClick={fetchServices}>
                  Retry Loading Services
                </button>
              </div>
            )}

            {loadingServices ? (
              <div className="center-loader py-8">
                <div className="spinner"></div>
              </div>
            ) : !servicesError && services.length === 0 ? (
              <p className="text-xs text-muted text-center py-6">
                No services registered in master catalogue.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Service Name</th>
                      <th>Category</th>
                      <th>Slug</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((svc) => (
                      <tr key={svc.id}>
                        <td className="font-mono text-xs">#{svc.id}</td>
                        <td className="font-bold text-xs">{svc.name}</td>
                        <td className="text-xs text-muted">{svc.category.replace('_', ' ')}</td>
                        <td className="font-mono text-xs text-muted">{svc.slug}</td>
                        <td>
                          <span className={`badge ${svc.isActive ? 'badge-success' : 'badge-warning'}`}>
                            {svc.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decision Modal */}
      <Modal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title={actionTitle}
      >
        <div className="space-y-4">
          {modalError && <Alert type="error" message={modalError} className="mb-3" />}
          <p className="text-xs text-secondary">{actionDescription}</p>

          <div className="form-group">
            <label className="form-label text-xs">
              Review Notes {actionRequiredNotes ? '*' : '(Optional)'}
            </label>
            <textarea
              rows={3}
              required={actionRequiredNotes}
              className="form-control text-xs"
              placeholder="Enter audit rationale, feedback, or verification remarks"
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
            />
          </div>

          <div className="modal-actions flex-between">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActionModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={actionSubmitting || (actionRequiredNotes && !actionNotes.trim())}
              onClick={handleConfirmAction}
            >
              {actionSubmitting ? 'Processing...' : 'Confirm Decision'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
