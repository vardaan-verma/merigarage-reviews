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
  UpdateReviewRequest,
  UserDto,
} from './types';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
    login: (email: string, password: string): Promise<UserDto> =>
      request<UserDto>('/api/auth/login', {
        method: 'POST',
        json: { email, password },
      }),

    googleAuth: (credential: string): Promise<UserDto> =>
      request<UserDto>('/api/auth/google', {
        method: 'POST',
        json: { credential },
      }),

    register: (data: {
      email: string;
      password: string;
      fullName: string;
      phoneNumber?: string;
    }): Promise<UserDto> =>
      request<UserDto>('/api/auth/register', {
        method: 'POST',
        json: data,
      }),

    logout: (): Promise<{ message: string }> =>
      request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

    getCurrentUser: (): Promise<UserDto> =>
      request<UserDto>('/api/auth/me', { method: 'GET' }),

    getCsrf: (): Promise<{ token: string; headerName: string; parameterName: string }> =>
      request('/api/auth/csrf', { method: 'GET' }),

    getProfile: (): Promise<UserDto> =>
      request<UserDto>('/api/users/profile', { method: 'GET' }),
  },

  // Public Garages
  garages: {
    list: (params?: {
      city?: string;
      isVerified?: boolean;
      serviceId?: number;
      serviceSlug?: string;
      page?: number;
      size?: number;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }): Promise<PagedResponse<GarageSummaryDto>> => {
      const sp = new URLSearchParams();
      if (params?.city) sp.set('city', params.city);
      if (params?.isVerified !== undefined) sp.set('isVerified', String(params.isVerified));
      if (params?.serviceId !== undefined) sp.set('serviceId', String(params.serviceId));
      if (params?.serviceSlug) sp.set('serviceSlug', params.serviceSlug);
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
    submit: (garageId: number, claimMessage: string): Promise<GarageClaimDto> =>
      request<GarageClaimDto>(`/api/garages/${garageId}/claims`, {
        method: 'POST',
        json: { claimMessage },
      }),

    getMyClaims: (): Promise<GarageClaimDto[]> =>
      request<GarageClaimDto[]>('/api/claims/my-claims'),
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
};

