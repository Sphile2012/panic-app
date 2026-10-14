// All screen names the router understands
export type Screen =
  | 'signup'
  | 'login'
  | 'verify-email'
  | 'calculator'
  | 'decoy'
  | 'setup-pin'
  | 'setup-contacts'
  | 'recovery-setup'
  | 'recovery-settings'
  | 'pin-recovery'
  | 'app'
  | 'contacts'
  | 'location'
  | 'sending'
  | 'sent'
  | 'notes'
  | 'note-edit'
  | 'safety-plan'
  | 'support'
  | 'companion'
  | 'about'
  | 'terms'
  | 'settings'
  | 'appearance';

export type DeliveryStatus = 'pending' | 'sending' | 'delivered' | 'failed';
