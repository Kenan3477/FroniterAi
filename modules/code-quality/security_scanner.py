"""
Security Scanner

Advanced security vulnerability detection system that:
- Identifies common security vulnerabilities (OWASP Top 10)
- Detects insecure coding patterns and practices
- Analyzes authentication and authorization implementations
- Scans for data leakage and privacy violations
- Provides security-focused refactoring recommendations
"""

import re
import ast
import json
import logging
import hashlib
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from pathlib import Path

class SecuritySeverity(Enum):
    """Security vulnerability severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class VulnerabilityType(Enum):
    """Types of security vulnerabilities"""
    SQL_INJECTION = "sql_injection"
    XSS = "cross_site_scripting"
    CSRF = "cross_site_request_forgery"
    AUTHENTICATION_BYPASS = "authentication_bypass"
    AUTHORIZATION_FAILURE = "authorization_failure"
    SENSITIVE_DATA_EXPOSURE = "sensitive_data_exposure"
    INSECURE_DESERIALIZATION = "insecure_deserialization"
    INSUFFICIENT_LOGGING = "insufficient_logging"
    HARDCODED_CREDENTIALS = "hardcoded_credentials"
    WEAK_CRYPTOGRAPHY = "weak_cryptography"
    INSECURE_CONFIGURATION = "insecure_configuration"
    PATH_TRAVERSAL = "path_traversal"
    COMMAND_INJECTION = "command_injection"
    LDAP_INJECTION = "ldap_injection"
    BUFFER_OVERFLOW = "buffer_overflow"

@dataclass
class SecurityVulnerability:
    """Represents a security vulnerability"""
    vulnerability_id: str
    vulnerability_type: VulnerabilityType
    severity: SecuritySeverity
    title: str
    description: str
    file_path: str
    line_number: int
    column_number: int
    code_snippet: str
    cwe_id: Optional[str]
    owasp_category: Optional[str]
    attack_vector: str
    impact: str
    likelihood: str
    fix_suggestion: str
    explanation: str
    tags: List[str]
    confidence: float
    auto_fixable: bool
    fix_complexity: str
    compliance_impact: List[str]

class SecurityScanner:
    """
    Advanced security vulnerability scanner that detects:
    
    1. OWASP Top 10 vulnerabilities
    2. Common coding security anti-patterns
    3. Authentication and authorization flaws
    4. Data privacy and protection issues
    5. Cryptographic implementation errors
    6. Configuration security issues
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.vulnerability_patterns = {}
        self.security_rules = {}
        self.compliance_frameworks = ["OWASP", "GDPR", "PCI_DSS", "HIPAA"]
        
        # Scanner configuration
        self.scan_depth = self.config.get("scan_depth", "deep")
        self.include_low_severity = self.config.get("include_low_severity", True)
        self.check_dependencies = self.config.get("check_dependencies", True)
        
        # Setup logging
        self.logger = self._setup_logging()
    
    async def initialize(self):
        """Initialize the security scanner"""
        
        self.logger.info("Initializing Security Scanner...")
        
        # Load vulnerability patterns and rules
        await self._load_vulnerability_patterns()
        await self._load_security_rules()
        await self._load_compliance_mappings()
        
        self.logger.info("Security Scanner initialized successfully")
    
    async def scan_code(self, file_path: str, code_content: str) -> List[SecurityVulnerability]:
        """
        Scan code for security vulnerabilities
        
        Args:
            file_path: Path to the code file
            code_content: Content of the code file
            
        Returns:
            List of detected security vulnerabilities
        """
        
        vulnerabilities = []
        
        try:
            # Determine file type for targeted scanning
            file_type = self._determine_file_type(file_path)
            
            # Run general security scans
            vulnerabilities.extend(await self._scan_hardcoded_secrets(file_path, code_content))
            vulnerabilities.extend(await self._scan_injection_vulnerabilities(file_path, code_content))
            vulnerabilities.extend(await self._scan_cryptographic_issues(file_path, code_content))
            vulnerabilities.extend(await self._scan_authentication_issues(file_path, code_content))
            vulnerabilities.extend(await self._scan_data_privacy_issues(file_path, code_content))
            
            # Run language-specific scans
            if file_type == "python":
                vulnerabilities.extend(await self._scan_python_security(file_path, code_content))
            elif file_type in ["javascript", "typescript"]:
                vulnerabilities.extend(await self._scan_javascript_security(file_path, code_content))
            elif file_type == "java":
                vulnerabilities.extend(await self._scan_java_security(file_path, code_content))
            
            # Run configuration and deployment scans
            if file_type in ["yaml", "json", "xml", "properties"]:
                vulnerabilities.extend(await self._scan_configuration_security(file_path, code_content))
            
            # Sort by severity and confidence
            vulnerabilities.sort(key=lambda v: (v.severity.value, -v.confidence))
            
            self.logger.info(f"Security scan completed for {file_path}: {len(vulnerabilities)} vulnerabilities found")
            
            return vulnerabilities
            
        except Exception as e:
            self.logger.error(f"Error during security scan of {file_path}: {str(e)}")
            return []
    
    async def _scan_hardcoded_secrets(self, file_path: str, code_content: str) -> List[SecurityVulnerability]:
        """Scan for hardcoded secrets and credentials"""
        
        vulnerabilities = []
        
        # Patterns for detecting hardcoded secrets
        secret_patterns = [
            (r'password\s*=\s*["\'][^"\']{8,}["\']', "hardcoded_password", "CWE-798"),
            (r'api[_-]?key\s*=\s*["\'][^"\']{16,}["\']', "hardcoded_api_key", "CWE-798"),
            (r'secret[_-]?key\s*=\s*["\'][^"\']{16,}["\']', "hardcoded_secret_key", "CWE-798"),
            (r'private[_-]?key\s*=\s*["\'][^"\']{32,}["\']', "hardcoded_private_key", "CWE-798"),
            (r'token\s*=\s*["\'][^"\']{20,}["\']', "hardcoded_token", "CWE-798"),
            (r'jdbc:.*://.*:.*@', "database_connection_string", "CWE-798"),
            (r'mongodb://.*:.*@', "mongodb_connection_string", "CWE-798"),
            (r'AKIA[0-9A-Z]{16}', "aws_access_key", "CWE-798"),
            (r'-----BEGIN.*PRIVATE KEY-----', "private_key_in_code", "CWE-798"),
        ]
        
        lines = code_content.split('\n')
        
        for i, line in enumerate(lines, 1):
            for pattern, vuln_type, cwe_id in secret_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    vulnerability = SecurityVulnerability(
                        vulnerability_id=self._generate_vuln_id(vuln_type, file_path, i),
                        vulnerability_type=VulnerabilityType.HARDCODED_CREDENTIALS,
                        severity=SecuritySeverity.CRITICAL,
                        title="Hardcoded Credential Detected",
                        description=f"Hardcoded {vuln_type.replace('_', ' ')} found in source code",
                        file_path=file_path,
                        line_number=i,
                        column_number=match.start(),
                        code_snippet=line.strip(),
                        cwe_id=cwe_id,
                        owasp_category="A02:2021 – Cryptographic Failures",
                        attack_vector="Source code access",
                        impact="Complete system compromise possible",
                        likelihood="High if source code is accessible",
                        fix_suggestion="Move credentials to environment variables or secure configuration",
                        explanation="Hardcoded credentials in source code can be discovered by anyone with access to the code, including attackers who gain access to repositories.",
                        tags=["credentials", "hardcoded", "critical"],
                        confidence=0.9,
                        auto_fixable=False,
                        fix_complexity="simple",
                        compliance_impact=["PCI_DSS", "GDPR", "HIPAA"]
                    )
                    vulnerabilities.append(vulnerability)
        
        return vulnerabilities
    
    async def _scan_injection_vulnerabilities(self, file_path: str, code_content: str) -> List[SecurityVulnerability]:
        """Scan for injection vulnerabilities"""
        
        vulnerabilities = []
        
        # SQL Injection patterns
        sql_injection_patterns = [
            (r'execute\s*\(\s*["\'].*\+.*["\']', "sql_concatenation"),
            (r'query\s*=\s*["\'].*%s.*["\']', "sql_string_formatting"),
            (r'SELECT.*\+.*FROM', "sql_dynamic_query"),
            (r'cursor\.execute\s*\([^)]*%[^)]*\)', "sql_format_string"),
        ]
        
        # Command Injection patterns
        command_injection_patterns = [
            (r'os\.system\s*\([^)]*\+[^)]*\)', "command_concatenation"),
            (r'subprocess\.(call|run|Popen)\s*\([^)]*\+[^)]*\)', "subprocess_concatenation"),
            (r'eval\s*\([^)]*input[^)]*\)', "eval_user_input"),
            (r'exec\s*\([^)]*input[^)]*\)', "exec_user_input"),
        ]
        
        # XSS patterns (for web frameworks)
        xss_patterns = [
            (r'innerHTML\s*=\s*[^;]*\+', "dom_xss"),
            (r'document\.write\s*\([^)]*\+[^)]*\)', "document_write_xss"),
            (r'render_template_string\s*\([^)]*\+[^)]*\)', "template_injection"),
        ]
        
        lines = code_content.split('\n')
        
        # Check for SQL injection
        for i, line in enumerate(lines, 1):
            for pattern, vuln_subtype in sql_injection_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    vulnerability = SecurityVulnerability(
                        vulnerability_id=self._generate_vuln_id("sql_injection", file_path, i),
                        vulnerability_type=VulnerabilityType.SQL_INJECTION,
                        severity=SecuritySeverity.HIGH,
                        title="SQL Injection Vulnerability",
                        description=f"Potential SQL injection via {vuln_subtype}",
                        file_path=file_path,
                        line_number=i,
                        column_number=0,
                        code_snippet=line.strip(),
                        cwe_id="CWE-89",
                        owasp_category="A03:2021 – Injection",
                        attack_vector="User input manipulation",
                        impact="Database compromise, data theft",
                        likelihood="High if user input reaches database",
                        fix_suggestion="Use parameterized queries or ORM with proper input validation",
                        explanation="SQL injection occurs when user input is directly concatenated into SQL queries, allowing attackers to execute arbitrary SQL commands.",
                        tags=["injection", "sql", "database"],
                        confidence=0.8,
                        auto_fixable=False,
                        fix_complexity="moderate",
                        compliance_impact=["PCI_DSS", "GDPR"]
                    )
                    vulnerabilities.append(vulnerability)
        
        # Check for command injection
        for i, line in enumerate(lines, 1):
            for pattern, vuln_subtype in command_injection_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    vulnerability = SecurityVulnerability(
                        vulnerability_id=self._generate_vuln_id("command_injection", file_path, i),
                        vulnerability_type=VulnerabilityType.COMMAND_INJECTION,
                        severity=SecuritySeverity.CRITICAL,
                        title="Command Injection Vulnerability",
                        description=f"Potential command injection via {vuln_subtype}",
                        file_path=file_path,
                        line_number=i,
                        column_number=0,
                        code_snippet=line.strip(),
                        cwe_id="CWE-78",
                        owasp_category="A03:2021 – Injection",
                        attack_vector="User input in system commands",
                        impact="Full system compromise",
                        likelihood="High if user input reaches OS commands",
                        fix_suggestion="Use subprocess with shell=False and validate input",
                        explanation="Command injection allows attackers to execute arbitrary operating system commands through unsanitized user input.",
                        tags=["injection", "command", "rce"],
                        confidence=0.85,
                        auto_fixable=False,
                        fix_complexity="moderate",
                        compliance_impact=["PCI_DSS", "GDPR", "HIPAA"]
                    )
                    vulnerabilities.append(vulnerability)
        
        # Check for XSS
        for i, line in enumerate(lines, 1):
            for pattern, vuln_subtype in xss_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    vulnerability = SecurityVulnerability(
                        vulnerability_id=self._generate_vuln_id("xss", file_path, i),
                        vulnerability_type=VulnerabilityType.XSS,
                        severity=SecuritySeverity.MEDIUM,
                        title="Cross-Site Scripting (XSS) Vulnerability",
                        description=f"Potential XSS via {vuln_subtype}",
                        file_path=file_path,
                        line_number=i,
                        column_number=0,
                        code_snippet=line.strip(),
                        cwe_id="CWE-79",
                        owasp_category="A03:2021 – Injection",
                        attack_vector="Malicious script injection",
                        impact="Session hijacking, data theft",
                        likelihood="Medium in web applications",
                        fix_suggestion="Use proper output encoding and Content Security Policy",
                        explanation="XSS vulnerabilities allow attackers to inject malicious scripts into web pages viewed by other users.",
                        tags=["xss", "web", "client-side"],
                        confidence=0.7,
                        auto_fixable=False,
                        fix_complexity="moderate",
                        compliance_impact=["PCI_DSS", "GDPR"]
                    )
                    vulnerabilities.append(vulnerability)
        
        return vulnerabilities
    
    async def _scan_cryptographic_issues(self, file_path: str, code_content: str) -> List[SecurityVulnerability]:
        """Scan for cryptographic implementation issues"""
        
        vulnerabilities = []
        
        # Weak cryptographic patterns
        crypto_patterns = [
            (r'hashlib\.md5\(', "weak_hash_md5", "CWE-327"),
            (r'hashlib\.sha1\(', "weak_hash_sha1", "CWE-327"),
            (r'DES\.new\(', "weak_cipher_des", "CWE-327"),
            (r'RC4\(', "weak_cipher_rc4", "CWE-327"),
            (r'random\.random\(\)', "weak_random", "CWE-338"),
            (r'Cipher\(.*ECB', "weak_mode_ecb", "CWE-327"),
            (r'ssl_version\s*=\s*PROTOCOL_SSLv[23]', "weak_ssl", "CWE-327"),
            (r'verify=False', "ssl_verification_disabled", "CWE-295"),
        ]
        
        lines = code_content.split('\n')
        
        for i, line in enumerate(lines, 1):
            for pattern, vuln_type, cwe_id in crypto_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    severity = SecuritySeverity.HIGH
                    if vuln_type in ["weak_hash_md5", "weak_hash_sha1"]:
                        severity = SecuritySeverity.MEDIUM
                    elif vuln_type in ["ssl_verification_disabled"]:
                        severity = SecuritySeverity.HIGH
                    
                    vulnerability = SecurityVulnerability(
                        vulnerability_id=self._generate_vuln_id(vuln_type, file_path, i),
                        vulnerability_type=VulnerabilityType.WEAK_CRYPTOGRAPHY,
                        severity=severity,
                        title="Weak Cryptographic Implementation",
                        description=f"Weak cryptographic implementation: {vuln_type.replace('_', ' ')}",
                        file_path=file_path,
                        line_number=i,
                        column_number=0,
                        code_snippet=line.strip(),
                        cwe_id=cwe_id,
                        owasp_category="A02:2021 – Cryptographic Failures",
                        attack_vector="Cryptographic attack",
                        impact="Data exposure or tampering",
                        likelihood="Medium to High",
                        fix_suggestion=self._get_crypto_fix_suggestion(vuln_type),
                        explanation=self._get_crypto_explanation(vuln_type),
                        tags=["cryptography", "weak", vuln_type],
                        confidence=0.9,
                        auto_fixable=True,
                        fix_complexity="simple",
                        compliance_impact=["PCI_DSS", "GDPR", "HIPAA"]
                    )
                    vulnerabilities.append(vulnerability)
        
        return vulnerabilities
    
    async def _scan_authentication_issues(self, file_path: str, code_content: str) -> List[SecurityVulnerability]:
        """Scan for authentication and authorization issues"""
        
        vulnerabilities = []
        
        # Authentication patterns
        auth_patterns = [
            (r'if.*password.*==.*["\']', "plaintext_password_comparison"),
            (r'session\[.*\]\s*=.*without.*auth', "session_without_auth"),
            (r'@app\.route.*methods.*POST.*without.*auth', "unprotected_endpoint"),
            (r'login_required\s*=\s*False', "login_bypass"),
            (r'authenticate\s*=\s*False', "auth_bypass"),
        ]
        
        lines = code_content.split('\n')
        
        for i, line in enumerate(lines, 1):
            for pattern, vuln_type in auth_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    vulnerability = SecurityVulnerability(
                        vulnerability_id=self._generate_vuln_id(vuln_type, file_path, i),
                        vulnerability_type=VulnerabilityType.AUTHENTICATION_BYPASS,
                        severity=SecuritySeverity.HIGH,
                        title="Authentication/Authorization Issue",
                        description=f"Authentication issue: {vuln_type.replace('_', ' ')}",
                        file_path=file_path,
                        line_number=i,
                        column_number=0,
                        code_snippet=line.strip(),
                        cwe_id="CWE-287",
                        owasp_category="A07:2021 – Identification and Authentication Failures",
                        attack_vector="Authentication bypass",
                        impact="Unauthorized access",
                        likelihood="High if exploitable",
                        fix_suggestion="Implement proper authentication and authorization checks",
                        explanation="Authentication bypass vulnerabilities allow attackers to access protected resources without proper credentials.",
                        tags=["authentication", "authorization", "bypass"],
                        confidence=0.7,
                        auto_fixable=False,
                        fix_complexity="moderate",
                        compliance_impact=["PCI_DSS", "GDPR", "HIPAA"]
                    )
                    vulnerabilities.append(vulnerability)
        
        return vulnerabilities
    
    async def _scan_data_privacy_issues(self, file_path: str, code_content: str) -> List[SecurityVulnerability]:
        """Scan for data privacy and protection issues"""
        
        vulnerabilities = []
        
        # Data privacy patterns
        privacy_patterns = [
            (r'(ssn|social.?security)', "ssn_in_code"),
            (r'(credit.?card|cc.?number)', "credit_card_data"),
            (r'(email.*password|username.*password)', "credentials_logging"),
            (r'print\(.*password', "password_logging"),
            (r'log.*password', "password_in_logs"),
            (r'(pii|personal.?info)', "pii_exposure"),
        ]
        
        lines = code_content.split('\n')
        
        for i, line in enumerate(lines, 1):
            for pattern, vuln_type in privacy_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    vulnerability = SecurityVulnerability(
                        vulnerability_id=self._generate_vuln_id(vuln_type, file_path, i),
                        vulnerability_type=VulnerabilityType.SENSITIVE_DATA_EXPOSURE,
                        severity=SecuritySeverity.MEDIUM,
                        title="Sensitive Data Exposure",
                        description=f"Potential sensitive data exposure: {vuln_type.replace('_', ' ')}",
                        file_path=file_path,
                        line_number=i,
                        column_number=0,
                        code_snippet=line.strip(),
                        cwe_id="CWE-200",
                        owasp_category="A02:2021 – Cryptographic Failures",
                        attack_vector="Data exposure",
                        impact="Privacy violation, compliance breach",
                        likelihood="Medium",
                        fix_suggestion="Remove sensitive data from code and logs, implement proper data handling",
                        explanation="Sensitive data exposure can lead to privacy violations and compliance breaches.",
                        tags=["privacy", "sensitive-data", "exposure"],
                        confidence=0.6,
                        auto_fixable=False,
                        fix_complexity="simple",
                        compliance_impact=["GDPR", "HIPAA", "PCI_DSS"]
                    )
                    vulnerabilities.append(vulnerability)
        
        return vulnerabilities
    
    async def _scan_python_security(self, file_path: str, code_content: str) -> List[SecurityVulnerability]:
        """Scan Python-specific security issues"""
        
        vulnerabilities = []
        
        try:
            tree = ast.parse(code_content)
            
            # Python-specific security patterns
            class PythonSecurityVisitor(ast.NodeVisitor):
                def __init__(self, scanner):
                    self.scanner = scanner
                    self.vulnerabilities = []
                
                def visit_Call(self, node):
                    # Check for pickle.loads() - deserialization vulnerability
                    if (isinstance(node.func, ast.Attribute) and
                        isinstance(node.func.value, ast.Name) and
                        node.func.value.id == 'pickle' and
                        node.func.attr == 'loads'):
                        
                        vuln = SecurityVulnerability(
                            vulnerability_id=self.scanner._generate_vuln_id("pickle_loads", file_path, node.lineno),
                            vulnerability_type=VulnerabilityType.INSECURE_DESERIALIZATION,
                            severity=SecuritySeverity.HIGH,
                            title="Insecure Deserialization",
                            description="Use of pickle.loads() can lead to code execution",
                            file_path=file_path,
                            line_number=node.lineno,
                            column_number=node.col_offset,
                            code_snippet=self.scanner._get_code_snippet(code_content, node.lineno),
                            cwe_id="CWE-502",
                            owasp_category="A08:2021 – Software and Data Integrity Failures",
                            attack_vector="Malicious serialized data",
                            impact="Remote code execution",
                            likelihood="High if processing untrusted data",
                            fix_suggestion="Use safer serialization formats like JSON",
                            explanation="pickle.loads() can execute arbitrary code during deserialization",
                            tags=["deserialization", "pickle", "rce"],
                            confidence=0.9,
                            auto_fixable=False,
                            fix_complexity="moderate",
                            compliance_impact=["PCI_DSS", "GDPR"]
                        )
                        self.vulnerabilities.append(vuln)
                    
                    # Check for eval() usage
                    elif (isinstance(node.func, ast.Name) and node.func.id == 'eval'):
                        vuln = SecurityVulnerability(
                            vulnerability_id=self.scanner._generate_vuln_id("eval_usage", file_path, node.lineno),
                            vulnerability_type=VulnerabilityType.COMMAND_INJECTION,
                            severity=SecuritySeverity.CRITICAL,
                            title="Dangerous eval() Usage",
                            description="Use of eval() can lead to code execution",
                            file_path=file_path,
                            line_number=node.lineno,
                            column_number=node.col_offset,
                            code_snippet=self.scanner._get_code_snippet(code_content, node.lineno),
                            cwe_id="CWE-95",
                            owasp_category="A03:2021 – Injection",
                            attack_vector="Code injection",
                            impact="Remote code execution",
                            likelihood="High if processing user input",
                            fix_suggestion="Avoid eval(), use ast.literal_eval() for safe evaluation",
                            explanation="eval() executes arbitrary Python code and should never be used with untrusted input",
                            tags=["eval", "code-injection", "rce"],
                            confidence=0.95,
                            auto_fixable=False,
                            fix_complexity="moderate",
                            compliance_impact=["PCI_DSS", "GDPR", "HIPAA"]
                        )
                        self.vulnerabilities.append(vuln)
                    
                    self.generic_visit(node)
            
            visitor = PythonSecurityVisitor(self)
            visitor.visit(tree)
            vulnerabilities.extend(visitor.vulnerabilities)
            
        except SyntaxError:
            # Can't parse, skip Python-specific analysis
            pass
        
        return vulnerabilities
    
    async def _scan_javascript_security(self, file_path: str, code_content: str) -> List[SecurityVulnerability]:
        """Scan JavaScript-specific security issues"""
        
        vulnerabilities = []
        
        # JavaScript security patterns
        js_patterns = [
            (r'eval\s*\(', "eval_usage", "CWE-95"),
            (r'innerHTML\s*=\s*[^;]*\+', "dom_xss", "CWE-79"),
            (r'document\.write\s*\(', "document_write", "CWE-79"),
            (r'setTimeout\s*\(["\'][^"\']*\+', "settimeout_injection", "CWE-95"),
            (r'new Function\s*\(', "function_constructor", "CWE-95"),
        ]
        
        lines = code_content.split('\n')
        
        for i, line in enumerate(lines, 1):
            for pattern, vuln_type, cwe_id in js_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    vulnerability = SecurityVulnerability(
                        vulnerability_id=self._generate_vuln_id(vuln_type, file_path, i),
                        vulnerability_type=VulnerabilityType.XSS if 'xss' in vuln_type else VulnerabilityType.COMMAND_INJECTION,
                        severity=SecuritySeverity.HIGH,
                        title="JavaScript Security Issue",
                        description=f"JavaScript security issue: {vuln_type.replace('_', ' ')}",
                        file_path=file_path,
                        line_number=i,
                        column_number=0,
                        code_snippet=line.strip(),
                        cwe_id=cwe_id,
                        owasp_category="A03:2021 – Injection",
                        attack_vector="Client-side code injection",
                        impact="Code execution or XSS",
                        likelihood="Medium to High",
                        fix_suggestion="Use safer alternatives and proper input validation",
                        explanation="Dangerous JavaScript functions can lead to code execution vulnerabilities",
                        tags=["javascript", vuln_type, "injection"],
                        confidence=0.8,
                        auto_fixable=False,
                        fix_complexity="moderate",
                        compliance_impact=["PCI_DSS", "GDPR"]
                    )
                    vulnerabilities.append(vulnerability)
        
        return vulnerabilities
    
    async def _scan_java_security(self, file_path: str, code_content: str) -> List[SecurityVulnerability]:
        """Scan Java-specific security issues"""
        
        vulnerabilities = []
        
        # Java security patterns
        java_patterns = [
            (r'Runtime\.getRuntime\(\)\.exec\(', "runtime_exec", "CWE-78"),
            (r'ObjectInputStream.*readObject\(', "deserialization", "CWE-502"),
            (r'System\.exit\(', "system_exit", "CWE-382"),
            (r'Class\.forName\(', "reflection_abuse", "CWE-470"),
        ]
        
        lines = code_content.split('\n')
        
        for i, line in enumerate(lines, 1):
            for pattern, vuln_type, cwe_id in java_patterns:
                if re.search(pattern, line):
                    vulnerability = SecurityVulnerability(
                        vulnerability_id=self._generate_vuln_id(vuln_type, file_path, i),
                        vulnerability_type=VulnerabilityType.COMMAND_INJECTION if 'exec' in vuln_type else VulnerabilityType.INSECURE_DESERIALIZATION,
                        severity=SecuritySeverity.HIGH,
                        title="Java Security Issue",
                        description=f"Java security issue: {vuln_type.replace('_', ' ')}",
                        file_path=file_path,
                        line_number=i,
                        column_number=0,
                        code_snippet=line.strip(),
                        cwe_id=cwe_id,
                        owasp_category="A03:2021 – Injection",
                        attack_vector="Various",
                        impact="Code execution or DoS",
                        likelihood="Medium",
                        fix_suggestion="Use safer alternatives and proper input validation",
                        explanation="Dangerous Java functions can lead to security vulnerabilities",
                        tags=["java", vuln_type, "security"],
                        confidence=0.8,
                        auto_fixable=False,
                        fix_complexity="moderate",
                        compliance_impact=["PCI_DSS", "GDPR"]
                    )
                    vulnerabilities.append(vulnerability)
        
        return vulnerabilities
    
    async def _scan_configuration_security(self, file_path: str, code_content: str) -> List[SecurityVulnerability]:
        """Scan configuration files for security issues"""
        
        vulnerabilities = []
        
        # Configuration security patterns
        config_patterns = [
            (r'debug\s*[:=]\s*true', "debug_enabled"),
            (r'ssl\s*[:=]\s*false', "ssl_disabled"),
            (r'verify_ssl\s*[:=]\s*false', "ssl_verification_disabled"),
            (r'password\s*[:=]\s*["\'][^"\']+["\']', "hardcoded_password"),
        ]
        
        lines = code_content.split('\n')
        
        for i, line in enumerate(lines, 1):
            for pattern, vuln_type in config_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    severity = SecuritySeverity.HIGH if 'password' in vuln_type else SecuritySeverity.MEDIUM
                    
                    vulnerability = SecurityVulnerability(
                        vulnerability_id=self._generate_vuln_id(vuln_type, file_path, i),
                        vulnerability_type=VulnerabilityType.INSECURE_CONFIGURATION,
                        severity=severity,
                        title="Insecure Configuration",
                        description=f"Insecure configuration: {vuln_type.replace('_', ' ')}",
                        file_path=file_path,
                        line_number=i,
                        column_number=0,
                        code_snippet=line.strip(),
                        cwe_id="CWE-16",
                        owasp_category="A05:2021 – Security Misconfiguration",
                        attack_vector="Configuration exploitation",
                        impact="Various security impacts",
                        likelihood="Medium",
                        fix_suggestion="Review and secure configuration settings",
                        explanation="Insecure configurations can expose the application to various attacks",
                        tags=["configuration", vuln_type, "misconfiguration"],
                        confidence=0.7,
                        auto_fixable=True,
                        fix_complexity="simple",
                        compliance_impact=["PCI_DSS", "GDPR"]
                    )
                    vulnerabilities.append(vulnerability)
        
        return vulnerabilities
    
    # Helper methods
    def _get_crypto_fix_suggestion(self, vuln_type: str) -> str:
        """Get specific fix suggestion for cryptographic issues"""
        
        suggestions = {
            "weak_hash_md5": "Use SHA-256 or SHA-3 instead of MD5",
            "weak_hash_sha1": "Use SHA-256 or SHA-3 instead of SHA-1",
            "weak_cipher_des": "Use AES instead of DES",
            "weak_cipher_rc4": "Use AES or ChaCha20 instead of RC4",
            "weak_random": "Use secrets.randbits() or os.urandom() for cryptographic randomness",
            "weak_mode_ecb": "Use CBC, GCM, or other secure modes instead of ECB",
            "weak_ssl": "Use TLS 1.2 or 1.3 instead of older SSL versions",
            "ssl_verification_disabled": "Enable SSL certificate verification"
        }
        
        return suggestions.get(vuln_type, "Use modern, secure cryptographic implementations")
    
    def _get_crypto_explanation(self, vuln_type: str) -> str:
        """Get detailed explanation for cryptographic issues"""
        
        explanations = {
            "weak_hash_md5": "MD5 is cryptographically broken and vulnerable to collision attacks",
            "weak_hash_sha1": "SHA-1 is deprecated and vulnerable to collision attacks",
            "weak_cipher_des": "DES has a small key size and is vulnerable to brute force attacks",
            "weak_cipher_rc4": "RC4 has known biases and vulnerabilities",
            "weak_random": "Standard random functions are not cryptographically secure",
            "weak_mode_ecb": "ECB mode reveals patterns in encrypted data",
            "weak_ssl": "Older SSL versions have known vulnerabilities",
            "ssl_verification_disabled": "Disabling SSL verification allows man-in-the-middle attacks"
        }
        
        return explanations.get(vuln_type, "This cryptographic implementation has known security weaknesses")
    
    def _get_code_snippet(self, code_content: str, line_number: int, context_lines: int = 2) -> str:
        """Get code snippet around a specific line"""
        
        lines = code_content.split('\n')
        start = max(0, line_number - context_lines - 1)
        end = min(len(lines), line_number + context_lines)
        
        snippet_lines = lines[start:end]
        return '\n'.join(snippet_lines)
    
    def _determine_file_type(self, file_path: str) -> str:
        """Determine file type from extension"""
        
        extension = Path(file_path).suffix.lower()
        
        type_mapping = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.java': 'java',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.json': 'json',
            '.xml': 'xml',
            '.properties': 'properties',
            '.conf': 'config',
            '.cfg': 'config'
        }
        
        return type_mapping.get(extension, 'unknown')
    
    def _generate_vuln_id(self, vuln_type: str, file_path: str, line_number: int) -> str:
        """Generate unique vulnerability ID"""
        
        content = f"{vuln_type}_{file_path}_{line_number}"
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    async def _load_vulnerability_patterns(self):
        """Load vulnerability detection patterns"""
        
        # This would load from configuration files
        # For now, patterns are implemented in the scanning methods
        pass
    
    async def _load_security_rules(self):
        """Load security scanning rules"""
        
        # This would load custom security rules
        pass
    
    async def _load_compliance_mappings(self):
        """Load compliance framework mappings"""
        
        # This would load mappings to compliance frameworks
        pass
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging for the security scanner"""
        
        logger = logging.getLogger("SecurityScanner")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
