import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfirm, useToast } from '../context/NotificationContext';
import { api } from '../api/client';
import type { VehicleDto, CreateVehicleRequest, UpdateVehicleRequest, QuoteRequestDto } from '../api/types';
import { Modal } from '../components/Modal';
import { UserAvatar } from '../components/UserAvatar';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, uploadProfilePhoto, deleteProfilePhoto, logout, hasRole, hasPermission } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { showSuccess, showError, showWarning } = useToast();

  // Profile Edit State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Profile Photo Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Vehicles State
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Vehicle Modal State (Add / Edit)
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [vehicleType, setVehicleType] = useState('Car');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState<number | ''>(new Date().getFullYear());
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleFuel, setVehicleFuel] = useState('Petrol');
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Vehicle History State (keyed by vehicle ID)
  const [historyLoadingId, setHistoryLoadingId] = useState<number | null>(null);
  const [vehicleHistory, setVehicleHistory] = useState<Record<number, QuoteRequestDto[]>>({});
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);

  const isGarageOwner = hasRole('ROLE_GARAGE_OWNER');
  const isVehicleOwner = hasRole('ROLE_USER') && !isGarageOwner;
  const isAdmin =
    hasRole('ROLE_ADMIN') ||
    hasPermission('GARAGE_APPROVAL') ||
    hasPermission('CLAIM_MANAGEMENT') ||
    hasPermission('VERIFICATION_REVIEW') ||
    hasPermission('CONTENT_MODERATION');

  const fetchVehicles = useCallback(async () => {
    try {
      setLoadingVehicles(true);
      const data = await api.vehicles.list();
      setVehicles(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load saved vehicles');
    } finally {
      setLoadingVehicles(false);
    }
  }, [showError]);

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user, fetchVehicles]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      showError('Unsupported image format. Please select a JPEG, PNG, or WebP image.');
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      showError(`Selected image (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 5 MB limit.`);
      return;
    }

    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(objectUrl);
  };

  const handleCancelPhotoSelection = () => {
    if (photoPreviewUrl && photoPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
  };

  const handleConfirmPhotoUpload = async () => {
    if (!selectedPhotoFile) return;
    try {
      setUploadingPhoto(true);
      await uploadProfilePhoto(selectedPhotoFile);
      showSuccess('Profile photo uploaded and saved successfully.');
      handleCancelPhotoSelection();
    } catch (err: any) {
      showError(err.message || 'Failed to upload profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    const confirmed = await confirm({
      title: 'Remove Profile Photo?',
      message: 'Are you sure you want to remove your custom profile photo? Your account will revert to the default avatar.',
      confirmText: 'Remove Photo',
      variant: 'danger',
      icon: 'no_accounts',
    });
    if (!confirmed) {
      return;
    }
    try {
      setUploadingPhoto(true);
      await deleteProfilePhoto();
      showSuccess('Profile photo removed. Default avatar restored.');
    } catch (err: any) {
      showError(err.message || 'Failed to remove profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const openProfileModal = () => {
    if (!user) return;
    setEditFullName(user.fullName || '');
    setEditPhone(user.phoneNumber ? user.phoneNumber.replace('+91', '') : '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) {
      showWarning('Full name cannot be blank.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        showWarning('New password must be at least 8 characters long.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        showWarning('New passwords do not match.');
        return;
      }
      if (!currentPassword) {
        showWarning('Please provide your current password to confirm changes.');
        return;
      }
    }

    try {
      setUpdatingProfile(true);
      await updateProfile({
        fullName: editFullName.trim(),
        phoneNumber: editPhone.trim() || undefined,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      showSuccess('Your profile details have been saved successfully.');
      setProfileModalOpen(false);
    } catch (err: any) {
      showError(err.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const openAddVehicleModal = () => {
    setEditingVehicleId(null);
    setVehicleType('Car');
    setVehicleMake('');
    setVehicleModel('');
    setVehicleYear(new Date().getFullYear());
    setVehicleReg('');
    setVehicleFuel('Petrol');
    setVehicleModalOpen(true);
  };

  const openEditVehicleModal = (v: VehicleDto) => {
    setEditingVehicleId(v.id);
    setVehicleType(v.vehicleType || 'Car');
    setVehicleMake(v.make);
    setVehicleModel(v.model);
    setVehicleYear(v.year || '');
    setVehicleReg(v.registrationNumber || '');
    setVehicleFuel(v.fuelType || 'Petrol');
    setVehicleModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleMake.trim() || !vehicleModel.trim()) {
      showWarning('Please enter both make and model.');
      return;
    }

    try {
      setSavingVehicle(true);
      const payload: CreateVehicleRequest = {
        vehicleType: vehicleType.trim() || 'Car',
        make: vehicleMake.trim(),
        model: vehicleModel.trim(),
        year: vehicleYear ? Number(vehicleYear) : undefined,
        registrationNumber: vehicleReg.trim() || undefined,
        fuelType: vehicleFuel.trim() || undefined,
      };

      if (editingVehicleId) {
        await api.vehicles.update(editingVehicleId, payload as UpdateVehicleRequest);
        showSuccess('Vehicle details updated successfully.');
      } else {
        await api.vehicles.create(payload);
        showSuccess('New vehicle added to your garage.');
      }

      setVehicleModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      showError(err.message || 'Failed to save vehicle details.');
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    const confirmed = await confirm({
      title: 'Delete Saved Vehicle?',
      message: 'Are you sure you want to remove this vehicle from your account? This action cannot be undone.',
      confirmText: 'Delete Vehicle',
      variant: 'danger',
      icon: 'directions_car',
    });
    if (!confirmed) return;

    try {
      await api.vehicles.delete(id);
      showSuccess('Vehicle removed from your saved garage.');
      fetchVehicles();
    } catch (err: any) {
      showError(err.message || 'Failed to remove vehicle.');
    }
  };

  const toggleVehicleHistory = async (vehicleId: number) => {
    if (expandedHistoryId === vehicleId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(vehicleId);
    if (!vehicleHistory[vehicleId]) {
      try {
        setHistoryLoadingId(vehicleId);
        const history = await api.vehicles.getHistory(vehicleId);
        setVehicleHistory((prev) => ({ ...prev, [vehicleId]: history }));
      } catch {
        setVehicleHistory((prev) => ({ ...prev, [vehicleId]: [] }));
      } finally {
        setHistoryLoadingId(null);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  // Role label for badge
  const roleBadgeLabel = isAdmin
    ? 'Lead Administrator'
    : isGarageOwner
    ? 'Garage Owner'
    : 'Vehicle Owner';

  return (
    <div className="pp-page container py-8" style={{ maxWidth: '900px' }}>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="pp-page-header">
        <div>
          <h1 className="pp-page-title">My Account Profile</h1>
          <p className="pp-page-subtitle">
            Manage your personal credentials, contact details, and registered vehicles.
          </p>
        </div>
        <div className="pp-header-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm flex items-center gap-1.5"
            onClick={openProfileModal}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
            Edit Profile
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            onClick={handleLogout}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Profile Card ─────────────────────────────────────────────── */}
      <div className="pp-profile-card card mb-6">
        {/* Identity row: avatar + info */}
        <div className="pp-identity-row">
          {/* Avatar */}
          <div className="pp-avatar-wrap">
            <div className="pp-avatar-ring">
              <UserAvatar
                photoUrl={photoPreviewUrl || user.profilePhotoUrl}
                name={user.fullName}
                email={user.email}
                size="xl"
                showBorder={false}
                className="w-full h-full"
              />
            </div>
            {photoPreviewUrl && (
              <span className="pp-avatar-preview-badge">Preview</span>
            )}
          </div>

          {/* Name / role / contact + photo controls */}
          <div className="pp-identity-info">
            <div className="pp-name-row">
              <h2 className="pp-name">{user.fullName || 'Registered User'}</h2>
              <span className="badge badge-secondary pp-role-badge">
                {roleBadgeLabel}
              </span>
            </div>

            <div className="pp-contact-row">
              <span className="pp-contact-item">
                <span className="material-symbols-outlined pp-contact-icon">mail</span>
                <span className="pp-contact-text">{user.email}</span>
              </span>
              {user.phoneNumber ? (
                <span className="pp-contact-item">
                  <span className="material-symbols-outlined pp-contact-icon">call</span>
                  <span className="pp-contact-text">{user.phoneNumber}</span>
                </span>
              ) : (
                <span className="pp-contact-item pp-contact-missing">No phone number provided</span>
              )}
            </div>

            {/* Photo controls */}
            <div className="pp-photo-controls">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
                id="profile-photo-upload"
              />

              {selectedPhotoFile ? (
                <>
                  <button
                    type="button"
                    onClick={handleConfirmPhotoUpload}
                    disabled={uploadingPhoto}
                    className="btn btn-primary btn-xs flex items-center gap-1"
                  >
                    {uploadingPhoto ? (
                      <>
                        <span className="spinner spinner-xs mr-1" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check</span>
                        <span>Save New Photo</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelPhotoSelection}
                    disabled={uploadingPhoto}
                    className="btn btn-secondary btn-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>close</span>
                    <span>Cancel</span>
                  </button>
                  <span className="pp-photo-hint">
                    {selectedPhotoFile.name} ({Math.round(selectedPhotoFile.size / 1024)} KB)
                  </span>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="btn btn-secondary btn-xs flex items-center gap-1"
                    title="Upload profile picture (JPG, PNG, WebP up to 5 MB)"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>photo_camera</span>
                    <span>{user.profilePhotoUrl ? 'Change Photo' : 'Upload Photo (JPG, PNG, WebP)'}</span>
                  </button>
                  {user.profilePhotoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={uploadingPhoto}
                      className="btn btn-secondary btn-xs text-danger flex items-center gap-1"
                      title="Remove profile photo and reset to default avatar"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                      <span>Remove</span>
                    </button>
                  )}
                  <span className="pp-photo-hint">Supports JPG, PNG, WebP (max 5 MB)</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Roles & permissions section */}
        <div className="pp-roles-section">
          <div className="pp-roles-col">
            <h4 className="pp-section-label">Assigned Platform Roles</h4>
            <div className="pp-badges-wrap">
              {user.roles && user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <span
                    key={role}
                    className={`badge ${
                      role === 'ROLE_ADMIN'
                        ? 'badge-verified'
                        : role === 'ROLE_GARAGE_OWNER'
                        ? 'badge-accent'
                        : 'badge-secondary'
                    }`}
                  >
                    {role.replace('ROLE_', '')}
                  </span>
                ))
              ) : (
                <span className="pp-no-data">No roles assigned</span>
              )}
            </div>
          </div>

          <div className="pp-roles-col">
            <h4 className="pp-section-label">Administrative Permissions</h4>
            <div className="pp-badges-wrap">
              {user.permissions && user.permissions.length > 0 ? (
                user.permissions.map((perm) => (
                  <span key={perm} className="badge badge-pending">
                    {perm}
                  </span>
                ))
              ) : (
                <span className="pp-no-data">Standard Motorist Access</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Saved Vehicles ────────────────────────────────────────────── */}
      <div className="card pp-section-card mb-6">
        <div className="pp-section-header">
          <div>
            <h3 className="pp-section-title">
              <span className="material-symbols-outlined pp-section-icon">directions_car</span>
              My Saved Vehicles
            </h3>
            <p className="pp-section-subtitle">
              Save your vehicles to request instant quotes and complete service history across MeriGarage workshops.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddVehicleModal}
            className="btn btn-primary btn-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            Add Vehicle
          </button>
        </div>

        {loadingVehicles ? (
          <div className="center-loader py-8">
            <div className="spinner"></div>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="pp-empty-vehicles">
            <span className="material-symbols-outlined pp-empty-icon">directions_car</span>
            <h4 className="pp-empty-title">No Vehicles Saved Yet</h4>
            <p className="pp-empty-desc">
              Add your car or two-wheeler here to instantly pre-fill your quote requests
              and maintain your digital repair records.
            </p>
            <button
              type="button"
              onClick={openAddVehicleModal}
              className="btn btn-primary btn-sm inline-flex items-center gap-1.5 mt-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="pp-vehicle-row"
              >
                <div className="pp-vehicle-main">
                  <div className="pp-vehicle-info">
                    <div className="pp-vehicle-name-row">
                      <span className="pp-vehicle-name">
                        {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                      </span>
                      <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>{v.vehicleType}</span>
                      {v.fuelType && <span className="badge badge-accent" style={{ fontSize: '0.65rem' }}>{v.fuelType}</span>}
                    </div>
                    {v.registrationNumber ? (
                      <span className="pp-vehicle-reg">{v.registrationNumber}</span>
                    ) : (
                      <span className="pp-vehicle-no-reg">No plate number</span>
                    )}
                  </div>

                  <div className="pp-vehicle-actions">
                    <button
                      type="button"
                      onClick={() => toggleVehicleHistory(v.id)}
                      className="btn btn-secondary btn-xs flex items-center gap-1"
                      title="View service and quote history"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>history</span>
                      {expandedHistoryId === v.id ? 'Hide History' : 'Service History'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditVehicleModal(v)}
                      className="btn btn-secondary btn-xs flex items-center gap-1"
                      title="Edit vehicle details"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVehicle(v.id)}
                      className="btn btn-secondary btn-xs text-danger"
                      title="Remove vehicle"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                    </button>
                  </div>
                </div>

                {/* Service & Quote History Accordion */}
                {expandedHistoryId === v.id && (
                  <div className="pp-history-panel">
                    <h5 className="pp-history-title">
                      <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--primary)' }}>receipt_long</span>
                      Related Quotes & Service History on MeriGarage
                    </h5>

                    {historyLoadingId === v.id ? (
                      <div className="py-4 text-center text-muted text-xs">Loading history...</div>
                    ) : (vehicleHistory[v.id] || []).length === 0 ? (
                      <p className="pp-history-empty">
                        No quote requests or service records linked to this vehicle on MeriGarage yet.
                      </p>
                    ) : (
                      <div className="space-y-2 mt-2">
                        {vehicleHistory[v.id].map((h) => (
                          <div
                            key={h.id}
                            className="p-3 rounded-lg bg-card border border-border/30 flex-between items-center text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-primary font-bold">
                                  #{h.referenceNumber}
                                </span>
                                <span className="text-white font-semibold">{h.garageName}</span>
                              </div>
                              <span className="text-muted block mt-0.5" style={{ fontSize: '0.65rem' }}>
                                {new Date(h.createdAt).toLocaleDateString()} • {h.problemDescription}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="badge mb-1 block" style={{ fontSize: '0.65rem' }}>{h.status}</span>
                              {h.proposedQuoteAmount && (
                                <span className="font-mono font-bold text-white text-xs">
                                  ₹{Number(h.proposedQuoteAmount).toLocaleString('en-IN')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Actions & Workspaces ───────────────────────────────── */}
      <div className="card pp-section-card">
        <h3 className="pp-qa-title">Quick Actions & Workspaces</h3>

        <div className={`pp-qa-grid ${isAdmin ? 'pp-qa-grid-admin' : ''}`}>

          {/* Vehicle Owner Actions */}
          {isVehicleOwner && (
            <>
              <Link
                to="/my-reviews"
                className="pp-qa-card"
              >
                <div className="pp-qa-card-top">
                  <div className="pp-qa-card-head">
                    <span className="material-symbols-outlined pp-qa-icon">rate_review</span>
                    <h4 className="pp-qa-card-title">My Submitted Reviews</h4>
                  </div>
                  <p className="pp-qa-card-desc">
                    View, manage, and update your published ratings and feedback for workshops.
                  </p>
                </div>
                <span className="pp-qa-card-link">View my reviews →</span>
              </Link>

              <Link
                to="/my-asked-quotes"
                className="pp-qa-card"
              >
                <div className="pp-qa-card-top">
                  <div className="pp-qa-card-head">
                    <span className="material-symbols-outlined pp-qa-icon">request_quote</span>
                    <h4 className="pp-qa-card-title">My Asked Quotes</h4>
                  </div>
                  <p className="pp-qa-card-desc">
                    Check quotation estimates, compare prices, and workshop ownership managers.
                  </p>
                </div>
                <span className="pp-qa-card-link">Track quotes →</span>
              </Link>

              <Link
                to="/garages"
                className="pp-qa-card"
              >
                <div className="pp-qa-card-top">
                  <div className="pp-qa-card-head">
                    <span className="material-symbols-outlined pp-qa-icon">search</span>
                    <h4 className="pp-qa-card-title">Explore Garages</h4>
                  </div>
                  <p className="pp-qa-card-desc">
                    Discover verified automotive repair centers and multi-brand garages near you.
                  </p>
                </div>
                <span className="pp-qa-card-link">Explore workshops →</span>
              </Link>
            </>
          )}

          {/* Garage Owner Actions */}
          {isGarageOwner && !isAdmin && (
            <>
              <Link
                to="/submit-garage"
                className="pp-qa-card"
              >
                <div className="pp-qa-card-top">
                  <div className="pp-qa-card-head">
                    <span className="material-symbols-outlined pp-qa-icon">add_business</span>
                    <h4 className="pp-qa-card-title">Submit a Workshop</h4>
                  </div>
                  <p className="pp-qa-card-desc">
                    List an auto repair workshop on MeriGarage for verification and customer discovery.
                  </p>
                </div>
                <span className="pp-qa-card-link">Start submission →</span>
              </Link>

              <Link
                to="/my-claims"
                className="pp-qa-card"
              >
                <div className="pp-qa-card-top">
                  <div className="pp-qa-card-head">
                    <span className="material-symbols-outlined pp-qa-icon">verified</span>
                    <h4 className="pp-qa-card-title">Ownership Claims</h4>
                  </div>
                  <p className="pp-qa-card-desc">
                    Check status and decisions on your submitted workshop ownership claims.
                  </p>
                </div>
                <span className="pp-qa-card-link">Check claims →</span>
              </Link>

              <Link
                to="/owner"
                className="pp-qa-card"
              >
                <div className="pp-qa-card-top">
                  <div className="pp-qa-card-head">
                    <span className="material-symbols-outlined pp-qa-icon">construction</span>
                    <h4 className="pp-qa-card-title">Workshop Owner Hub</h4>
                  </div>
                  <p className="pp-qa-card-desc">
                    Manage garage profile edits, upload verification trade documents and workshop photos.
                  </p>
                </div>
                <span className="pp-qa-card-link">Open owner hub →</span>
              </Link>

              <Link
                to="/my-reviews"
                className="pp-qa-card"
              >
                <div className="pp-qa-card-top">
                  <div className="pp-qa-card-head">
                    <span className="material-symbols-outlined pp-qa-icon">rate_review</span>
                    <h4 className="pp-qa-card-title">My Submitted Reviews</h4>
                  </div>
                  <p className="pp-qa-card-desc">
                    View customer reviews and feedback you have submitted for other workshops.
                  </p>
                </div>
                <span className="pp-qa-card-link">View my reviews →</span>
              </Link>
            </>
          )}

          {/* Administrator Actions */}
          {isAdmin && (
            <>
              <Link
                to="/submit-garage"
                className="pp-qa-card"
              >
                <div className="pp-qa-card-top">
                  <div className="pp-qa-card-head">
                    <span className="material-symbols-outlined pp-qa-icon">add_business</span>
                    <h4 className="pp-qa-card-title">Submit a Workshop</h4>
                  </div>
                  <p className="pp-qa-card-desc">
                    List an auto workshop on MeriGarage for verification and customer discovery.
                  </p>
                </div>
                <span className="pp-qa-card-link">Start submission →</span>
              </Link>

              <Link
                to="/my-claims"
                className="pp-qa-card"
              >
                <div className="pp-qa-card-top">
                  <div className="pp-qa-card-head">
                    <span className="material-symbols-outlined pp-qa-icon">verified</span>
                    <h4 className="pp-qa-card-title">Ownership Claims</h4>
                  </div>
                  <p className="pp-qa-card-desc">
                    Check claim and decisions on your workshop claims.
                  </p>
                </div>
                <span className="pp-qa-card-link">Check claims →</span>
              </Link>

              <Link
                to="/owner"
                className="pp-qa-card"
              >
                <div className="pp-qa-card-top">
                  <div className="pp-qa-card-head">
                    <span className="material-symbols-outlined pp-qa-icon">construction</span>
                    <h4 className="pp-qa-card-title">Workshop Owner Hub</h4>
                  </div>
                  <p className="pp-qa-card-desc">
                    Manage garage file edits. Upload rade and workshop photos.
                  </p>
                </div>
                <span className="pp-qa-card-link">Open owner hub →</span>
              </Link>

              <Link
                to="/my-reviews"
                className="pp-qa-card"
              >
                <div className="pp-qa-card-top">
                  <div className="pp-qa-card-head">
                    <span className="material-symbols-outlined pp-qa-icon">rate_review</span>
                    <h4 className="pp-qa-card-title">My Submitted Reviews</h4>
                  </div>
                  <p className="pp-qa-card-desc">
                    View your reviews and see/mind their reviews.
                  </p>
                </div>
                <span className="pp-qa-card-link">View my reviews →</span>
              </Link>

              <Link
                to="/admin"
                className="pp-qa-card pp-qa-card-admin"
              >
                <div className="pp-qa-card-top">
                  <div className="pp-qa-card-head">
                    <span className="material-symbols-outlined pp-qa-icon">admin_panel_settings</span>
                    <h4 className="pp-qa-card-title">Administrator Console</h4>
                  </div>
                  <p className="pp-qa-card-desc">
                    Review pending garages, verification documents, claims, and manage user directory.
                  </p>
                </div>
                <span className="pp-qa-card-link">Open admin console →</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Edit Profile Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Edit Personal Information & Security"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div>
            <label className="label">Full Name *</label>
            <input
              type="text"
              required
              className="input w-full"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div>
            <label className="label">Registered Email</label>
            <input
              type="email"
              disabled
              className="input w-full opacity-60 cursor-not-allowed bg-secondary/10"
              value={user.email}
              title="Registered email address cannot be modified directly"
            />
            <span className="text-muted mt-1 block" style={{ fontSize: '0.65rem' }}>
              Contact platform administration for registered email updates.
            </span>
          </div>

          <div>
            <label className="label">Mobile Number</label>
            <input
              type="tel"
              className="input w-full"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="10-digit mobile number, e.g. 9876543210"
            />
          </div>

          {/* Profile Photo Quick Action in Modal */}
          <div className="p-3 bg-secondary/10 rounded-lg border border-border/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserAvatar
                photoUrl={user.profilePhotoUrl}
                name={user.fullName}
                email={user.email}
                size="md"
              />
              <div>
                <span className="text-xs font-semibold text-white block">Profile Picture</span>
                <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                  {user.profilePhotoUrl ? 'Saved profile picture active' : 'Default avatar active'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setProfileModalOpen(false);
                fileInputRef.current?.click();
              }}
              className="btn btn-secondary btn-xs flex items-center gap-1 hover:border-primary"
            >
              <span className="material-symbols-outlined text-xs">photo_camera</span>
              <span>{user.profilePhotoUrl ? 'Change' : 'Upload'}</span>
            </button>
          </div>

          {/* Change Password Sub-section */}
          <div className="pt-3 border-t border-border/20 space-y-3">
            <h5 className="font-bold text-white text-xs">Update Password (Optional)</h5>
            <div>
              <label className="label">Current Master Password</label>
              <input
                type="password"
                className="input w-full"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Required if changing password"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input w-full"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  className="input w-full"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setProfileModalOpen(false)}
              disabled={updatingProfile}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={updatingProfile}>
              {updatingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Add / Edit Vehicle Modal ────────────────────────────────── */}
      <Modal
        isOpen={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        title={editingVehicleId ? 'Edit Vehicle Details' : 'Add New Vehicle'}
      >
        <form onSubmit={handleSaveVehicle} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Vehicle Type *</label>
              <select
                className="input w-full"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="Car">Car / Hatchback / Sedan</option>
                <option value="SUV">SUV / MUV</option>
                <option value="Motorcycle">Motorcycle / Bike</option>
                <option value="Scooter">Scooter</option>
                <option value="Electric">Electric Vehicle</option>
                <option value="Van">Van / Commercial</option>
              </select>
            </div>

            <div>
              <label className="label">Fuel Type</label>
              <select
                className="input w-full"
                value={vehicleFuel}
                onChange={(e) => setVehicleFuel(e.target.value)}
              >
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="CNG">CNG</option>
                <option value="Electric">Electric</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Brand / Make *</label>
              <input
                type="text"
                required
                className="input w-full"
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                placeholder="e.g. Maruti Suzuki, Hyundai, Honda"
              />
            </div>

            <div>
              <label className="label">Model *</label>
              <input
                type="text"
                required
                className="input w-full"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="e.g. Swift, Creta, City"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Manufacturing Year</label>
              <input
                type="number"
                min={1990}
                max={new Date().getFullYear() + 1}
                className="input w-full"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 2022"
              />
            </div>

            <div>
              <label className="label">Registration / Plate Number</label>
              <input
                type="text"
                className="input w-full uppercase font-mono"
                value={vehicleReg}
                onChange={(e) => setVehicleReg(e.target.value)}
                placeholder="e.g. DL 01 AB 1234"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setVehicleModalOpen(false)}
              disabled={savingVehicle}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingVehicle}>
              {savingVehicle ? 'Saving...' : editingVehicleId ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default ProfilePage;
