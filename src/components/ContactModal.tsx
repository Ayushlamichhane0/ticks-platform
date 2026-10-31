import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('PLEASE FILL IN ALL FIELDS');
      return;
    }
    setError('');
    setSubmitted(true);
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setMessage('');
    setSubmitted(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/90 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/20 p-6 sm:p-8 text-white font-mono-geist shadow-2xl"
        >
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-5 right-5 p-2 text-white/50 hover:text-white transition-all cursor-pointer border border-white/10"
          >
            <X className="h-4 w-4" />
          </button>

          {!submitted ? (
            <div>
              <div className="font-silkscreen text-[11px] uppercase tracking-widest text-white/50 mb-1">
                INBOUND CONTACT
              </div>
              <h2 className="font-silkscreen text-xl sm:text-2xl text-white">
                GET IN TOUCH
              </h2>
              <p className="mt-2 font-inter text-xs sm:text-sm text-white/70 font-light leading-relaxed">
                Send a message to discuss trading algorithms, dev tools, or collaborations.
              </p>

              {error && (
                <div className="mt-4 border border-white/40 bg-white/10 p-2.5 text-xs text-white font-silkscreen">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
                <div>
                  <label htmlFor="contact-name" className="block text-white/70 uppercase tracking-wider mb-1 text-[10px] font-silkscreen">
                    YOUR NAME:
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ayush or Organization"
                    className="w-full border border-white/15 bg-black p-3 text-white placeholder-white/30 focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-white/70 uppercase tracking-wider mb-1 text-[10px] font-silkscreen">
                    EMAIL ADDRESS:
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@domain.com"
                    className="w-full border border-white/15 bg-black p-3 text-white placeholder-white/30 focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-white/70 uppercase tracking-wider mb-1 text-[10px] font-silkscreen">
                    MESSAGE:
                  </label>
                  <textarea
                    id="contact-message"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Let's build something fast and clean..."
                    className="w-full border border-white/15 bg-black p-3 text-white placeholder-white/30 focus:border-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 font-silkscreen">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-4 text-white/50 hover:text-white uppercase tracking-wider transition-opacity cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-6 bg-white text-black font-bold uppercase tracking-wider hover:bg-neutral-200 transition-all cursor-pointer"
                  >
                    SEND MESSAGE
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="py-8 text-center font-mono-geist">
              <div className="w-12 h-12 mx-auto bg-white text-black flex items-center justify-center mb-4">
                <Check className="h-6 w-6 stroke-[3]" />
              </div>
              <h3 className="font-silkscreen text-xl text-white">MESSAGE SENT</h3>
              <p className="mt-2 font-inter text-xs sm:text-sm text-white/70 font-light leading-relaxed max-w-sm mx-auto">
                Thank you, {name}. Your message has been received. I will reply to <span className="text-white underline">{email}</span> shortly.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleReset}
                  className="py-2.5 px-8 bg-white text-black font-silkscreen font-bold uppercase tracking-wider hover:bg-neutral-200 transition-all cursor-pointer"
                >
                  CLOSE
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ContactModal;
