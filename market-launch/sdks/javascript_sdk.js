/**
 * Frontier Business Operations API - JavaScript/Node.js SDK
 * 
 * Official JavaScript client library for the Frontier Business Operations API.
 * Provides convenient access to business intelligence, financial analysis,
 * and strategic planning capabilities.
 * 
 * @version 1.0.0
 * @author Frontier Business Operations
 */

const axios = require('axios');

/**
 * Base error class for Frontier API errors
 */
class FrontierAPIError extends Error {
    constructor(message, statusCode = null, errorCode = null) {
        super(message);
        this.name = 'FrontierAPIError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
}

/**
 * Rate limit exceeded error
 */
class RateLimitError extends FrontierAPIError {
    constructor(message = 'Rate limit exceeded', statusCode = 429) {
        super(message, statusCode, 'RATE_LIMIT_EXCEEDED');
        this.name = 'RateLimitError';
    }
}

/**
 * Authentication error
 */
class AuthenticationError extends FrontierAPIError {
    constructor(message = 'Authentication failed', statusCode = 401) {
        super(message, statusCode, 'AUTHENTICATION_FAILED');
        this.name = 'AuthenticationError';
    }
}

/**
 * Validation error
 */
class ValidationError extends FrontierAPIError {
    constructor(message = 'Validation error', statusCode = 422) {
        super(message, statusCode, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

/**
 * Main client for interacting with the Frontier Business Operations API
 * 
 * @example
 * const client = new FrontierClient({ apiKey: 'your_api_key' });
 * const result = await client.financialAnalysis({
 *   company_name: 'Example Corp',
 *   industry: 'technology',
 *   // ... more data
 * });
 */
class FrontierClient {
    /**
     * Initialize the Frontier API client
     * 
     * @param {Object} options - Configuration options
     * @param {string} options.apiKey - Your Frontier API key
     * @param {string} [options.baseUrl] - API base URL
     * @param {number} [options.timeout] - Request timeout in milliseconds
     * @param {number} [options.maxRetries] - Maximum number of retry attempts
     */
    constructor(options = {}) {
        if (!options.apiKey) {
            throw new Error('API key is required');
        }

        this.apiKey = options.apiKey;
        this.baseUrl = (options.baseUrl || 'https://api.frontier-business.com/v1').replace(/\/$/, '');
        this.timeout = options.timeout || 30000;
        this.maxRetries = options.maxRetries || 3;

        // Create axios instance
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'frontier-javascript-sdk/1.0.0'
            }
        });

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            response => response,
            error => this._handleError(error)
        );
    }

    /**
     * Handle API errors and convert to appropriate error types
     */
    _handleError(error) {
        if (error.response) {
            const { status, data } = error.response;
            const message = data?.error?.message || `HTTP ${status} error`;

            switch (status) {
                case 401:
                    throw new AuthenticationError(message, status);
                case 422:
                    throw new ValidationError(message, status);
                case 429:
                    throw new RateLimitError(message, status);
                default:
                    throw new FrontierAPIError(message, status);
            }
        } else if (error.request) {
            throw new FrontierAPIError('Network error: No response received');
        } else {
            throw new FrontierAPIError(`Request setup error: ${error.message}`);
        }
    }

    /**
     * Make HTTP request with retry logic
     */
    async _makeRequest(method, endpoint, data = null, params = null) {
        const config = {
            method,
            url: endpoint,
            ...(data && { data }),
            ...(params && { params })
        };

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await this.client(config);
                return response.data;
            } catch (error) {
                // Don't retry on client errors (4xx) except rate limiting
                if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
                    throw error;
                }

                // Retry on server errors or rate limiting
                if (attempt < this.maxRetries) {
                    const delay = error.statusCode === 429 
                        ? parseInt(error.response?.headers?.['retry-after'] || '60') * 1000
                        : Math.pow(2, attempt) * 1000; // Exponential backoff

                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                throw error;
            }
        }
    }

    // Health and Status Methods

    /**
     * Check API health status
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        return this._makeRequest('GET', '/health');
    }

    /**
     * Get detailed API status
     * @returns {Promise<Object>} API status
     */
    async getStatus() {
        return this._makeRequest('GET', '/status');
    }

    /**
     * Get API metrics
     * @returns {Promise<Object>} API metrics
     */
    async getMetrics() {
        return this._makeRequest('GET', '/metrics');
    }

    // Financial Analysis Methods

    /**
     * Perform comprehensive financial analysis
     * 
     * @param {Object} data - Financial data including company info and statements
     * @returns {Promise<Object>} Analysis results with ratios, scores, and insights
     */
    async financialAnalysis(data) {
        return this._makeRequest('POST', '/business/financial-analysis', data);
    }

    /**
     * Perform company valuation analysis (Professional tier required)
     * 
     * @param {Object} data - Valuation data including financial and market data
     * @returns {Promise<Object>} Valuation results with multiple methods
     */
    async valuationAnalysis(data) {
        return this._makeRequest('POST', '/business/valuation', data);
    }

    /**
     * Analyze historical trends and generate forecasts
     * 
     * @param {Object} data - Historical data and analysis parameters
     * @returns {Promise<Object>} Trend analysis and forecasts
     */
    async trendAnalysis(data) {
        return this._makeRequest('POST', '/business/trend-analysis', data);
    }

    /**
     * Get industry benchmark data
     * 
     * @param {string} industry - Industry sector
     * @param {string} [region='global'] - Geographic region
     * @param {string} [companySize] - Company size category
     * @returns {Promise<Object>} Industry benchmarks and statistics
     */
    async getIndustryBenchmarks(industry, region = 'global', companySize = null) {
        const params = { industry, region };
        if (companySize) {
            params.company_size = companySize;
        }

        return this._makeRequest('GET', '/business/industry-benchmarks', null, params);
    }

    // Strategic Planning Methods

    /**
     * Generate comprehensive strategic plan
     * 
     * @param {Object} data - Company profile and strategic planning data
     * @returns {Promise<Object>} Strategic plan with SWOT, objectives, and action plan
     */
    async strategicPlanning(data) {
        return this._makeRequest('POST', '/business/strategic-planning', data);
    }

    /**
     * Conduct market research analysis
     * 
     * @param {Object} data - Market research parameters
     * @returns {Promise<Object>} Market analysis and insights
     */
    async marketResearch(data) {
        return this._makeRequest('POST', '/business/market-research', data);
    }

    /**
     * Analyze competitive landscape (Professional tier required)
     * 
     * @param {Object} data - Competitive analysis parameters
     * @returns {Promise<Object>} Competitive landscape analysis
     */
    async competitiveAnalysis(data) {
        return this._makeRequest('POST', '/business/competitive-analysis', data);
    }
}

/**
 * Convenience function to create a new Frontier API client
 * 
 * @param {Object} options - Configuration options
 * @returns {FrontierClient} New client instance
 */
function createClient(options) {
    return new FrontierClient(options);
}

// Export classes and functions
module.exports = {
    FrontierClient,
    FrontierAPIError,
    RateLimitError,
    AuthenticationError,
    ValidationError,
    createClient
};

// For ES6 modules
module.exports.default = FrontierClient;

// Package metadata
module.exports.version = '1.0.0';
module.exports.author = 'Frontier Business Operations';
module.exports.homepage = 'https://github.com/frontier-business/javascript-sdk';
