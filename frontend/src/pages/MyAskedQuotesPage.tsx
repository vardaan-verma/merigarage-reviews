import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { QuoteRequestDto, QuoteCustomerActionRequest } from '../api/types';
import { Alert } from '../components/Alert';
import { Modal } from '../components/Modal';

export const MyAskedQuotesPage: React.FC = () => {
  useAuth();
  const [quotes, setQuotes] = useState<QuoteRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'QUOTED' | 'ACCEPTED' | 'HISTORY'>('ALL');

  // Customer Action Modal (Accept / Decline / Cancel)
  const [actionModalQuote, setActionModalQuote] = useState<QuoteRequestDto | null>(null);
  const [modalAction, setModalAction] = useState<'ACCEPT' | 'DECLINE' | 'CANCEL' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Message reply states (keyed by quote ID)
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [replyLoadingId, setReplyLoadingId] = useState<number | null>(null);

  const loadMyQuotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.quotes.getMyRequests();
      setQuotes(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load your quote requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyQuotes();
  }, [loadMyQuotes]);

  const handleOpenActionModal = (
    quote: QuoteRequestDto,
    action: 'ACCEPT' | 'DECLINE' | 'CANCEL'
  ) => {
    setActionModalQuote(quote);
    setModalAction(action);
    setActionNotes('');
    setActionError(null);
  };

  const handleConfirmCustomerAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModalQuote || !modalAction) return;

    try {
      setActionSubmitting(true);
      setActionError(null);

      const payload: QuoteCustomerActionRequest = {
        action: modalAction,
        notes: actionNotes.trim() || undefined,
      };

      const updated = await api.quotes.customerAction(actionModalQuote.id, payload);
      setSuccess(
        `Quote request ${actionModalQuote.referenceNumber} has been updated to ${updated.status}.`
      );
      setActionModalQuote(null);
      setModalAction(null);
      setActionNotes('');
      await loadMyQuotes();
    } catch (err: any) {
      setActionError(err.message || 'Failed to process action');
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleSendCustomerReply = async (quoteId: number, e: React.FormEvent) => {
    e.preventDefault();
    const text = replyTexts[quoteId]?.trim();
    if (!text) return;

    try {
      setReplyLoadingId(quoteId);
      await api.quotes.addMessage(quoteId, text);
      setReplyTexts((prev) => ({ ...prev, [quoteId]: '' }));
      await loadMyQuotes();
    } catch (err: any) {
      setError(err.message || 'Failed to send message to workshop');
    } finally {
      setReplyLoadingId(null);
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return q.status === 'PENDING';
    if (statusFilter === 'QUOTED') return q.status === 'QUOTED';
    if (statusFilter === 'ACCEPTED') return q.status === 'ACCEPTED';
    if (statusFilter === 'HISTORY')
      return q.status === 'DECLINED' || q.status === 'CANCELLED' || q.status === 'COMPLETED';
    return true;
  });

  const pendingCount = quotes.filter((q) => q.status === 'PENDING').length;
  const quotedCount = quotes.filter((q) => q.status === 'QUOTED').length;
  const acceptedCount = quotes.filter((q) => q.status === 'ACCEPTED').length;

  return (
    <div className="container py-8 max-w-5xl">
      <div className="page-header mb-8 flex-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Asked Quotes</h1>
          <p className="text-secondary text-sm mt-1">
            Review quotation estimates, compare repair pricing, and message workshops directly.
          </p>
        </div>
        <Link to="/garages" className="btn btn-primary btn-sm flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">add</span>
          Request New Quote
        </Link>
      </div>

      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} className="mb-6" />
      )}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-6" />}

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="card p-5 border border-border bg-surface-raised">
          <span className="text-2xs text-muted font-bold uppercase tracking-wider block mb-1">
            Total Requests
          </span>
          <span className="text-2xl font-black text-white">{quotes.length}</span>
        </div>
        <div className="card p-5 border border-border bg-surface-raised">
          <span className="text-2xs text-muted font-bold uppercase tracking-wider block mb-1">
            Awaiting Response
          </span>
          <span className="text-2xl font-black text-yellow-400">{pendingCount}</span>
        </div>
        <div className="card p-5 border border-border bg-surface-raised">
          <span className="text-2xs text-muted font-bold uppercase tracking-wider block mb-1">
            Quotes Received
          </span>
          <span className="text-2xl font-black text-primary">{quotedCount}</span>
        </div>
        <div className="card p-5 border border-border bg-surface-raised">
          <span className="text-2xs text-muted font-bold uppercase tracking-wider block mb-1">
            Accepted / Booked
          </span>
          <span className="text-2xl font-black text-emerald-400">{acceptedCount}</span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-border/40 pb-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`btn btn-xs rounded-full px-4 py-1.5 ${
            statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          All ({quotes.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('PENDING')}
          className={`btn btn-xs rounded-full px-4 py-1.5 ${
            statusFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('QUOTED')}
          className={`btn btn-xs rounded-full px-4 py-1.5 ${
            statusFilter === 'QUOTED' ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          Quoted ({quotedCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('ACCEPTED')}
          className={`btn btn-xs rounded-full px-4 py-1.5 ${
            statusFilter === 'ACCEPTED' ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          Accepted ({acceptedCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('HISTORY')}
          className={`btn btn-xs rounded-full px-4 py-1.5 ${
            statusFilter === 'HISTORY' ? 'btn-primary' : 'btn-secondary'
          }`}
        >
          Closed / History
        </button>
      </div>

      {loading ? (
        <div className="center-loader py-16">
          <div className="spinner"></div>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="card p-12 text-center border border-border">
          <div className="w-16 h-16 rounded-full bg-surface-raised border border-border mx-auto flex items-center justify-center text-secondary mb-4">
            <span className="material-symbols-outlined text-3xl">request_quote</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Asked Quotes Found</h2>
          <p className="text-secondary text-sm max-w-md mx-auto mb-6">
            You haven't requested any estimates matching this filter. Explore verified workshops on MeriGarage to ask for estimates.
          </p>
          <Link to="/garages" className="btn btn-primary btn-sm inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">search</span>
            Explore Workshops
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredQuotes.map((q) => (
            <div
              key={q.id}
              className="card p-6 border border-border hover:border-border/80 transition-all bg-card"
            >
              {/* Header: Reference, Garage, Status */}
              <div className="flex-between items-start flex-wrap gap-4 pb-4 border-b border-border/30">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary">
                      #{q.referenceNumber}
                    </span>
                    <span className="text-muted text-2xs">•</span>
                    <Link
                      to={q.garageSlug ? `/garages/${q.garageSlug}` : `/garages`}
                      className="text-base font-bold text-white hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span>{q.garageName || 'Automotive Workshop'}</span>
                      <span className="material-symbols-outlined text-xs text-muted">open_in_new</span>
                    </Link>
                    {q.garageCity && (
                      <span className="text-2xs text-muted font-mono">({q.garageCity})</span>
                    )}
                  </div>
                  <span className="text-2xs text-muted">
                    Submitted on {new Date(q.createdAt).toLocaleDateString()} at{' '}
                    {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`badge ${
                      q.status === 'ACCEPTED'
                        ? 'badge-success'
                        : q.status === 'QUOTED'
                        ? 'badge-accent'
                        : q.status === 'PENDING'
                        ? 'badge-pending'
                        : 'badge-secondary'
                    }`}
                  >
                    {q.status}
                  </span>

                  {/* Actions for QUOTED status */}
                  {q.status === 'QUOTED' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenActionModal(q, 'ACCEPT')}
                        className="btn btn-primary btn-xs flex items-center gap-1 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-xs">check</span>
                        Accept Quote
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenActionModal(q, 'DECLINE')}
                        className="btn btn-secondary btn-xs flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                        Decline
                      </button>
                    </div>
                  )}

                  {/* Cancel button if pending */}
                  {q.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => handleOpenActionModal(q, 'CANCEL')}
                      className="btn btn-secondary btn-xs text-danger hover:bg-danger/10"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>

              {/* Vehicle & Service Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-b border-border/20 text-xs">
                <div>
                  <h4 className="text-2xs font-bold text-muted uppercase tracking-wider mb-1.5">
                    Vehicle Details
                  </h4>
                  <p className="text-white font-semibold">
                    {[q.vehicleYear, q.vehicleMake, q.vehicleModel].filter(Boolean).join(' ')}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1 text-2xs text-secondary font-mono">
                    {q.registrationNumber && <span>Reg: {q.registrationNumber}</span>}
                    {q.fuelType && <span>• Fuel: {q.fuelType}</span>}
                    {q.vehicleType && <span>• Type: {q.vehicleType}</span>}
                  </div>
                </div>

                <div>
                  <h4 className="text-2xs font-bold text-muted uppercase tracking-wider mb-1.5">
                    Requested Services
                  </h4>
                  {q.services && q.services.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {q.services.map((s) => (
                        <span key={s.id} className="badge badge-secondary text-2xs">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted text-2xs">General inspection / repair</span>
                  )}
                </div>
              </div>

              {/* Problem Description */}
              <div className="py-3 text-xs border-b border-border/20">
                <h4 className="text-2xs font-bold text-muted uppercase tracking-wider mb-1">
                  Issue Description
                </h4>
                <p className="text-secondary leading-relaxed">{q.problemDescription}</p>
                {q.customerMessage && (
                  <p className="text-muted text-2xs mt-1 italic">Note: "{q.customerMessage}"</p>
                )}
              </div>

              {/* Workshop Quotation Details if Available */}
              {(q.proposedQuoteAmount || q.estimatedMinPrice || q.ownerNotes) && (
                <div className="my-4 p-4 rounded-xl bg-accent/5 border border-accent/20 text-xs">
                  <div className="flex-between items-center mb-2">
                    <span className="font-bold text-accent text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">payments</span>
                      Workshop Quotation
                    </span>
                    {q.proposedQuoteAmount && (
                      <span className="text-lg font-black text-white">
                        ₹{Number(q.proposedQuoteAmount).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {q.estimatedMinPrice && q.estimatedMaxPrice && (
                    <p className="text-2xs text-muted mb-2 font-mono">
                      Estimated Range: ₹{Number(q.estimatedMinPrice).toLocaleString('en-IN')} - ₹
                      {Number(q.estimatedMaxPrice).toLocaleString('en-IN')}
                    </p>
                  )}

                  {q.ownerNotes && (
                    <div className="mt-2 text-secondary text-xs leading-relaxed">
                      <strong className="text-white block mb-0.5">Workshop Remarks:</strong>
                      {q.ownerNotes}
                    </div>
                  )}
                </div>
              )}

              {/* Messages & Discussion */}
              <div className="mt-4 pt-2">
                <h4 className="text-2xs font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">chat</span>
                  Direct Messages ({q.messages?.length || 0})
                </h4>

                {q.messages && q.messages.length > 0 && (
                  <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
                    {q.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-lg text-xs ${
                          m.senderRole === 'CUSTOMER'
                            ? 'bg-surface-raised ml-6 border border-border/40 text-right'
                            : 'bg-primary/10 mr-6 border border-primary/20 text-left'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1 justify-between text-3xs text-muted font-mono">
                          <span>{m.senderRole === 'CUSTOMER' ? 'You' : (q.garageName || 'Garage')}</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-white text-xs leading-relaxed text-left">{m.messageText}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form */}
                <form
                  onSubmit={(e) => handleSendCustomerReply(q.id, e)}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    className="input input-sm flex-1 text-xs"
                    placeholder="Type a message to this workshop..."
                    value={replyTexts[q.id] || ''}
                    onChange={(e) =>
                      setReplyTexts((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    disabled={replyLoadingId === q.id}
                  />
                  <button
                    type="submit"
                    className="btn btn-secondary btn-sm"
                    disabled={replyLoadingId === q.id || !replyTexts[q.id]?.trim()}
                  >
                    {replyLoadingId === q.id ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!actionModalQuote}
        onClose={() => setActionModalQuote(null)}
        title={
          modalAction === 'ACCEPT'
            ? 'Accept Workshop Quotation'
            : modalAction === 'DECLINE'
            ? 'Decline Quotation'
            : 'Cancel Quote Request'
        }
      >
        {actionModalQuote && (
          <form onSubmit={handleConfirmCustomerAction} className="space-y-4 text-xs">
            {actionError && <Alert type="error" message={actionError} className="mb-2" />}

            <p className="text-secondary leading-relaxed">
              {modalAction === 'ACCEPT'
                ? `Confirming acceptance of quotation from ${actionModalQuote.garageName}. The workshop will be notified to schedule your repair.`
                : modalAction === 'DECLINE'
                ? `Are you sure you want to decline the quotation from ${actionModalQuote.garageName}?`
                : `Are you sure you want to cancel quote request #${actionModalQuote.referenceNumber}?`}
            </p>

            <div>
              <label className="label">Note to Workshop (Optional)</label>
              <textarea
                rows={3}
                className="input w-full"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Optional explanation or preferred booking timeline..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/20">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActionModalQuote(null)}
                disabled={actionSubmitting}
              >
                Go Back
              </button>
              <button
                type="submit"
                className={`btn btn-sm ${
                  modalAction === 'ACCEPT' ? 'btn-primary' : 'btn-danger'
                }`}
                disabled={actionSubmitting}
              >
                {actionSubmitting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
export default MyAskedQuotesPage;
