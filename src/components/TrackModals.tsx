import React from 'react';
import { CommentModal } from './CommentModal';
import { ExportModal } from './ExportModal';
import { TrackPointsModal } from './TrackPointsModal';
import { TrackPoint } from '../utils/exportFormats';
import { User } from "@junobuild/core";

interface TrackModalsProps {
  showCommentModal: boolean;
  showExportModal: boolean;
  showPointsModal: boolean;
  trackPoints: TrackPoint[];
  user: User | null;
  onCommentSave: (comment: string) => void;
  onCommentClose: () => void;
  onExport: (format: string, storage: 'local' | 'cloud', filename: string, description: string) => void;
  onExportClose: () => void;
  onPointsClose: () => void;
  onAuth: () => void;
}

export const TrackModals: React.FC<TrackModalsProps> = ({
  showCommentModal,
  showExportModal,
  showPointsModal,
  trackPoints,
  user,
  onCommentSave,
  onCommentClose,
  onExport,
  onExportClose,
  onPointsClose,
  onAuth
}) => {
  return (
    <>
      {showCommentModal && (
        <CommentModal
          onSave={onCommentSave}
          onClose={onCommentClose}
        />
      )}

      {showExportModal && (
        <ExportModal
          onExport={onExport}
          onClose={onExportClose}
          user={user}
          onLogin={onAuth}
        />
      )}

      {showPointsModal && (
        <TrackPointsModal
          points={trackPoints}
          onClose={onPointsClose}
        />
      )}
    </>
  );
};
