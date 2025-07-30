package com.frontier.business.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import okhttp3.*;
import okhttp3.logging.HttpLoggingInterceptor;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.HashMap;
import java.util.concurrent.TimeUnit;

/**
 * Frontier Business Operations API - Java SDK
 * 
 * Official Java client library for the Frontier Business Operations API.
 * Provides convenient access to business intelligence, financial analysis,
 * and strategic planning capabilities.
 * 
 * @version 1.0.0
 * @author Frontier Business Operations
 */
public class FrontierClient {
    
    private static final String DEFAULT_BASE_URL = "https://api.frontier-business.com/v1";
    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
    
    private final String apiKey;
    private final String baseUrl;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final int maxRetries;
    
    /**
     * Builder class for FrontierClient
     */
    public static class Builder {
        private String apiKey;
        private String baseUrl = DEFAULT_BASE_URL;
        private Duration timeout = Duration.ofSeconds(30);
        private int maxRetries = 3;
        private boolean enableLogging = false;
        
        public Builder apiKey(String apiKey) {
            this.apiKey = apiKey;
            return this;
        }
        
        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl.replaceAll("/$", "");
            return this;
        }
        
        public Builder timeout(Duration timeout) {
            this.timeout = timeout;
            return this;
        }
        
        public Builder maxRetries(int maxRetries) {
            this.maxRetries = maxRetries;
            return this;
        }
        
        public Builder enableLogging(boolean enableLogging) {
            this.enableLogging = enableLogging;
            return this;
        }
        
        public FrontierClient build() {
            if (apiKey == null || apiKey.trim().isEmpty()) {
                throw new IllegalArgumentException("API key is required");
            }
            return new FrontierClient(this);
        }
    }
    
    private FrontierClient(Builder builder) {
        this.apiKey = builder.apiKey;
        this.baseUrl = builder.baseUrl;
        this.maxRetries = builder.maxRetries;
        this.objectMapper = new ObjectMapper();
        
        OkHttpClient.Builder clientBuilder = new OkHttpClient.Builder()
            .connectTimeout(builder.timeout.toMillis(), TimeUnit.MILLISECONDS)
            .readTimeout(builder.timeout.toMillis(), TimeUnit.MILLISECONDS)
            .writeTimeout(builder.timeout.toMillis(), TimeUnit.MILLISECONDS);
            
        if (builder.enableLogging) {
            HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
            logging.setLevel(HttpLoggingInterceptor.Level.BODY);
            clientBuilder.addInterceptor(logging);
        }
        
        this.httpClient = clientBuilder.build();
    }
    
    /**
     * Create a new FrontierClient builder
     */
    public static Builder builder() {
        return new Builder();
    }
    
    /**
     * Make HTTP request with retry logic
     */
    private ApiResponse makeRequest(String method, String endpoint, Object data) throws FrontierAPIException {
        String url = baseUrl + "/" + endpoint.replaceFirst("^/", "");
        
        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                Request.Builder requestBuilder = new Request.Builder()
                    .url(url)
                    .addHeader("Authorization", "Bearer " + apiKey)
                    .addHeader("Content-Type", "application/json")
                    .addHeader("User-Agent", "frontier-java-sdk/1.0.0");
                
                RequestBody requestBody = null;
                if (data != null) {
                    String jsonData = objectMapper.writeValueAsString(data);
                    requestBody = RequestBody.create(jsonData, JSON);
                }
                
                switch (method.toUpperCase()) {
                    case "GET":
                        requestBuilder.get();
                        break;
                    case "POST":
                        requestBuilder.post(requestBody != null ? requestBody : RequestBody.create("", JSON));
                        break;
                    case "PUT":
                        requestBuilder.put(requestBody != null ? requestBody : RequestBody.create("", JSON));
                        break;
                    case "DELETE":
                        requestBuilder.delete();
                        break;
                    default:
                        throw new IllegalArgumentException("Unsupported HTTP method: " + method);
                }
                
                try (Response response = httpClient.newCall(requestBuilder.build()).execute()) {
                    String responseBody = response.body() != null ? response.body().string() : "";
                    
                    // Handle rate limiting
                    if (response.code() == 429) {
                        if (attempt < maxRetries) {
                            String retryAfter = response.header("Retry-After", "60");
                            Thread.sleep(Integer.parseInt(retryAfter) * 1000L);
                            continue;
                        }
                        throw new RateLimitException("Rate limit exceeded");
                    }
                    
                    // Handle authentication errors
                    if (response.code() == 401) {
                        throw new AuthenticationException("Authentication failed");
                    }
                    
                    // Handle validation errors
                    if (response.code() == 422) {
                        JsonNode errorData = objectMapper.readTree(responseBody);
                        String message = errorData.path("error").path("message").asText("Validation error");
                        throw new ValidationException(message);
                    }
                    
                    // Handle other client errors
                    if (response.code() >= 400 && response.code() < 500) {
                        JsonNode errorData = objectMapper.readTree(responseBody);
                        String message = errorData.path("error").path("message").asText("Client error " + response.code());
                        throw new FrontierAPIException(message, response.code());
                    }
                    
                    // Handle server errors
                    if (response.code() >= 500) {
                        if (attempt < maxRetries) {
                            Thread.sleep((long) Math.pow(2, attempt) * 1000);
                            continue;
                        }
                        throw new FrontierAPIException("Server error " + response.code(), response.code());
                    }
                    
                    // Success
                    if (response.isSuccessful()) {
                        JsonNode jsonResponse = objectMapper.readTree(responseBody);
                        return new ApiResponse(jsonResponse, response.code());
                    }
                    
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new FrontierAPIException("Request interrupted", e);
                }
                
            } catch (IOException e) {
                if (attempt < maxRetries) {
                    try {
                        Thread.sleep((long) Math.pow(2, attempt) * 1000);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new FrontierAPIException("Request interrupted", ie);
                    }
                    continue;
                }
                throw new FrontierAPIException("Request failed: " + e.getMessage(), e);
            }
        }
        
        throw new FrontierAPIException("Max retries exceeded");
    }
    
    // Health and Status Methods
    
    /**
     * Check API health status
     */
    public ApiResponse healthCheck() throws FrontierAPIException {
        return makeRequest("GET", "/health", null);
    }
    
    /**
     * Get detailed API status
     */
    public ApiResponse getStatus() throws FrontierAPIException {
        return makeRequest("GET", "/status", null);
    }
    
    /**
     * Get API metrics
     */
    public ApiResponse getMetrics() throws FrontierAPIException {
        return makeRequest("GET", "/metrics", null);
    }
    
    // Financial Analysis Methods
    
    /**
     * Perform comprehensive financial analysis
     */
    public ApiResponse financialAnalysis(Map<String, Object> data) throws FrontierAPIException {
        return makeRequest("POST", "/business/financial-analysis", data);
    }
    
    /**
     * Perform company valuation analysis (Professional tier required)
     */
    public ApiResponse valuationAnalysis(Map<String, Object> data) throws FrontierAPIException {
        return makeRequest("POST", "/business/valuation", data);
    }
    
    /**
     * Analyze historical trends and generate forecasts
     */
    public ApiResponse trendAnalysis(Map<String, Object> data) throws FrontierAPIException {
        return makeRequest("POST", "/business/trend-analysis", data);
    }
    
    /**
     * Get industry benchmark data
     */
    public ApiResponse getIndustryBenchmarks(String industry, String region, String companySize) throws FrontierAPIException {
        Map<String, Object> params = new HashMap<>();
        params.put("industry", industry);
        if (region != null) params.put("region", region);
        if (companySize != null) params.put("company_size", companySize);
        
        // For GET requests with parameters, we need to build the URL
        StringBuilder urlBuilder = new StringBuilder("/business/industry-benchmarks?");
        params.forEach((key, value) -> urlBuilder.append(key).append("=").append(value).append("&"));
        String url = urlBuilder.toString().replaceAll("&$", "");
        
        return makeRequest("GET", url, null);
    }
    
    public ApiResponse getIndustryBenchmarks(String industry) throws FrontierAPIException {
        return getIndustryBenchmarks(industry, "global", null);
    }
    
    // Strategic Planning Methods
    
    /**
     * Generate comprehensive strategic plan
     */
    public ApiResponse strategicPlanning(Map<String, Object> data) throws FrontierAPIException {
        return makeRequest("POST", "/business/strategic-planning", data);
    }
    
    /**
     * Conduct market research analysis
     */
    public ApiResponse marketResearch(Map<String, Object> data) throws FrontierAPIException {
        return makeRequest("POST", "/business/market-research", data);
    }
    
    /**
     * Analyze competitive landscape (Professional tier required)
     */
    public ApiResponse competitiveAnalysis(Map<String, Object> data) throws FrontierAPIException {
        return makeRequest("POST", "/business/competitive-analysis", data);
    }
    
    /**
     * Close the HTTP client and clean up resources
     */
    public void close() {
        httpClient.dispatcher().executorService().shutdown();
        httpClient.connectionPool().evictAll();
    }
}

/**
 * API Response wrapper
 */
class ApiResponse {
    private final JsonNode data;
    private final int statusCode;
    
    public ApiResponse(JsonNode data, int statusCode) {
        this.data = data;
        this.statusCode = statusCode;
    }
    
    public JsonNode getData() {
        return data;
    }
    
    public int getStatusCode() {
        return statusCode;
    }
    
    public boolean isSuccess() {
        return data.path("success").asBoolean(false);
    }
    
    public JsonNode getResponseData() {
        return data.path("data");
    }
    
    public JsonNode getMetadata() {
        return data.path("metadata");
    }
}

/**
 * Base exception for Frontier API errors
 */
class FrontierAPIException extends Exception {
    private final int statusCode;
    
    public FrontierAPIException(String message) {
        super(message);
        this.statusCode = 0;
    }
    
    public FrontierAPIException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
    
    public FrontierAPIException(String message, Throwable cause) {
        super(message, cause);
        this.statusCode = 0;
    }
    
    public int getStatusCode() {
        return statusCode;
    }
}

/**
 * Rate limit exceeded exception
 */
class RateLimitException extends FrontierAPIException {
    public RateLimitException(String message) {
        super(message, 429);
    }
}

/**
 * Authentication failed exception
 */
class AuthenticationException extends FrontierAPIException {
    public AuthenticationException(String message) {
        super(message, 401);
    }
}

/**
 * Validation error exception
 */
class ValidationException extends FrontierAPIException {
    public ValidationException(String message) {
        super(message, 422);
    }
}
