/**
 * RequestManagementService - Manages Doer questions, Checklist requests, and related requests
 * Storage: localStorage key 'taskManagement_requests'
 */

const STORAGE_KEY = 'taskManagement_requests';

// Initialize requests from localStorage
let requests = [];

const loadRequests = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      requests = JSON.parse(data);
    } else {
      requests = [];
    }
  } catch (error) {
    console.error('Error loading requests:', error);
    requests = [];
  }
};

const saveRequests = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('requestsUpdated'));
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving requests:', error);
    return { success: false, error: error.message };
  }
};

loadRequests();

export const RequestManagementService = {
  /**
   * Get all requests
   */
  getAllRequests: () => {
    loadRequests();
    return requests;
  },

  /**
   * Get request by ID
   */
  getRequestById: (requestId) => {
    return requests.find(r => r.id === requestId);
  },

  /**
   * Get requests by type
   */
  getRequestsByType: (requestType) => {
    loadRequests();
    return requests.filter(r => r.type === requestType);
  },

  /**
   * Get requests by status
   */
  getRequestsByStatus: (status) => {
    loadRequests();
    return requests.filter(r => r.status === status);
  },

  /**
   * Create a new request
   */
  createRequest: (requestData) => {
    try {
      const { type, title, description, categoryId, requestedBy, requestedByRole, metadata = {} } = requestData;

      if (!type || !title || !categoryId || !requestedBy) {
        return { success: false, message: 'Type, title, category ID, and requested by are required' };
      }

      const now = new Date().toISOString();
      const newRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type, // 'doer_question', 'checklist_add_request', 'guideline_suggestion'
        title,
        description,
        categoryId,
        requestedBy,
        requestedByRole, // 2: Doer, 3: Checker
        metadata,
        status: 'pending', // 'pending', 'approved', 'rejected'
        responses: [],
        createdAt: now,
        updatedAt: now
      };

      requests.push(newRequest);
      const saveResult = saveRequests();

      if (!saveResult.success) {
        requests.pop(); // Rollback
        return { success: false, message: saveResult.error };
      }

      console.log('✅ Request created:', newRequest.id);
      return {
        success: true,
        request: newRequest,
        message: 'Request created successfully'
      };
    } catch (error) {
      console.error('Error creating request:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Add response to a request
   */
  addResponse: (requestId, responseData) => {
    try {
      const { respondedBy, respondedByRole, response, status } = responseData;

      if (!respondedBy || !response) {
        return { success: false, message: 'Responded by and response are required' };
      }

      const requestIndex = requests.findIndex(r => r.id === requestId);
      if (requestIndex === -1) {
        return { success: false, message: 'Request not found' };
      }

      const now = new Date().toISOString();
      const newResponse = {
        id: `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        respondedBy,
        respondedByRole,
        response,
        createdAt: now
      };

      requests[requestIndex].responses.push(newResponse);
      if (status) {
        requests[requestIndex].status = status;
      }
      requests[requestIndex].updatedAt = now;

      const saveResult = saveRequests();

      if (!saveResult.success) {
        // Rollback
        requests[requestIndex].responses.pop();
        if (status) {
          requests[requestIndex].status = requests[requestIndex].responses.length === 0 ? 'pending' : requests[requestIndex].status;
        }
        return { success: false, message: saveResult.error };
      }

      return {
        success: true,
        request: requests[requestIndex],
        message: 'Response added successfully'
      };
    } catch (error) {
      console.error('Error adding response:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Update request status
   */
  updateRequestStatus: (requestId, status) => {
    try {
      const requestIndex = requests.findIndex(r => r.id === requestId);
      if (requestIndex === -1) {
        return { success: false, message: 'Request not found' };
      }

      requests[requestIndex].status = status;
      requests[requestIndex].updatedAt = new Date().toISOString();

      const saveResult = saveRequests();

      if (!saveResult.success) {
        return { success: false, message: saveResult.error };
      }

      return {
        success: true,
        request: requests[requestIndex],
        message: 'Request status updated successfully'
      };
    } catch (error) {
      console.error('Error updating request status:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Delete request
   */
  deleteRequest: (requestId) => {
    try {
      const index = requests.findIndex(r => r.id === requestId);
      if (index === -1) {
        return { success: false, message: 'Request not found' };
      }

      requests.splice(index, 1);
      const saveResult = saveRequests();

      if (!saveResult.success) {
        return { success: false, message: saveResult.error };
      }

      return { success: true, message: 'Request deleted successfully' };
    } catch (error) {
      console.error('Error deleting request:', error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Get requests for a specific team leader
   */
  getRequestsForTeamLeader: (teamLeaderId) => {
    loadRequests();
    // Filter requests by categories assigned to the team leader
    // This would require checking team leader's assigned categories
    return requests.filter(r => r.status === 'pending');
  }
};

export default RequestManagementService;

