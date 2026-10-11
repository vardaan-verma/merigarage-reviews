export type RoleName = 'ROLE_USER' | 'ROLE_GARAGE_OWNER' | 'ROLE_ADMIN';

export type AdminPermissionCode =
  | 'GARAGE_APPROVAL'
  | 'VERIFICATION_REVIEW'
  | 'CLAIM_MANAGEMENT'
  | 'CONTENT_MODERATION';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export type DocumentType =
  | 'TRADE_LICENSE'
  | 'GST_CERTIFICATE'
  | 'ID_PROOF'
  | 'UTILITY_BILL'
  | 'BUSINESS_PAN'
  | 'OTHER';

export type DocumentVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type EditStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ServiceCategory =
  | 'PERIODIC_MAINTENANCE'
  | 'BODY_AND_PAINT'
  | 'WHEELS_AND_TYRES'
  | 'ELECTRICAL'
  | 'MECHANICAL_REPAIR';

export interface UserDto {
  id: number;
  email: string;
  fullName: string;
  status: UserStatus;
  roles: string[];
  permissions: string[];
}

export interface GarageSummaryDto {
  id: number;
  name: string;
  slug: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
  isVerified: boolean;
  coverPhotoId?: number | null;
}

export interface GaragePhotoDto {
  id: number;
  caption?: string | null;
  displayOrder?: number | null;
  isCover?: boolean | null;
}

export interface GarageServiceDto {
  serviceId: number;
  serviceName: string;
  category: ServiceCategory;
  description?: string | null;
  startingPrice?: number | null;
  isAvailable: boolean;
}

export interface GarageDetailDto {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
  email?: string | null;
  websiteUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isVerified: boolean;
  coverPhotoId?: number | null;
  photos: GaragePhotoDto[];
  services: GarageServiceDto[];
}

export interface GarageDocumentDto {
  id: number;
  garageId: number;
  documentType: DocumentType;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  verificationStatus: DocumentVerificationStatus;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface GarageProfileEditDto {
  id: number;
  garageId: number;
  proposedName: string;
  proposedDescription?: string | null;
  proposedAddressLine1: string;
  proposedAddressLine2?: string | null;
  proposedCity: string;
  proposedState: string;
  proposedPostalCode: string;
  proposedPhoneNumber: string;
  proposedEmail?: string | null;
  proposedWebsiteUrl?: string | null;
  proposedLatitude?: number | null;
  proposedLongitude?: number | null;
  status: EditStatus;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface GarageClaimDto {
  id: number;
  garageId: number;
  garageName: string;
  claimantUserId: number;
  claimantEmail: string;
  claimMessage: string;
  claimStatus: ClaimStatus;
  decisionNotes?: string | null;
  createdAt: string;
}

export interface ReviewResponseDto {
  id: number;
  responseText: string;
  createdAt: string;
}

export interface ReviewDto {
  id: number;
  garageId: number;
  authorFullName: string;
  ratingServiceQuality: number;
  ratingPricing: number;
  ratingTimeline: number;
  ratingCommunication: number;
  overallRating: number;
  reviewTitle?: string | null;
  reviewText: string;
  response?: ReviewResponseDto | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ServiceDto {
  id: number;
  name: string;
  slug: string;
  category: ServiceCategory;
  description?: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ErrorResponse {
  status: number;
  error: string;
  message: string;
  details?: string[];
  timestamp?: string;
}

export interface CreateGarageRequest {
  name: string;
  description?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
  email?: string;
  websiteUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface ProfileEditRequest {
  proposedName: string;
  proposedDescription?: string;
  proposedAddressLine1: string;
  proposedAddressLine2?: string;
  proposedCity: string;
  proposedState: string;
  proposedPostalCode: string;
  proposedPhoneNumber: string;
  proposedEmail?: string;
  proposedWebsiteUrl?: string;
  proposedLatitude?: number;
  proposedLongitude?: number;
}

export interface CreateReviewRequest {
  ratingServiceQuality: number;
  ratingPricing: number;
  ratingTimeline: number;
  ratingCommunication: number;
  reviewTitle?: string;
  reviewText: string;
}

export interface UpdateReviewRequest {
  ratingServiceQuality: number;
  ratingPricing: number;
  ratingTimeline: number;
  ratingCommunication: number;
  reviewTitle?: string;
  reviewText: string;
}
