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
  AdminOverviewMetricsDto,
  AdminUserSummaryDto,
  AdminUserDetailDto,
  AdminGarageDetailDto,
  AdminQuoteSummaryDto,
  QuoteRequestDto,
  LeadEventDto,
  PagedResponse,
  UserStatus,
  QuoteRequestStatus,
  DocumentVerificationStatus,
  AdminAuditLogDto,
  AdminPermissionCode,
} from '../api/types';
import { Alert } from '../components/Alert';
import { Modal } from '../components/Modal';

type AdminTab =
  | 'garages_all'
  | 'garages_pending'
  | 'claims'
  | 'documents'
  | 'users'
  | 'leads'
  | 'quotes'
  | 'edits'
  | 'services'
  | 'export'
  | 'audit_logs';

export const AdminDashboardPage: React.FC = () => {
  const { user, hasRole, hasPermission } = useAuth();

  const isAdmin = hasRole('ROLE_ADMIN');
  const hasExplicitPerms = !!(user?.permissions && user.permissions.length > 0);
  const canApproveGarages = hasPermission('GARAGE_APPROVAL') || (isAdmin && !hasExplicitPerms);
  const canManageClaims = hasPermission('CLAIM_MANAGEMENT') || (isAdmin && !hasExplicitPerms);
  const canReviewDocs = hasPermission('VERIFICATION_REVIEW') || (isAdmin && !hasExplicitPerms);
  const canManageUsers = hasPermission('USER_MANAGEMENT') || (isAdmin && !hasExplicitPerms);
  const canAccessLeads = hasPermission('LEAD_ACCESS') || (isAdmin && !hasExplicitPerms);
  const canOversightQuotes = hasPermission('QUOTE_OVERSIGHT') || (isAdmin && !hasExplicitPerms);
  const canExportData = hasPermission('DATA_EXPORT') || (isAdmin && !hasExplicitPerms);

  // Active Portal Tab (Overview metrics are placed persistently above portal navigation)
  const [activeTab, setActiveTab] = useState<AdminTab>(
    canApproveGarages
      ? 'garages_all'
      : canManageUsers
      ? 'users'
      : canAccessLeads
      ? 'leads'
      : canOversightQuotes
      ? 'quotes'
      : canManageClaims
      ? 'claims'
      : 'documents'
  );

  const [showPlatformFeeds, setShowPlatformFeeds] = useState(false);

  // Global feedback
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  // -------------------------------------------------------------
  // TAB 1: Overview & Metrics
  // -------------------------------------------------------------
  const [overviewMetrics, setOverviewMetrics] = useState<AdminOverviewMetricsDto | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoadingOverview(true);
      setOverviewError(null);
      const data = await api.admin.getOverview();
      setOverviewMetrics(data);
    } catch (err: any) {
      setOverviewError(err.message || 'Failed to load platform overview metrics');
    } finally {
      setLoadingOverview(false);
    }
  }, [isAdmin]);

  // -------------------------------------------------------------
  // TAB 2: User Management
  // -------------------------------------------------------------
  const [usersData, setUsersData] = useState<PagedResponse<AdminUserSummaryDto>>({
    content: [],
    page: 0,
    size: 15,
    totalElements: 0,
    totalPages: 0,
    last: true,
  });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [userPage, setUserPage] = useState(0);

  // User detail modal
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserDetailDto | null>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);

  // User status change modal
  const [statusChangeUser, setStatusChangeUser] = useState<AdminUserSummaryDto | null>(null);
  const [targetUserStatus, setTargetUserStatus] = useState<UserStatus>('SUSPENDED');
  const [userStatusReason, setUserStatusReason] = useState('');
  const [submittingUserStatus, setSubmittingUserStatus] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalError, setStatusModalError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page: number = userPage) => {
    if (!canManageUsers) return;
    try {
      setLoadingUsers(true);
      setUsersError(null);
      const res = await api.admin.searchUsers({
        search: userSearch.trim() || undefined,
        role: userRoleFilter || undefined,
        status: userStatusFilter || undefined,
        page,
        size: 15,
      });
      setUsersData(res);
      setUserPage(res.page);
    } catch (err: any) {
      setUsersError(err.message || 'Failed to load user records');
    } finally {
      setLoadingUsers(false);
    }
  }, [canManageUsers, userPage, userSearch, userRoleFilter, userStatusFilter]);

  const handleInspectUser = async (userId: number) => {
    try {
      setLoadingUserDetail(true);
      setUserModalOpen(true);
      const detail = await api.admin.getUserDetail(userId);
      setSelectedUserDetail(detail);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to fetch user details');
      setUserModalOpen(false);
    } finally {
      setLoadingUserDetail(false);
    }
  };

  const openStatusChangeModal = (u: AdminUserSummaryDto) => {
    setStatusChangeUser(u);
    setTargetUserStatus(u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
    setUserStatusReason('');
    setStatusModalError(null);
    setStatusModalOpen(true);
  };

  const handleConfirmStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusChangeUser || !userStatusReason.trim()) {
      setStatusModalError('Please specify the justification for this account status change.');
      return;
    }
    try {
      setSubmittingUserStatus(true);
      setStatusModalError(null);
      await api.admin.updateUserStatus(statusChangeUser.id, {
        status: targetUserStatus,
        reason: userStatusReason.trim(),
      });
      setStatusModalOpen(false);
      setGlobalSuccess(`Successfully updated status for ${statusChangeUser.fullName} to ${targetUserStatus}.`);
      fetchUsers();
      if (overviewMetrics) fetchOverview();
    } catch (err: any) {
      setStatusModalError(err.message || 'Failed to update user status');
    } finally {
      setSubmittingUserStatus(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: Garage Management (All Garages Directory)
  // -------------------------------------------------------------
  const [allGaragesData, setAllGaragesData] = useState<PagedResponse<AdminGarageDetailDto>>({
    content: [],
    page: 0,
    size: 15,
    totalElements: 0,
    totalPages: 0,
    last: true,
  });
  const [loadingAllGarages, setLoadingAllGarages] = useState(false);
  const [allGaragesError, setAllGaragesError] = useState<string | null>(null);
  const [garageSearch, setGarageSearch] = useState('');
  const [garageStatusFilter, setGarageStatusFilter] = useState('');
  const [garageVerifiedFilter, setGarageVerifiedFilter] = useState('');
  const [garageCityFilter, setGarageCityFilter] = useState('');
  const [garagePage, setGaragePage] = useState(0);

  // Garage Detail Modal
  const [selectedGarageDetail, setSelectedGarageDetail] = useState<AdminGarageDetailDto | null>(null);
  const [loadingGarageDetail, setLoadingGarageDetail] = useState(false);
  const [garageModalOpen, setGarageModalOpen] = useState(false);

  const fetchAllGarages = useCallback(async (page: number = garagePage) => {
    if (!canApproveGarages) return;
    try {
      setLoadingAllGarages(true);
      setAllGaragesError(null);
      const res = await api.admin.searchAllGarages({
        search: garageSearch.trim() || undefined,
        status: garageStatusFilter || undefined,
        verified: garageVerifiedFilter ? garageVerifiedFilter === 'true' : undefined,
        city: garageCityFilter.trim() || undefined,
        page,
        size: 15,
      });
      setAllGaragesData(res);
      setGaragePage(res.page);
    } catch (err: any) {
      setAllGaragesError(err.message || 'Failed to load workshop directory');
    } finally {
      setLoadingAllGarages(false);
    }
  }, [canApproveGarages, garagePage, garageSearch, garageStatusFilter, garageVerifiedFilter, garageCityFilter]);

  const handleInspectGarage = async (garageId: number) => {
    try {
      setLoadingGarageDetail(true);
      setGarageModalOpen(true);
      const detail = await api.admin.getGarageDetail(garageId);
      setSelectedGarageDetail(detail);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to fetch workshop details');
      setGarageModalOpen(false);
    } finally {
      setLoadingGarageDetail(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 4: Leads & Search Events
  // -------------------------------------------------------------
  const [leadsData, setLeadsData] = useState<PagedResponse<LeadEventDto>>({
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    last: true,
  });
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [leadTypeFilter, setLeadTypeFilter] = useState('');
  const [leadSearch, setLeadSearch] = useState('');
  const [leadCityFilter, setLeadCityFilter] = useState('');
  const [leadUserFilter, setLeadUserFilter] = useState('');
  const [leadPage, setLeadPage] = useState(0);

  const fetchLeads = useCallback(async (page: number = leadPage) => {
    if (!canAccessLeads) return;
    try {
      setLoadingLeads(true);
      setLeadsError(null);
      const res = await api.leads.listAdmin({
        type: leadTypeFilter || undefined,
        search: leadSearch.trim() || undefined,
        city: leadCityFilter.trim() || undefined,
        hasUser: leadUserFilter ? leadUserFilter === 'true' : undefined,
        page,
        size: 20,
      });
      setLeadsData(res);
      setLeadPage(res.page);
    } catch (err: any) {
      setLeadsError(err.message || 'Failed to load lead and search activity');
    } finally {
      setLoadingLeads(false);
    }
  }, [canAccessLeads, leadPage, leadTypeFilter, leadSearch, leadCityFilter, leadUserFilter]);

  // -------------------------------------------------------------
  // TAB 5: Quote Requests Management
  // -------------------------------------------------------------
  const [quotesData, setQuotesData] = useState<PagedResponse<AdminQuoteSummaryDto>>({
    content: [],
    page: 0,
    size: 15,
    totalElements: 0,
    totalPages: 0,
    last: true,
  });
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('');
  const [quotePage, setQuotePage] = useState(0);

  // Quote Detail & Intervention Modal
  const [selectedQuoteDetail, setSelectedQuoteDetail] = useState<QuoteRequestDto | null>(null);
  const [loadingQuoteDetail, setLoadingQuoteDetail] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  const [quoteInterveneModal, setQuoteInterveneModal] = useState(false);
  const [interveneTargetStatus, setInterveneTargetStatus] = useState<QuoteRequestStatus>('CANCELLED');
  const [interveneReason, setInterveneReason] = useState('');
  const [submittingIntervention, setSubmittingIntervention] = useState(false);
  const [interveneError, setInterveneError] = useState<string | null>(null);

  const fetchQuotes = useCallback(async (page: number = quotePage) => {
    if (!canOversightQuotes) return;
    try {
      setLoadingQuotes(true);
      setQuotesError(null);
      const res = await api.admin.searchQuotes({
        search: quoteSearch.trim() || undefined,
        status: quoteStatusFilter || undefined,
        page,
        size: 15,
      });
      setQuotesData(res);
      setQuotePage(res.page);
    } catch (err: any) {
      setQuotesError(err.message || 'Failed to load quote requests');
    } finally {
      setLoadingQuotes(false);
    }
  }, [canOversightQuotes, quotePage, quoteSearch, quoteStatusFilter]);

  const handleInspectQuote = async (quoteId: number) => {
    try {
      setLoadingQuoteDetail(true);
      setQuoteModalOpen(true);
      const detail = await api.admin.getQuoteDetail(quoteId);
      setSelectedQuoteDetail(detail);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to fetch quote details');
      setQuoteModalOpen(false);
    } finally {
      setLoadingQuoteDetail(false);
    }
  };

  const handleConfirmQuoteIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteDetail || !interveneReason.trim()) {
      setInterveneError('Please provide administrative justification for this status change.');
      return;
    }
    try {
      setSubmittingIntervention(true);
      setInterveneError(null);
      const updated = await api.admin.updateQuoteStatus(selectedQuoteDetail.id, {
        status: interveneTargetStatus,
        reason: interveneReason.trim(),
      });
      setSelectedQuoteDetail(updated);
      setQuoteInterveneModal(false);
      setGlobalSuccess(`Successfully updated Quote #${updated.referenceNumber} to ${interveneTargetStatus}.`);
      fetchQuotes();
      if (overviewMetrics) fetchOverview();
    } catch (err: any) {
      setInterveneError(err.message || 'Failed to update quote status');
    } finally {
      setSubmittingIntervention(false);
    }
  };

  // -------------------------------------------------------------
  // EXISTING MODERATION QUEUES
  // -------------------------------------------------------------
  // Pending Garages
  const [pendingGarages, setPendingGarages] = useState<GarageSummaryDto[]>([]);
  const [loadingGarages, setLoadingGarages] = useState(false);
  const [garagesError, setGaragesError] = useState<string | null>(null);

  // Pending Edits
  const [pendingEdits, setPendingEdits] = useState<GarageProfileEditDto[]>([]);
  const [loadingEdits, setLoadingEdits] = useState(false);
  const [editsError, setEditsError] = useState<string | null>(null);

  // Pending Claims
  const [pendingClaims, setPendingClaims] = useState<GarageClaimDto[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [claimsError, setClaimsError] = useState<string | null>(null);

  // Verification Documents
  const [docGarageIdInput, setDocGarageIdInput] = useState('');
  const [loadedDocs, setLoadedDocs] = useState<GarageDocumentDto[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  // Master Services
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

  // -------------------------------------------------------------
  // TAB 13: Audit Trail (Phase 5)
  // -------------------------------------------------------------
  const [auditLogsData, setAuditLogsData] = useState<PagedResponse<AdminAuditLogDto>>({
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    last: true,
  });
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditTargetFilter, setAuditTargetFilter] = useState('');
  const [auditFromDate, setAuditFromDate] = useState('');
  const [auditToDate, setAuditToDate] = useState('');
  const [auditPage, setAuditPage] = useState(0);

  const fetchAuditLogs = useCallback(async (page: number = auditPage) => {
    if (!isAdmin) return;
    try {
      setLoadingAuditLogs(true);
      setAuditLogsError(null);
      const res = await api.admin.searchAuditLogs({
        actionType: auditActionFilter.trim() || undefined,
        targetType: auditTargetFilter.trim() || undefined,
        fromDate: auditFromDate ? `${auditFromDate}T00:00:00` : undefined,
        toDate: auditToDate ? `${auditToDate}T23:59:59` : undefined,
        page,
        size: 20,
      });
      setAuditLogsData(res);
      setAuditPage(res.page);
    } catch (err: any) {
      setAuditLogsError(err.message || 'Failed to load audit trail records');
    } finally {
      setLoadingAuditLogs(false);
    }
  }, [isAdmin, auditPage, auditActionFilter, auditTargetFilter, auditFromDate, auditToDate]);

  // Role & Permission Management (Phase 5)
  const [managingRoleOrPerm, setManagingRoleOrPerm] = useState(false);

  const handleToggleUserPermission = async (targetUserId: number, permission: AdminPermissionCode, currentHasPerm: boolean) => {
    try {
      setManagingRoleOrPerm(true);
      setGlobalError(null);
      const updated = await api.admin.manageUserPermission(targetUserId, {
        permission,
        action: currentHasPerm ? 'REVOKE' : 'GRANT',
      });
      setSelectedUserDetail(updated);
      setGlobalSuccess(`Successfully ${currentHasPerm ? 'revoked' : 'granted'} permission ${permission}.`);
      fetchUsers();
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to update user permission');
    } finally {
      setManagingRoleOrPerm(false);
    }
  };

  // Load overview metrics on mount and when admin changes
  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Initial load depending on active tab
  useEffect(() => {
    if (activeTab === 'users') fetchUsers(0);
    if (activeTab === 'garages_all') fetchAllGarages(0);
    if (activeTab === 'leads') fetchLeads(0);
    if (activeTab === 'quotes') fetchQuotes(0);
    if (activeTab === 'garages_pending') fetchPendingGarages();
    if (activeTab === 'edits') fetchPendingEdits();
    if (activeTab === 'claims') fetchPendingClaims();
    if (activeTab === 'documents') {
      if (allGaragesData.content.length === 0) fetchAllGarages(0);
    }
    if (activeTab === 'services') fetchServices();
    if (activeTab === 'audit_logs') fetchAuditLogs(0);
  }, [
    activeTab,
    fetchUsers,
    fetchAllGarages,
    fetchLeads,
    fetchQuotes,
    fetchPendingGarages,
    fetchPendingEdits,
    fetchPendingClaims,
    fetchServices,
    fetchAuditLogs,
    allGaragesData.content.length,
  ]);

  // Modal helper
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
      if (overviewMetrics) fetchOverview();
    } catch (err: any) {
      setModalError(err.message || 'Action failed.');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Decisions
  const handleApproveGarage = (g: GarageSummaryDto | AdminGarageDetailDto) => {
    openDecisionModal(
      `Approve Workshop: ${g.name}`,
      'This garage listing will be marked as APPROVED and become publicly searchable.',
      false,
      async (notes) => {
        await api.admin.approveGarage(g.id, notes);
        fetchPendingGarages();
        if (activeTab === 'garages_all') fetchAllGarages();
      }
    );
  };

  const handleRejectGarage = (g: GarageSummaryDto | AdminGarageDetailDto) => {
    openDecisionModal(
      `Reject Workshop: ${g.name}`,
      'Please state why this listing was rejected. The submitter will receive this feedback.',
      true,
      async (notes) => {
        await api.admin.rejectGarage(g.id, notes);
        fetchPendingGarages();
        if (activeTab === 'garages_all') fetchAllGarages();
      }
    );
  };

  const handleSuspendGarage = (g: AdminGarageDetailDto) => {
    openDecisionModal(
      `Suspend Workshop: ${g.name}`,
      'Please provide the administrative justification for suspending this workshop.',
      true,
      async (notes) => {
        await api.admin.suspendGarage(g.id, notes);
        fetchAllGarages();
        if (selectedGarageDetail && selectedGarageDetail.id === g.id) {
          handleInspectGarage(g.id);
        }
      }
    );
  };

  const handleToggleVerified = async (g: GarageSummaryDto | AdminGarageDetailDto) => {
    try {
      await api.admin.setVerified(g.id, !g.isVerified, 'Admin verification toggle');
      setGlobalSuccess(`Updated verification status for ${g.name}.`);
      fetchPendingGarages();
      if (activeTab === 'garages_all') fetchAllGarages();
      if (selectedGarageDetail && selectedGarageDetail.id === g.id) {
        handleInspectGarage(g.id);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to update verification status');
    }
  };

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

  const canApproveClaim = (claim: GarageClaimDto): { canApprove: boolean; reason?: string } => {
    if (!claim.documents || claim.documents.length === 0) {
      return { canApprove: false, reason: 'No ownership verification documents attached.' };
    }
    const hasUnverified = claim.documents.some((d) => d.verificationStatus === 'PENDING');
    if (hasUnverified) {
      return { canApprove: false, reason: 'One or more required documents are still pending verification.' };
    }
    const hasRejected = claim.documents.some((d) => d.verificationStatus === 'REJECTED');
    if (hasRejected) {
      return { canApprove: false, reason: 'Claim contains rejected documents. Cannot approve.' };
    }
    return { canApprove: true };
  };

  const handleApproveClaim = (claim: GarageClaimDto) => {
    const check = canApproveClaim(claim);
    if (!check.canApprove) {
      setGlobalError(`Approval Blocked: ${check.reason}`);
      return;
    }

    openDecisionModal(
      `Approve Ownership Claim #${claim.id}`,
      `Grant ownership of "${claim.garageName}" (Garage #${claim.garageId}) to User #${claim.claimantUserId} (${claim.claimantEmail}). All ${claim.documents?.length || 0} required documents have been verified. Competing claims for this workshop will be automatically superseded.`,
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
      'Please provide the reason for rejecting this ownership claim. Attached unverified documents will be marked rejected.',
      true,
      async (notes) => {
        await api.admin.rejectClaim(claim.id, notes);
        fetchPendingClaims();
      }
    );
  };

  const handleRequestClaimResubmission = (claim: GarageClaimDto) => {
    openDecisionModal(
      `Request Document Resubmission for Claim #${claim.id}`,
      'Specify the missing, unreadable, or invalid documents the claimant must re-submit.',
      true,
      async (notes) => {
        await api.admin.requestClaimResubmission(claim.id, notes);
        fetchPendingClaims();
      }
    );
  };

  const handleReviewClaimDoc = async (
    claimId: number,
    docId: number,
    status: DocumentVerificationStatus
  ) => {
    let rejectionReason: string | undefined = undefined;
    if (status === 'REJECTED') {
      const reason = prompt('Please enter the reason for rejecting this document (e.g. illegible scan, expired license):');
      if (!reason || !reason.trim()) return;
      rejectionReason = reason.trim();
    }

    try {
      await api.admin.reviewClaimDocument(claimId, docId, status, rejectionReason);
      setGlobalSuccess(`Document verification status updated to ${status}.`);
      fetchPendingClaims();
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to update document verification status');
    }
  };

  const handleDownloadClaimDoc = async (claimId: number, docId: number, fileName: string) => {
    try {
      await api.admin.downloadClaimDocument(claimId, docId, fileName);
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to open claim document');
    }
  };

  const handleLoadGarageDocs = async (targetOrEvent?: number | React.FormEvent) => {
    let gId: number | null = null;
    if (typeof targetOrEvent === 'number') {
      gId = targetOrEvent;
      setDocGarageIdInput(String(targetOrEvent));
    } else {
      if (targetOrEvent && 'preventDefault' in targetOrEvent) {
        targetOrEvent.preventDefault();
      }
      gId = parseInt(docGarageIdInput.trim(), 10);
    }
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

  const handleReviewDocument = async (docId: number, status: DocumentVerificationStatus) => {
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

  const [downloadingExport, setDownloadingExport] = useState<string | null>(null);

  const handleDownloadExport = async (type: 'users' | 'garages' | 'leads' | 'quotes') => {
    try {
      setDownloadingExport(type);
      setGlobalError(null);
      await api.admin.downloadExport(type);
      setGlobalSuccess(`Export for ${type} generated and downloaded successfully.`);
    } catch (err: any) {
      setGlobalError(err.message || `Failed to export ${type} dataset`);
    } finally {
      setDownloadingExport(null);
    }
  };

  return (
    <div className="container py-8 max-w-6xl">
      {/* Header */}
      <div className="flex-between items-center flex-wrap gap-4 mb-6 pb-4 border-b border-border/30">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="page-title text-xl lg:text-2xl font-bold text-white">Admin Dashboard</h1>
                <span className="admin-header-badge">Authorized Console</span>
              </div>
              <p className="text-secondary text-xs mt-0.5">
                Platform governance, verification workflows, customer leads & directory management
              </p>
            </div>
          </div>
        </div>

        {/* Existing account controls */}
        <div className="flex items-center gap-2.5">
          {user && (
            <span className="text-xs text-muted bg-card px-3.5 py-1.5 rounded-full border border-border/30 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              <span className="text-white font-medium">{user.fullName || user.email}</span>
              <span className="text-2xs text-muted font-mono">({user.roles[0]?.replace('ROLE_', '')})</span>
            </span>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-xs rounded-full px-3.5 py-1.5 flex items-center gap-1.5"
            onClick={fetchOverview}
            disabled={loadingOverview}
            title="Refresh database statistics"
          >
            <span className={`material-symbols-outlined text-xs ${loadingOverview ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{loadingOverview ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
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

      {/* ============================================================= */}
      {/* 2. ADMIN OVERVIEW: 6 CORE PLATFORM METRIC CARDS               */}
      {/* ============================================================= */}
      <div className="overview-section mb-6">
        {overviewError && (
          <Alert
            type="error"
            message={`Overview Metrics Error: ${overviewError}`}
            onClose={() => setOverviewError(null)}
            className="mb-4"
          />
        )}

        <div className="admin-metric-cards-container">
          {/* Card 1: Total Users (Blue) */}
          <div
            className="admin-metric-card admin-metric-card-blue is-clickable group"
            onClick={() => setActiveTab('users')}
            title="Click to view Customer and User Directory"
          >
            <div className="flex flex-col justify-between h-full flex-1 min-w-0">
              <span className="admin-metric-label text-xs font-semibold truncate">
                Total Users
              </span>
              <div className="admin-metric-num text-2xl lg:text-3xl font-extrabold my-0.5">
                {overviewMetrics?.totalUsers != null
                  ? overviewMetrics.totalUsers.toLocaleString()
                  : loadingOverview
                  ? '...'
                  : '—'}
              </div>
              <div className="admin-metric-link text-2xs font-medium flex items-center gap-1 admin-metric-arrow transition-all">
                <span>View users</span>
                <span>→</span>
              </div>
            </div>
            <div className="admin-metric-icon-circle">
              <span role="img" aria-label="users">👥</span>
            </div>
          </div>

          {/* Card 2: Total Garages (Purple) */}
          <div
            className="admin-metric-card admin-metric-card-purple is-clickable group"
            onClick={() => {
              setActiveTab('garages_all');
              setGarageStatusFilter('');
              setGarageVerifiedFilter('');
            }}
            title="Click to view Workshops and Garages Management"
          >
            <div className="flex flex-col justify-between h-full flex-1 min-w-0">
              <span className="admin-metric-label text-xs font-semibold truncate">
                Total Garages
              </span>
              <div className="admin-metric-num text-2xl lg:text-3xl font-extrabold my-0.5">
                {overviewMetrics?.totalGarages != null
                  ? overviewMetrics.totalGarages.toLocaleString()
                  : loadingOverview
                  ? '...'
                  : '—'}
              </div>
              <div className="admin-metric-link text-2xs font-medium flex items-center gap-1 admin-metric-arrow transition-all">
                <span>Manage workshops</span>
                <span>→</span>
              </div>
            </div>
            <div className="admin-metric-icon-circle">
              <span role="img" aria-label="workshops">🏢</span>
            </div>
          </div>

          {/* Card 3: Total Reviews (Emerald) */}
          <div
            className="admin-metric-card admin-metric-card-emerald"
            title="Total platform reviews across all workshops (dashboard statistic only)"
          >
            <div className="flex flex-col justify-between h-full flex-1 min-w-0">
              <span className="admin-metric-label text-xs font-semibold truncate">
                Total Reviews
              </span>
              <div className="admin-metric-num text-2xl lg:text-3xl font-extrabold my-0.5">
                {overviewMetrics?.totalReviews != null
                  ? overviewMetrics.totalReviews.toLocaleString()
                  : loadingOverview
                  ? '...'
                  : '—'}
              </div>
              <div className="admin-metric-link text-2xs font-medium flex items-center gap-1">
                <span>All website reviews</span>
              </div>
            </div>
            <div className="admin-metric-icon-circle">
              <span role="img" aria-label="reviews">⭐</span>
            </div>
          </div>

          {/* Card 4: Pending Approvals (Amber) */}
          <div
            className="admin-metric-card admin-metric-card-amber is-clickable group"
            onClick={() => setActiveTab('garages_pending')}
            title="Click to view Pending Garage Listings & Approvals"
          >
            <div className="flex flex-col justify-between h-full flex-1 min-w-0">
              <span className="admin-metric-label text-xs font-semibold truncate">
                Pending Approvals
              </span>
              <div className="admin-metric-num text-2xl lg:text-3xl font-extrabold my-0.5">
                {overviewMetrics?.pendingGarages != null
                  ? overviewMetrics.pendingGarages.toLocaleString()
                  : loadingOverview
                  ? '...'
                  : '0'}
              </div>
              <div className="admin-metric-link text-2xs font-medium flex items-center gap-1 admin-metric-arrow transition-all">
                <span>View pending</span>
                <span>→</span>
              </div>
            </div>
            <div className="admin-metric-icon-circle">
              <span role="img" aria-label="pending">⏳</span>
            </div>
          </div>

          {/* Card 5: Verified Garages (Red) */}
          <div
            className="admin-metric-card admin-metric-card-red is-clickable group"
            onClick={() => {
              setActiveTab('garages_all');
              setGarageVerifiedFilter('true');
              fetchAllGarages(0);
            }}
            title="Click to view Garages filtered by Verified Trust Badge"
          >
            <div className="flex flex-col justify-between h-full flex-1 min-w-0">
              <span className="admin-metric-label text-xs font-semibold truncate">
                Verified Garages
              </span>
              <div className="admin-metric-num text-2xl lg:text-3xl font-extrabold my-0.5">
                {overviewMetrics?.verifiedGarages != null
                  ? overviewMetrics.verifiedGarages.toLocaleString()
                  : loadingOverview
                  ? '...'
                  : '0'}
              </div>
              <div className="admin-metric-link text-2xs font-medium flex items-center gap-1 admin-metric-arrow transition-all">
                <span>View verified</span>
                <span>→</span>
              </div>
            </div>
            <div className="admin-metric-icon-circle">
              <span role="img" aria-label="verified">🛡️</span>
            </div>
          </div>
        </div>

        {/* Optional Collapsible Platform Insights & Activity Feeds */}
        {overviewMetrics && (
          <div className="mt-3">
            <button
              type="button"
              className="text-xs text-muted hover:text-white flex items-center gap-1.5 transition-colors font-medium py-1 px-2 rounded hover:bg-card"
              onClick={() => setShowPlatformFeeds(!showPlatformFeeds)}
            >
              <span>{showPlatformFeeds ? '▼ Hide' : '▶ Show'} Platform Breakdown & Activity Feeds</span>
              <span className="text-2xs text-primary font-normal">
                ({overviewMetrics.newRegistrations24h} new users in 24h, {overviewMetrics.totalLeads} inquiries)
              </span>
            </button>

            {showPlatformFeeds && (
              <div className="space-y-4 mt-3 pt-3 border-t border-border/20">
                {/* Status Breakdowns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Workshop Listing Audit Breakdown */}
                  <div className="card p-4 bg-card border border-border/30">
                    <h3 className="text-xs font-semibold text-white mb-2.5 uppercase tracking-wider">
                      Workshop Listing Breakdown
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex-between">
                        <span className="text-secondary">Approved (Public)</span>
                        <span className="badge badge-success font-mono">{overviewMetrics.activeGarages}</span>
                      </div>
                      <div className="flex-between">
                        <span className="text-secondary">Pending Review</span>
                        <span className="badge badge-warning font-mono">{overviewMetrics.pendingGarages}</span>
                      </div>
                      <div className="flex-between">
                        <span className="text-secondary">Suspended</span>
                        <span className="badge badge-danger font-mono">{overviewMetrics.suspendedGarages}</span>
                      </div>
                      <div className="flex-between">
                        <span className="text-secondary">Rejected</span>
                        <span className="badge font-mono">{overviewMetrics.rejectedGarages}</span>
                      </div>
                      <div className="flex-between pt-1.5 border-t border-border/20">
                        <span className="text-secondary">Verified Trust Awarded</span>
                        <span className="badge badge-info font-mono">{overviewMetrics.verifiedGarages}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quote Requests Lifecycle */}
                  <div className="card p-4 bg-card border border-border/30">
                    <h3 className="text-xs font-semibold text-white mb-2.5 uppercase tracking-wider">
                      Quote Requests Lifecycle
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      {Object.entries(overviewMetrics.quoteRequestsByStatus).map(([status, count]) => (
                        <div key={status} className="flex-between">
                          <span className="text-secondary">{status}</span>
                          <span className="font-mono text-white font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Service Catalogue Adoption */}
                  <div className="card p-4 bg-card border border-border/30">
                    <h3 className="text-xs font-semibold text-white mb-2.5 uppercase tracking-wider">
                      Master Services Adoption
                    </h3>
                    <div className="space-y-1.5 text-xs max-h-40 overflow-y-auto pr-1">
                      {overviewMetrics.serviceCatalogueUsage.slice(0, 5).map((s) => (
                        <div key={s.serviceId} className="flex-between">
                          <span className="text-secondary truncate max-w-[170px]">{s.serviceName}</span>
                          <span className="font-mono text-muted text-2xs">{s.offeringGaragesCount} workshops</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Feeds Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Recent Registrations */}
                  <div className="card p-4 bg-card border border-border/30">
                    <div className="flex-between items-center mb-2.5">
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                        Recent Registrations
                      </h3>
                      <button
                        type="button"
                        className="text-2xs text-primary hover:underline"
                        onClick={() => setActiveTab('users')}
                      >
                        View All →
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-sm text-xs">
                        <thead>
                          <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Registered</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overviewMetrics.recentRegistrations.map((u) => (
                            <tr key={u.id}>
                              <td>
                                <div className="font-medium text-white">{u.fullName}</div>
                                <div className="text-2xs text-muted truncate max-w-[150px]">{u.email}</div>
                              </td>
                              <td>
                                <span className="badge badge-2xs">
                                  {u.roles[0]?.replace('ROLE_', '')}
                                </span>
                              </td>
                              <td className="text-2xs text-muted font-mono">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recent Leads */}
                  <div className="card p-4 bg-card border border-border/30">
                    <div className="flex-between items-center mb-2.5">
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                        Recent Lead Inquiries
                      </h3>
                      <button
                        type="button"
                        className="text-2xs text-primary hover:underline"
                        onClick={() => setActiveTab('leads')}
                      >
                        View All →
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-sm text-xs">
                        <thead>
                          <tr>
                            <th>Event</th>
                            <th>Vehicle / Service</th>
                            <th>Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overviewMetrics.recentLeads.map((l) => (
                            <tr key={l.id}>
                              <td>
                                <span className="badge badge-2xs">
                                  {l.eventType.replace('HOMEPAGE_', '')}
                                </span>
                              </td>
                              <td className="text-secondary text-2xs truncate max-w-[140px]">
                                {l.vehicleMake || l.vehicleModel ? `${l.vehicleMake || ''} ${l.vehicleModel || ''}` : l.serviceName || 'Search'}
                              </td>
                              <td className="text-muted text-2xs">{l.city || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 3. PORTAL NAVIGATION: CLEAN ROUNDED PILLS WITH EMOJIS         */}
      {/* ============================================================= */}
      <div className="portal-navigation mb-6 flex items-center flex-wrap gap-2 border-b border-border/30 pb-4">
        {canApproveGarages && (
          <button
            type="button"
            className={`admin-tab-pill ${activeTab === 'garages_all' ? 'active' : ''}`}
            onClick={() => setActiveTab('garages_all')}
          >
            <span>🏢</span>
            <span>Workshops</span>
          </button>
        )}

        {canApproveGarages && (
          <button
            type="button"
            className={`admin-tab-pill ${activeTab === 'garages_pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('garages_pending')}
          >
            <span>⏳</span>
            <span>Pending Listings</span>
            {pendingGarages.length > 0 && (
              <span className="admin-pill-badge">{pendingGarages.length}</span>
            )}
          </button>
        )}

        {canManageClaims && (
          <button
            type="button"
            className={`admin-tab-pill ${activeTab === 'claims' ? 'active' : ''}`}
            onClick={() => setActiveTab('claims')}
          >
            <span>📑</span>
            <span>Claims</span>
            {pendingClaims.length > 0 && (
              <span className="admin-pill-badge">{pendingClaims.length}</span>
            )}
          </button>
        )}

        {canReviewDocs && (
          <button
            type="button"
            className={`admin-tab-pill ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <span>🛡️</span>
            <span>Document Verification</span>
          </button>
        )}

        {canManageUsers && (
          <button
            type="button"
            className={`admin-tab-pill ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span>👥</span>
            <span>Customers</span>
          </button>
        )}

        {canAccessLeads && (
          <button
            type="button"
            className={`admin-tab-pill ${activeTab === 'leads' ? 'active' : ''}`}
            onClick={() => setActiveTab('leads')}
          >
            <span>📊</span>
            <span>Leads</span>
          </button>
        )}

        {canOversightQuotes && (
          <button
            type="button"
            className={`admin-tab-pill ${activeTab === 'quotes' ? 'active' : ''}`}
            onClick={() => setActiveTab('quotes')}
          >
            <span>💬</span>
            <span>Quotes</span>
          </button>
        )}

        {canApproveGarages && (
          <button
            type="button"
            className={`admin-tab-pill ${activeTab === 'edits' ? 'active' : ''}`}
            onClick={() => setActiveTab('edits')}
          >
            <span>✏️</span>
            <span>Profile Edits</span>
            {pendingEdits.length > 0 && (
              <span className="admin-pill-badge">{pendingEdits.length}</span>
            )}
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            className={`admin-tab-pill ${activeTab === 'audit_logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit_logs')}
          >
            <span>📜</span>
            <span>Audit Trail</span>
          </button>
        )}

        {canExportData && (
          <button
            type="button"
            className={`admin-tab-pill ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* ============================================================= */}
      {/* PORTAL CONTENT: SELECTED TAB                                  */}
      {/* ============================================================= */}

      {/* ============================================================= */}
      {/* TAB 2: USERS DIRECTORY                                        */}
      {/* ============================================================= */}
      {activeTab === 'users' && (
        <div className="card p-6 bg-card border border-border/30">
          <div className="flex-between items-center mb-4">
            <div>
              <h2 className="section-title text-base">User Directory & Authorization</h2>
              <p className="text-xs text-muted">Search registered customers, garage managers, and administrators.</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => fetchUsers(userPage)}
              disabled={loadingUsers}
            >
              Refresh
            </button>
          </div>

          {/* Search & Filters */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchUsers(0);
            }}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-3 bg-secondary/20 rounded border border-border/20"
          >
            <div>
              <label className="label text-2xs">Search (Name / Email / Phone)</label>
              <input
                type="text"
                className="input input-sm w-full"
                placeholder="e.g. Rahul, rahul@gmail.com"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="label text-2xs">Filter by Role</label>
              <select
                className="input input-sm w-full"
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
              >
                <option value="">All Account Roles</option>
                <option value="ROLE_USER">Customer (ROLE_USER)</option>
                <option value="ROLE_GARAGE_OWNER">Workshop Owner (ROLE_GARAGE_OWNER)</option>
                <option value="ROLE_ADMIN">Administrator (ROLE_ADMIN)</option>
              </select>
            </div>
            <div>
              <label className="label text-2xs">Account Status</label>
              <select
                className="input input-sm w-full"
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="DEACTIVATED">DEACTIVATED</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn btn-primary btn-sm flex-1">
                Apply Filters
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setUserSearch('');
                  setUserRoleFilter('');
                  setUserStatusFilter('');
                  setTimeout(() => fetchUsers(0), 10);
                }}
              >
                Reset
              </button>
            </div>
          </form>

          {usersError && <Alert type="error" message={usersError} className="mb-4" />}

          {loadingUsers ? (
            <div className="center-loader py-8">
              <div className="spinner"></div>
            </div>
          ) : usersData.content.length === 0 ? (
            <p className="text-center text-xs text-muted py-8">No user accounts found matching your query criteria.</p>
          ) : (
            <div className="table-responsive">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Email & Contact</th>
                    <th>Status</th>
                    <th>Roles</th>
                    <th>Linked Garages</th>
                    <th>Quotes</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersData.content.map((u) => (
                    <tr key={u.id}>
                      <td className="font-mono text-2xs">#{u.id}</td>
                      <td>
                        <strong className="text-white block">{u.fullName}</strong>
                        {u.registrationSource && (
                          <span className="text-2xs text-muted">Source: {u.registrationSource}</span>
                        )}
                      </td>
                      <td>
                        {u.email ? (
                          <a
                            href={`mailto:${u.email}`}
                            className="text-secondary hover:text-primary hover:underline transition-colors block text-xs"
                            title={`Send email to ${u.email}`}
                          >
                            {u.email}
                          </a>
                        ) : (
                          <span className="text-muted text-2xs">—</span>
                        )}
                        {u.phoneNumber ? (
                          <a
                            href={`tel:${u.phoneNumber}`}
                            className="font-mono text-2xs text-muted hover:text-primary hover:underline flex items-center gap-1 mt-0.5"
                            title={`Call ${u.phoneNumber}`}
                          >
                            <span>📞</span>
                            <span>{u.phoneNumber}</span>
                          </a>
                        ) : (
                          <div className="font-mono text-2xs text-muted/60 mt-0.5">No phone</div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge badge-xs font-mono font-medium ${
                            u.status === 'ACTIVE'
                              ? 'badge-success'
                              : u.status === 'SUSPENDED'
                              ? 'badge-danger'
                              : 'badge-secondary'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span key={r} className="admin-pill-badge bg-card border-border/40 text-muted">
                              {r.replace('ROLE_', '')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="font-mono">{u.linkedGaragesCount}</td>
                      <td className="font-mono">{u.quoteRequestsCount}</td>
                      <td className="text-2xs text-muted font-mono">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs rounded-full px-2.5 py-1 text-2xs flex items-center gap-1"
                            onClick={() => handleInspectUser(u.id)}
                            title="Inspect User Details"
                          >
                            <span className="material-symbols-outlined text-xs">visibility</span>
                            <span>Inspect</span>
                          </button>
                          <button
                            type="button"
                            className={`btn btn-xs rounded-full px-2.5 py-1 text-2xs flex items-center gap-1 ${
                              u.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'
                            }`}
                            onClick={() => openStatusChangeModal(u)}
                            title={u.status === 'ACTIVE' ? 'Suspend account' : 'Reactivate account'}
                          >
                            <span className="material-symbols-outlined text-xs">
                              {u.status === 'ACTIVE' ? 'block' : 'check_circle'}
                            </span>
                            <span>{u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex-between items-center mt-4 pt-4 border-t border-border/20 text-xs">
                <span className="text-muted">
                  Showing {usersData.content.length} of {usersData.totalElements} users (Page {usersData.page + 1} of{' '}
                  {Math.max(1, usersData.totalPages)})
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    disabled={usersData.page === 0}
                    onClick={() => fetchUsers(usersData.page - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    disabled={usersData.last}
                    onClick={() => fetchUsers(usersData.page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: ALL WORKSHOPS DIRECTORY                                */}
      {/* ============================================================= */}
      {activeTab === 'garages_all' && (
        <div className="card p-6 bg-card border border-border/30">
          <div className="flex-between items-center mb-4">
            <div>
              <h2 className="section-title text-base">Workshop Directory & Status Management</h2>
              <p className="text-xs text-muted">Complete database registry of all approved, pending, and suspended workshops.</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => fetchAllGarages(garagePage)}
              disabled={loadingAllGarages}
            >
              Refresh
            </button>
          </div>

          {/* Search & Filters */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchAllGarages(0);
            }}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-3 bg-secondary/20 rounded border border-border/20"
          >
            <div>
              <label className="label text-2xs">Workshop Search (Name / Slug / City)</label>
              <input
                type="text"
                className="input input-sm w-full"
                placeholder="e.g. Bosch, Gurgaon"
                value={garageSearch}
                onChange={(e) => setGarageSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="label text-2xs">Listing Approval Status</label>
              <select
                className="input input-sm w-full"
                value={garageStatusFilter}
                onChange={(e) => setGarageStatusFilter(e.target.value)}
              >
                <option value="">All Listing Statuses</option>
                <option value="APPROVED">APPROVED (Publicly Visible)</option>
                <option value="PENDING">PENDING (Awaiting Review)</option>
                <option value="SUSPENDED">SUSPENDED (Moderated)</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
            <div>
              <label className="label text-2xs">Verification Trust Badge</label>
              <select
                className="input input-sm w-full"
                value={garageVerifiedFilter}
                onChange={(e) => setGarageVerifiedFilter(e.target.value)}
              >
                <option value="">All Trust Levels</option>
                <option value="true">Verified Workshops Only</option>
                <option value="false">Unverified Workshops Only</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn btn-primary btn-sm flex-1">
                Apply Filters
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setGarageSearch('');
                  setGarageStatusFilter('');
                  setGarageVerifiedFilter('');
                  setGarageCityFilter('');
                  setTimeout(() => fetchAllGarages(0), 10);
                }}
              >
                Reset
              </button>
            </div>
          </form>

          {allGaragesError && <Alert type="error" message={allGaragesError} className="mb-4" />}

          {loadingAllGarages ? (
            <div className="center-loader py-8">
              <div className="spinner"></div>
            </div>
          ) : allGaragesData.content.length === 0 ? (
            <p className="text-center text-xs text-muted py-8">No workshop listings match the selected filters.</p>
          ) : (
            <div className="table-responsive">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Workshop Name</th>
                    <th>City & State</th>
                    <th>Approval Status</th>
                    <th>Verified</th>
                    <th>Owner / Manager</th>
                    <th>Services</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allGaragesData.content.map((g) => (
                    <tr key={g.id}>
                      <td className="font-mono text-2xs">#{g.id}</td>
                      <td>
                        <strong className="text-white block">{g.name}</strong>
                        <span className="text-2xs text-muted">Slug: {g.slug}</span>
                      </td>
                      <td>
                        <div className="text-secondary">{g.city}, {g.state}</div>
                        {g.phoneNumber ? (
                          <a
                            href={`tel:${g.phoneNumber}`}
                            className="font-mono text-2xs text-muted hover:text-primary hover:underline flex items-center gap-1 mt-0.5"
                            title={`Call ${g.phoneNumber}`}
                          >
                            <span>📞</span>
                            <span>{g.phoneNumber}</span>
                          </a>
                        ) : (
                          <div className="font-mono text-2xs text-muted/60 mt-0.5">—</div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge badge-xs font-mono font-medium ${
                            g.approvalStatus === 'APPROVED'
                              ? 'badge-success'
                              : g.approvalStatus === 'PENDING'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          {g.approvalStatus}
                        </span>
                      </td>
                      <td>
                        {g.isVerified ? (
                          <span className="badge badge-xs badge-info font-mono font-medium">✓ Verified</span>
                        ) : (
                          <span className="text-2xs text-muted">Unverified</span>
                        )}
                      </td>
                      <td>
                        {g.ownerName ? (
                          <div>
                            <div className="text-white font-medium">{g.ownerName}</div>
                            {g.ownerEmail ? (
                              <a
                                href={`mailto:${g.ownerEmail}`}
                                className="text-2xs text-muted hover:text-primary hover:underline block"
                                title={`Email ${g.ownerEmail}`}
                              >
                                {g.ownerEmail}
                              </a>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-2xs text-muted italic">Unclaimed</span>
                        )}
                      </td>
                      <td className="font-mono">{g.services.length}</td>
                      <td className="text-2xs text-muted font-mono">
                        {new Date(g.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs rounded-full px-2.5 py-1 text-2xs flex items-center gap-1"
                            onClick={() => handleInspectGarage(g.id)}
                            title="Inspect workshop details"
                          >
                            <span className="material-symbols-outlined text-xs">visibility</span>
                            <span>Inspect</span>
                          </button>
                          {g.approvalStatus === 'PENDING' && (
                            <button
                              type="button"
                              className="btn btn-primary btn-xs rounded-full px-2.5 py-1 text-2xs flex items-center gap-1"
                              onClick={() => handleApproveGarage(g)}
                              title="Approve pending workshop"
                            >
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              <span>Approve</span>
                            </button>
                          )}
                          {g.approvalStatus === 'APPROVED' && (
                            <button
                              type="button"
                              className="btn btn-danger btn-xs rounded-full px-2.5 py-1 text-2xs flex items-center gap-1"
                              onClick={() => handleSuspendGarage(g)}
                              title="Suspend workshop"
                            >
                              <span className="material-symbols-outlined text-xs">block</span>
                              <span>Suspend</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex-between items-center mt-4 pt-4 border-t border-border/20 text-xs">
                <span className="text-muted">
                  Showing {allGaragesData.content.length} of {allGaragesData.totalElements} workshops (Page{' '}
                  {allGaragesData.page + 1} of {Math.max(1, allGaragesData.totalPages)})
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    disabled={allGaragesData.page === 0}
                    onClick={() => fetchAllGarages(allGaragesData.page - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    disabled={allGaragesData.last}
                    onClick={() => fetchAllGarages(allGaragesData.page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: LEADS & SEARCH ACTIVITY                                */}
      {/* ============================================================= */}
      {activeTab === 'leads' && (
        <div className="card p-6 bg-card border border-border/30">
          <div className="flex-between items-center mb-4">
            <div>
              <h2 className="section-title text-base">Persistent Leads & Search Events</h2>
              <p className="text-xs text-muted">Track visitor searches, conversion funnels, and customer intent with masked contact data.</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => fetchLeads(leadPage)}
              disabled={loadingLeads}
            >
              Refresh
            </button>
          </div>

          {/* Filters */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchLeads(0);
            }}
            className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-3 bg-secondary/20 rounded border border-border/20"
          >
            <div>
              <label className="label text-2xs">Event Type</label>
              <select
                className="input input-sm w-full"
                value={leadTypeFilter}
                onChange={(e) => setLeadTypeFilter(e.target.value)}
              >
                <option value="">All Event Types</option>
                <option value="HOMEPAGE_SEARCH_SUBMITTED">HOMEPAGE_SEARCH_SUBMITTED</option>
                <option value="HOMEPAGE_SEARCH_STARTED">HOMEPAGE_SEARCH_STARTED</option>
                <option value="EXPLORE_GARAGES_VIEWED">EXPLORE_GARAGES_VIEWED</option>
                <option value="GARAGE_PROFILE_VIEWED">GARAGE_PROFILE_VIEWED</option>
                <option value="QUOTE_REQUEST_SUBMITTED">QUOTE_REQUEST_SUBMITTED</option>
                <option value="SIGNUP_STARTED">SIGNUP_STARTED</option>
                <option value="USER_REGISTERED">USER_REGISTERED</option>
              </select>
            </div>
            <div>
              <label className="label text-2xs">Visitor Association</label>
              <select
                className="input input-sm w-full"
                value={leadUserFilter}
                onChange={(e) => setLeadUserFilter(e.target.value)}
              >
                <option value="">All Visitors</option>
                <option value="false">Anonymous Visitors Only</option>
                <option value="true">Registered & Identified Users</option>
              </select>
            </div>
            <div>
              <label className="label text-2xs">Search (Session / Vehicle / City)</label>
              <input
                type="text"
                className="input input-sm w-full"
                placeholder="e.g. Tata, Delhi"
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn btn-primary btn-sm flex-1">
                Filter Leads
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setLeadTypeFilter('');
                  setLeadSearch('');
                  setLeadUserFilter('');
                  setLeadCityFilter('');
                  setTimeout(() => fetchLeads(0), 10);
                }}
              >
                Reset
              </button>
            </div>
          </form>

          {leadsError && <Alert type="error" message={leadsError} className="mb-4" />}

          {loadingLeads ? (
            <div className="center-loader py-8">
              <div className="spinner"></div>
            </div>
          ) : leadsData.content.length === 0 ? (
            <p className="text-center text-xs text-muted py-8">No lead tracking events recorded matching the criteria.</p>
          ) : (
            <div className="table-responsive">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Type</th>
                    <th>Session ID</th>
                    <th>User Association</th>
                    <th>Vehicle Details</th>
                    <th>Service / Problem</th>
                    <th>City & State</th>
                    <th>Customer Phone</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsData.content.map((l) => (
                    <tr key={l.id}>
                      <td className="font-mono text-2xs text-muted truncate max-w-[100px]" title={l.eventId}>
                        {l.eventId}
                      </td>
                      <td>
                        <span
                          className={`badge badge-xs ${
                            l.eventType.includes('SUBMITTED')
                              ? 'badge-primary'
                              : l.eventType.includes('REGISTERED')
                              ? 'badge-success'
                              : 'badge-secondary'
                          }`}
                        >
                          {l.eventType}
                        </span>
                      </td>
                      <td className="font-mono text-2xs text-secondary">{l.sessionId}</td>
                      <td>
                        {l.userId ? (
                          <span className="badge badge-2xs badge-info" title={l.userEmail || ''}>
                            User #{l.userId}
                          </span>
                        ) : (
                          <span className="text-2xs text-muted">Anonymous Visitor</span>
                        )}
                      </td>
                      <td className="text-secondary text-2xs">
                        {l.vehicleMake || l.vehicleModel ? `${l.vehicleMake || ''} ${l.vehicleModel || ''}` : '—'}
                      </td>
                      <td className="text-secondary text-2xs">{l.serviceName || l.serviceSlug || '—'}</td>
                      <td className="text-secondary text-2xs">{l.city ? `${l.city}, ${l.state || ''}` : '—'}</td>
                      <td className="font-mono text-2xs">
                        {l.phoneNumber ? (
                          <a
                            href={`tel:${l.phoneNumber}`}
                            className="text-primary hover:underline font-mono inline-flex items-center gap-1"
                            title={`Call customer: ${l.phoneNumber}`}
                          >
                            <span>📞</span>
                            <span>{l.phoneNumber}</span>
                          </a>
                        ) : l.maskedPhoneNumber ? (
                          <span className="text-muted" title="Masked visitor phone">{l.maskedPhoneNumber}</span>
                        ) : (
                          <span className="text-muted/60">—</span>
                        )}
                      </td>
                      <td className="text-2xs text-muted font-mono">
                        {new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                        {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex-between items-center mt-4 pt-4 border-t border-border/20 text-xs">
                <span className="text-muted">
                  Showing {leadsData.content.length} of {leadsData.totalElements} events (Page{' '}
                  {leadsData.page + 1} of {Math.max(1, leadsData.totalPages)})
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    disabled={leadsData.page === 0}
                    onClick={() => fetchLeads(leadsData.page - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    disabled={leadsData.last}
                    onClick={() => fetchLeads(leadsData.page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 5: QUOTE REQUESTS MANAGEMENT                              */}
      {/* ============================================================= */}
      {activeTab === 'quotes' && (
        <div className="card p-6 bg-card border border-border/30">
          <div className="flex-between items-center mb-4">
            <div>
              <h2 className="section-title text-base">Quote Requests & Moderation</h2>
              <p className="text-xs text-muted">Administrative oversight of customer service inquiries, workshop quotations, and status history.</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-xs"
              onClick={() => fetchQuotes(quotePage)}
              disabled={loadingQuotes}
            >
              Refresh
            </button>
          </div>

          {/* Search & Filters */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchQuotes(0);
            }}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-3 bg-secondary/20 rounded border border-border/20"
          >
            <div>
              <label className="label text-2xs">Search (Ref #, Customer, Workshop)</label>
              <input
                type="text"
                className="input input-sm w-full"
                placeholder="e.g. MG-Q-2026, Rahul"
                value={quoteSearch}
                onChange={(e) => setQuoteSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="label text-2xs">Lifecycle Status</label>
              <select
                className="input input-sm w-full"
                value={quoteStatusFilter}
                onChange={(e) => setQuoteStatusFilter(e.target.value)}
              >
                <option value="">All Quote Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="QUOTED">QUOTED</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn btn-primary btn-sm flex-1">
                Filter Quotes
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setQuoteSearch('');
                  setQuoteStatusFilter('');
                  setTimeout(() => fetchQuotes(0), 10);
                }}
              >
                Reset
              </button>
            </div>
          </form>

          {quotesError && <Alert type="error" message={quotesError} className="mb-4" />}

          {loadingQuotes ? (
            <div className="center-loader py-8">
              <div className="spinner"></div>
            </div>
          ) : quotesData.content.length === 0 ? (
            <p className="text-center text-xs text-muted py-8">No quote requests found matching the filter criteria.</p>
          ) : (
            <div className="table-responsive">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Workshop</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Services</th>
                    <th>Quoted Price</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotesData.content.map((q) => (
                    <tr key={q.id}>
                      <td className="font-mono text-2xs text-primary font-bold">{q.referenceNumber}</td>
                      <td>
                        <strong className="text-white block">{q.garageName}</strong>
                        <span className="text-2xs text-muted">{q.garageCity}</span>
                      </td>
                      <td>
                        <div className="text-secondary font-medium">{q.customerName}</div>
                        {q.contactPhone ? (
                          <a
                            href={`tel:${q.contactPhone}`}
                            className="text-2xs text-muted hover:text-primary hover:underline font-mono flex items-center gap-1 mt-0.5"
                            title={`Call ${q.contactPhone}`}
                          >
                            <span>📞</span>
                            <span>{q.contactPhone}</span>
                          </a>
                        ) : q.customerEmail ? (
                          <a
                            href={`mailto:${q.customerEmail}`}
                            className="text-2xs text-muted hover:text-primary hover:underline font-mono flex items-center gap-1 mt-0.5"
                            title={`Email ${q.customerEmail}`}
                          >
                            <span>✉</span>
                            <span>{q.customerEmail}</span>
                          </a>
                        ) : (
                          <div className="text-2xs text-muted/60 mt-0.5">—</div>
                        )}
                      </td>
                      <td className="text-2xs text-secondary">
                        {q.vehicleMake} {q.vehicleModel}
                        {q.vehicleYear && ` (${q.vehicleYear})`}
                      </td>
                      <td className="text-2xs truncate max-w-[140px]">
                        {q.serviceNames.join(', ') || 'General Repair'}
                      </td>
                      <td className="font-mono text-white">
                        {q.proposedQuoteAmount != null ? `₹${q.proposedQuoteAmount}` : q.estimatedMinPrice != null ? `From ₹${q.estimatedMinPrice}` : 'Awaiting quote'}
                      </td>
                      <td>
                        <span
                          className={`badge badge-xs font-mono font-medium ${
                            q.status === 'ACCEPTED' || q.status === 'COMPLETED'
                              ? 'badge-success'
                              : q.status === 'QUOTED'
                              ? 'badge-info'
                              : q.status === 'PENDING'
                              ? 'badge-warning'
                              : 'badge-secondary'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="text-2xs text-muted font-mono">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-xs rounded-full px-3 py-1 text-2xs flex items-center gap-1"
                          onClick={() => handleInspectQuote(q.id)}
                          title="Inspect quote lifecycle & thread"
                        >
                          <span className="material-symbols-outlined text-xs">manage_search</span>
                          <span>Lifecycle & Thread</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex-between items-center mt-4 pt-4 border-t border-border/20 text-xs">
                <span className="text-muted">
                  Showing {quotesData.content.length} of {quotesData.totalElements} requests (Page{' '}
                  {quotesData.page + 1} of {Math.max(1, quotesData.totalPages)})
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    disabled={quotesData.page === 0}
                    onClick={() => fetchQuotes(quotesData.page - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    disabled={quotesData.last}
                    onClick={() => fetchQuotes(quotesData.page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 6: PENDING GARAGES QUEUE                                  */}
      {/* ============================================================= */}
      {activeTab === 'garages_pending' && (
        <div className="card p-6 bg-card border border-border/30">
          <div className="flex-between items-center mb-4">
            <h3 className="section-title text-base">Pending Workshop Listings Queue</h3>
            <button type="button" className="btn btn-secondary btn-xs" onClick={fetchPendingGarages}>
              Refresh
            </button>
          </div>

          {garagesError && <Alert type="error" message={garagesError} className="mb-4" />}

          {loadingGarages ? (
            <div className="center-loader py-8">
              <div className="spinner"></div>
            </div>
          ) : pendingGarages.length === 0 ? (
            <p className="text-xs text-muted text-center py-8">No pending garage submissions awaiting review. Queue is clear!</p>
          ) : (
            <div className="table-responsive">
              <table className="table text-xs">
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
                      <td className="font-mono text-2xs">#{g.id}</td>
                      <td>
                        <strong className="text-white block">{g.name}</strong>
                        <span className="text-2xs text-muted">Slug: {g.slug}</span>
                      </td>
                      <td className="text-2xs">{g.addressLine1}, {g.city}, {g.state}</td>
                      <td className="font-mono text-2xs">
                        {g.phoneNumber ? (
                          <a
                            href={`tel:${g.phoneNumber}`}
                            className="text-muted hover:text-primary hover:underline flex items-center gap-1"
                            title={`Call ${g.phoneNumber}`}
                          >
                            <span>📞</span>
                            <span>{g.phoneNumber}</span>
                          </a>
                        ) : (
                          <span className="text-muted/60">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`badge badge-xs font-mono font-medium ${g.isVerified ? 'badge-info' : 'badge-secondary'}`}
                          onClick={() => handleToggleVerified(g)}
                        >
                          {g.isVerified ? '✓ Verified' : 'Unverified'}
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="btn btn-primary btn-xs rounded-full px-2.5 py-1 text-2xs flex items-center gap-1"
                            onClick={() => handleApproveGarage(g)}
                            title="Approve pending garage listing"
                          >
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-xs rounded-full px-2.5 py-1 text-2xs flex items-center gap-1"
                            onClick={() => handleRejectGarage(g)}
                            title="Reject pending garage listing"
                          >
                            <span className="material-symbols-outlined text-xs">cancel</span>
                            <span>Reject</span>
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

      {/* ============================================================= */}
      {/* TAB 7: PROFILE EDITS QUEUE                                    */}
      {/* ============================================================= */}
      {activeTab === 'edits' && (
        <div className="card p-6 bg-card border border-border/30">
          <div className="flex-between items-center mb-4">
            <h3 className="section-title text-base">Pending Profile Modification Requests</h3>
            <button type="button" className="btn btn-secondary btn-xs" onClick={fetchPendingEdits}>
              Refresh
            </button>
          </div>

          {editsError && <Alert type="error" message={editsError} className="mb-4" />}

          {loadingEdits ? (
            <div className="center-loader py-8">
              <div className="spinner"></div>
            </div>
          ) : pendingEdits.length === 0 ? (
            <p className="text-xs text-muted text-center py-8">No pending garage profile modification requests.</p>
          ) : (
            <div className="table-responsive">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Garage ID</th>
                    <th>Proposed Name</th>
                    <th>Proposed Phone</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingEdits.map((edit) => (
                    <tr key={edit.id}>
                      <td className="font-mono text-2xs">#{edit.id}</td>
                      <td className="font-mono text-2xs">#{edit.garageId}</td>
                      <td className="text-white font-medium">{edit.proposedName}</td>
                      <td className="font-mono text-2xs">{edit.proposedPhoneNumber}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => handleApproveEdit(edit)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            onClick={() => handleRejectEdit(edit)}
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

      {/* ============================================================= */}
      {/* TAB 8: OWNERSHIP CLAIMS                                       */}
      {/* ============================================================= */}
      {activeTab === 'claims' && (
        <div className="card p-6 bg-card border border-border/30">
          <div className="flex-between items-center mb-4">
            <div>
              <h3 className="section-title text-base">Workshop Ownership Claim Verification</h3>
              <p className="text-2xs text-secondary mt-1">
                Verify legal proof of ownership documents before granting workshop ownership. All attached documents must be verified to approve a claim.
              </p>
            </div>
            <button type="button" className="btn btn-secondary btn-xs" onClick={fetchPendingClaims}>
              Refresh
            </button>
          </div>

          {claimsError && <Alert type="error" message={claimsError} className="mb-4" />}

          {loadingClaims ? (
            <div className="center-loader py-8">
              <div className="spinner"></div>
            </div>
          ) : pendingClaims.length === 0 ? (
            <p className="text-xs text-muted text-center py-8">No pending ownership claims.</p>
          ) : (
            <div className="space-y-6">
              {pendingClaims.map((claim) => {
                const approvalCheck = canApproveClaim(claim);
                const verifiedDocsCount = claim.documents?.filter((d) => d.verificationStatus === 'VERIFIED').length || 0;
                const totalDocsCount = claim.documents?.length || 0;

                return (
                  <div
                    key={claim.id}
                    className="p-5 rounded-xl bg-surface/40 border border-border/50 hover:border-border transition-all"
                  >
                    {/* Top Row: Claim meta & status */}
                    <div className="flex-between items-start flex-wrap gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white bg-elevated px-2 py-0.5 rounded border border-border/60">
                            Claim #{claim.id}
                          </span>
                          <span className="badge badge-warning text-2xs">Pending Admin Review</span>
                        </div>
                        <h4 className="text-base font-bold text-white mt-1">
                          {claim.garageName}{' '}
                          <span className="text-xs text-muted font-normal">
                            (Garage ID: #{claim.garageId})
                          </span>
                        </h4>
                        {(claim.garageAddress || claim.garageCity) && (
                          <p className="text-2xs text-muted">
                            {[claim.garageAddress, claim.garageCity].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-2xs text-muted block">
                          Submitted on {new Date(claim.createdAt).toLocaleString()}
                        </span>
                        <span
                          className={`badge text-2xs mt-1 ${
                            approvalCheck.canApprove
                              ? 'badge-success'
                              : 'badge-warning'
                          }`}
                        >
                          {totalDocsCount === 0
                            ? 'No Docs Attached'
                            : `${verifiedDocsCount}/${totalDocsCount} Docs Verified`}
                        </span>
                      </div>
                    </div>

                    {/* Claimant details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-surface/70 p-3 rounded-lg border border-border/40 mb-3">
                      <div>
                        <span className="text-2xs text-muted block">Claimant Account</span>
                        <span className="text-white font-medium">User #{claim.claimantUserId}</span>
                      </div>
                      <div>
                        <span className="text-2xs text-muted block">Full Name</span>
                        <span className="text-white">
                          {claim.claimantName || claim.claimantFullName || 'Not specified'}
                        </span>
                      </div>
                      <div>
                        <span className="text-2xs text-muted block">Email & Phone</span>
                        {claim.claimantEmail ? (
                          <a
                            href={`mailto:${claim.claimantEmail}`}
                            className="text-secondary hover:text-primary hover:underline truncate block"
                            title={`Email ${claim.claimantEmail}`}
                          >
                            {claim.claimantEmail}
                          </a>
                        ) : (
                          <span className="text-muted block">—</span>
                        )}
                        {claim.claimantPhone ? (
                          <a
                            href={`tel:${claim.claimantPhone}`}
                            className="text-white hover:text-primary hover:underline font-mono text-2xs flex items-center gap-1 mt-0.5"
                            title={`Call ${claim.claimantPhone}`}
                          >
                            <span>📞</span>
                            <span>{claim.claimantPhone}</span>
                          </a>
                        ) : (
                          <span className="text-muted font-mono text-2xs block mt-0.5">No phone</span>
                        )}
                      </div>
                      <div>
                        <span className="text-2xs text-muted block">Business Registration #</span>
                        <span className="text-white font-mono">{claim.businessRegNumber || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Claimant Statement */}
                    <div className="text-xs bg-elevated/50 p-3 rounded-lg border border-border/40 mb-4">
                      <span className="text-2xs font-semibold text-muted block mb-1">
                        Claimant Rationale & Statement:
                      </span>
                      <p className="text-white leading-relaxed whitespace-pre-wrap">{claim.claimMessage}</p>
                    </div>

                    {/* Documents List & Verification */}
                    <div className="border border-border/50 rounded-xl overflow-hidden mb-4">
                      <div className="bg-surface px-4 py-2 text-xs font-semibold text-white flex-between items-center border-b border-border/50">
                        <span>Submitted Ownership Proof Documents ({totalDocsCount})</span>
                        <span className="text-2xs text-muted">
                          Private Storage • Authorized Verification Only
                        </span>
                      </div>

                      {claim.documents && claim.documents.length > 0 ? (
                        <div className="divide-y divide-border/30 bg-elevated/30">
                          {claim.documents.map((doc) => (
                            <div key={doc.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-medium text-white">
                                    {doc.documentType === 'OWNERSHIP_PROOF'
                                      ? 'Proof of Ownership / Lease / Utility'
                                      : doc.documentType === 'TRADE_LICENSE'
                                      ? 'Trade / Municipal License'
                                      : doc.documentType === 'GST_CERTIFICATE'
                                      ? 'GST Registration Certificate'
                                      : doc.documentType === 'ID_PROOF'
                                      ? 'Signatory ID Proof'
                                      : doc.documentType}
                                  </span>
                                  <span
                                    className={`badge badge-xs font-mono font-medium ${
                                      doc.verificationStatus === 'VERIFIED'
                                        ? 'badge-success'
                                        : doc.verificationStatus === 'REJECTED'
                                        ? 'badge-danger'
                                        : 'badge-warning'
                                    }`}
                                  >
                                    {doc.verificationStatus}
                                  </span>
                                </div>
                                <span className="text-2xs text-muted font-mono block mt-0.5">
                                  Doc #{doc.id} • {doc.originalFileName} • {((doc.fileSizeBytes || 0) / 1024).toFixed(1)} KB
                                </span>
                                {doc.rejectionReason && (
                                  <span className="text-2xs text-danger block mt-1">
                                    Reason: {doc.rejectionReason}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-xs rounded-full px-2.5 py-1 text-2xs flex items-center gap-1"
                                  onClick={() => handleDownloadClaimDoc(claim.id, doc.id, doc.originalFileName)}
                                >
                                  <span className="material-symbols-outlined text-xs">download</span>
                                  <span>Preview / Download</span>
                                </button>
                                {doc.verificationStatus !== 'VERIFIED' && (
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-xs rounded-full px-2.5 py-1 text-2xs flex items-center gap-1"
                                    onClick={() => handleReviewClaimDoc(claim.id, doc.id, 'VERIFIED')}
                                  >
                                    <span className="material-symbols-outlined text-xs">check_circle</span>
                                    <span>Mark Verified</span>
                                  </button>
                                )}
                                {doc.verificationStatus !== 'REJECTED' && (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-xs rounded-full px-2.5 py-1 text-2xs flex items-center gap-1"
                                    onClick={() => handleReviewClaimDoc(claim.id, doc.id, 'REJECTED')}
                                  >
                                    <span className="material-symbols-outlined text-xs">cancel</span>
                                    <span>Reject Doc</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-danger/10 border-b border-danger/30 text-xs text-danger">
                          ⚠️ No verification documents were uploaded with this claim. Claim approval is blocked.
                        </div>
                      )}
                    </div>

                    {/* Decision Actions Bar */}
                    <div className="flex-between items-center flex-wrap gap-3 pt-2 border-t border-border/40">
                      <div className="text-2xs">
                        {approvalCheck.canApprove ? (
                          <span className="text-success flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">check_circle</span>
                            All documents verified. Ready for atomic ownership assignment.
                          </span>
                        ) : (
                          <span className="text-warning flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">info</span>
                            {approvalCheck.reason}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-warning btn-xs rounded-full px-3 py-1 text-2xs flex items-center gap-1"
                          onClick={() => handleRequestClaimResubmission(claim)}
                        >
                          <span className="material-symbols-outlined text-xs">replay</span>
                          <span>Request Resubmission</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-xs rounded-full px-3 py-1 text-2xs flex items-center gap-1"
                          onClick={() => handleRejectClaim(claim)}
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                          <span>Reject Claim</span>
                        </button>
                        <button
                          type="button"
                          className={`btn btn-xs rounded-full px-3 py-1 text-2xs flex items-center gap-1 ${approvalCheck.canApprove ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                          disabled={!approvalCheck.canApprove}
                          onClick={() => handleApproveClaim(claim)}
                          title={approvalCheck.canApprove ? 'Grant workshop ownership to claimant' : approvalCheck.reason}
                        >
                          <span className="material-symbols-outlined text-xs">task_alt</span>
                          <span>Approve Claim</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: DOCUMENTS VERIFICATION                                  */}
      {/* ============================================================= */}
      {activeTab === 'documents' && (
        <div className="card p-6 bg-card border border-border/30">
          <div className="flex-between items-center mb-4">
            <div>
              <h3 className="section-title text-base">🛡️ Workshop Business Document Verification</h3>
              <p className="text-xs text-muted">
                Review submitted business licenses, GST certificates, and identity verification documents.
              </p>
            </div>
            {docGarageIdInput && (
              <button
                type="button"
                className="btn btn-secondary btn-xs rounded-full px-3 py-1 flex items-center gap-1"
                onClick={() => handleLoadGarageDocs(parseInt(docGarageIdInput, 10))}
                disabled={loadingDocs}
              >
                <span>🔄</span>
                <span>{loadingDocs ? 'Refreshing...' : 'Refresh Documents'}</span>
              </button>
            )}
          </div>

          {/* Quick Workshop Selector & ID Lookup */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-secondary/10 rounded-xl border border-border/20">
            <div className="md:col-span-1">
              <label className="label text-2xs mb-1">Direct Workshop ID Lookup</label>
              <form onSubmit={handleLoadGarageDocs} className="flex gap-2">
                <input
                  type="number"
                  className="input input-sm flex-1 font-mono"
                  placeholder="e.g. 1"
                  value={docGarageIdInput}
                  onChange={(e) => setDocGarageIdInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm rounded-lg px-3"
                  disabled={loadingDocs || !docGarageIdInput.trim()}
                >
                  {loadingDocs ? 'Loading...' : 'Inspect'}
                </button>
              </form>
            </div>

            <div className="md:col-span-2">
              <label className="label text-2xs mb-1">Quick Select from Registered Workshops</label>
              {allGaragesData.content.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-1">
                  {allGaragesData.content.slice(0, 10).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleLoadGarageDocs(g.id)}
                      className={`text-2xs px-2.5 py-1.5 rounded-lg border transition-all text-left flex items-center gap-2 ${
                        docGarageIdInput === String(g.id)
                          ? 'bg-primary/20 border-primary text-white font-medium shadow-sm'
                          : 'bg-card border-border/40 text-muted hover:text-white hover:border-border'
                      }`}
                    >
                      <span className="font-mono text-3xs text-secondary">#{g.id}</span>
                      <span className="truncate max-w-[120px]">{g.name}</span>
                      <span
                        className={`badge badge-2xs font-mono ${
                          g.isVerified ? 'badge-success' : 'badge-secondary'
                        }`}
                      >
                        {g.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-2xs text-muted flex items-center gap-2 py-2">
                  <span>No cached workshops.</span>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => fetchAllGarages(0)}
                  >
                    Load workshop list
                  </button>
                </div>
              )}
            </div>
          </div>

          {docsError && <Alert type="error" message={docsError} className="mb-4" />}

          {loadingDocs ? (
            <div className="center-loader py-12">
              <div className="spinner"></div>
            </div>
          ) : loadedDocs.length > 0 ? (
            <div>
              <div className="flex-between items-center mb-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>Documents for Workshop</span>
                  <span className="font-mono text-primary font-bold">#{docGarageIdInput}</span>
                  <span className="text-2xs text-muted">({loadedDocs.length} record{loadedDocs.length === 1 ? '' : 's'})</span>
                </h4>
              </div>
              <div className="table-responsive">
                <table className="table text-xs">
                  <thead>
                    <tr>
                      <th>Document ID</th>
                      <th>Type</th>
                      <th>File Name</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadedDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td className="font-mono text-2xs">#{doc.id}</td>
                        <td>
                          <span className="admin-pill-badge bg-card border-border/40 font-mono text-2xs text-white">
                            {doc.documentType}
                          </span>
                        </td>
                        <td className="text-white font-medium">{doc.originalFileName}</td>
                        <td>
                          <span
                            className={`badge badge-xs font-mono font-medium ${
                              doc.verificationStatus === 'VERIFIED'
                                ? 'badge-success'
                                : doc.verificationStatus === 'REJECTED'
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}
                          >
                            {doc.verificationStatus}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={api.admin.getDocumentDownloadUrl(doc.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-xs rounded-full px-2.5 py-1 text-2xs flex items-center gap-1"
                              title="Download & inspect submitted document"
                            >
                              <span className="material-symbols-outlined text-xs">download</span>
                              <span>Download</span>
                            </a>
                            {doc.verificationStatus !== 'VERIFIED' && (
                              <button
                                type="button"
                                className="btn btn-primary btn-xs rounded-full px-2.5 py-1 text-2xs flex items-center gap-1"
                                onClick={() => handleReviewDocument(doc.id, 'VERIFIED')}
                                title="Mark document as Verified"
                              >
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                <span>Verify</span>
                              </button>
                            )}
                            {doc.verificationStatus !== 'REJECTED' && (
                              <button
                                type="button"
                                className="btn btn-danger btn-xs rounded-full px-2.5 py-1 text-2xs flex items-center gap-1"
                                onClick={() => handleReviewDocument(doc.id, 'REJECTED')}
                                title="Reject submitted document"
                              >
                                <span className="material-symbols-outlined text-xs">cancel</span>
                                <span>Reject</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : docGarageIdInput ? (
            <div className="text-center py-8 bg-secondary/5 rounded-xl border border-dashed border-border/30">
              <span className="material-symbols-outlined text-2xl text-muted mb-1 block">description</span>
              <p className="text-xs text-muted">
                No business documents found on record for Workshop #{docGarageIdInput}.
              </p>
            </div>
          ) : (
            <div className="text-center py-8 bg-secondary/5 rounded-xl border border-dashed border-border/30">
              <span className="material-symbols-outlined text-2xl text-muted mb-1 block">badge</span>
              <p className="text-xs text-muted">
                Select a workshop from the quick list or enter a Workshop ID above to inspect submitted verification documents.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 11: MASTER SERVICES CATALOGUE                             */}
      {/* ============================================================= */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 bg-card border border-border/30 md:col-span-1">
            <h3 className="section-title text-base mb-4">Create Master Service</h3>
            <form onSubmit={handleCreateService} className="space-y-3">
              <div>
                <label className="label text-xs">Service Name</label>
                <input
                  type="text"
                  className="input input-sm w-full"
                  placeholder="e.g. Ceramic Coating"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label text-xs">Category</label>
                <select
                  className="input input-sm w-full"
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
              <div>
                <label className="label text-xs">Description</label>
                <textarea
                  className="input input-sm w-full h-20"
                  placeholder="Standard description..."
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary btn-sm w-full" disabled={creatingService}>
                {creatingService ? 'Saving...' : 'Add Master Service'}
              </button>
            </form>
          </div>

          <div className="card p-6 bg-card border border-border/30 md:col-span-2">
            <div className="flex-between items-center mb-4">
              <h3 className="section-title text-base">Active Master Service Catalogue</h3>
              <button type="button" className="btn btn-secondary btn-xs" onClick={fetchServices}>
                Refresh
              </button>
            </div>
            {servicesError && <Alert type="error" message={servicesError} className="mb-4" />}
            {loadingServices ? (
              <div className="center-loader py-8">
                <div className="spinner"></div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table text-xs">
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
                    {services.map((s) => (
                      <tr key={s.id}>
                        <td className="font-mono text-2xs">#{s.id}</td>
                        <td className="text-white font-medium">{s.name}</td>
                        <td className="text-secondary">{s.category}</td>
                        <td className="font-mono text-2xs text-muted">{s.slug}</td>
                        <td>
                          <span className={`badge badge-xs ${s.isActive ? 'badge-success' : 'badge-secondary'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
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

      {/* ============================================================= */}
      {/* TAB 12: DATA EXPORT                                           */}
      {/* ============================================================= */}
      {activeTab === 'export' && (
        <div className="card p-6 bg-card border border-border/30 space-y-6">
          <div>
            <h2 className="section-title text-base">Secure Operational Data Export</h2>
            <p className="text-xs text-muted">
              Download complete, standard CSV datasets for administrative governance and platform auditing.
            </p>
          </div>

          <div className="p-4 rounded border border-warning/30 bg-warning/5 text-xs text-warning leading-relaxed">
            <strong>⚠️ Compliance & Purpose Limitation Notice:</strong> Exported files contain operational customer and workshop data. Passwords, hashes, and auth tokens are strictly stripped. Usage of personal phone numbers and emails is restricted to direct booking coordination under MeriGarage terms. All downloads are logged with your administrator user ID.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded border border-border/30 bg-secondary/10 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">👥 Registered Users Directory</h4>
                <p className="text-xs text-muted mb-4">
                  Includes User ID, Full Name, Email, Contact Number, Roles, Account Status, Consent Status, and Registration Source.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadExport('users')}
                disabled={downloadingExport === 'users'}
                className="btn btn-secondary btn-sm text-center"
              >
                {downloadingExport === 'users' ? 'Exporting...' : 'Download Users CSV ⬇'}
              </button>
            </div>

            <div className="p-4 rounded border border-border/30 bg-secondary/10 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">🏢 Workshop Registry Directory</h4>
                <p className="text-xs text-muted mb-4">
                  Includes Workshop ID, Name, City, State, Address, Phone, Approval Status, Verified Trust Badge, and Owner Email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadExport('garages')}
                disabled={downloadingExport === 'garages'}
                className="btn btn-secondary btn-sm text-center"
              >
                {downloadingExport === 'garages' ? 'Exporting...' : 'Download Workshops CSV ⬇'}
              </button>
            </div>

            <div className="p-4 rounded border border-border/30 bg-secondary/10 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">🎯 Persistent Leads & Search Events</h4>
                <p className="text-xs text-muted mb-4">
                  Includes Event ID, Event Type, Session ID, State/City, Vehicle Make/Model, Service Slug, Source, and Timestamp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadExport('leads')}
                disabled={downloadingExport === 'leads'}
                className="btn btn-secondary btn-sm text-center"
              >
                {downloadingExport === 'leads' ? 'Exporting...' : 'Download Leads & Searches CSV ⬇'}
              </button>
            </div>

            <div className="p-4 rounded border border-border/30 bg-secondary/10 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">💬 Quote Requests Pipeline</h4>
                <p className="text-xs text-muted mb-4">
                  Includes Reference Number, Workshop Name, Customer Name/Contact, Vehicle, Requested Services, Status, and Proposed Price.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadExport('quotes')}
                disabled={downloadingExport === 'quotes'}
                className="btn btn-secondary btn-sm text-center"
              >
                {downloadingExport === 'quotes' ? 'Exporting...' : 'Download Quotes CSV ⬇'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 13: AUDIT TRAIL (Phase 5)                                 */}
      {/* ============================================================= */}
      {activeTab === 'audit_logs' && (
        <div className="card p-6 bg-card border border-border/30 space-y-6">
          <div className="flex-between items-center">
            <div>
              <h2 className="section-title text-base">Platform Administrative Audit Trail</h2>
              <p className="text-xs text-muted">
                Immutable, database-recorded log of all consequential administrative operations, status transitions, and data exports.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fetchAuditLogs(0)}
              disabled={loadingAuditLogs}
            >
              🔄 Refresh Logs
            </button>
          </div>

          {auditLogsError && <Alert type="error" message={auditLogsError} />}

          {/* Search Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-secondary/10 p-3 rounded border border-border/20 text-xs">
            <div>
              <label className="label text-2xs">Action Type</label>
              <select
                className="input w-full text-xs"
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
              >
                <option value="">All Actions</option>
                <option value="GARAGE_APPROVAL">GARAGE_APPROVAL</option>
                <option value="GARAGE_REJECTION">GARAGE_REJECTION</option>
                <option value="GARAGE_SUSPENSION">GARAGE_SUSPENSION</option>
                <option value="GARAGE_VERIFIED_STATUS_GRANTED">GARAGE_VERIFIED_STATUS_GRANTED</option>
                <option value="GARAGE_VERIFIED_STATUS_REVOKED">GARAGE_VERIFIED_STATUS_REVOKED</option>
                <option value="CLAIM_APPROVAL">CLAIM_APPROVAL</option>
                <option value="CLAIM_REJECTION">CLAIM_REJECTION</option>
                <option value="DOCUMENT_VERIFICATION">DOCUMENT_VERIFICATION</option>
                <option value="DOCUMENT_REJECTION">DOCUMENT_REJECTION</option>
                <option value="USER_STATUS_CHANGE">USER_STATUS_CHANGE</option>
                <option value="USER_ROLE_ASSIGNMENT">USER_ROLE_ASSIGNMENT</option>
                <option value="USER_ROLE_REVOCATION">USER_ROLE_REVOCATION</option>
                <option value="USER_PERMISSION_GRANT">USER_PERMISSION_GRANT</option>
                <option value="USER_PERMISSION_REVOKE">USER_PERMISSION_REVOKE</option>
                <option value="QUOTE_STATUS_UPDATE">QUOTE_STATUS_UPDATE</option>
                <option value="REVIEW_MODERATION">REVIEW_MODERATION</option>
                <option value="DATA_EXPORT">DATA_EXPORT</option>
              </select>
            </div>
            <div>
              <label className="label text-2xs">Target Record Type</label>
              <input
                type="text"
                className="input w-full text-xs"
                placeholder="e.g. USER, GARAGE, CLAIM..."
                value={auditTargetFilter}
                onChange={(e) => setAuditTargetFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="label text-2xs">From Date</label>
              <input
                type="date"
                className="input w-full text-xs"
                value={auditFromDate}
                onChange={(e) => setAuditFromDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="label text-2xs">To Date</label>
                <input
                  type="date"
                  className="input w-full text-xs"
                  value={auditToDate}
                  onChange={(e) => setAuditToDate(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => fetchAuditLogs(0)}
              >
                Filter
              </button>
            </div>
          </div>

          {/* Logs Table */}
          {loadingAuditLogs ? (
            <div className="center-loader py-12">
              <div className="spinner"></div>
            </div>
          ) : auditLogsData.content.length === 0 ? (
            <div className="text-center py-12 text-muted text-xs">
              No audit log entries match the selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-dark w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-left text-2xs text-muted">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Admin</th>
                    <th className="py-2.5 px-3">Action Type</th>
                    <th className="py-2.5 px-3">Target</th>
                    <th className="py-2.5 px-3">Outcome</th>
                    <th className="py-2.5 px-3">Reason / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {auditLogsData.content.map((log) => {
                    const isExport = log.actionType.includes('EXPORT');
                    const isReject = log.actionType.includes('REJECT') || log.actionType.includes('SUSPEND');
                    const isApprove = log.actionType.includes('APPROVAL') || log.actionType.includes('GRANTED');
                    return (
                      <tr key={log.id} className="hover:bg-secondary/10 transition-colors">
                        <td className="py-2.5 px-3 text-2xs font-mono text-muted whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-white block">
                            {log.adminFullName || 'Admin'}
                          </span>
                          <span className="text-2xs text-secondary font-mono">
                            {log.adminEmail || (log.adminUserId ? `User #${log.adminUserId}` : 'System')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`badge badge-xs ${
                              isReject
                                ? 'badge-danger'
                                : isApprove
                                ? 'badge-success'
                                : isExport
                                ? 'badge-warning'
                                : 'badge-primary'
                            }`}
                          >
                            {log.actionType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-white">{log.targetType}</span>
                          {log.targetId && (
                            <span className="font-mono text-2xs text-muted block">#{log.targetId}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="badge badge-xs badge-outline">{log.outcome}</span>
                        </td>
                        <td className="py-2.5 px-3 text-secondary text-2xs max-w-xs break-words">
                          {log.reason || 'No additional notes'}
                          {log.metadataJson && (
                            <pre className="mt-1 p-1 bg-black/40 rounded text-3xs font-mono text-muted overflow-x-auto max-w-xs">
                              {log.metadataJson}
                            </pre>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {auditLogsData.totalPages > 1 && (
            <div className="flex-between items-center pt-2 text-xs">
              <span className="text-muted text-2xs">
                Page {auditLogsData.page + 1} of {auditLogsData.totalPages} ({auditLogsData.totalElements} records)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  disabled={auditLogsData.page <= 0 || loadingAuditLogs}
                  onClick={() => fetchAuditLogs(auditLogsData.page - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  disabled={auditLogsData.last || loadingAuditLogs}
                  onClick={() => fetchAuditLogs(auditLogsData.page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* MODALS                                                        */}
      {/* ============================================================= */}

      {/* Generic Action Decision Modal */}
      <Modal isOpen={actionModalOpen} onClose={() => setActionModalOpen(false)} title={actionTitle}>
        <div className="space-y-4 text-xs">
          <p className="text-secondary leading-relaxed">{actionDescription}</p>
          {modalError && <Alert type="error" message={modalError} className="mb-2" />}
          <div>
            <label className="label">
              Decision Notes {actionRequiredNotes ? <span className="text-danger">*</span> : '(Optional)'}
            </label>
            <textarea
              className="input w-full h-20"
              placeholder="Provide reason or context for audit trail..."
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
            ></textarea>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActionModalOpen(false)}
              disabled={actionSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleConfirmAction}
              disabled={actionSubmitting}
            >
              {actionSubmitting ? 'Processing...' : 'Confirm Action'}
            </button>
          </div>
        </div>
      </Modal>

      {/* User Detail Inspection Modal */}
      <Modal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} title="User Account Dossier">
        {loadingUserDetail ? (
          <div className="center-loader py-8">
            <div className="spinner"></div>
          </div>
        ) : selectedUserDetail ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/10 rounded border border-border/20">
              <div>
                <span className="text-muted block text-2xs">Full Name</span>
                <span className="text-white font-bold">{selectedUserDetail.user.fullName}</span>
              </div>
              <div>
                <span className="text-muted block text-2xs">Email Address</span>
                {selectedUserDetail.user.email ? (
                  <a
                    href={`mailto:${selectedUserDetail.user.email}`}
                    className="text-secondary hover:text-primary hover:underline font-medium inline-flex items-center gap-1"
                    title={`Send email to ${selectedUserDetail.user.email}`}
                  >
                    <span>✉</span>
                    <span>{selectedUserDetail.user.email}</span>
                  </a>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </div>
              <div>
                <span className="text-muted block text-2xs">Phone Number</span>
                {selectedUserDetail.user.phoneNumber ? (
                  <a
                    href={`tel:${selectedUserDetail.user.phoneNumber}`}
                    className="text-secondary hover:text-primary hover:underline font-mono inline-flex items-center gap-1"
                    title={`Call ${selectedUserDetail.user.phoneNumber}`}
                  >
                    <span>📞</span>
                    <span>{selectedUserDetail.user.phoneNumber}</span>
                  </a>
                ) : (
                  <span className="text-muted">Not provided</span>
                )}
              </div>
              <div>
                <span className="text-muted block text-2xs">Account Status</span>
                <span className="badge badge-xs font-mono">{selectedUserDetail.user.status}</span>
              </div>
              <div>
                <span className="text-muted block text-2xs">Assigned Roles</span>
                <span className="text-white font-mono text-2xs">
                  {selectedUserDetail.user.roles.map((r) => r.replace('ROLE_', '')).join(', ')}
                </span>
              </div>
              <div>
                <span className="text-muted block text-2xs">Registration Source</span>
                <span className="text-white">{selectedUserDetail.user.registrationSource || 'Direct'}</span>
              </div>
            </div>

            {/* Account Roles & Permissions Display (Read-Only) */}
            <div className="p-3 bg-secondary/10 rounded border border-border/20 space-y-3">
              <div className="flex-between items-center">
                <h4 className="font-semibold text-white">🔐 Account Roles & Authorization</h4>
              </div>

              {/* Roles Badge List */}
              <div>
                <span className="text-muted block text-2xs mb-1.5 font-semibold">Current Assigned Roles</span>
                <div className="flex flex-wrap gap-2">
                  {selectedUserDetail.user.roles.map((r) => (
                    <span
                      key={r}
                      className="admin-pill-badge bg-card border-border/40 text-white font-medium"
                    >
                      ✓ {r.replace('ROLE_', '')}
                    </span>
                  ))}
                </div>
              </div>

                {/* Granular Permissions (for admins) */}
                {selectedUserDetail.user.roles.includes('ROLE_ADMIN') && (
                  <div>
                    <span className="text-muted block text-2xs mb-1.5 font-semibold">
                      Granular Admin Permissions (Least Privilege Enforcement)
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        { code: 'GARAGE_APPROVAL', label: 'Garage Approval & Suspension' },
                        { code: 'VERIFICATION_REVIEW', label: 'Verification & Document Review' },
                        { code: 'CLAIM_MANAGEMENT', label: 'Ownership Claim Oversight' },
                        { code: 'CONTENT_MODERATION', label: 'Review & Content Moderation' },
                        { code: 'USER_MANAGEMENT', label: 'User & Access Governance' },
                        { code: 'LEAD_ACCESS', label: 'Persistent Lead & Search Data' },
                        { code: 'QUOTE_OVERSIGHT', label: 'Quote Requests Oversight' },
                        { code: 'DATA_EXPORT', label: 'Operational CSV Data Export' },
                      ] as { code: AdminPermissionCode; label: string }[]).map((p) => {
                        const hasP = selectedUserDetail.user.permissions?.includes(p.code);
                        return (
                          <button
                            key={p.code}
                            type="button"
                            disabled={managingRoleOrPerm}
                            onClick={() => handleToggleUserPermission(selectedUserDetail.user.id, p.code, !!hasP)}
                            className={`p-2 rounded text-left border flex items-center justify-between text-2xs transition-colors ${
                              hasP
                                ? 'bg-primary/20 border-primary text-white font-medium'
                                : 'bg-card border-border/40 text-muted hover:text-white'
                            }`}
                          >
                            <span>{p.label}</span>
                            <span className="font-mono text-3xs ml-1">{hasP ? 'ENABLED' : 'DISABLED'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            {/* Linked Workshops */}
            <div>
              <h4 className="font-semibold text-white mb-2">Linked Workshops ({selectedUserDetail.linkedGarages.length})</h4>
              {selectedUserDetail.linkedGarages.length === 0 ? (
                <p className="text-2xs text-muted">No workshops associated with this account.</p>
              ) : (
                <div className="space-y-1">
                  {selectedUserDetail.linkedGarages.map((g) => (
                    <div key={g.id} className="flex-between p-2 rounded bg-secondary/10 border border-border/10">
                      <span>{g.name} ({g.city})</span>
                      <span className="font-mono text-2xs text-muted">ID #{g.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Quotes */}
            <div>
              <h4 className="font-semibold text-white mb-2">Quote Requests ({selectedUserDetail.quoteRequests.length})</h4>
              {selectedUserDetail.quoteRequests.length === 0 ? (
                <p className="text-2xs text-muted">No quote requests submitted.</p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {selectedUserDetail.quoteRequests.map((q) => (
                    <div key={q.id} className="flex-between p-2 rounded bg-secondary/10 border border-border/10">
                      <div>
                        <span className="font-mono text-primary font-bold">{q.referenceNumber}</span>
                        <span className="text-muted text-2xs block">{q.garageName}</span>
                      </div>
                      <span className="badge badge-xs">{q.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setUserModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* User Status Change Confirmation Modal */}
      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Change Account Status">
        {statusChangeUser && (
          <form onSubmit={handleConfirmStatusChange} className="space-y-4 text-xs">
            <p className="text-secondary leading-relaxed">
              Updating account status for <strong>{statusChangeUser.fullName}</strong> ({statusChangeUser.email}).
            </p>
            {statusModalError && <Alert type="error" message={statusModalError} className="mb-2" />}
            <div>
              <label className="label">Target Status</label>
              <select
                className="input w-full"
                value={targetUserStatus}
                onChange={(e) => setTargetUserStatus(e.target.value as UserStatus)}
              >
                <option value="ACTIVE">ACTIVE (Full access restored)</option>
                <option value="SUSPENDED">SUSPENDED (Cannot authenticate or request quotes)</option>
                <option value="DEACTIVATED">DEACTIVATED (Account marked expired)</option>
              </select>
            </div>
            <div>
              <label className="label">
                Audit Reason <span className="text-danger">*</span>
              </label>
              <textarea
                className="input w-full h-20"
                placeholder="State the justification for this administrative account action..."
                value={userStatusReason}
                onChange={(e) => setUserStatusReason(e.target.value)}
                required
              ></textarea>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setStatusModalOpen(false)}
                disabled={submittingUserStatus}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submittingUserStatus}>
                {submittingUserStatus ? 'Processing...' : 'Apply Status Change'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Workshop Inspection Modal */}
      <Modal isOpen={garageModalOpen} onClose={() => setGarageModalOpen(false)} title="Workshop Dossier & Audit History">
        {loadingGarageDetail ? (
          <div className="center-loader py-8">
            <div className="spinner"></div>
          </div>
        ) : selectedGarageDetail ? (
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/10 rounded border border-border/20">
              <div>
                <span className="text-muted block text-2xs">Workshop Name</span>
                <span className="text-white font-bold">{selectedGarageDetail.name}</span>
              </div>
              <div>
                <span className="text-muted block text-2xs">Location</span>
                <span className="text-secondary">{selectedGarageDetail.addressLine1}, {selectedGarageDetail.city}, {selectedGarageDetail.state}</span>
              </div>
              <div>
                <span className="text-muted block text-2xs">Listing Status</span>
                <span className="badge badge-xs">{selectedGarageDetail.approvalStatus}</span>
              </div>
              <div>
                <span className="text-muted block text-2xs">Verified Trust</span>
                <span className="badge badge-xs">{selectedGarageDetail.isVerified ? 'Verified' : 'Unverified'}</span>
              </div>
              <div>
                <span className="text-muted block text-2xs">Owner</span>
                <span className="text-white">{selectedGarageDetail.ownerName || 'Unclaimed'} ({selectedGarageDetail.ownerEmail || '—'})</span>
              </div>
              <div>
                <span className="text-muted block text-2xs">Contact Phone</span>
                <span className="font-mono text-white">{selectedGarageDetail.phoneNumber}</span>
              </div>
            </div>

            {/* Offered Services */}
            <div>
              <h4 className="font-semibold text-white mb-1">Configured Services ({selectedGarageDetail.services.length})</h4>
              <div className="flex flex-wrap gap-1">
                {selectedGarageDetail.services.map((s) => (
                  <span key={s} className="badge badge-xs">{s}</span>
                ))}
              </div>
            </div>

            {/* Approval Audit Timeline */}
            <div>
              <h4 className="font-semibold text-white mb-2">Administrative Audit Trail</h4>
              {selectedGarageDetail.approvalHistory.length === 0 ? (
                <p className="text-2xs text-muted">No historical audit changes recorded for this listing.</p>
              ) : (
                <div className="space-y-2">
                  {selectedGarageDetail.approvalHistory.map((audit) => (
                    <div key={audit.id} className="p-2 rounded bg-secondary/20 border border-border/10 text-2xs">
                      <div className="flex-between">
                        <strong className="text-white">{audit.actionType} by {audit.adminUserName}</strong>
                        <span className="font-mono text-muted">{new Date(audit.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-muted mt-1">
                        Status: {audit.previousStatus} → {audit.newStatus} • Verified: {String(audit.previousVerified)} → {String(audit.newVerified)}
                      </div>
                      {audit.decisionNotes && (
                        <div className="text-secondary italic mt-1 bg-secondary/30 p-1.5 rounded">
                          "{audit.decisionNotes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fast Moderation Actions */}
            <div className="flex justify-between items-center pt-2 border-t border-border/20">
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => handleToggleVerified(selectedGarageDetail)}
              >
                {selectedGarageDetail.isVerified ? 'Revoke Verified Badge' : 'Award Verified Badge'}
              </button>
              <div className="flex gap-2">
                {selectedGarageDetail.approvalStatus === 'APPROVED' ? (
                  <button
                    type="button"
                    className="btn btn-danger btn-xs"
                    onClick={() => handleSuspendGarage(selectedGarageDetail)}
                  >
                    Suspend Listing
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    onClick={() => handleApproveGarage(selectedGarageDetail)}
                  >
                    Approve Listing
                  </button>
                )}
                <button type="button" className="btn btn-secondary btn-xs" onClick={() => setGarageModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Quote Inspection & Lifecycle Thread Modal */}
      <Modal isOpen={quoteModalOpen} onClose={() => setQuoteModalOpen(false)} title="Quote Request Lifecycle Dossier">
        {loadingQuoteDetail ? (
          <div className="center-loader py-8">
            <div className="spinner"></div>
          </div>
        ) : selectedQuoteDetail ? (
          <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/10 rounded border border-border/20">
              <div>
                <span className="text-muted block text-2xs">Reference Number</span>
                <span className="font-mono text-primary font-bold">{selectedQuoteDetail.referenceNumber}</span>
              </div>
              <div>
                <span className="text-muted block text-2xs">Lifecycle Status</span>
                <span className="badge badge-xs">{selectedQuoteDetail.status}</span>
              </div>
              <div>
                <span className="text-muted block text-2xs">Customer</span>
                <span className="text-white">{selectedQuoteDetail.customerName}</span>
                <span className="text-2xs text-muted block">{selectedQuoteDetail.contactPhone || selectedQuoteDetail.customerEmail}</span>
              </div>
              <div>
                <span className="text-muted block text-2xs">Workshop</span>
                <span className="text-white">{selectedQuoteDetail.garageName}</span>
                <span className="text-2xs text-muted block">{selectedQuoteDetail.garageCity}</span>
              </div>
              <div>
                <span className="text-muted block text-2xs">Vehicle</span>
                <span className="text-white">
                  {selectedQuoteDetail.vehicleMake} {selectedQuoteDetail.vehicleModel} ({selectedQuoteDetail.vehicleType})
                </span>
              </div>
              <div>
                <span className="text-muted block text-2xs">Proposed Quotation</span>
                <span className="font-mono text-white">
                  {selectedQuoteDetail.proposedQuoteAmount != null ? `₹${selectedQuoteDetail.proposedQuoteAmount}` : 'Not quoted yet'}
                </span>
              </div>
            </div>

            {selectedQuoteDetail.problemDescription && (
              <div>
                <h4 className="font-semibold text-white mb-1">Problem Description / Notes</h4>
                <div className="p-2.5 rounded bg-secondary/20 text-secondary border border-border/10">
                  {selectedQuoteDetail.problemDescription}
                </div>
              </div>
            )}

            {/* Conversation Messages Thread */}
            <div>
              <h4 className="font-semibold text-white mb-2">Message Lifecycle Thread ({selectedQuoteDetail.messages.length})</h4>
              {selectedQuoteDetail.messages.length === 0 ? (
                <p className="text-2xs text-muted">No in-app messages exchanged yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedQuoteDetail.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded border text-2xs ${
                        m.senderRole === 'OWNER'
                          ? 'bg-secondary/30 border-border/30 ml-4'
                          : 'bg-primary/5 border-primary/20 mr-4'
                      }`}
                    >
                      <div className="flex-between mb-1">
                        <strong className={m.senderRole === 'OWNER' ? 'text-primary' : 'text-white'}>
                          {m.senderName} ({m.senderRole === 'OWNER' ? 'Workshop' : 'Customer'})
                        </strong>
                        <span className="font-mono text-muted">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-secondary leading-relaxed">{m.messageText}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Intervention Action */}
            <div className="flex justify-between items-center pt-2 border-t border-border/20">
              <button
                type="button"
                className="btn btn-danger btn-xs"
                onClick={() => {
                  setInterveneTargetStatus('CANCELLED');
                  setInterveneReason('');
                  setInterveneError(null);
                  setQuoteInterveneModal(true);
                }}
              >
                Administrative Status Override
              </button>
              <button type="button" className="btn btn-secondary btn-xs" onClick={() => setQuoteModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Quote Status Intervention Confirmation Modal */}
      <Modal isOpen={quoteInterveneModal} onClose={() => setQuoteInterveneModal(false)} title="Administrative Quote Intervention">
        {selectedQuoteDetail && (
          <form onSubmit={handleConfirmQuoteIntervention} className="space-y-4 text-xs">
            <p className="text-secondary leading-relaxed">
              Manually modify the lifecycle status for Quote <strong>#{selectedQuoteDetail.referenceNumber}</strong>. This action is auditable.
            </p>
            {interveneError && <Alert type="error" message={interveneError} className="mb-2" />}
            <div>
              <label className="label">Target Status</label>
              <select
                className="input w-full"
                value={interveneTargetStatus}
                onChange={(e) => setInterveneTargetStatus(e.target.value as QuoteRequestStatus)}
              >
                <option value="CANCELLED">CANCELLED (Moderated / Invalid inquiry)</option>
                <option value="COMPLETED">COMPLETED (Manually finalized booking)</option>
                <option value="REJECTED">REJECTED (Workshop declined)</option>
                <option value="PENDING">PENDING (Reset to queue)</option>
              </select>
            </div>
            <div>
              <label className="label">
                Administrative Justification <span className="text-danger">*</span>
              </label>
              <textarea
                className="input w-full h-20"
                placeholder="State the audit rationale for intervening on this quotation..."
                value={interveneReason}
                onChange={(e) => setInterveneReason(e.target.value)}
                required
              ></textarea>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setQuoteInterveneModal(false)}
                disabled={submittingIntervention}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submittingIntervention}>
                {submittingIntervention ? 'Saving...' : 'Apply Intervention'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
