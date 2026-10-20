export type RoleName = 'ROLE_USER' | 'ROLE_GARAGE_OWNER' | 'ROLE_ADMIN';

export type AdminPermissionCode =
  | 'GARAGE_APPROVAL'
  | 'VERIFICATION_REVIEW'
  | 'CLAIM_MANAGEMENT'
  | 'CONTENT_MODERATION'
  | 'USER_MANAGEMENT'
  | 'LEAD_ACCESS'
  | 'QUOTE_OVERSIGHT'
  | 'DATA_EXPORT';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export type DocumentType =
  | 'TRADE_LICENSE'
  | 'GST_CERTIFICATE'
  | 'OWNERSHIP_PROOF'
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
  phoneNumber?: string | null;
  profilePhotoUrl?: string | null;
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
  claimId?: number | null;
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
  garageCity?: string | null;
  garageAddress?: string | null;
  claimantUserId: number;
  claimantFullName?: string | null;
  claimantName?: string | null;
  claimantEmail: string;
  claimantPhone?: string | null;
  businessRegNumber?: string | null;
  claimMessage: string;
  claimStatus: ClaimStatus;
  decisionNotes?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  documents?: GarageDocumentDto[];
}

export interface SubmitClaimData {
  claimMessage: string;
  claimantName?: string;
  claimantPhone?: string;
  claimantEmail?: string;
  businessRegNumber?: string;
  documentTypes?: DocumentType[];
  documents?: File[];
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
  authorProfilePhotoUrl?: string | null;
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

export type LeadEventType =
  | 'HOMEPAGE_SEARCH_STARTED'
  | 'HOMEPAGE_SEARCH_SUBMITTED'
  | 'EXPLORE_GARAGES_VIEWED'
  | 'GARAGE_PROFILE_VIEWED'
  | 'SIGNUP_STARTED'
  | 'USER_REGISTERED'
  | 'QUOTE_REQUEST_SUBMITTED'
  | 'GENERIC_CONVERSION';

export interface TrackLeadEventRequest {
  eventId?: string;
  sessionId?: string;
  eventType: LeadEventType;
  state?: string;
  city?: string;
  vehicleType?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  serviceSlug?: string;
  serviceName?: string;
  phoneNumber?: string;
  customerName?: string;
  garageId?: number;
  garageSlug?: string;
  source?: string;
  consentStatus?: string;
  metadata?: Record<string, any>;
}

export interface TrackLeadEventResponse {
  eventId: string;
  sessionId: string;
  eventType: string;
  status: string;
  timestamp: string;
}

export interface LeadEventDto {
  id: number;
  eventId: string;
  sessionId: string;
  userId?: number | null;
  userFullName?: string | null;
  userEmail?: string | null;
  customerName?: string | null;
  eventType: string;
  state?: string | null;
  city?: string | null;
  vehicleType?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  serviceSlug?: string | null;
  serviceName?: string | null;
  maskedPhoneNumber?: string | null;
  phoneNumber?: string | null;
  garageId?: number | null;
  garageSlug?: string | null;
  source?: string | null;
  consentStatus?: string | null;
  createdAt: string;
}

export interface ServiceUsageDto {
  serviceId: number;
  serviceName: string;
  slug: string;
  category: string;
  offeringGaragesCount: number;
}

export interface AdminUserSummaryDto {
  id: number;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  profilePhotoUrl?: string | null;
  roles: string[];
  permissions: string[];
  status: UserStatus;
  registrationSource?: string | null;
  consentStatus?: string | null;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  linkedGaragesCount: number;
  quoteRequestsCount: number;
}

export interface AdminUserDetailDto {
  user: AdminUserSummaryDto;
  linkedGarages: GarageSummaryDto[];
  quoteRequests: QuoteRequestDto[];
  ownershipClaims: GarageClaimDto[];
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
  reason: string;
}

export interface GarageApprovalAuditDto {
  id: number;
  garageId: number;
  actionType: string;
  adminUserId: number;
  adminUserName: string;
  previousStatus: string;
  newStatus: string;
  previousVerified: boolean;
  newVerified: boolean;
  decisionNotes?: string | null;
  createdAt: string;
}

export interface AdminGarageDetailDto {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  phoneNumber: string;
  email?: string | null;
  websiteUrl?: string | null;
  googleMapsUrl?: string | null;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  isVerified: boolean;
  coverPhotoId?: number | null;
  ownerId?: number | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  createdByUserId?: number | null;
  createdByName?: string | null;
  services: string[];
  documentsCount: number;
  createdAt: string;
  updatedAt: string;
  approvalHistory: GarageApprovalAuditDto[];
}

export interface AdminQuoteSummaryDto {
  id: number;
  referenceNumber: string;
  garageId: number;
  garageName: string;
  garageCity: string;
  customerUserId?: number | null;
  customerName?: string | null;
  customerEmail?: string | null;
  contactPhone?: string | null;
  vehicleType?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | null;
  problemDescription?: string | null;
  serviceNames: string[];
  estimatedMinPrice?: number | null;
  proposedQuoteAmount?: number | null;
  ownerNotes?: string | null;
  status: QuoteRequestStatus;
  createdAt: string;
  updatedAt: string;
  messagesCount: number;
}

export interface AdminQuoteStatusUpdateRequest {
  status: QuoteRequestStatus;
  reason: string;
}

export interface AdminOverviewMetricsDto {
  totalUsers: number;
  customerAccounts: number;
  garageOwnerAccounts: number;
  adminAccounts: number;
  newRegistrations24h: number;
  newRegistrations7d: number;
  newRegistrations30d: number;
  totalGarages: number;
  activeGarages: number;
  pendingGarages: number;
  suspendedGarages: number;
  rejectedGarages: number;
  verifiedGarages: number;
  claimedGarages: number;
  totalReviews: number;
  totalSubmittedReviews: number;
  pendingReviewReports: number;
  totalLeads: number;
  homepageSearchSubmissions: number;
  quoteRequestsByStatus: Record<string, number>;
  claimsByStatus: Record<string, number>;
  recentRegistrations: AdminUserSummaryDto[];
  recentLeads: LeadEventDto[];
  recentQuoteRequests: AdminQuoteSummaryDto[];
  serviceCatalogueUsage: ServiceUsageDto[];
}

export interface ManageRoleRequest {
  role: RoleName;
  action: 'GRANT' | 'REVOKE';
}

export interface ManagePermissionRequest {
  permission: AdminPermissionCode;
  action: 'GRANT' | 'REVOKE';
}

export interface AdminAuditLogDto {
  id: number;
  adminUserId?: number | null;
  adminEmail?: string | null;
  adminFullName?: string | null;
  actionType: string;
  targetType: string;
  targetId?: number | null;
  outcome: string;
  reason?: string | null;
  metadataJson?: string | null;
  createdAt: string;
}

export interface VehicleDto {
  id: number;
  userId: number;
  vehicleType: string;
  make: string;
  model: string;
  year?: number | null;
  registrationNumber?: string | null;
  fuelType?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleRequest {
  vehicleType: string;
  make: string;
  model: string;
  year?: number;
  registrationNumber?: string;
  fuelType?: string;
}

export interface UpdateVehicleRequest {
  vehicleType: string;
  make: string;
  model: string;
  year?: number;
  registrationNumber?: string;
  fuelType?: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  phoneNumber?: string;
  profilePhotoUrl?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface SwitchPrimaryRoleRequest {
  targetRole: RoleName;
  reason?: string;
}

export interface UserReviewDto {
  id: number;
  garageId: number;
  garageName: string;
  garageSlug?: string | null;
  garageCity?: string | null;
  overallRating: number;
  ratingServiceQuality?: number | null;
  ratingPricing?: number | null;
  ratingTimeline?: number | null;
  ratingCommunication?: number | null;
  reviewTitle?: string | null;
  reviewText: string;
  status: string;
  response?: ReviewResponseDto | null;
  createdAt: string;
  updatedAt: string;
  authorUserId?: number | null;
  authorFullName?: string | null;
  authorProfilePhotoUrl?: string | null;
}

export type ReviewReportStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';

export interface ReviewReportDto {
  id: number;
  reviewId: number;
  garageId: number;
  garageName: string;
  garageCity?: string | null;
  authorUserId?: number | null;
  authorFullName: string;
  authorEmail?: string | null;
  overallRating?: number | null;
  reviewTitle?: string | null;
  reviewText: string;
  reviewStatus: string;
  reporterUserId?: number | null;
  reporterFullName: string;
  reporterEmail?: string | null;
  reportReason: string;
  details?: string | null;
  status: ReviewReportStatus;
  decisionNotes?: string | null;
  resolvedByAdminId?: number | null;
  resolvedByAdminName?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewReportRequest {
  reportReason: string;
  details?: string;
}

export interface ModerateReviewReportRequest {
  action: 'DISMISS' | 'HIDE_REVIEW' | 'DELETE_REVIEW';
  decisionNotes?: string;
}

