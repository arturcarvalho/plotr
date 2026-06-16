export const PHONE_VIEWPORT_BREAKPOINT = 768;

export function isPhoneViewportWidth(width: number): boolean {
  return width < PHONE_VIEWPORT_BREAKPOINT;
}
