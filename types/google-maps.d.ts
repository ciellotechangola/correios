// Google Maps global type declaration
// This file ensures TypeScript recognizes the google namespace globally

export {};

declare global {
  interface Window {
    google: typeof google;
  }
}
