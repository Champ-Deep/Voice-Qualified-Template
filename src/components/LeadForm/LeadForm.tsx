import React, { useState } from 'react';
import { LeadFormData } from '../../types';
import { validateForm } from '../../utils/validation';

interface LeadFormProps {
  onSubmit: (data: LeadFormData) => Promise<boolean | void>;
  isLoading?: boolean;
}

const LeadForm: React.FC<LeadFormProps> = ({ onSubmit, isLoading: externalLoading }) => {
  const [formData, setFormData] = useState<LeadFormData>({
    username: '',
    companyName: '',
    companyEmail: '',
    phoneNumber: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationResults = validateForm(formData);
    if (Object.keys(validationResults).length > 0) {
      setErrors(validationResults);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({ username: '', companyName: '', companyEmail: '', phoneNumber: '' });
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = externalLoading || isSubmitting;

  return (
    <form onSubmit={validateAndSubmit} className="lead-form">
      <div className="form-group">
        <label htmlFor="username">Full Name</label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Enter your full name"
          disabled={isLoading}
          className="form-input"
        />
        {errors.username && <span className="error">{errors.username}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="companyName">Company Name</label>
        <input
          type="text"
          id="companyName"
          name="companyName"
          value={formData.companyName}
          onChange={handleChange}
          placeholder="Enter company name"
          disabled={isLoading}
          className="form-input"
        />
        {errors.companyName && <span className="error">{errors.companyName}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="companyEmail">Company Email</label>
        <input
          type="email"
          id="companyEmail"
          name="companyEmail"
          value={formData.companyEmail}
          onChange={handleChange}
          placeholder="Enter company email"
          disabled={isLoading}
          className="form-input"
        />
        {errors.companyEmail && <span className="error">{errors.companyEmail}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="phoneNumber">Phone Number</label>
        <input
          type="tel"
          id="phoneNumber"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          placeholder="+1234567890"
          disabled={isLoading}
          className="form-input"
        />
        {errors.phoneNumber && <span className="error">{errors.phoneNumber}</span>}
      </div>

      <button type="submit" disabled={isLoading} className="submit-button">
        {isLoading ? 'Initiating Call...' : 'Start Call'}
      </button>
    </form>
  );
};

export default LeadForm;
