# Supported Regulations

## Overview

This document provides detailed descriptions of all regulations supported by the Frontier Compliance Knowledge Base. Each regulation includes comprehensive information about requirements, scope, penalties, and implementation guidance.

## 🏦 Financial Services Regulations

### SOX (Sarbanes-Oxley Act)
**Jurisdiction**: United States  
**Effective Date**: July 30, 2002  
**Last Updated**: March 15, 2025  
**Current Version**: 2.1

#### Overview
The Sarbanes-Oxley Act establishes requirements for all U.S. public company boards, management, and public accounting firms to ensure accurate financial reporting and prevent corporate fraud.

#### Key Requirements
- **Section 302**: CEO/CFO certification of financial reports
- **Section 404**: Management assessment of internal controls
- **Section 409**: Real-time disclosure of material changes
- **Section 802**: Criminal penalties for altering documents

#### Scope and Applicability
- **Public Companies**: All publicly traded companies in the US
- **Foreign Companies**: Foreign companies listed on US exchanges
- **Accounting Firms**: Public accounting firms auditing public companies
- **Officers**: CEOs, CFOs, and other senior financial officers

#### Implementation Requirements
```yaml
sox_compliance:
  internal_controls:
    - financial_reporting_controls
    - disclosure_controls_procedures
    - management_assessment
    - external_auditor_attestation
  
  certifications:
    quarterly_certification: "Form 10-Q Section 302"
    annual_certification: "Form 10-K Section 302"
    internal_controls_report: "Section 404 Report"
  
  documentation:
    - control_design_documentation
    - testing_procedures
    - deficiency_remediation
    - management_letters
```

#### Penalties and Enforcement
- **Civil Penalties**: Up to $5 million for individuals, $25 million for entities
- **Criminal Penalties**: Up to 20 years imprisonment
- **Officer Bars**: Prohibition from serving as officer/director
- **Whistleblower Protection**: Protection for reporting violations

#### Recent Updates
- **March 2025**: Updated guidance on cybersecurity controls
- **January 2025**: Enhanced ESG reporting requirements
- **October 2024**: AI and automated controls guidance

---

### Basel III
**Jurisdiction**: International (implemented nationally)  
**Effective Date**: January 1, 2019  
**Last Updated**: June 20, 2025  
**Current Version**: 3.2

#### Overview
Basel III is a global regulatory framework for banks addressing capital adequacy, stress testing, and market liquidity risk.

#### Key Requirements
- **Capital Ratios**: Minimum capital requirements
- **Leverage Ratio**: Non-risk-based capital measure
- **Liquidity Requirements**: LCR and NSFR ratios
- **Systemic Risk**: Additional requirements for systemically important banks

#### Capital Requirements
```yaml
basel_iii_capital:
  common_equity_tier1:
    minimum_ratio: 4.5
    conservation_buffer: 2.5
    total_requirement: 7.0
  
  tier1_capital:
    minimum_ratio: 6.0
    conservation_buffer: 2.5
    total_requirement: 8.5
  
  total_capital:
    minimum_ratio: 8.0
    conservation_buffer: 2.5
    total_requirement: 10.5
  
  leverage_ratio:
    minimum_requirement: 3.0
```

#### Liquidity Requirements
- **LCR (Liquidity Coverage Ratio)**: Minimum 100%
- **NSFR (Net Stable Funding Ratio)**: Minimum 100%
- **Additional Monitoring**: BCBS monitoring tools

#### Implementation Timeline
- **Phase 1 (2019-2022)**: Basic capital requirements
- **Phase 2 (2023-2025)**: Enhanced liquidity requirements
- **Phase 3 (2025-2027)**: Final implementation of all measures

---

### MiFID II
**Jurisdiction**: European Union  
**Effective Date**: January 3, 2018  
**Last Updated**: April 10, 2025  
**Current Version**: 2.3

#### Overview
Markets in Financial Instruments Directive II regulates investment services and activities within the EU.

#### Key Requirements
- **Best Execution**: Obligation to obtain best execution for clients
- **Client Categorization**: Retail, professional, and eligible counterparty
- **Product Governance**: Requirements for product design and distribution
- **Transaction Reporting**: Detailed transaction reporting requirements

#### Scope and Services
```yaml
mifid_ii_scope:
  investment_services:
    - reception_transmission_orders
    - execution_orders
    - dealing_own_account
    - portfolio_management
    - investment_advice
    - underwriting
    - placing_instruments
    - operation_multilateral_trading
  
  financial_instruments:
    - transferable_securities
    - money_market_instruments
    - units_collective_investment
    - options_futures_swaps
    - derivative_contracts
```

#### Conduct of Business Rules
- **Client Assessment**: Suitability and appropriateness tests
- **Information Disclosure**: Clear, fair, and not misleading
- **Conflicts of Interest**: Identification and management
- **Record Keeping**: Comprehensive record maintenance

---

## 🏥 Healthcare Regulations

### HIPAA (Health Insurance Portability and Accountability Act)
**Jurisdiction**: United States  
**Effective Date**: August 21, 1996  
**Last Updated**: May 5, 2025  
**Current Version**: 3.1

#### Overview
HIPAA establishes national standards for protecting patient health information privacy and security.

#### Key Components
- **Privacy Rule**: Standards for protecting health information
- **Security Rule**: Standards for protecting electronic health information
- **Breach Notification Rule**: Requirements for breach notification
- **Enforcement Rule**: Investigation and penalty procedures

#### Protected Health Information (PHI)
```yaml
phi_elements:
  identifiers:
    - names
    - addresses
    - birth_dates
    - telephone_numbers
    - fax_numbers
    - email_addresses
    - social_security_numbers
    - medical_record_numbers
    - health_plan_numbers
    - account_numbers
    - certificate_numbers
    - vehicle_identifiers
    - device_identifiers
    - web_urls
    - ip_addresses
    - biometric_identifiers
    - full_face_photos
    - other_unique_identifiers
```

#### Security Requirements
- **Administrative Safeguards**: Policies and procedures
- **Physical Safeguards**: Protection of physical access
- **Technical Safeguards**: Technology controls
- **Organizational Requirements**: Business associate agreements

#### Penalties
- **Tier 1**: $100-$50,000 per violation, annual max $1.5M
- **Tier 2**: $1,000-$50,000 per violation, annual max $1.5M
- **Tier 3**: $10,000-$50,000 per violation, annual max $1.5M
- **Tier 4**: $50,000 per violation, annual max $1.5M

---

### FDA 21 CFR Part 11
**Jurisdiction**: United States  
**Effective Date**: August 20, 1997  
**Last Updated**: February 28, 2025  
**Current Version**: 2.4

#### Overview
FDA regulation governing electronic records and electronic signatures in FDA-regulated industries.

#### Key Requirements
- **Electronic Record Integrity**: Accuracy, reliability, and authenticity
- **Electronic Signatures**: Legally binding electronic signatures
- **Audit Trails**: Secure, time-stamped audit trails
- **System Validation**: Validation of electronic systems

#### Electronic Record Requirements
```yaml
electronic_records:
  integrity_controls:
    - access_controls
    - audit_trails
    - data_encryption
    - backup_procedures
    - version_control
  
  validation_requirements:
    - system_validation
    - user_training
    - standard_operating_procedures
    - change_control
    - periodic_review
```

#### Electronic Signature Requirements
- **Unique Identification**: Each signature must be unique to one individual
- **Reliable Authentication**: Verified identity of the signer
- **Non-Repudiation**: Cannot deny having signed
- **Link to Record**: Signature permanently linked to the record

---

## 🔒 Data Protection Regulations

### GDPR (General Data Protection Regulation)
**Jurisdiction**: European Union  
**Effective Date**: May 25, 2018  
**Last Updated**: July 1, 2025  
**Current Version**: 2.5

#### Overview
Comprehensive data protection regulation governing processing of personal data within the EU.

#### Fundamental Principles
```yaml
gdpr_principles:
  lawfulness_fairness_transparency:
    description: "Processing must be lawful, fair, and transparent"
    
  purpose_limitation:
    description: "Data collected for specified, explicit, legitimate purposes"
    
  data_minimization:
    description: "Adequate, relevant, and limited to necessary purposes"
    
  accuracy:
    description: "Accurate and kept up to date"
    
  storage_limitation:
    description: "Kept only as long as necessary"
    
  integrity_confidentiality:
    description: "Processed securely with appropriate safeguards"
    
  accountability:
    description: "Controller responsible for demonstrating compliance"
```

#### Individual Rights
- **Right to Information**: Transparent information about processing
- **Right of Access**: Access to personal data and processing information
- **Right to Rectification**: Correction of inaccurate personal data
- **Right to Erasure**: Deletion of personal data ("right to be forgotten")
- **Right to Restrict Processing**: Limitation of processing activities
- **Right to Data Portability**: Transfer data between controllers
- **Right to Object**: Object to processing for legitimate interests
- **Rights Related to Automated Decision-Making**: Protection from automated decisions

#### Legal Bases for Processing
```yaml
legal_bases:
  consent:
    requirements: "Freely given, specific, informed, unambiguous"
    withdrawal: "Easy to withdraw consent"
    
  contract:
    description: "Necessary for contract performance"
    
  legal_obligation:
    description: "Required to comply with legal obligation"
    
  vital_interests:
    description: "Protect vital interests of data subject"
    
  public_task:
    description: "Performance of public interest task"
    
  legitimate_interests:
    description: "Legitimate interests not overridden by individual rights"
```

#### Penalties
- **Administrative Fines**: Up to €20 million or 4% of annual global turnover
- **Criminal Penalties**: Vary by member state implementation
- **Corrective Measures**: Orders to bring processing into compliance

---

### CCPA (California Consumer Privacy Act)
**Jurisdiction**: California, United States  
**Effective Date**: January 1, 2020  
**Last Updated**: June 15, 2025  
**Current Version**: 2.2

#### Overview
California state law granting consumers rights regarding their personal information.

#### Consumer Rights
```yaml
ccpa_rights:
  right_to_know:
    categories: "Categories of personal information collected"
    sources: "Sources of personal information"
    purposes: "Business purposes for collection"
    third_parties: "Third parties with whom information is shared"
    
  right_to_delete:
    scope: "Request deletion of personal information"
    exceptions: "Certain exceptions apply"
    
  right_to_opt_out:
    scope: "Opt out of sale of personal information"
    
  right_to_non_discrimination:
    protection: "Cannot discriminate for exercising rights"
```

#### Business Obligations
- **Privacy Policy Updates**: Detailed privacy policy requirements
- **Consumer Request Procedures**: Verified procedures for handling requests
- **Opt-Out Mechanisms**: "Do Not Sell My Personal Information" links
- **Training**: Employee training on privacy practices

---

## 👥 Employment Law Regulations

### FLSA (Fair Labor Standards Act)
**Jurisdiction**: United States  
**Effective Date**: June 25, 1938  
**Last Updated**: January 30, 2025  
**Current Version**: 4.1

#### Overview
Federal law establishing minimum wage, overtime pay, recordkeeping, and youth employment standards.

#### Key Requirements
```yaml
flsa_requirements:
  minimum_wage:
    federal_rate: 7.25  # USD per hour
    state_variations: "States may have higher rates"
    
  overtime_pay:
    threshold: 40  # hours per week
    rate: 1.5  # times regular rate
    
  recordkeeping:
    duration: 3  # years for payroll records
    detail_requirements: "Hours worked, wages paid, deductions"
    
  child_labor:
    minimum_age: 14  # for non-agricultural work
    restrictions: "Hours and types of work restricted"
```

#### Exemptions
- **Executive Employees**: Management duties, salary basis
- **Administrative Employees**: Office work, discretion and judgment
- **Professional Employees**: Advanced knowledge, creative work
- **Computer Employees**: Computer systems analysis, programming
- **Outside Sales Employees**: Primary duty is sales outside workplace

---

## 🌍 Environmental Regulations

### REACH (Registration, Evaluation, Authorization of Chemicals)
**Jurisdiction**: European Union  
**Effective Date**: June 1, 2007  
**Last Updated**: March 22, 2025  
**Current Version**: 3.0

#### Overview
EU regulation addressing production and use of chemical substances and their potential impacts on human health and environment.

#### Key Obligations
```yaml
reach_obligations:
  registration:
    threshold: "1 tonne per year per manufacturer/importer"
    information_requirements: "Chemical safety report for >10 tonnes"
    
  evaluation:
    substance_evaluation: "ECHA evaluation of registered substances"
    dossier_evaluation: "Check compliance of registration dossiers"
    
  authorization:
    svhc_list: "Substances of Very High Concern"
    restriction: "EU-wide restrictions on certain substances"
    
  communication:
    supply_chain: "Safety data sheets and exposure scenarios"
    articles: "SVHC information for articles"
```

#### Implementation Timeline
- **Pre-registration**: June 2008 - December 2008
- **Phase 1**: December 2010 (≥1000 tonnes/year)
- **Phase 2**: June 2013 (≥100 tonnes/year)
- **Phase 3**: June 2018 (≥1 tonne/year)

---

## 📊 Regulation Matrix

### By Industry Coverage
| Regulation | Financial | Healthcare | Technology | Manufacturing | Retail |
|------------|-----------|------------|------------|---------------|---------|
| SOX | ✅ Primary | ⚠️ If Public | ⚠️ If Public | ⚠️ If Public | ⚠️ If Public |
| Basel III | ✅ Primary | ❌ Not Applicable | ❌ Not Applicable | ❌ Not Applicable | ❌ Not Applicable |
| GDPR | ✅ Applicable | ✅ Applicable | ✅ Primary | ✅ Applicable | ✅ Primary |
| HIPAA | ⚠️ Limited | ✅ Primary | ⚠️ If Health Data | ❌ Not Applicable | ⚠️ If Health Data |
| REACH | ❌ Not Applicable | ⚠️ If Chemicals | ⚠️ If Hardware | ✅ Primary | ⚠️ If Products |

### By Jurisdiction Coverage
| Regulation | US | EU | UK | Canada | Asia-Pacific |
|------------|----|----|----| -------|--------------|
| SOX | ✅ Primary | ⚠️ US Listed | ⚠️ US Listed | ⚠️ US Listed | ⚠️ US Listed |
| GDPR | ⚠️ If EU Data | ✅ Primary | ⚠️ UK GDPR | ⚠️ If EU Data | ⚠️ If EU Data |
| CCPA | ⚠️ CA Only | ⚠️ If CA Data | ⚠️ If CA Data | ⚠️ If CA Data | ⚠️ If CA Data |

## 🔄 Update Frequency

### Real-Time Monitoring
- **Regulatory Announcements**: Immediate notification
- **Enforcement Actions**: Daily monitoring
- **Guidance Updates**: Weekly review

### Regular Updates
- **Monthly**: Comprehensive regulation review
- **Quarterly**: Impact assessment and implementation guidance
- **Annually**: Full regulation revalidation

### Change Management
- **Version Control**: All changes tracked with version numbers
- **Impact Analysis**: Assessment of changes on existing compliance programs
- **Implementation Timeline**: Phased rollout of updates
- **Training Updates**: Updated training materials for significant changes

---

*For the most current information on any regulation, please check the specific regulation document in the knowledge base or contact our legal team.*
