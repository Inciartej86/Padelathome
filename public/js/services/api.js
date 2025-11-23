const API_BASE_URL = '';
export const authToken = localStorage.getItem('authToken');

/**
 * Wrapper for the Fetch API to make authenticated requests.
 * @param {string} endpoint - The API endpoint to call (e.g., '/users/me').
 * @param {object} [options={}] - Optional fetch options (method, body, etc.).
 * @returns {Promise<any>} - The JSON response from the API.
 * @throws {Error} - Throws an error if the request fails or the response is not ok.
 */
export const fetchApi = async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}/api${endpoint}`;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            // Attempt to parse error message from response body
            let errorMessage = `Error ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // Ignore if response is not JSON
            }
            throw new Error(errorMessage);
        }

        // Handle cases with no content in response
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`API call failed: ${error.message}`);
        // Re-throw the error to be handled by the calling code
        throw error;
    }
};
