import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderKanban } from 'lucide-react';
import { MagneticButton } from '../components/common/MagneticButton';

export const GenericProtectedPlaceholder: React.FC<{ viewName: string }> = ({ viewName }) => {
  const params = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-sand text-forest px-4 sm:px-6 md:px-10 py-12">
      <div className="max-w-3xl mx-auto space-y-6 text-center">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-forest/70 hover:text-forest transition-colors cursor-pointer mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </button>

        <div className="p-8 rounded-3xl bg-sand-light border-2 border-forest/20 shadow-md space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-forest/5 text-purple mx-auto flex items-center justify-center">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-forest">{viewName}</h2>
          <p className="text-xs sm:text-sm text-forest/80 max-w-md mx-auto leading-relaxed">
            This protected workspace route is successfully authenticated and registered.
            {params.projectId && (
              <span className="block mt-2 font-mono text-purple font-semibold">
                Project ID: {params.projectId}
              </span>
            )}
          </p>
          <div className="pt-4">
            <MagneticButton variant="forest" size="sm" onClick={() => navigate('/')}>
              Return to Landing Page
            </MagneticButton>
          </div>
        </div>
      </div>
    </div>
  );
};

