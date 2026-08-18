import React, { useState } from "react";
import { X, Calendar, Clock, MapPin, CheckCircle2, ArrowRight, User, Phone, Mail } from "lucide-react";

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookAppointmentModal({ isOpen, onClose }: BookAppointmentModalProps) {
  const [serviceType, setServiceType] = useState<"laser-survey" | "showroom-visit" | "design-consult">("laser-survey");
  const [address, setAddress] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("09:00 - 12:00 (Morning)");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isBooked, setIsBooked] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsBooked(true);
    setTimeout(() => {
      setIsBooked(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative animate-scale-up">
        
        {/* Header */}
        <div className="bg-[#1A1A1A] text-white p-6 flex justify-between items-center border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold flex items-center justify-center text-gold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-white">Book Survey / Appointment</h3>
              <p className="text-[10px] font-mono text-gold uppercase tracking-widest">SMC Laser Templating & Survey</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isBooked ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="font-serif text-2xl font-medium text-neutral-900">Appointment Confirmed!</h4>
            <p className="text-xs text-neutral-600 max-w-xs mx-auto leading-relaxed">
              Your laser templating survey has been scheduled for <strong className="text-neutral-900">{selectedDate}</strong> ({selectedTimeSlot}). A calendar invite & confirmation SMS have been dispatched.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
            
            {/* Service Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block font-sans">
                Select Appointment Type:
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setServiceType("laser-survey")}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    serviceType === "laser-survey"
                      ? "bg-gold/10 border-gold text-neutral-900"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block font-sans text-neutral-900">Laser 3D Digital Templating Survey</span>
                    <span className="text-[10px] text-neutral-500 block">On-site precision measurement using Proliner 3D scanner.</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-gold bg-[#1A1A1A] px-2 py-0.5 rounded">Popular</span>
                </button>

                <button
                  type="button"
                  onClick={() => setServiceType("showroom-visit")}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    serviceType === "showroom-visit"
                      ? "bg-gold/10 border-gold text-neutral-900"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block font-sans text-neutral-900">Slab Gallery & Showroom Private Tour</span>
                    <span className="text-[10px] text-neutral-500 block">Inspect full jumbo marble & quartzite slabs in Chelsea gallery.</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setServiceType("design-consult")}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    serviceType === "design-consult"
                      ? "bg-gold/10 border-gold text-neutral-900"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block font-sans text-neutral-900">Design & Architectural Spec Consultation</span>
                    <span className="text-[10px] text-neutral-500 block">Discuss mitered details, edge profiles, and CAD engineering with Simo.</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Address Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block font-sans">
                Project Site Address:
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg text-xs font-sans text-neutral-800 focus:border-gold focus:ring-1 focus:ring-gold/30"
                  placeholder="Street, City, Postcode"
                />
              </div>
            </div>

            {/* Date & Time Slot */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block font-sans">
                  Preferred Date:
                </label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono text-neutral-800 focus:border-gold focus:ring-1 focus:ring-gold/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block font-sans">
                  Time Slot:
                </label>
                <select
                  value={selectedTimeSlot}
                  onChange={(e) => setSelectedTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono text-neutral-800 focus:border-gold focus:ring-1 focus:ring-gold/30"
                >
                  <option>09:00 - 12:00 (Morning)</option>
                  <option>12:00 - 15:00 (Afternoon)</option>
                  <option>15:00 - 18:00 (Late Afternoon)</option>
                </select>
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block font-sans">
                  Contact Name:
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Alexander Wright"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-sans text-neutral-800 focus:border-gold focus:ring-1 focus:ring-gold/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block font-sans">
                  Phone Number:
                </label>
                <input
                  type="tel"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="e.g. +44 7700 900077"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono text-neutral-800 focus:border-gold focus:ring-1 focus:ring-gold/30"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block font-sans">
                Project Notes / Access Instructions:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Kitchen island & matching waterfall splashback survey..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-sans text-neutral-800 focus:border-gold focus:ring-1 focus:ring-gold/30"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 border border-neutral-300 hover:border-neutral-400 text-neutral-700 font-bold text-xs rounded-xl transition-colors uppercase tracking-wider font-mono"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-2/3 py-3 bg-[#1A1A1A] hover:bg-gold text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 uppercase tracking-wider font-mono shadow-md cursor-pointer"
              >
                <span>Confirm Booking</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
