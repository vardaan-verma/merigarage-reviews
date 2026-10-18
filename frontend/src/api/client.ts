import type {
  CreateGarageRequest,
  CreateQuoteRequest,
  CreateReviewRequest,
  DocumentType,
  DocumentVerificationStatus,
  ErrorResponse,
  GarageClaimDto,
  GarageDetailDto,
  GarageDocumentDto,
  GaragePhotoDto,
  GarageProfileEditDto,
  GarageServiceDto,
  GarageSummaryDto,
  PagedResponse,
  ProfileEditRequest,
  QuoteCustomerActionRequest,
  QuoteOwnerResponseRequest,
  QuoteRequestDto,
  ReviewDto,
  ReviewResponseDto,
  ServiceCategory,
  ServiceDto,
  SubmitClaimData,
  UpdateReviewRequest,
  UserDto,
  TrackLeadEventRequest,
  TrackLeadEventResponse,
  LeadEventDto,
  AdminOverviewMetricsDto,
  AdminUserSummaryDto,
  AdminUserDetailDto,
  UpdateUserStatusRequest,
  AdminGarageDetailDto,
  AdminQuoteSummaryDto,
  AdminQuoteStatusUpdateRequest,
  ManageRoleRequest,
  ManagePermissionRequest,
  AdminAuditLogDto,
  VehicleDto,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  UpdateProfileRequest,
  SwitchPrimaryRoleRequest,
  UserReviewDto,
  RoleName,
  ReviewReportStatus,
  ReviewReportDto,
  CreateReviewReportRequest,
  ModerateReviewReportRequest,
} from './types';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function getStoredVisitorSessionId(): string | undefined {
  try {
    return sessionStorage.getItem('mg_session_id') || undefined;
  } catch {
    return undefined;
  }
}

export class ApiError extends Error {
  status: number;
  error: string;
  details: string[];

  constructor(status: number, message: string, error = 'Error', details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.error = error;
    this.details = details;
  }
}

function getCookie(name: string): string | null {
  const matches = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)')
  );
  return matches ? decodeURIComponent(matches[1]) : null;
}

let cachedCsrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string | null> {
  const cookieToken = getCookie('XSRF-TOKEN');
  if (cookieToken) {
    cachedCsrfToken = cookieToken;
    return cookieToken;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.token) {
        cachedCsrfToken = data.token;
        return data.token;
      }
    }
  } catch {
    // Ignore fetch error, fallback to cookie
  }

  return getCookie('XSRF-TOKEN') || cachedCsrfToken;
}

interface RequestOptions extends RequestInit {
  json?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  const isStateChanging = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (isStateChanging) {
    const csrf = await ensureCsrfToken();
    if (csrf) {
      headers.set('X-XSRF-TOKEN', csrf);
    }
  }

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.json);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: 'include',
    });
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    const isFailedToFetch = err?.message === 'Failed to fetch' || err?.name === 'TypeError';
    const message = isFailedToFetch
      ? 'Unable to connect to the MeriGarage server. Please check your internet connection or verify the server is running.'
      : err?.message || 'Network request failed.';
    throw new ApiError(0, message, 'NetworkError');
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    let errorType = response.statusText;
    let details: string[] = [];

    if (isJson) {
      try {
        const errorJson = (await response.json()) as ErrorResponse;
        errorMessage = errorJson.message || errorMessage;
        errorType = errorJson.error || errorType;
        details = errorJson.details || [];
        if (details.length > 0 && (!errorJson.message || errorJson.message === 'Validation failed for request fields.')) {
          errorMessage = details.join('; ');
        }
      } catch {
        // Fallback to text
      }
    } else {
      try {
        const text = await response.text();
        if (text) errorMessage = text;
      } catch {
        // Fallback
      }
    }

    if (response.status === 401) {
      errorMessage = 'Your session has expired or authentication is required. Please log in.';
    } else if (response.status === 403 && (!errorMessage || errorMessage.includes('Forbidden') || errorMessage.includes('Access denied'))) {
      errorMessage = 'You do not have permission to manage this workshop.';
    } else if (response.status === 413) {
      errorMessage = 'Uploaded file exceeds the maximum allowed limit of 5 MB.';
    } else if (response.status === 409) {
      errorMessage = errorMessage || 'The server is currently busy processing another request for this workshop. Please retry in a moment.';
    }

    throw new ApiError(response.status, errorMessage, errorType, details);
  }

  if (isJson) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

export const api = {
  // Auth
  auth: {
    login: (email: string, password: string, portal?: string, sessionId?: string): Promise<UserDto> =>
      request<UserDto>('/api/auth/login', {
        method: 'POST',
        json: { email, password, portal, sessionId: sessionId || getStoredVisitorSessionId() },
      }),

    googleAuth: (credential: string, portal?: string, sessionId?: string, role?: string): Promise<UserDto> =>
      request<UserDto>('/api/auth/google', {
        method: 'POST',
        json: { credential, portal, sessionId: sessionId || getStoredVisitorSessionId(), role },
      }),

    register: (data: {
      email: string;
      password: string;
      fullName: string;
      phoneNumber?: string;
      registrationSource?: string;
      consentStatus?: string;
      role?: RoleName;
      sessionId?: string;
    }): Promise<UserDto> =>
      request<UserDto>('/api/auth/register', {
        method: 'POST',
        json: { ...data, sessionId: data.sessionId || getStoredVisitorSessionId() },
      }),

    logout: (): Promise<{ message: string }> =>
      request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

    getCurrentUser: (): Promise<UserDto> =>
      request<UserDto>('/api/auth/me', { method: 'GET' }),

    getCsrf: (): Promise<{ token: string; headerName: string; parameterName: string }> =>
      request('/api/auth/csrf', { method: 'GET' }),

    getProfile: (): Promise<UserDto> =>
      request<UserDto>('/api/users/profile', { method: 'GET' }),

    updateProfile: (data: UpdateProfileRequest): Promise<UserDto> =>
      request<UserDto>('/api/users/profile', {
        method: 'PUT',
        json: data,
      }),

    uploadProfilePhoto: (file: File): Promise<UserDto> => {
      const fd = new FormData();
      fd.append('file', file);
      return request<UserDto>('/api/users/profile/photo', {
        method: 'POST',
        body: fd,
      });
    },

    deleteProfilePhoto: (): Promise<UserDto> =>
      request<UserDto>('/api/users/profile/photo', {
        method: 'DELETE',
      }),
  },

  // User Saved Vehicles
  vehicles: {
    list: (): Promise<VehicleDto[]> => request<VehicleDto[]>('/api/vehicles'),
    create: (data: CreateVehicleRequest): Promise<VehicleDto> =>
      request<VehicleDto>('/api/vehicles', { method: 'POST', json: data }),
    update: (id: number, data: UpdateVehicleRequest): Promise<VehicleDto> =>
      request<VehicleDto>(`/api/vehicles/${id}`, { method: 'PUT', json: data }),
    delete: (id: number): Promise<void> =>
      request<void>(`/api/vehicles/${id}`, { method: 'DELETE' }),
    getHistory: (id: number): Promise<QuoteRequestDto[]> =>
      request<QuoteRequestDto[]>(`/api/vehicles/${id}/history`),
  },

  // Public Garages
  garages: {
    list: (params?: {
      city?: string;
      state?: string;
      isVerified?: boolean;
      serviceId?: number;
      serviceSlug?: string;
      search?: string;
      page?: number;
      size?: number;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }): Promise<PagedResponse<GarageSummaryDto>> => {
      const sp = new URLSearchParams();
      if (params?.city) sp.set('city', params.city);
      if (params?.state) sp.set('state', params.state);
      if (params?.isVerified !== undefined) sp.set('isVerified', String(params.isVerified));
      if (params?.serviceId !== undefined) sp.set('serviceId', String(params.serviceId));
      if (params?.serviceSlug) sp.set('serviceSlug', params.serviceSlug);
      if (params?.search) sp.set('search', params.search);
      if (params?.page !== undefined) sp.set('page', String(params.page));
      if (params?.size !== undefined) sp.set('size', String(params.size));
      if (params?.sortBy) sp.set('sortBy', params.sortBy);
      if (params?.sortDir) sp.set('sortDir', params.sortDir);

      const qs = sp.toString();
      return request<PagedResponse<GarageSummaryDto>>(`/api/garages${qs ? `?${qs}` : ''}`);
    },

    getBySlug: (slug: string): Promise<GarageDetailDto> =>
      request<GarageDetailDto>(`/api/garages/${slug}`),

    getPhotoUrl: (garageId: number, photoId: number): string =>
      `${API_BASE_URL}/api/garages/${garageId}/photos/${photoId}`,
  },

  // Garage Management (Owner & Authenticated)
  garageManagement: {
    getMyGarages: (): Promise<GarageSummaryDto[]> =>
      request<GarageSummaryDto[]>('/api/garages/my-garages'),

    getMyGarageById: (id: number): Promise<GarageDetailDto> =>
      request<GarageDetailDto>(`/api/garages/my-garages/${id}`),

    createListing: (data: CreateGarageRequest): Promise<GarageSummaryDto> =>
      request<GarageSummaryDto>('/api/garages', {
        method: 'POST',
        json: data,
      }),

    submitProfileEdit: (garageId: number, data: ProfileEditRequest): Promise<GarageProfileEditDto> =>
      request<GarageProfileEditDto>(`/api/garages/${garageId}/edits`, {
        method: 'POST',
        json: data,
      }),

    getProfileEdits: (garageId: number): Promise<GarageProfileEditDto[]> =>
      request<GarageProfileEditDto[]>(`/api/garages/${garageId}/edits`),

    associateService: (
      garageId: number,
      data: { serviceId: number; startingPrice?: number; isAvailable?: boolean }
    ): Promise<GarageServiceDto> =>
      request<GarageServiceDto>(`/api/garages/${garageId}/services`, {
        method: 'POST',
        json: data,
      }),

    disassociateService: (garageId: number, serviceId: number): Promise<void> =>
      request<void>(`/api/garages/${garageId}/services/${serviceId}`, {
        method: 'DELETE',
      }),

    uploadPhoto: (
      garageId: number,
      file: File,
      caption?: string,
      isCover?: boolean,
      displayOrder?: number
    ): Promise<GaragePhotoDto> => {
      const fd = new FormData();
      fd.append('file', file);
      if (caption) fd.append('caption', caption);
      if (isCover !== undefined) fd.append('isCover', String(isCover));
      if (displayOrder !== undefined) fd.append('displayOrder', String(displayOrder));

      return request<GaragePhotoDto>(`/api/garages/${garageId}/photos`, {
        method: 'POST',
        body: fd,
      });
    },

    setCoverPhoto: (garageId: number, photoId: number): Promise<void> =>
      request<void>(`/api/garages/${garageId}/photos/${photoId}/cover`, {
        method: 'PUT',
      }),

    deletePhoto: (garageId: number, photoId: number): Promise<void> =>
      request<void>(`/api/garages/${garageId}/photos/${photoId}`, {
        method: 'DELETE',
      }),

    uploadDocument: (
      garageId: number,
      file: File,
      documentType: DocumentType
    ): Promise<GarageDocumentDto> => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('documentType', documentType);

      return request<GarageDocumentDto>(`/api/garages/${garageId}/documents`, {
        method: 'POST',
        body: fd,
      });
    },

    getDocuments: (garageId: number): Promise<GarageDocumentDto[]> =>
      request<GarageDocumentDto[]>(`/api/garages/${garageId}/documents`),
  },

  // Claims
  claims: {
    submit: (
      garageId: number,
      data: string | FormData | SubmitClaimData
    ): Promise<GarageClaimDto> => {
      if (typeof data === 'string') {
        return request<GarageClaimDto>(`/api/garages/${garageId}/claims`, {
          method: 'POST',
          json: { claimMessage: data },
        });
      }
      if (data instanceof FormData) {
        return request<GarageClaimDto>(`/api/garages/${garageId}/claims`, {
          method: 'POST',
          body: data,
        });
      }
      const formData = new FormData();
      formData.append('claimMessage', data.claimMessage);
      if (data.claimantName) formData.append('claimantName', data.claimantName);
      if (data.claimantPhone) formData.append('claimantPhone', data.claimantPhone);
      if (data.claimantEmail) formData.append('claimantEmail', data.claimantEmail);
      if (data.businessRegNumber) formData.append('businessRegNumber', data.businessRegNumber);
      if (data.documents && data.documents.length > 0) {
        data.documents.forEach((file, index) => {
          formData.append('documents', file);
          const docType = data.documentTypes?.[index] || 'OWNERSHIP_PROOF';
          formData.append('documentTypes', docType);
        });
      }
      return request<GarageClaimDto>(`/api/garages/${garageId}/claims`, {
        method: 'POST',
        body: formData,
      });
    },

    getMyClaims: (): Promise<GarageClaimDto[]> =>
      request<GarageClaimDto[]>('/api/claims/my-claims'),

    downloadDocumentUrl: (claimId: number, docId: number): string =>
      `${API_BASE_URL}/api/claims/${claimId}/documents/${docId}/download`,

    downloadDocument: async (claimId: number, docId: number, filename?: string): Promise<void> => {
      const res = await fetch(`${API_BASE_URL}/api/claims/${claimId}/documents/${docId}/download`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new ApiError(res.status, 'Failed to fetch claim document', res.statusText);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      if (filename) a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    },
  },

  // Reviews
  reviews: {
    getForGarage: (
      garageId: number,
      params?: { page?: number; size?: number; sortBy?: string; sortDir?: 'asc' | 'desc' }
    ): Promise<PagedResponse<ReviewDto>> => {
      const sp = new URLSearchParams();
      if (params?.page !== undefined) sp.set('page', String(params.page));
      if (params?.size !== undefined) sp.set('size', String(params.size));
      if (params?.sortBy) sp.set('sortBy', params.sortBy);
      if (params?.sortDir) sp.set('sortDir', params.sortDir);

      const qs = sp.toString();
      return request<PagedResponse<ReviewDto>>(`/api/garages/${garageId}/reviews${qs ? `?${qs}` : ''}`);
    },

    create: (garageId: number, data: CreateReviewRequest): Promise<ReviewDto> =>
      request<ReviewDto>(`/api/garages/${garageId}/reviews`, {
        method: 'POST',
        json: data,
      }),

    update: (reviewId: number, data: UpdateReviewRequest): Promise<ReviewDto> =>
      request<ReviewDto>(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        json: data,
      }),

    respond: (reviewId: number, responseText: string): Promise<ReviewResponseDto> =>
      request<ReviewResponseDto>(`/api/reviews/${reviewId}/response`, {
        method: 'POST',
        json: { responseText },
      }),

    getMyReviews: (): Promise<UserReviewDto[]> =>
      request<UserReviewDto[]>('/api/reviews/my-reviews'),

    report: (
      garageId: number,
      reviewId: number,
      data: CreateReviewReportRequest
    ): Promise<ReviewReportDto> =>
      request<ReviewReportDto>(`/api/garages/${garageId}/reviews/${reviewId}/report`, {
        method: 'POST',
        json: data,
      }),
  },

  // Catalogue Services
  services: {
    list: (): Promise<ServiceDto[]> => request<ServiceDto[]>('/api/services'),

    getById: (id: number): Promise<ServiceDto> => request<ServiceDto>(`/api/services/${id}`),

    adminList: (): Promise<ServiceDto[]> => request<ServiceDto[]>('/api/admin/services'),

    create: (data: {
      name: string;
      category: string;
      description?: string;
      displayOrder?: number;
      isActive?: boolean;
    }): Promise<ServiceDto> =>
      request<ServiceDto>('/api/admin/services', {
        method: 'POST',
        json: data,
      }),

    update: (
      id: number,
      data: {
        name: string;
        category: string;
        description?: string;
        displayOrder?: number;
        isActive?: boolean;
      }
    ): Promise<ServiceDto> =>
      request<ServiceDto>(`/api/admin/services/${id}`, {
        method: 'PUT',
        json: data,
      }),
  },

  // Admin
  admin: {
    // Garages & Edits
    getPendingGarages: (): Promise<GarageSummaryDto[]> =>
      request<GarageSummaryDto[]>('/api/admin/garages/pending'),

    approveGarage: (id: number, notes?: string): Promise<GarageSummaryDto> =>
      request<GarageSummaryDto>(`/api/admin/garages/${id}/approve`, {
        method: 'POST',
        json: { notes: notes || '' },
      }),

    rejectGarage: (id: number, notes: string): Promise<GarageSummaryDto> =>
      request<GarageSummaryDto>(`/api/admin/garages/${id}/reject`, {
        method: 'POST',
        json: { notes },
      }),

    suspendGarage: (id: number, notes: string): Promise<GarageSummaryDto> =>
      request<GarageSummaryDto>(`/api/admin/garages/${id}/suspend`, {
        method: 'POST',
        json: { notes },
      }),

    setVerified: (id: number, verified: boolean, notes?: string): Promise<GarageSummaryDto> =>
      request<GarageSummaryDto>(`/api/admin/garages/${id}/verified`, {
        method: 'PUT',
        json: { verified, notes },
      }),

    getPendingProfileEdits: (): Promise<GarageProfileEditDto[]> =>
      request<GarageProfileEditDto[]>('/api/admin/garages/edits/pending'),

    approveProfileEdit: (id: number, notes?: string): Promise<GarageProfileEditDto> =>
      request<GarageProfileEditDto>(`/api/admin/garages/edits/${id}/approve`, {
        method: 'POST',
        json: { notes: notes || '' },
      }),

    rejectProfileEdit: (id: number, notes: string): Promise<GarageProfileEditDto> =>
      request<GarageProfileEditDto>(`/api/admin/garages/edits/${id}/reject`, {
        method: 'POST',
        json: { notes },
      }),

    // Claims
    getPendingClaims: (): Promise<GarageClaimDto[]> =>
      request<GarageClaimDto[]>('/api/admin/claims'),

    getClaim: (id: number): Promise<GarageClaimDto> =>
      request<GarageClaimDto>(`/api/admin/claims/${id}`),

    approveClaim: (id: number, decisionNotes?: string): Promise<GarageClaimDto> =>
      request<GarageClaimDto>(`/api/admin/claims/${id}/approve`, {
        method: 'POST',
        json: { decisionNotes: decisionNotes || '' },
      }),

    rejectClaim: (id: number, decisionNotes: string): Promise<GarageClaimDto> =>
      request<GarageClaimDto>(`/api/admin/claims/${id}/reject`, {
        method: 'POST',
        json: { decisionNotes },
      }),

    requestClaimResubmission: (id: number, decisionNotes: string): Promise<GarageClaimDto> =>
      request<GarageClaimDto>(`/api/admin/claims/${id}/request-resubmission`, {
        method: 'POST',
        json: { decisionNotes },
      }),

    reviewClaimDocument: (
      claimId: number,
      docId: number,
      status: DocumentVerificationStatus,
      rejectionReason?: string
    ): Promise<GarageDocumentDto> =>
      request<GarageDocumentDto>(`/api/admin/claims/${claimId}/documents/${docId}/review`, {
        method: 'POST',
        json: { status, rejectionReason },
      }),

    getClaimDocumentDownloadUrl: (claimId: number, docId: number): string =>
      `${API_BASE_URL}/api/admin/claims/${claimId}/documents/${docId}/download`,

    downloadClaimDocument: async (claimId: number, docId: number, filename?: string): Promise<void> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/claims/${claimId}/documents/${docId}/download`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new ApiError(res.status, 'Failed to fetch claim document', res.statusText);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      if (filename) a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    },

    // Documents
    getDocumentsForGarage: (garageId: number): Promise<GarageDocumentDto[]> =>
      request<GarageDocumentDto[]>(`/api/admin/documents/garage/${garageId}`),

    reviewDocument: (
      id: number,
      status: DocumentVerificationStatus,
      rejectionReason?: string
    ): Promise<GarageDocumentDto> =>
      request<GarageDocumentDto>(`/api/admin/documents/${id}/review`, {
        method: 'POST',
        json: { status, rejectionReason },
      }),

    getDocumentDownloadUrl: (id: number): string =>
      `${API_BASE_URL}/api/admin/documents/${id}/download`,

    // Reviews
    softDeleteReview: (id: number, deletionReason: string): Promise<void> =>
      request<void>(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
        json: { deletionReason },
      }),

    // Catalogue Services
    createService: (data: {
      name: string;
      category: ServiceCategory;
      description?: string;
      isActive?: boolean;
      displayOrder?: number;
    }): Promise<ServiceDto> =>
      request<ServiceDto>('/api/admin/services', {
        method: 'POST',
        json: data,
      }),

    updateService: (
      id: number,
      data: {
        name: string;
        category: ServiceCategory;
        description?: string;
        isActive?: boolean;
        displayOrder?: number;
      }
    ): Promise<ServiceDto> =>
      request<ServiceDto>(`/api/admin/services/${id}`, {
        method: 'PUT',
        json: data,
      }),
    // Phase 3 Admin Portal
    getOverview: (): Promise<AdminOverviewMetricsDto> =>
      request<AdminOverviewMetricsDto>('/api/admin/overview'),

    searchUsers: (params?: {
      search?: string;
      role?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      size?: number;
    }): Promise<PagedResponse<AdminUserSummaryDto>> => {
      const sp = new URLSearchParams();
      if (params?.search) sp.set('search', params.search);
      if (params?.role) sp.set('role', params.role);
      if (params?.status) sp.set('status', params.status);
      if (params?.fromDate) sp.set('fromDate', params.fromDate);
      if (params?.toDate) sp.set('toDate', params.toDate);
      if (params?.page !== undefined) sp.set('page', String(params.page));
      if (params?.size !== undefined) sp.set('size', String(params.size));
      const qs = sp.toString();
      return request<PagedResponse<AdminUserSummaryDto>>(`/api/admin/users${qs ? `?${qs}` : ''}`);
    },

    getUserDetail: (id: number): Promise<AdminUserDetailDto> =>
      request<AdminUserDetailDto>(`/api/admin/users/${id}`),

    updateUserStatus: (id: number, data: UpdateUserStatusRequest): Promise<AdminUserSummaryDto> =>
      request<AdminUserSummaryDto>(`/api/admin/users/${id}/status`, {
        method: 'POST',
        json: data,
      }),

    searchAllGarages: (params?: {
      search?: string;
      status?: string;
      verified?: boolean;
      city?: string;
      state?: string;
      page?: number;
      size?: number;
    }): Promise<PagedResponse<AdminGarageDetailDto>> => {
      const sp = new URLSearchParams();
      if (params?.search) sp.set('search', params.search);
      if (params?.status) sp.set('status', params.status);
      if (params?.verified !== undefined) sp.set('verified', String(params.verified));
      if (params?.city) sp.set('city', params.city);
      if (params?.state) sp.set('state', params.state);
      if (params?.page !== undefined) sp.set('page', String(params.page));
      if (params?.size !== undefined) sp.set('size', String(params.size));
      const qs = sp.toString();
      return request<PagedResponse<AdminGarageDetailDto>>(`/api/admin/garages/all${qs ? `?${qs}` : ''}`);
    },

    getGarageDetail: (id: number): Promise<AdminGarageDetailDto> =>
      request<AdminGarageDetailDto>(`/api/admin/garages/${id}/details`),

    searchQuotes: (params?: {
      search?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
      page?: number;
      size?: number;
    }): Promise<PagedResponse<AdminQuoteSummaryDto>> => {
      const sp = new URLSearchParams();
      if (params?.search) sp.set('search', params.search);
      if (params?.status) sp.set('status', params.status);
      if (params?.fromDate) sp.set('fromDate', params.fromDate);
      if (params?.toDate) sp.set('toDate', params.toDate);
      if (params?.page !== undefined) sp.set('page', String(params.page));
      if (params?.size !== undefined) sp.set('size', String(params.size));
      const qs = sp.toString();
      return request<PagedResponse<AdminQuoteSummaryDto>>(`/api/admin/quotes${qs ? `?${qs}` : ''}`);
    },

    getQuoteDetail: (id: number): Promise<QuoteRequestDto> =>
      request<QuoteRequestDto>(`/api/admin/quotes/${id}`),

    updateQuoteStatus: (id: number, data: AdminQuoteStatusUpdateRequest): Promise<QuoteRequestDto> =>
      request<QuoteRequestDto>(`/api/admin/quotes/${id}/status`, {
        method: 'POST',
        json: data,
      }),

    manageUserRole: (id: number, data: ManageRoleRequest): Promise<AdminUserDetailDto> =>
      request<AdminUserDetailDto>(`/api/admin/users/${id}/roles`, {
        method: 'POST',
        json: data,
      }),

    switchPrimaryRole: (id: number, data: SwitchPrimaryRoleRequest): Promise<AdminUserDetailDto> =>
      request<AdminUserDetailDto>(`/api/admin/users/${id}/primary-role`, {
        method: 'POST',
        json: data,
      }),

    manageUserPermission: (id: number, data: ManagePermissionRequest): Promise<AdminUserDetailDto> =>
      request<AdminUserDetailDto>(`/api/admin/users/${id}/permissions`, {
        method: 'POST',
        json: data,
      }),

    searchAuditLogs: (params?: {
      actionType?: string;
      targetType?: string;
      adminUserId?: number;
      fromDate?: string;
      toDate?: string;
      page?: number;
      size?: number;
    }): Promise<PagedResponse<AdminAuditLogDto>> => {
      const sp = new URLSearchParams();
      if (params?.actionType) sp.set('actionType', params.actionType);
      if (params?.targetType) sp.set('targetType', params.targetType);
      if (params?.adminUserId !== undefined) sp.set('adminUserId', String(params.adminUserId));
      if (params?.fromDate) sp.set('fromDate', params.fromDate);
      if (params?.toDate) sp.set('toDate', params.toDate);
      if (params?.page !== undefined) sp.set('page', String(params.page));
      if (params?.size !== undefined) sp.set('size', String(params.size));
      const qs = sp.toString();
      return request<PagedResponse<AdminAuditLogDto>>(`/api/admin/audit-logs${qs ? `?${qs}` : ''}`);
    },

    getExportUrl: (type: 'users' | 'garages' | 'leads' | 'quotes'): string =>
      `${API_BASE_URL}/api/admin/export/${type}`,

    downloadExport: async (type: 'users' | 'garages' | 'leads' | 'quotes'): Promise<void> => {
      const res = await fetch(`${API_BASE_URL}/api/admin/export/${type}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new ApiError(res.status, 'Export failed or unauthorized', res.statusText);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merigarage_${type}_export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    },

    // Review Moderation Reports
    getReviewReports: (params?: {
      search?: string;
      status?: ReviewReportStatus;
      page?: number;
      size?: number;
    }): Promise<PagedResponse<ReviewReportDto>> => {
      const sp = new URLSearchParams();
      if (params?.search) sp.set('search', params.search);
      if (params?.status) sp.set('status', params.status);
      if (params?.page !== undefined) sp.set('page', String(params.page));
      if (params?.size !== undefined) sp.set('size', String(params.size));
      const qs = sp.toString();
      return request<PagedResponse<ReviewReportDto>>(`/api/admin/reviews/reports${qs ? `?${qs}` : ''}`);
    },

    moderateReviewReport: (
      id: number,
      data: ModerateReviewReportRequest
    ): Promise<ReviewReportDto> =>
      request<ReviewReportDto>(`/api/admin/reviews/reports/${id}/moderate`, {
        method: 'POST',
        json: data,
      }),
  },

  // Quote Requests
  quotes: {
    create: (data: CreateQuoteRequest): Promise<QuoteRequestDto> =>
      request<QuoteRequestDto>('/api/quote-requests', {
        method: 'POST',
        json: data,
      }),

    getMyRequests: (): Promise<QuoteRequestDto[]> =>
      request<QuoteRequestDto[]>('/api/quote-requests/my-requests'),

    getForGarage: (garageId: number): Promise<QuoteRequestDto[]> =>
      request<QuoteRequestDto[]>(`/api/quote-requests/garage/${garageId}`),

    getById: (id: number): Promise<QuoteRequestDto> =>
      request<QuoteRequestDto>(`/api/quote-requests/${id}`),

    ownerResponse: (id: number, data: QuoteOwnerResponseRequest): Promise<QuoteRequestDto> =>
      request<QuoteRequestDto>(`/api/quote-requests/${id}/owner-response`, {
        method: 'POST',
        json: data,
      }),

    customerAction: (id: number, data: QuoteCustomerActionRequest): Promise<QuoteRequestDto> =>
      request<QuoteRequestDto>(`/api/quote-requests/${id}/customer-action`, {
        method: 'POST',
        json: data,
      }),

    addMessage: (id: number, messageText: string): Promise<QuoteRequestDto> =>
      request<QuoteRequestDto>(`/api/quote-requests/${id}/messages`, {
        method: 'POST',
        json: { messageText },
      }),
  },

  // Persistent Leads & Search Events
  leads: {
    track: (event: TrackLeadEventRequest): Promise<TrackLeadEventResponse> =>
      request<TrackLeadEventResponse>('/api/leads/track', {
        method: 'POST',
        json: event,
      }),

    listAdmin: (params?: {
      page?: number;
      size?: number;
      type?: string;
      city?: string;
      state?: string;
      serviceSlug?: string;
      source?: string;
      hasUser?: boolean;
      search?: string;
      fromDate?: string;
      toDate?: string;
    }): Promise<PagedResponse<LeadEventDto>> => {
      const sp = new URLSearchParams();
      if (params?.page !== undefined) sp.set('page', String(params.page));
      if (params?.size !== undefined) sp.set('size', String(params.size));
      if (params?.type) sp.set('eventType', params.type);
      if (params?.city) sp.set('city', params.city);
      if (params?.state) sp.set('state', params.state);
      if (params?.serviceSlug) sp.set('serviceSlug', params.serviceSlug);
      if (params?.source) sp.set('source', params.source);
      if (params?.hasUser !== undefined) sp.set('hasUser', String(params.hasUser));
      if (params?.search) sp.set('search', params.search);
      if (params?.fromDate) sp.set('fromDate', params.fromDate);
      if (params?.toDate) sp.set('toDate', params.toDate);
      const qs = sp.toString();
      return request<PagedResponse<LeadEventDto>>(`/api/admin/leads${qs ? `?${qs}` : ''}`);
    },
  },
};

