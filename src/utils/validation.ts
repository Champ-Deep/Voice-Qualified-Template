import { LeadFormData } from '../types';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z\s]{2,50}$/;
  return usernameRegex.test(username.trim());
};

export const validateCompanyName = (company: string): boolean => {
  return company.trim().length >= 2 && company.trim().length <= 100;
};

export const validateForm = (formData: LeadFormData): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!validateUsername(formData.username)) {
    errors.username = 'Username must be 2-50 letters or spaces';
  }

  if (!validateCompanyName(formData.companyName)) {
    errors.companyName = 'Company name must be 2-100 characters';
  }

  if (!validateEmail(formData.companyEmail)) {
    errors.companyEmail = 'Please enter a valid email address';
  }

  if (!validatePhoneNumber(formData.phoneNumber)) {
    errors.phoneNumber = 'Please enter a valid phone number (E.164 format)';
  }

  return errors;
};
