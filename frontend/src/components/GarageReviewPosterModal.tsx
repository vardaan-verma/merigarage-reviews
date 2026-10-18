import React from 'react';
import { Modal } from './Modal';
import { GarageReviewPosterCard } from './GarageReviewPosterCard';
import type { GarageDetailDto, GarageSummaryDto } from '../api/types';

interface GarageReviewPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  garage: GarageDetailDto | GarageSummaryDto | { id: number; name: string; slug: string; city?: string; state?: string; isVerified?: boolean };
}

export const GarageReviewPosterModal: React.FC<GarageReviewPosterModalProps> = ({
  isOpen,
  onClose,
  garage,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="2xl"
    >
      <GarageReviewPosterCard
        garage={garage}
        onClose={onClose}
        isModal={true}
      />
    </Modal>
  );
};
