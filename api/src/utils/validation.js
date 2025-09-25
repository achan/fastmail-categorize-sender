/**
 * Validation utilities
 */

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email.trim());
}

function validateGroupName(groupName) {
  return typeof groupName === 'string' &&
         groupName.trim().length > 0 &&
         groupName.trim().length <= 100 &&
         !/[<>:"\\|?*\x00-\x1f]/.test(groupName); // Avoid problematic characters
}

function validateContactData(contactData) {
  if (!contactData || typeof contactData !== 'object') {
    return { valid: false, error: 'Contact data must be an object' };
  }

  // At least one of these must be provided
  const hasName = contactData.firstName || contactData.lastName || contactData.fullName;
  const hasEmail = contactData.email;

  if (!hasName && !hasEmail) {
    return { valid: false, error: 'Contact must have at least a name or email address' };
  }

  // Validate email if provided
  if (contactData.email && !validateEmail(contactData.email)) {
    return { valid: false, error: 'Invalid email address format' };
  }

  // Validate string fields
  const stringFields = ['firstName', 'lastName', 'fullName', 'phone', 'organization'];
  for (const field of stringFields) {
    if (contactData[field] !== undefined && typeof contactData[field] !== 'string') {
      return { valid: false, error: `${field} must be a string` };
    }
    if (contactData[field] && contactData[field].length > 255) {
      return { valid: false, error: `${field} must be less than 255 characters` };
    }
  }

  return { valid: true };
}

module.exports = {
  validateEmail,
  validateGroupName,
  validateContactData
};