// App-wide settings for the Solid code.

// Name the login provider shows on its "allow this app?" page.
export const APP_NAME = "SolidCard";

// Provider pre-filled on the login screen.
export const DEFAULT_ISSUER = "https://solidcommunity.net";

// Where the provider sends the user back after login. It must match the address the app runs on
// exactly (localhost while developing, the GitHub Pages address when deployed).
export const REDIRECT_URL = window.location.origin + import.meta.env.BASE_URL;
