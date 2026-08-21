import { env } from '../config/env';

export const isValidEmail = (email: string, domain: string = env.ALLOWED_EMAIL_DOMAIN): boolean => {
  const emailRegex = new RegExp(`^[a-zA-Z0-9._%+-]+@${domain.replace(/\./g, '\\.')}$`);
  return emailRegex.test(email);
};

export const isValidHallTicket = (ht: string): boolean => {
  const htRegex = /^\d{12}$/;
  return htRegex.test(ht);
};

export const isValidMobile = (mobile: string): boolean => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile);
};

export const isValidYear = (year: number): boolean => {
  return [1, 2, 3].includes(year);
};
