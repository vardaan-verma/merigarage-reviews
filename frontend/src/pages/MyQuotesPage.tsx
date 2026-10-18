import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { QuoteRequestDto, QuoteCustomerActionRequest } from '../api/types';
import { Modal } from '../components/Modal';
import { useToast } from '../context/NotificationContext';

export const MyQuotesPage: React.FC = () => {
  useAuth();
  const { showSuccess, showError } = useToast();
  const [quotes, setQuotes] = useState<QuoteRequestDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'QUOTED' | 'ACCEPTED' | 'HISTORY'>('ALL');

  // Customer Action Modal (Accept / Decline / Cancel)
  const [actionModalQuote, setActionModalQuote] = useState<QuoteRequestDto | null>(null);
  const [modalAction, setModalAction] = useState<'ACCEPT' | 'DECLINE' | 'CANCEL' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Message reply states (keyed by quote ID)
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [replyLoadingId, setReplyLoadingId] = useState<number | null>(null);

  const loadMyQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.quotes.getMyRequests();
      setQuotes(data || []);
    } catch (err: any) {
      showError(err.message || 'Failed to load your quote requests');
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
  };

  const handleConfirmCustomerAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModalQuote || !modalAction) return;

    try {
      setActionSubmitting(true);

      const payload: QuoteCustomerActionRequest = {
        action: modalAction,
        notes: actionNotes.trim() || undefined,
      };

      const updated = await api.quotes.customerAction(actionModalQuote.id, payload);
      const msg = `Quote request ${actionModalQuote.referenceNumber} has been updated to ${updated.status}.`;
      showSuccess(msg);
      setActionModalQuote(null);
      setModalAction(null);
      setActionNotes('');
      await loadMyQuotes();
    } catch (err: any) {
      const msg = err.message || 'Failed to process action';
      showError(msg);
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
      const updated = await api.quotes.addMessage(quoteId, text);
      setQuotes((prev) => prev.map((q) => (q.id === quoteId ? updated : q)));
      setReplyTexts((prev) => ({ ...prev, [quoteId]: '' }));
      showSuccess('Reply sent to customer.');
    } catch (err: any) {
      const msg = err.message || 'Failed to send message';
      showError(msg);
    } finally {
      setReplyLoadingId(null);
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    if (statusFilter === 'PENDING') return q.status === 'PENDING' || q.status === 'UNDER_REVIEW';
    if (statusFilter === 'QUOTED') return q.status === 'QUOTED';
    if (statusFilter === 'ACCEPTED') return q.status === 'ACCEPTED';
    if (statusFilter === 'HISTORY')
      return (
        q.status === 'DECLINED' ||
        q.status === 'CANCELLED' ||
        q.status === 'COMPLETED'
      );
    return true;
  });

  return (
    <div className="container py-8 max-w-4xl">
      {/* Header */}
      <div className="page-header mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="page-title text-2xl font-extrabold text-white">My Quote Requests</h1>
            <p className="text-secondary text-sm mt-1">
              Track vehicle repair estimates, communicate with garage owners, and confirm proposed quotations.
            </p>
          </div>
          <Link to="/garages" className="btn btn-secondary btn-sm self-start sm:self-auto inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">search</span>
            Explore Garages
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { key: 'ALL', label: 'All Requests', count: quotes.length },
            {
              key: 'PENDING',
              label: 'Under Review',
              count: quotes.filter((q) => q.status === 'PENDING' || q.status === 'UNDER_REVIEW').length,
            },
            {
              key: 'QUOTED',
              label: 'Quoted (Action Required)',
              count: quotes.filter((q) => q.status === 'QUOTED').length,
            },
            {
              key: 'ACCEPTED',
              label: 'Confirmed Bookings',
              count: quotes.filter((q) => q.status === 'ACCEPTED').length,
            },
            {
              key: 'HISTORY',
              label: 'History',
              count: quotes.filter(
                (q) => q.status === 'DECLINED' || q.status === 'CANCELLED' || q.status === 'COMPLETED'
              ).length,
            },
          ].map((tab) => {
            const isSelected = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key as any)}
                className={`text-xs px-3.5 py-1.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-primary border-primary text-white font-bold shadow-sm'
                    : 'bg-surface border-border text-secondary hover:text-white hover:border-primary/40'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-2xs px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-surface-raised text-muted'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List or Empty State */}
      {loading ? (
        <div className="center-loader py-12 text-center">
          <div className="spinner"></div>
          <p className="text-muted mt-2 text-sm">Loading your quote requests...</p>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="card p-12 text-center bg-surface border border-border space-y-3">
          <div className="text-4xl">📄</div>
          <h3 className="text-lg font-bold text-white">No Quote Requests Found</h3>
          <p className="text-xs text-secondary max-w-md mx-auto">
            {statusFilter === 'ALL'
              ? 'You have not submitted any quote requests yet. Open any approved garage profile and click "Get a Quote" to receive an itemized estimate.'
              : `You have no quote requests in the "${statusFilter}" category.`}
          </p>
          <div className="pt-2">
            <Link to="/garages" className="btn btn-primary btn-sm inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">search</span>
              Find a Workshop
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredQuotes.map((quote) => {
            const isPending = quote.status === 'PENDING';
            const isUnderReview = quote.status === 'UNDER_REVIEW';
            const isQuoted = quote.status === 'QUOTED';
            const isAccepted = quote.status === 'ACCEPTED';
            const isCompleted = quote.status === 'COMPLETED';
            const isDeclined = quote.status === 'DECLINED';
            const isCancelled = quote.status === 'CANCELLED';

            return (
              <div
                key={quote.id}
                className="card p-6 bg-surface border border-border space-y-4 hover:border-primary/40 transition-colors"
              >
                {/* Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-bold text-primary text-base">
                        {quote.referenceNumber}
                      </span>
                      <span className="text-xs text-muted">
                        • Submitted{' '}
                        {new Date(quote.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <Link
                        to={quote.garageSlug ? `/garages/${quote.garageSlug}` : '/garages'}
                        className="font-bold text-white text-base hover:text-primary transition-colors flex items-center gap-1"
                      >
                        🏪 {quote.garageName || 'Workshop'}
                        <span className="material-symbols-outlined text-xs text-muted">
                          open_in_new
                        </span>
                      </Link>
                      {quote.garageCity && (
                        <span className="text-xs text-secondary">📍 {quote.garageCity}</span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending && (
                      <span className="badge badge-warning text-xs font-bold uppercase py-1.5 px-3">
                        Pending Workshop Review
                      </span>
                    )}
                    {isUnderReview && (
                      <span className="badge bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold uppercase py-1.5 px-3">
                        Workshop Reviewing
                      </span>
                    )}
                    {isQuoted && (
                      <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold uppercase py-1.5 px-3 animate-pulse">
                        Quotation Received! Action Required
                      </span>
                    )}
                    {isAccepted && (
                      <span className="badge badge-success text-xs font-bold uppercase py-1.5 px-3">
                        ✓ Booking Confirmed (Accepted)
                      </span>
                    )}
                    {isCompleted && (
                      <span className="badge badge-success text-xs font-bold uppercase py-1.5 px-3">
                        ✓ Work Completed
                      </span>
                    )}
                    {isDeclined && (
                      <span className="badge badge-danger text-xs font-bold uppercase py-1.5 px-3">
                        Declined
                      </span>
                    )}
                    {isCancelled && (
                      <span className="badge badge-secondary text-xs font-bold uppercase py-1.5 px-3">
                        Cancelled
                      </span>
                    )}
                  </div>
                </div>

                {/* Proposed Quotation Highlight Card if Quoted or Accepted */}
                {quote.proposedQuoteAmount && (
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        Proposed Quotation from Workshop
                      </span>
                      <span className="text-2xl font-mono font-extrabold text-white">
                        ₹{Number(quote.proposedQuoteAmount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {quote.ownerNotes && (
                      <div className="text-xs text-white/90 bg-surface/60 p-3 rounded border border-border">
                        <span className="text-2xs text-muted block uppercase font-bold mb-0.5">
                          Workshop Notes & Scope:
                        </span>
                        <p className="leading-relaxed">{quote.ownerNotes}</p>
                      </div>
                    )}

                    {/* Customer Accept / Decline CTA Buttons */}
                    {isQuoted && (
                      <div className="pt-2 flex flex-wrap gap-3 items-center justify-end">
                        <button
                          type="button"
                          className="btn btn-outline text-xs text-danger"
                          onClick={() => handleOpenActionModal(quote, 'DECLINE')}
                        >
                          Decline Quotation
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary text-xs inline-flex items-center gap-1.5 shadow-md"
                          onClick={() => handleOpenActionModal(quote, 'ACCEPT')}
                        >
                          <span className="material-symbols-outlined text-sm">check</span>
                          Accept & Confirm Booking
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Vehicle & Services Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Vehicle details */}
                  <div className="p-3 bg-surface-raised rounded border border-border">
                    <span className="text-2xs text-muted uppercase tracking-wider block font-bold mb-1">
                      Vehicle Specifications
                    </span>
                    <div className="font-bold text-white text-sm">
                      {quote.vehicleMake} {quote.vehicleModel}
                    </div>
                    <div className="text-muted mt-1 space-y-0.5">
                      <div>
                        Type: <span className="text-white">{quote.vehicleType}</span>
                        {quote.vehicleYear && ` • Year: ${quote.vehicleYear}`}
                      </div>
                      {quote.fuelType && (
                        <div>
                          Fuel: <span className="text-white">{quote.fuelType}</span>
                        </div>
                      )}
                      {quote.registrationNumber && (
                        <div className="font-mono text-white">
                          Reg: {quote.registrationNumber}
                        </div>
                      )}
                      {quote.odometerReading && (
                        <div>
                          Odometer: {quote.odometerReading.toLocaleString('en-IN')} km
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Services Requested */}
                  <div className="p-3 bg-surface-raised rounded border border-border">
                    <span className="text-2xs text-muted uppercase tracking-wider block font-bold mb-1">
                      Services Requested ({quote.services?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {quote.services && quote.services.length > 0 ? (
                        quote.services.map((s) => (
                          <span key={s.id} className="badge badge-secondary text-2xs py-1 px-2">
                            {s.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted italic">Custom inspection request</span>
                      )}
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-border flex justify-between items-center text-2xs">
                      <span className="text-muted">Indicative Baseline:</span>
                      <span className="font-mono font-bold text-white">
                        {quote.estimatedMinPrice
                          ? `₹${Number(quote.estimatedMinPrice).toLocaleString('en-IN')}*`
                          : 'Custom Diagnosis'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Problem Description */}
                <div className="p-3 bg-surface-raised rounded border border-border text-xs">
                  <span className="text-2xs text-muted uppercase tracking-wider block font-bold mb-1">
                    Problem Description Submitted:
                  </span>
                  <p className="text-white leading-relaxed">{quote.problemDescription}</p>
                  {quote.customerMessage && (
                    <p className="text-secondary mt-1.5 italic border-t border-border pt-1.5">
                      Your note: "{quote.customerMessage}"
                    </p>
                  )}
                </div>

                {/* Communication Log */}
                {quote.messages && quote.messages.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <span className="text-2xs text-muted uppercase tracking-wider block font-bold mb-2">
                      Communication Thread ({quote.messages.length})
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto p-2.5 bg-surface-raised rounded border border-border text-xs">
                      {quote.messages.map((m) => {
                        const isMe = m.senderRole === 'CUSTOMER';
                        return (
                          <div
                            key={m.id}
                            className={`p-2.5 rounded ${
                              isMe
                                ? 'bg-primary/10 border border-primary/20 text-white ml-6'
                                : 'bg-surface border border-border text-white mr-6'
                            }`}
                          >
                            <div className="flex justify-between items-center text-3xs text-muted mb-0.5">
                              <span className="font-bold text-white">
                                {isMe ? 'You' : `Workshop (${quote.garageName || 'Owner'})`}
                              </span>
                              <span>
                                {new Date(m.createdAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="text-xs leading-relaxed">{m.messageText}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Reply Form & Cancel Option */}
                <div className="pt-2 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Reply Form */}
                  <form
                    onSubmit={(e) => handleSendCustomerReply(quote.id, e)}
                    className="flex-1 flex gap-2"
                  >
                    <input
                      type="text"
                      className="input text-xs flex-1"
                      placeholder="Ask a question or reply to the workshop..."
                      value={replyTexts[quote.id] || ''}
                      onChange={(e) =>
                        setReplyTexts((prev) => ({ ...prev, [quote.id]: e.target.value }))
                      }
                      disabled={replyLoadingId === quote.id || isCompleted || isCancelled}
                    />
                    <button
                      type="submit"
                      className="btn btn-secondary btn-xs flex items-center gap-1"
                      disabled={
                        replyLoadingId === quote.id ||
                        !replyTexts[quote.id]?.trim() ||
                        isCompleted ||
                        isCancelled
                      }
                    >
                      {replyLoadingId === quote.id ? (
                        'Sending...'
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xs">send</span>
                          Reply
                        </>
                      )}
                    </button>
                  </form>

                  {/* Cancel Button if pending/under review/quoted */}
                  {(isPending || isUnderReview || isQuoted) && (
                    <button
                      type="button"
                      className="btn btn-outline text-2xs text-muted hover:text-danger self-end sm:self-auto"
                      onClick={() => handleOpenActionModal(quote, 'CANCEL')}
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Action Modal (Accept / Decline / Cancel) */}
      {actionModalQuote && modalAction && (
        <Modal
          isOpen={Boolean(actionModalQuote)}
          onClose={() => {
            setActionModalQuote(null);
            setModalAction(null);
          }}
          title={
            modalAction === 'ACCEPT'
              ? `Accept Quotation — ${actionModalQuote.referenceNumber}`
              : modalAction === 'DECLINE'
              ? `Decline Quotation — ${actionModalQuote.referenceNumber}`
              : `Cancel Request — ${actionModalQuote.referenceNumber}`
          }
          maxWidth="md"
        >
          <form onSubmit={handleConfirmCustomerAction} className="space-y-4">
            {modalAction === 'ACCEPT' && (
              <div className="space-y-3">
                <p className="text-xs text-white">
                  You are accepting the proposed quotation of{' '}
                  <strong className="text-primary font-mono text-sm">
                    ₹{Number(actionModalQuote.proposedQuoteAmount).toLocaleString('en-IN')}
                  </strong>{' '}
                  from <strong>{actionModalQuote.garageName}</strong>.
                </p>
                <div className="p-3 bg-surface rounded border border-border text-xs text-secondary">
                  ✓ The workshop will be notified immediately to prepare for your vehicle drop-off/service.
                </div>
                <div>
                  <label className="label text-xs">Note to Workshop (Optional)</label>
                  <input
                    type="text"
                    className="input text-xs"
                    placeholder="e.g. Will drop off car tomorrow at 10 AM"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {modalAction === 'DECLINE' && (
              <div className="space-y-3">
                <p className="text-xs text-white">
                  Are you sure you want to decline this quotation from{' '}
                  <strong>{actionModalQuote.garageName}</strong>?
                </p>
                <div>
                  <label className="label text-xs">Reason for Declining (Optional)</label>
                  <input
                    type="text"
                    className="input text-xs"
                    placeholder="e.g. Budget mismatch, chose another workshop"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            {modalAction === 'CANCEL' && (
              <div className="space-y-3">
                <p className="text-xs text-white">
                  Are you sure you want to cancel this quote request with{' '}
                  <strong>{actionModalQuote.garageName}</strong>?
                </p>
                <div>
                  <label className="label text-xs">Reason for Cancellation (Optional)</label>
                  <input
                    type="text"
                    className="input text-xs"
                    placeholder="e.g. Problem resolved, no longer needed"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => {
                  setActionModalQuote(null);
                  setModalAction(null);
                }}
                disabled={actionSubmitting}
              >
                Go Back
              </button>
              <button
                type="submit"
                className={`btn text-xs ${
                  modalAction === 'ACCEPT' ? 'btn-primary' : 'btn-danger'
                }`}
                disabled={actionSubmitting}
              >
                {actionSubmitting
                  ? 'Processing...'
                  : modalAction === 'ACCEPT'
                  ? 'Confirm Acceptance'
                  : modalAction === 'DECLINE'
                  ? 'Confirm Decline'
                  : 'Confirm Cancellation'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
