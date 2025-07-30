# CDN Configuration for Static Assets and API Caching
# CloudFront distribution with multi-region caching and optimization

# Primary CloudFront Distribution for API and Static Assets
resource "aws_cloudfront_distribution" "frontier_cdn" {
  comment             = "Frontier Business API CDN"
  default_root_object = "index.html"
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = "PriceClass_All"  # Global distribution
  
  # API Origin (Load Balancer)
  origin {
    domain_name = aws_lb.frontier_api.dns_name
    origin_id   = "frontier-api-origin"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
    
    # Origin Shield for better performance
    origin_shield {
      enabled              = true
      origin_shield_region = "us-east-1"
    }
  }
  
  # Static Assets Origin (S3)
  origin {
    domain_name = aws_s3_bucket.frontier_static_assets.bucket_regional_domain_name
    origin_id   = "frontier-static-origin"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontier_static.cloudfront_access_identity_path
    }
  }
  
  # Documentation Origin (S3)
  origin {
    domain_name = aws_s3_bucket.frontier_docs.bucket_regional_domain_name
    origin_id   = "frontier-docs-origin"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontier_docs.cloudfront_access_identity_path
    }
  }
  
  # Default Cache Behavior for API
  default_cache_behavior {
    target_origin_id       = "frontier-api-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true
    
    # Cache Policy for API responses
    cache_policy_id = aws_cloudfront_cache_policy.api_cache_policy.id
    
    # Request/Response Headers
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api_request_policy.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
    
    # Lambda@Edge for API optimization
    lambda_function_association {
      event_type   = "origin-request"
      lambda_arn   = aws_lambda_function.api_optimizer.qualified_arn
      include_body = false
    }
    
    lambda_function_association {
      event_type   = "origin-response"
      lambda_arn   = aws_lambda_function.cache_optimizer.qualified_arn
      include_body = false
    }
  }
  
  # Static Assets Cache Behavior
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    target_origin_id       = "frontier-static-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    
    # Long-term caching for static assets
    cache_policy_id = aws_cloudfront_cache_policy.static_assets_policy.id
  }
  
  # Documentation Cache Behavior
  ordered_cache_behavior {
    path_pattern           = "/docs/*"
    target_origin_id       = "frontier-docs-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    
    cache_policy_id = aws_cloudfront_cache_policy.docs_cache_policy.id
  }
  
  # SDK Downloads Cache Behavior
  ordered_cache_behavior {
    path_pattern           = "/sdk/*"
    target_origin_id       = "frontier-static-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    
    # Medium-term caching for SDK files
    cache_policy_id = aws_cloudfront_cache_policy.sdk_cache_policy.id
  }
  
  # Geographic Restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  # SSL/TLS Configuration
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.frontier_api.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  # Custom Domain
  aliases = ["api.frontier-business.com", "cdn.frontier-business.com"]
  
  # Logging Configuration
  logging_config {
    bucket          = aws_s3_bucket.cloudfront_logs.bucket_domain_name
    prefix          = "api-logs/"
    include_cookies = false
  }
  
  # Web Application Firewall
  web_acl_id = aws_wafv2_web_acl.frontier_waf.arn
  
  tags = {
    Name        = "Frontier API CDN"
    Environment = "production"
  }
}

# API Cache Policy - Smart caching for API responses
resource "aws_cloudfront_cache_policy" "api_cache_policy" {
  name        = "frontier-api-cache-policy"
  comment     = "Cache policy for Frontier API with smart TTL"
  default_ttl = 300    # 5 minutes default
  max_ttl     = 3600   # 1 hour maximum
  min_ttl     = 0      # No minimum
  
  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    
    # Query String Configuration
    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["industry", "region", "period", "limit", "offset"]
      }
    }
    
    # Headers Configuration
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Authorization", "Content-Type", "User-Agent", "Accept"]
      }
    }
    
    # Cookies Configuration
    cookies_config {
      cookie_behavior = "none"
    }
  }
}

# Static Assets Cache Policy - Long-term caching
resource "aws_cloudfront_cache_policy" "static_assets_policy" {
  name        = "frontier-static-assets-policy"
  comment     = "Long-term cache policy for static assets"
  default_ttl = 86400   # 1 day
  max_ttl     = 31536000 # 1 year
  min_ttl     = 1
  
  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    
    query_strings_config {
      query_string_behavior = "none"
    }
    
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Accept", "Accept-Encoding"]
      }
    }
    
    cookies_config {
      cookie_behavior = "none"
    }
  }
}

# Documentation Cache Policy
resource "aws_cloudfront_cache_policy" "docs_cache_policy" {
  name        = "frontier-docs-cache-policy"
  comment     = "Cache policy for documentation"
  default_ttl = 1800   # 30 minutes
  max_ttl     = 86400  # 1 day
  min_ttl     = 0
  
  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    
    query_strings_config {
      query_string_behavior = "none"
    }
    
    headers_config {
      header_behavior = "whitelist"
      headers {
        items = ["Accept", "Accept-Encoding", "Accept-Language"]
      }
    }
    
    cookies_config {
      cookie_behavior = "none"
    }
  }
}

# SDK Cache Policy
resource "aws_cloudfront_cache_policy" "sdk_cache_policy" {
  name        = "frontier-sdk-cache-policy"
  comment     = "Cache policy for SDK downloads"
  default_ttl = 3600   # 1 hour
  max_ttl     = 604800 # 1 week
  min_ttl     = 0
  
  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true
    
    query_strings_config {
      query_string_behavior = "whitelist"
      query_strings {
        items = ["version", "platform"]
      }
    }
    
    headers_config {
      header_behavior = "none"
    }
    
    cookies_config {
      cookie_behavior = "none"
    }
  }
}

# Origin Request Policy for API
resource "aws_cloudfront_origin_request_policy" "api_request_policy" {
  name    = "frontier-api-request-policy"
  comment = "Origin request policy for API"
  
  cookies_config {
    cookie_behavior = "none"
  }
  
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = [
        "Authorization",
        "Content-Type",
        "User-Agent",
        "Accept",
        "X-Forwarded-For",
        "X-Real-IP",
        "CloudFront-Viewer-Country",
        "CloudFront-Is-Mobile-Viewer"
      ]
    }
  }
  
  query_strings_config {
    query_string_behavior = "all"
  }
}

# Response Headers Policy for Security
resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "frontier-security-headers"
  comment = "Security headers for Frontier API"
  
  cors_config {
    access_control_allow_credentials = false
    access_control_allow_headers {
      items = ["Authorization", "Content-Type", "Accept", "X-Requested-With"]
    }
    access_control_allow_methods {
      items = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"]
    }
    access_control_allow_origins {
      items = ["https://frontier-business.com", "https://app.frontier-business.com"]
    }
    access_control_max_age_sec = 3600
    origin_override = false
  }
  
  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = false
    }
    content_type_options {
      override = false
    }
    frame_options {
      frame_option = "DENY"
      override     = false
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = false
    }
  }
  
  custom_headers_config {
    items {
      header   = "X-API-Version"
      value    = "1.0.0"
      override = false
    }
    items {
      header   = "X-Cache-Status"
      value    = "CloudFront"
      override = false
    }
  }
}

# Lambda@Edge Function for API Optimization
resource "aws_lambda_function" "api_optimizer" {
  filename         = "api_optimizer.zip"
  function_name    = "frontier-api-optimizer"
  role            = aws_iam_role.lambda_edge.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 5
  memory_size     = 128
  publish         = true
  
  # Lambda@Edge must be in us-east-1
  provider = aws.us_east_1
  
  tags = {
    Name        = "Frontier API Optimizer"
    Environment = "production"
  }
}

# API Optimizer Lambda Code
locals {
  api_optimizer_code = <<-EOT
exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;
    
    // Add region-based routing
    const viewerCountry = headers['cloudfront-viewer-country'] 
      ? headers['cloudfront-viewer-country'][0].value : 'US';
    
    // Route to nearest region
    if (['GB', 'DE', 'FR', 'IT', 'ES'].includes(viewerCountry)) {
        request.origin.custom.domainName = 'api-eu.frontier-business.com';
    } else if (['CA', 'MX'].includes(viewerCountry)) {
        request.origin.custom.domainName = 'api-us-west.frontier-business.com';
    }
    
    // Add caching headers based on endpoint
    const uri = request.uri;
    if (uri.includes('/industry-benchmarks')) {
        headers['cache-control'] = [{ key: 'Cache-Control', value: 'max-age=3600' }];
    } else if (uri.includes('/financial-analysis')) {
        headers['cache-control'] = [{ key: 'Cache-Control', value: 'max-age=300' }];
    }
    
    // Add request ID for tracking
    headers['x-request-id'] = [{ 
        key: 'X-Request-ID', 
        value: require('crypto').randomUUID() 
    }];
    
    return request;
};
EOT
}

# Cache Optimizer Lambda Function
resource "aws_lambda_function" "cache_optimizer" {
  filename         = "cache_optimizer.zip"
  function_name    = "frontier-cache-optimizer"
  role            = aws_iam_role.lambda_edge.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 5
  memory_size     = 128
  publish         = true
  
  provider = aws.us_east_1
  
  tags = {
    Name        = "Frontier Cache Optimizer"
    Environment = "production"
  }
}

# Cache Optimizer Lambda Code
locals {
  cache_optimizer_code = <<-EOT
exports.handler = async (event) => {
    const response = event.Records[0].cf.response;
    const headers = response.headers;
    
    // Set cache headers based on response
    const status = response.status;
    const uri = event.Records[0].cf.request.uri;
    
    if (status === '200') {
        // Success responses - cache based on endpoint
        if (uri.includes('/industry-benchmarks')) {
            headers['cache-control'] = [{ 
                key: 'Cache-Control', 
                value: 'public, max-age=3600, s-maxage=7200' 
            }];
        } else if (uri.includes('/health')) {
            headers['cache-control'] = [{ 
                key: 'Cache-Control', 
                value: 'public, max-age=60' 
            }];
        } else if (uri.includes('/financial-analysis')) {
            headers['cache-control'] = [{ 
                key: 'Cache-Control', 
                value: 'private, max-age=300' 
            }];
        }
    } else if (status === '400' || status === '404') {
        // Client errors - short cache
        headers['cache-control'] = [{ 
            key: 'Cache-Control', 
            value: 'public, max-age=60' 
        }];
    } else {
        // Server errors - no cache
        headers['cache-control'] = [{ 
            key: 'Cache-Control', 
            value: 'no-cache' 
        }];
    }
    
    // Add performance headers
    headers['x-cache-status'] = [{ 
        key: 'X-Cache-Status', 
        value: 'CloudFront' 
    }];
    
    return response;
};
EOT
}

# S3 Bucket for Static Assets
resource "aws_s3_bucket" "frontier_static_assets" {
  bucket = "frontier-static-assets-${random_id.bucket_suffix.hex}"
  
  tags = {
    Name        = "Frontier Static Assets"
    Environment = "production"
  }
}

resource "aws_s3_bucket_public_access_block" "frontier_static_assets" {
  bucket = aws_s3_bucket.frontier_static_assets.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Bucket for Documentation
resource "aws_s3_bucket" "frontier_docs" {
  bucket = "frontier-docs-${random_id.bucket_suffix.hex}"
  
  tags = {
    Name        = "Frontier Documentation"
    Environment = "production"
  }
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "frontier_static" {
  comment = "OAI for Frontier static assets"
}

resource "aws_cloudfront_origin_access_identity" "frontier_docs" {
  comment = "OAI for Frontier documentation"
}

# S3 Bucket Policy for CloudFront Access
resource "aws_s3_bucket_policy" "frontier_static_assets" {
  bucket = aws_s3_bucket.frontier_static_assets.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.frontier_static.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontier_static_assets.arn}/*"
      }
    ]
  })
}

# WAF for DDoS Protection and Security
resource "aws_wafv2_web_acl" "frontier_waf" {
  name  = "frontier-api-waf"
  scope = "CLOUDFRONT"
  
  default_action {
    allow {}
  }
  
  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = 10000  # 10k requests per 5 minutes
        aggregate_key_type = "IP"
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }
  
  # Geo blocking rule (if needed)
  rule {
    name     = "GeoBlockRule"
    priority = 2
    
    action {
      allow {}  # Currently allowing all countries
    }
    
    statement {
      geo_match_statement {
        country_codes = ["US", "CA", "GB", "DE", "FR", "AU", "JP"]
      }
    }
    
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlockRule"
      sampled_requests_enabled   = true
    }
  }
  
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "frontier-api-waf"
    sampled_requests_enabled   = true
  }
  
  tags = {
    Name        = "Frontier API WAF"
    Environment = "production"
  }
}

# CloudFront Logs Bucket
resource "aws_s3_bucket" "cloudfront_logs" {
  bucket = "frontier-cloudfront-logs-${random_id.bucket_suffix.hex}"
  
  tags = {
    Name        = "Frontier CloudFront Logs"
    Environment = "production"
  }
}

# Route 53 Records for CDN
resource "aws_route53_record" "api_cdn" {
  zone_id = aws_route53_zone.frontier.zone_id
  name    = "api.frontier-business.com"
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.frontier_cdn.domain_name
    zone_id                = aws_cloudfront_distribution.frontier_cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cdn" {
  zone_id = aws_route53_zone.frontier.zone_id
  name    = "cdn.frontier-business.com"
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.frontier_cdn.domain_name
    zone_id                = aws_cloudfront_distribution.frontier_cdn.hosted_zone_id
    evaluate_target_health = false
  }
}
