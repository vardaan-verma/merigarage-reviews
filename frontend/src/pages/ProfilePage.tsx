import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { VehicleDto, CreateVehicleRequest, UpdateVehicleRequest, QuoteRequestDto } from '../api/types';
import { Alert } from '../components/Alert';
import { Modal } from '../components/Modal';
import { UserAvatar } from '../components/UserAvatar';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, uploadProfilePhoto, deleteProfilePhoto, logout, hasRole, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Profile Edit State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Profile Photo Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);

  // Vehicles State
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

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
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);

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
      setVehicleError(null);
      const data = await api.vehicles.list();
      setVehicles(data);
    } catch (err: any) {
      setVehicleError(err.message || 'Failed to load saved vehicles');
    } finally {
      setLoadingVehicles(false);
    }
  }, []);

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
    setPhotoError(null);
    setPhotoSuccess(null);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setPhotoError('Unsupported image format. Please select a JPEG, PNG, or WebP image.');
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      setPhotoError(`Selected image (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 5 MB limit.`);
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
    setPhotoError(null);
  };

  const handleConfirmPhotoUpload = async () => {
    if (!selectedPhotoFile) return;
    try {
      setUploadingPhoto(true);
      setPhotoError(null);
      await uploadProfilePhoto(selectedPhotoFile);
      setPhotoSuccess('Profile photo uploaded and saved successfully.');
      handleCancelPhotoSelection();
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to upload profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo and revert to the default avatar?')) {
      return;
    }
    try {
      setUploadingPhoto(true);
      setPhotoError(null);
      await deleteProfilePhoto();
      setPhotoSuccess('Profile photo removed. Default avatar restored.');
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to remove profile photo.');
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
    setProfileError(null);
    setProfileModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) {
      setProfileError('Full name cannot be blank.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setProfileError('New password must be at least 8 characters long.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setProfileError('New passwords do not match.');
        return;
      }
      if (!currentPassword) {
        setProfileError('Please provide your current password to confirm changes.');
        return;
      }
    }

    try {
      setUpdatingProfile(true);
      setProfileError(null);
      await updateProfile({
        fullName: editFullName.trim(),
        phoneNumber: editPhone.trim() || undefined,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      setProfileSuccess('Your profile details have been saved successfully.');
      setProfileModalOpen(false);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
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
    setVehicleFormError(null);
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
    setVehicleFormError(null);
    setVehicleModalOpen(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleMake.trim() || !vehicleModel.trim()) {
      setVehicleFormError('Please enter both make and model.');
      return;
    }

    try {
      setSavingVehicle(true);
      setVehicleFormError(null);
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
        setProfileSuccess('Vehicle details updated successfully.');
      } else {
        await api.vehicles.create(payload);
        setProfileSuccess('New vehicle added to your profile.');
      }

      setVehicleModalOpen(false);
      fetchVehicles();
    } catch (err: any) {
      setVehicleFormError(err.message || 'Failed to save vehicle details.');
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this vehicle from your account?')) return;
    try {
      await api.vehicles.delete(id);
      setProfileSuccess('Vehicle removed.');
      fetchVehicles();
    } catch (err: any) {
      setVehicleError(err.message || 'Failed to remove vehicle.');
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

  return (
    <div className="container py-8 max-w-4xl">
      <div className="page-header mb-8 flex-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Account Profile</h1>
          <p className="text-secondary text-sm mt-1">
            Manage your personal credentials, contact details, and registered vehicles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
            onClick={openProfileModal}
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Edit Profile
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            onClick={handleLogout}
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Sign Out
          </button>
        </div>
      </div>

      {profileSuccess && (
        <Alert
          type="success"
          message={profileSuccess}
          onClose={() => setProfileSuccess(null)}
          className="mb-6"
        />
      )}

      {/* Profile Card */}
      <div className="card p-8 mb-8 border border-border">
        {photoError && (
          <Alert
            type="error"
            message={photoError}
            onClose={() => setPhotoError(null)}
            className="mb-4"
          />
        )}
        {photoSuccess && (
          <Alert
            type="success"
            message={photoSuccess}
            onClose={() => setPhotoSuccess(null)}
            className="mb-4"
          />
        )}

        <div className="flex items-center gap-6 mb-6 flex-wrap">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-primary shadow-lg shadow-red-950/40 relative shrink-0 aspect-square flex items-center justify-center bg-slate-900">
              <UserAvatar
                photoUrl={photoPreviewUrl || user.profilePhotoUrl}
                name={user.fullName}
                email={user.email}
                size="xl"
                showBorder={false}
                className="w-full h-full text-3xl"
              />
            </div>
            {photoPreviewUrl && (
              <span className="absolute -top-1 -right-1 badge badge-xs bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 rounded shadow z-10">
                Preview
              </span>
            )}
          </div>

          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-extrabold text-white">{user.fullName || 'Registered User'}</h2>
              <span className="badge badge-secondary text-2xs uppercase tracking-wider">
                {isGarageOwner ? 'Garage Owner' : 'Vehicle Owner'}
              </span>
            </div>
            <p className="text-sm text-secondary font-mono mt-0.5">{user.email}</p>
            {user.phoneNumber ? (
              <p className="text-xs text-muted font-mono mt-1 flex items-center gap-1">
                <span>📞</span>
                <span>{user.phoneNumber}</span>
              </p>
            ) : (
              <p className="text-xs text-muted/60 mt-1 italic">No phone number provided</p>
            )}

            {/* Photo Action Controls */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
                id="profile-photo-upload"
              />

              {selectedPhotoFile ? (
                <div className="flex items-center gap-2 flex-wrap">
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
                        <span className="material-symbols-outlined text-xs">check</span>
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
                    <span className="material-symbols-outlined text-xs">close</span>
                    <span>Cancel</span>
                  </button>
                  <span className="text-3xs text-muted font-mono">
                    {selectedPhotoFile.name} ({Math.round(selectedPhotoFile.size / 1024)} KB)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="btn btn-secondary btn-xs flex items-center gap-1.5 hover:border-primary"
                    title="Upload profile picture (JPG, PNG, WebP up to 5 MB)"
                  >
                    <span className="material-symbols-outlined text-xs">photo_camera</span>
                    <span>{user.profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>
                  {user.profilePhotoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={uploadingPhoto}
                      className="btn btn-secondary btn-xs text-danger hover:bg-danger/10 flex items-center gap-1"
                      title="Remove profile photo and reset to default avatar"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                      <span>Remove</span>
                    </button>
                  )}
                  <span className="text-3xs text-muted">Supports JPG, PNG, WebP (max 5 MB)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-2 gap-6 pt-6 border-t border-border">
          <div>
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5">
              Assigned Platform Roles
            </h4>
            <div className="flex flex-wrap gap-2">
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
                <span className="text-xs text-muted">No roles assigned</span>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5">
              Administrative Permissions
            </h4>
            <div className="flex flex-wrap gap-2">
              {user.permissions && user.permissions.length > 0 ? (
                user.permissions.map((perm) => (
                  <span key={perm} className="badge badge-pending">
                    {perm}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted">Standard Motorist Access</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Multiple Saved Vehicles Section (For Vehicle Owners & Common Users) */}
      <div className="card p-8 mb-8 border border-border">
        <div className="flex-between items-center mb-6 flex-wrap gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">directions_car</span>
              My Saved Vehicles
            </h3>
            <p className="text-xs text-secondary mt-1">
              Save your vehicles to request instant quotes and track complete service history across MeriGarage workshops.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddVehicleModal}
            className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Vehicle
          </button>
        </div>

        {vehicleError && <Alert type="error" message={vehicleError} className="mb-4" />}

        {loadingVehicles ? (
          <div className="center-loader py-8">
            <div className="spinner"></div>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-surface-raised border border-border/40">
            <span className="material-symbols-outlined text-4xl text-muted mb-2">no_crash</span>
            <h4 className="text-base font-bold text-white mb-1">No Vehicles Saved Yet</h4>
            <p className="text-xs text-secondary max-w-md mx-auto mb-4">
              Add your car or two-wheeler here. It will automatically pre-fill your quote requests and maintain your digital repair records.
            </p>
            <button
              type="button"
              onClick={openAddVehicleModal}
              className="btn btn-secondary btn-sm inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="p-5 rounded-xl bg-surface-raised border border-border/40 hover:border-border transition-all"
              >
                <div className="flex-between items-start flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-extrabold text-white text-base">
                        {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                      </span>
                      <span className="badge badge-secondary text-2xs uppercase">{v.vehicleType}</span>
                      {v.fuelType && <span className="badge badge-accent text-2xs">{v.fuelType}</span>}
                    </div>
                    {v.registrationNumber ? (
                      <span className="font-mono text-xs text-primary font-bold tracking-wider">
                        {v.registrationNumber}
                      </span>
                    ) : (
                      <span className="text-2xs text-muted font-mono">No plate number</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleVehicleHistory(v.id)}
                      className="btn btn-secondary btn-xs flex items-center gap-1 text-2xs"
                      title="View service and quote history"
                    >
                      <span className="material-symbols-outlined text-xs">history</span>
                      {expandedHistoryId === v.id ? 'Hide History' : 'Service History'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditVehicleModal(v)}
                      className="btn btn-secondary btn-xs flex items-center gap-1 text-2xs"
                      title="Edit vehicle details"
                    >
                      <span className="material-symbols-outlined text-xs">edit</span>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVehicle(v.id)}
                      className="btn btn-secondary btn-xs text-danger hover:bg-danger/10 text-2xs"
                      title="Remove vehicle"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                    </button>
                  </div>
                </div>

                {/* Service & Quote History Accordion */}
                {expandedHistoryId === v.id && (
                  <div className="mt-4 pt-4 border-t border-border/30 text-xs">
                    <h5 className="font-bold text-white mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-primary">receipt_long</span>
                      Related Quotes & Service History on MeriGarage
                    </h5>

                    {historyLoadingId === v.id ? (
                      <div className="py-4 text-center text-muted">Loading history...</div>
                    ) : (vehicleHistory[v.id] || []).length === 0 ? (
                      <p className="text-2xs text-muted italic">
                        No quote requests or service records linked to this vehicle on MeriGarage yet.
                      </p>
                    ) : (
                      <div className="space-y-2 mt-2">
                        {vehicleHistory[v.id].map((h) => (
                          <div
                            key={h.id}
                            className="p-3 rounded bg-card border border-border/30 flex-between items-center text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-primary font-bold">
                                  #{h.referenceNumber}
                                </span>
                                <span className="text-white font-semibold">{h.garageName}</span>
                              </div>
                              <span className="text-3xs text-muted block mt-0.5">
                                {new Date(h.createdAt).toLocaleDateString()} • {h.problemDescription}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="badge badge-xs mb-1 block">{h.status}</span>
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

      {/* Quick Navigation / Action Hub */}
      <div className="card p-8 border border-border">
        <h3 className="text-lg font-bold text-white mb-5">Quick Actions & Workspaces</h3>
        <div className="grid grid-2 gap-5">
          {/* Vehicle Owner Actions */}
          {isVehicleOwner && (
            <>
              <Link
                to="/my-reviews"
                className="card p-5 bg-surface-raised hover:border-primary transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-primary text-xl">rate_review</span>
                    <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                      My Submitted Reviews
                    </h4>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    View, manage, and update your published ratings and feedback for workshops.
                  </p>
                </div>
                <span className="text-xs text-primary font-bold mt-4 flex items-center gap-1">
                  View my reviews →
                </span>
              </Link>

              <Link
                to="/my-asked-quotes"
                className="card p-5 bg-surface-raised hover:border-primary transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-primary text-xl">request_quote</span>
                    <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                      My Asked Quotes
                    </h4>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    Check quotation estimates, compare prices, and message workshop managers.
                  </p>
                </div>
                <span className="text-xs text-primary font-bold mt-4 flex items-center gap-1">
                  Track quotes →
                </span>
              </Link>

              <Link
                to="/garages"
                className="card p-5 bg-surface-raised hover:border-primary transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-primary text-xl">search</span>
                    <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                      Explore Garages
                    </h4>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    Discover verified automotive repair centers and multi-brand garages near you.
                  </p>
                </div>
                <span className="text-xs text-primary font-bold mt-4 flex items-center gap-1">
                  Explore workshops →
                </span>
              </Link>
            </>
          )}

          {/* Garage Owner Actions */}
          {isGarageOwner && (
            <>
              <Link
                to="/submit-garage"
                className="card p-5 bg-surface-raised hover:border-primary transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-primary text-xl">add_business</span>
                    <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                      Submit a Workshop
                    </h4>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    List an auto repair workshop on MeriGarage for verification and customer discovery.
                  </p>
                </div>
                <span className="text-xs text-primary font-bold mt-4 flex items-center gap-1">
                  Start submission →
                </span>
              </Link>

              <Link
                to="/my-claims"
                className="card p-5 bg-surface-raised hover:border-primary transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-primary text-xl">verified</span>
                    <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                      Ownership Claims
                    </h4>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    Check status and decisions on your submitted workshop ownership claims.
                  </p>
                </div>
                <span className="text-xs text-primary font-bold mt-4 flex items-center gap-1">
                  Check claims →
                </span>
              </Link>

              <Link
                to="/owner"
                className="card p-5 bg-surface-raised hover:border-primary transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-primary text-xl">construction</span>
                    <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                      Workshop Owner Hub
                    </h4>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    Manage garage profile edits, upload verification trade documents and workshop photos.
                  </p>
                </div>
                <span className="text-xs text-primary font-bold mt-4 flex items-center gap-1">
                  Open owner hub →
                </span>
              </Link>

              <Link
                to="/my-reviews"
                className="card p-5 bg-surface-raised hover:border-primary transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-primary text-xl">rate_review</span>
                    <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                      My Submitted Reviews
                    </h4>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    View customer reviews and feedback you have submitted for other workshops.
                  </p>
                </div>
                <span className="text-xs text-primary font-bold mt-4 flex items-center gap-1">
                  View my reviews →
                </span>
              </Link>
            </>
          )}

          {/* Administrator Console */}
          {isAdmin && (
            <Link
              to="/admin"
              className="card p-5 bg-surface-raised hover:border-primary transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-primary text-xl">admin_panel_settings</span>
                  <h4 className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                    Administrator Console
                  </h4>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Review pending garages, verification documents, claims, and manage user directory.
                </p>
              </div>
              <span className="text-xs text-primary font-bold mt-4 flex items-center gap-1">
                Open admin console →
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Edit Personal Information & Security"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          {profileError && <Alert type="error" message={profileError} className="mb-2" />}

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
            <span className="text-3xs text-muted mt-1 block">
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
                <span className="text-3xs text-muted">
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

      {/* Add / Edit Vehicle Modal */}
      <Modal
        isOpen={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        title={editingVehicleId ? 'Edit Vehicle Details' : 'Add New Vehicle'}
      >
        <form onSubmit={handleSaveVehicle} className="space-y-4 text-xs">
          {vehicleFormError && <Alert type="error" message={vehicleFormError} className="mb-2" />}

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
