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
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
  serviceNames?: string[];
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
  googleMapsUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isVerified: boolean;
  coverPhotoId?: number | null;
  photos: GaragePhotoDto[];
  services: GarageServiceDto[];
  hasOwner?: boolean;
  ownerId?: number | null;
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
  garageSlug?: string | null;
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
  authorUserId?: number;
  authorFullName: string;
  ratingServiceQuality: number;
  ratingPricing: number;
  ratingTimeline: number;
  ratingCommunication: number;
  serviceQuality?: number;
  pricing?: number;
  timeline?: number;
  communication?: number;
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
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  serviceIds?: number[];
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
  serviceQuality: number;
  pricing: number;
  timeline: number;
  communication: number;
  ratingServiceQuality?: number;
  ratingPricing?: number;
  ratingTimeline?: number;
  ratingCommunication?: number;
  reviewTitle?: string;
  reviewText: string;
}

export interface UpdateReviewRequest {
  serviceQuality: number;
  pricing: number;
  timeline: number;
  communication: number;
  ratingServiceQuality?: number;
  ratingPricing?: number;
  ratingTimeline?: number;
  ratingCommunication?: number;
  reviewTitle?: string;
  reviewText: string;
}

export type QuoteRequestStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface QuoteRequestMessageDto {
  id: number;
  quoteRequestId: number;
  senderUserId: number;
  senderName: string;
  senderRole: 'CUSTOMER' | 'OWNER';
  messageText: string;
  createdAt: string;
}

export interface QuoteRequestDto {
  id: number;
  referenceNumber: string;
  garageId: number;
  garageName?: string | null;
  garageSlug?: string | null;
  garageCity?: string | null;
  customerUserId: number;
  customerName?: string | null;
  customerEmail?: string | null;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear?: number | null;
  fuelType?: string | null;
  registrationNumber?: string | null;
  odometerReading?: number | null;
  problemDescription: string;
  customerMessage?: string | null;
  contactPhone: string;
  contactEmail?: string | null;
  preferredDate?: string | null;
  estimatedMinPrice?: number | null;
  estimatedMaxPrice?: number | null;
  proposedQuoteAmount?: number | null;
  ownerNotes?: string | null;
  status: QuoteRequestStatus;
  createdAt: string;
  updatedAt: string;
  services: ServiceDto[];
  messages: QuoteRequestMessageDto[];
}

export interface CreateQuoteRequest {
  garageId: number;
  serviceIds: number[];
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear?: number | null;
  fuelType?: string | null;
  registrationNumber?: string | null;
  odometerReading?: number | null;
  problemDescription: string;
  customerMessage?: string | null;
  contactPhone: string;
  contactEmail?: string | null;
  preferredDate?: string | null;
}

export interface QuoteOwnerResponseRequest {
  action: 'REVIEW' | 'QUOTE' | 'DECLINE' | 'COMPLETE';
  proposedQuoteAmount?: number;
  ownerNotes?: string;
}

export interface QuoteCustomerActionRequest {
  action: 'ACCEPT' | 'DECLINE' | 'CANCEL';
  notes?: string;
}

export interface QuoteMessageRequest {
  messageText: string;
}

