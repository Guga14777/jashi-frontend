// src/services/profile.api.js

/**
 * Update a specific section of the user profile
 * @param {string} section - The section to update ('company', 'payout', 'contacts', 'notifications')
 * @param {object} patch - The data to update
 * @returns {Promise<{ok: boolean, data?: object, error?: string, fieldErrors?: object}>}
 */
export async function updateProfileSection(section, patch) {
  try {
    let endpoint;
    let payload = patch;
    
    switch (section) {
      case 'company':
        endpoint = '/api/profile/company';
        break;
      case 'payout':
        endpoint = '/api/profile/payout';
        break;
      case 'contacts':
        endpoint = '/api/profile/contacts';
        break;
      case 'notifications':
        endpoint = '/api/profile/notifications';
        break;
      default:
        throw new Error(`Unknown section: ${section}`);
    }
    
    // Simulate API call with realistic delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    
    // Simulate occasional API errors for testing (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Network error');
    }
    
    // Simulate field validation errors occasionally (10% chance)
    if (Math.random() < 0.1) {
      const fieldErrors = {};
      
      // Add some realistic field errors based on section
      switch (section) {
        case 'company':
          if (patch.email && Math.random() < 0.5) {
            fieldErrors.email = 'This email is already in use';
          }
          if (patch.phone && Math.random() < 0.3) {
            fieldErrors.phone = 'Invalid phone number format';
          }
          break;
        case 'payout':
          if (patch.routingNumber && Math.random() < 0.4) {
            fieldErrors.routingNumber = 'Invalid routing number';
          }
          break;
        case 'contacts':
          if (patch.primaryContact?.email && Math.random() < 0.3) {
            fieldErrors.primaryContactEmail = 'Invalid email format';
          }
          break;
      }
      
      if (Object.keys(fieldErrors).length > 0) {
        return { 
          ok: false, 
          error: 'Validation failed', 
          fieldErrors 
        };
      }
    }
    
    // Real implementation would be:
    // const response = await fetch(endpoint, {
    //   method: 'PUT',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${getAuthToken()}`
    //   },
    //   body: JSON.stringify(payload)
    // });
    // 
    // if (!response.ok) {
    //   const error = await response.json();
    //   return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
    // }
    // 
    // const data = await response.json();
    // return { ok: true, data };
    
    // Mock successful response
    return { 
      ok: true, 
      data: payload,
      message: `${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully`
    };
    
  } catch (error) {
    console.error(`Error updating ${section}:`, error);
    return { 
      ok: false, 
      error: error.message || 'An unexpected error occurred',
      fieldErrors: {} 
    };
  }
}

/**
 * Update the entire profile in a single request (preferred approach)
 * @param {object} profileData - Complete profile data
 * @returns {Promise<{ok: boolean, data?: object, error?: string, fieldErrors?: object}>}
 */
export async function updateProfileAll(profileData) {
  try {
    const endpoint = '/api/profile';
    
    // Simulate API call with realistic delay
    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 600));
    
    // Simulate occasional API errors for testing (3% chance)
    if (Math.random() < 0.03) {
      throw new Error('Server error');
    }
    
    // Simulate field validation errors occasionally (8% chance)
    if (Math.random() < 0.08) {
      const fieldErrors = {};
      
      // Add some realistic cross-section field errors
      if (profileData.email && Math.random() < 0.5) {
        fieldErrors.email = 'This email is already in use';
      }
      if (profileData.routingNumber && Math.random() < 0.3) {
        fieldErrors.routingNumber = 'Invalid routing number';
      }
      if (profileData.primaryContact?.email && Math.random() < 0.4) {
        fieldErrors.primaryContactEmail = 'Invalid email format';
      }
      
      if (Object.keys(fieldErrors).length > 0) {
        return { 
          ok: false, 
          error: 'Validation failed', 
          fieldErrors 
        };
      }
    }
    
    // Real implementation would be:
    // const response = await fetch(endpoint, {
    //   method: 'PUT',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${getAuthToken()}`
    //   },
    //   body: JSON.stringify(profileData)
    // });
    // 
    // if (!response.ok) {
    //   const error = await response.json();
    //   return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
    // }
    // 
    // const data = await response.json();
    // return { ok: true, data };
    
    // Mock successful response
    return { 
      ok: true, 
      data: profileData,
      message: 'Profile updated successfully'
    };
    
  } catch (error) {
    console.error('Error updating profile:', error);
    return { 
      ok: false, 
      error: error.message || 'An unexpected error occurred',
      fieldErrors: {} 
    };
  }
}

/**
 * Deactivate user account
 * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
 */
export async function deactivateAccount() {
  try {
    const token = getAuthToken();
    
    const response = await fetch('/api/auth/deactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { ok: false, error: error.error || 'Failed to deactivate account' };
    }
    
    const data = await response.json();
    
    return { 
      ok: true, 
      message: data.message || 'Account deactivated successfully'
    };
    
  } catch (error) {
    console.error('Error deactivating account:', error);
    return { 
      ok: false, 
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Permanently delete user account
 * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
 */
export async function deleteAccount() {
  try {
    const token = getAuthToken();
    
    const response = await fetch('/api/auth/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { ok: false, error: error.error || 'Failed to delete account' };
    }
    
    const data = await response.json();
    
    return { 
      ok: true, 
      message: data.message || 'Account deleted successfully'
    };
    
  } catch (error) {
    console.error('Error deleting account:', error);
    return { 
      ok: false, 
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Individual section update functions (legacy support)
 */
export async function updateCompanyInfo(patch) {
  return updateProfileSection('company', patch);
}

export async function updatePayoutSettings(patch) {
  return updateProfileSection('payout', patch);
}

export async function updateContacts(patch) {
  return updateProfileSection('contacts', patch);
}

export async function updateNotifications(patch) {
  return updateProfileSection('notifications', patch);
}

/**
 * Get authentication token (helper function)
 * @returns {string|null} The auth token
 */
function getAuthToken() {
  return localStorage.getItem('authToken') || localStorage.getItem('token') || null;
}