import { X, ShieldCheck } from "lucide-react";
import { Project, DigitalSignoff } from "../App";

interface DigitalSignoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSaveSignoff: (projectId: string, signoffData: DigitalSignoff) => void;
}

/**
 * Phase 5 Gate 0 purge.
 *
 * This modal previously captured a canvas signature and then generated a
 * printable "Laser Validation Certificate" containing fabricated technical
 * claims (±0.038mm measured tolerance, 99.98% surface planarity, a
 * "BS EN 1469" compliance serial number) and an "INITIALIZE LIFETIME
 * WARRANTY" action — an unsupported warranty guarantee presented as an
 * acceptance step. None of the laser telemetry was ever measured; none of
 * the warranty terms were ever approved. Per the approved Gate 0 decision to
 * disable/remove signature, acceptance and certificate-generation actions,
 * all of that — the signature pad, the PDF/HTML certificate export, and the
 * warranty-initialization button — is removed here, not merely hidden.
 *
 * `project` and `onSaveSignoff` are kept on the public interface so the
 * existing call sites in App.tsx need no change, but `onSaveSignoff` is
 * never invoked — there is no path in this component that could reach it.
 */
export default function DigitalSignoffModal({ isOpen, onClose, project }: DigitalSignoffModalProps) {
  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 md:p-6">
      <div className="bg-[#121212] border border-[#D4AF37]/40 text-white rounded-2xl p-6 md:p-8 max-w-lg w-full relative shadow-2xl">
        <div className="flex justify-between items-start border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-2">
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" /> SMC PRO • INSTALLATION SIGN-OFF
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-neutral-200 leading-relaxed pt-5" role="status">
          Digital sign-off, installation certificates and warranty activation are currently under review and not
          available. Contact SMC for the completion arrangements applicable to your project.
        </p>

        <button
          onClick={onClose}
          className="mt-6 w-full bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-xl border border-neutral-700 cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
