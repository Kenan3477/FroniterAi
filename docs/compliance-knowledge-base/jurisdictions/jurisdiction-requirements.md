# Jurisdiction-Specific Compliance Requirements

## Overview

This document provides detailed compliance requirements organized by jurisdiction, including federal, state, regional, and international requirements. Each jurisdiction section includes regulatory landscape, key agencies, compliance obligations, and cross-border considerations.

## 🇺🇸 United States

### Federal Level

#### Primary Regulatory Agencies
```yaml
federal_agencies:
  sec:
    name: "Securities and Exchange Commission"
    scope: "Securities, public companies, investment advisers"
    key_regulations: ["SOX", "Investment Advisers Act", "Securities Act"]
    
  finra:
    name: "Financial Industry Regulatory Authority"
    scope: "Broker-dealers, securities firms"
    key_regulations: ["FINRA Rules", "MSRB Rules"]
    
  cfpb:
    name: "Consumer Financial Protection Bureau"
    scope: "Consumer financial products and services"
    key_regulations: ["TILA", "RESPA", "Fair Credit Reporting Act"]
    
  fdic:
    name: "Federal Deposit Insurance Corporation"
    scope: "Banking institutions, deposit insurance"
    key_regulations: ["Federal Deposit Insurance Act", "Bank Secrecy Act"]
    
  occ:
    name: "Office of the Comptroller of the Currency"
    scope: "National banks, federal savings associations"
    key_regulations: ["National Bank Act", "Federal savings regulations"]
    
  hhs:
    name: "Department of Health and Human Services"
    scope: "Healthcare, medical devices, health information"
    key_regulations: ["HIPAA", "HITECH", "FDA regulations"]
    
  epa:
    name: "Environmental Protection Agency"
    scope: "Environmental protection, chemical safety"
    key_regulations: ["Clean Air Act", "Clean Water Act", "TSCA"]
    
  dol:
    name: "Department of Labor"
    scope: "Employment law, workplace safety"
    key_regulations: ["FLSA", "FMLA", "OSHA"]
```

#### Federal Compliance Framework
```yaml
federal_compliance:
  financial_services:
    registration_requirements:
      - sec_registration: "Investment advisers >$100M AUM"
      - state_registration: "Investment advisers <$100M AUM"
      - broker_dealer_registration: "FINRA membership required"
    
    reporting_obligations:
      - form_adv: "Annual and quarterly filings"
      - form_pf: "Private fund advisers"
      - suspicious_activity_reports: "BSA requirements"
      - currency_transaction_reports: "Transactions >$10,000"
    
    examination_frequency:
      - large_advisers: "Every 2-3 years"
      - small_advisers: "Every 5-7 years"
      - broker_dealers: "Risk-based examination cycle"
  
  healthcare:
    privacy_requirements:
      - hipaa_privacy_rule: "PHI protection standards"
      - hipaa_security_rule: "ePHI security standards"
      - breach_notification: "Notification within 60 days"
    
    reporting_obligations:
      - medicare_fraud_reporting: "Suspected fraud reports"
      - quality_reporting: "MIPS and quality measures"
      - adverse_event_reporting: "FDA adverse event reports"
  
  environmental:
    permit_requirements:
      - air_emissions: "Clean Air Act permits"
      - water_discharge: "NPDES permits"
      - waste_management: "RCRA permits"
    
    reporting_obligations:
      - toxic_release_inventory: "Annual TRI reporting"
      - chemical_reporting: "TSCA chemical data reporting"
      - spill_reporting: "Immediate notification requirements"
```

### State Level - California

#### California Regulatory Landscape
```yaml
california_compliance:
  data_privacy:
    ccpa_requirements:
      applicability:
        - annual_revenue: ">$25 million"
        - personal_info_records: ">50,000 consumers"
        - revenue_from_selling: ">50% from selling personal info"
      
      consumer_rights:
        - right_to_know: "Categories and specific pieces of info"
        - right_to_delete: "Deletion of personal information"
        - right_to_opt_out: "Sale of personal information"
        - right_to_non_discrimination: "Equal service and pricing"
      
      business_obligations:
        - privacy_policy_updates: "Detailed disclosures required"
        - consumer_request_procedures: "Verification and response"
        - employee_training: "Privacy practices training"
        - data_mapping: "Comprehensive data inventory"
    
    cpra_enhancements:
      effective_date: "January 1, 2023"
      new_rights:
        - right_to_correct: "Correction of inaccurate information"
        - right_to_limit_use: "Sensitive personal information"
      
      new_obligations:
        - data_minimization: "Proportional collection and retention"
        - risk_assessments: "High-risk processing activities"
        - contractor_agreements: "Enhanced third-party contracts"
  
  employment_law:
    wage_hour_requirements:
      minimum_wage:
        - state_rate: "$16.00/hour (2024)"
        - overtime_threshold: "8 hours/day, 40 hours/week"
        - double_time: "12+ hours/day, 8+ hours on 7th day"
      
      meal_rest_breaks:
        - meal_break: "30 minutes for 5+ hour shifts"
        - rest_break: "10 minutes per 4 hours worked"
        - premium_pay: "1 hour additional pay for violations"
    
    classification_requirements:
      - abc_test: "Independent contractor classification"
      - dynamex_ruling: "Presumption of employee status"
      - exemption_criteria: "Specific industry exemptions"
  
  environmental_regulations:
    ceqa_requirements:
      - environmental_review: "Projects with potential impact"
      - public_participation: "Community input requirements"
      - mitigation_measures: "Environmental impact reduction"
    
    carb_regulations:
      - ghg_reporting: "Greenhouse gas emissions reporting"
      - cap_and_trade: "Carbon credit trading program"
      - clean_air_standards: "Vehicle and industrial emissions"
```

### State Level - New York

#### New York Financial Services
```yaml
new_york_compliance:
  banking_regulations:
    nydfs_requirements:
      - part_500_cybersecurity: "Cybersecurity requirements"
      - part_504_investigation: "Investigation and examination"
      - virtual_currency_licensing: "BitLicense requirements"
    
    reporting_obligations:
      - annual_certification: "Cybersecurity program certification"
      - incident_reporting: "72-hour notification requirement"
      - third_party_assessments: "Vendor risk management"
  
  insurance_regulations:
    insurance_law_requirements:
      - suitability_standards: "Annuity and life insurance sales"
      - claims_handling: "Prompt payment and fair dealing"
      - market_conduct: "Consumer protection standards"
    
    reporting_requirements:
      - annual_statements: "Financial condition reports"
      - market_conduct_exams: "Periodic examinations"
      - complaint_reporting: "Consumer complaint data"
```

## 🇪🇺 European Union

### EU-Wide Regulatory Framework

#### Primary EU Institutions
```yaml
eu_institutions:
  european_commission:
    role: "Legislative proposals and enforcement"
    key_areas: ["Competition", "Data Protection", "Financial Services"]
    
  european_parliament:
    role: "Legislative approval and oversight"
    key_committees: ["ECON", "JURI", "LIBE"]
    
  council_of_eu:
    role: "Legislative approval by member states"
    configurations: ["Economic and Financial Affairs", "Justice and Home Affairs"]
    
  european_central_bank:
    role: "Monetary policy and banking supervision"
    scope: "Eurozone banks and payment systems"
    
  european_supervisory_authorities:
    eba: "European Banking Authority"
    esma: "European Securities and Markets Authority"
    eiopa: "European Insurance and Occupational Pensions Authority"
```

#### EU Compliance Framework
```yaml
eu_compliance:
  data_protection:
    gdpr_implementation:
      territorial_scope:
        - establishment_criterion: "Processing in EU establishment"
        - targeting_criterion: "Offering goods/services to EU residents"
        - monitoring_criterion: "Monitoring behavior in EU"
      
      key_obligations:
        - lawful_basis: "Six legal bases for processing"
        - data_protection_by_design: "Built-in privacy protections"
        - data_protection_impact_assessments: "High-risk processing"
        - appointment_of_dpo: "Data Protection Officer requirements"
        - breach_notification: "72-hour notification to supervisory authority"
      
      enforcement_mechanisms:
        - supervisory_authorities: "National data protection authorities"
        - consistency_mechanism: "Cooperation between authorities"
        - one_stop_shop: "Lead supervisory authority"
        - administrative_fines: "Up to 4% of annual global turnover"
  
  financial_services:
    mifid_ii_requirements:
      scope:
        - investment_firms: "Authorization and conduct requirements"
        - trading_venues: "Market operation and transparency"
        - third_country_firms: "Equivalence and branch requirements"
      
      conduct_obligations:
        - client_categorization: "Retail, professional, eligible counterparty"
        - best_execution: "Best possible result for clients"
        - conflicts_of_interest: "Identification and management"
        - product_governance: "Target market identification"
      
      transparency_requirements:
        - pre_trade_transparency: "Quote and order disclosure"
        - post_trade_transparency: "Transaction reporting"
        - market_data_costs: "Reasonable commercial basis"
    
    psd2_requirements:
      scope:
        - payment_service_providers: "Authorization and supervision"
        - account_information_services: "Third-party access to accounts"
        - payment_initiation_services: "Direct payment initiation"
      
      security_requirements:
        - strong_customer_authentication: "Multi-factor authentication"
        - secure_communication: "Common and secure protocols"
        - incident_reporting: "Operational and security incidents"
  
  environmental_regulations:
    reach_compliance:
      registration_obligations:
        - substance_identification: "Chemical identity and properties"
        - tonnage_thresholds: "1, 10, 100, 1000 tonnes per year"
        - safety_assessments: "Chemical safety reports"
      
      evaluation_process:
        - dossier_evaluation: "Registration completeness check"
        - substance_evaluation: "Risk assessment priorities"
        - restriction_proposals: "EU-wide use restrictions"
      
      authorization_system:
        - svhc_identification: "Substances of Very High Concern"
        - candidate_list: "Public list of SVHC substances"
        - authorization_applications: "Continued use applications"
```

### Member State Implementation - Germany

#### German Compliance Framework
```yaml
germany_compliance:
  data_protection:
    bdsg_requirements:
      - federal_data_protection_act: "National implementation of GDPR"
      - video_surveillance: "Specific rules for video monitoring"
      - employee_data_protection: "Workplace privacy protections"
    
    supervisory_authority:
      - federal_commissioner: "BfDI - Federal level oversight"
      - state_authorities: "Länder-level supervision"
      - competence_allocation: "Federal vs. state jurisdiction"
  
  financial_services:
    bafin_supervision:
      - banking_supervision: "Credit institutions and financial services"
      - insurance_supervision: "Insurance companies and pension funds"
      - securities_supervision: "Investment firms and market conduct"
    
    regulatory_requirements:
      - kwg_compliance: "German Banking Act requirements"
      - wphg_compliance: "Securities Trading Act requirements"
      - vag_compliance: "German Insurance Supervision Act"
  
  employment_law:
    works_councils:
      - establishment_thresholds: "5+ employees for election rights"
      - codetermination_rights: "Participation in workplace decisions"
      - information_consultation: "Mandatory consultation processes"
    
    data_protection_workplace:
      - employee_monitoring: "Strict limitations on surveillance"
      - recruitment_screening: "Limited background check rights"
      - performance_evaluation: "Data protection in HR processes"
```

### Member State Implementation - France

#### French Compliance Framework
```yaml
france_compliance:
  data_protection:
    cnil_oversight:
      - enforcement_powers: "Investigation and sanction authority"
      - certification_schemes: "Data protection certification programs"
      - codes_of_conduct: "Industry-specific guidance"
    
    french_specificities:
      - right_to_be_forgotten: "Enhanced deletion rights"
      - health_data_protection: "Special rules for health information"
      - biometric_data: "Strict authorization requirements"
  
  financial_services:
    acpr_supervision:
      - prudential_supervision: "Banks and insurance companies"
      - conduct_supervision: "Consumer protection and market conduct"
      - fintech_regulation: "Innovation and regulatory sandbox"
    
    amf_oversight:
      - market_supervision: "Securities markets and investment services"
      - asset_management: "UCITS and alternative investment funds"
      - market_abuse: "Insider trading and market manipulation"
  
  employment_law:
    social_dialogue:
      - collective_bargaining: "Industry and company-level agreements"
      - works_committees: "Employee representation requirements"
      - trade_union_rights: "Union recognition and activity protection"
```

## 🇬🇧 United Kingdom

### Post-Brexit Regulatory Framework

#### UK Regulatory Architecture
```yaml
uk_post_brexit:
  financial_services:
    regulatory_authorities:
      pra: "Prudential Regulation Authority - Banking supervision"
      fca: "Financial Conduct Authority - Conduct supervision"
      boe: "Bank of England - Monetary policy and systemic risk"
    
    regulatory_framework:
      - uk_mifir: "UK Markets in Financial Instruments Regulation"
      - uk_benchmark_regulation: "Financial benchmarks oversight"
      - uk_central_counterparties: "CCP supervision and recovery"
    
    equivalence_regimes:
      - eu_equivalence: "Ongoing negotiations for market access"
      - third_country_regimes: "Enhanced equivalence frameworks"
      - mutual_recognition: "Bilateral agreements with key jurisdictions"
  
  data_protection:
    uk_gdpr:
      - territorial_scope: "Processing in UK or targeting UK residents"
      - adequacy_decision: "EU adequacy decision for data transfers"
      - international_transfers: "Transfer mechanisms post-Brexit"
    
    ico_enforcement:
      - investigation_powers: "Enhanced investigation capabilities"
      - monetary_penalties: "Administrative fines up to 4% of turnover"
      - enforcement_notices: "Compliance orders and undertakings"
    
    sector_specific_rules:
      - telecommunications: "PECR - Privacy and Electronic Communications"
      - law_enforcement: "DPA 2018 Part 3 - Law enforcement processing"
      - intelligence_services: "DPA 2018 Part 4 - Intelligence services"
  
  employment_law:
    post_brexit_changes:
      - retained_eu_law: "REUL Act 2023 - Sunset of retained EU law"
      - working_time_regulations: "48-hour weekly working time limit"
      - employment_rights: "Transfer of Undertakings (TUPE) regulations"
    
    emerging_requirements:
      - ir35_rules: "Off-payroll working regulations"
      - apprenticeship_levy: "Skills development funding requirements"
      - modern_slavery_reporting: "Transparency in supply chains"
```

## 🇨🇦 Canada

### Federal and Provincial Framework

#### Canadian Regulatory Structure
```yaml
canada_compliance:
  federal_level:
    financial_services:
      osfi: "Office of the Superintendent of Financial Institutions"
      bank_act: "Federal banking regulation and supervision"
      insurance_companies_act: "Federal insurance company regulation"
    
    privacy_protection:
      pipeda: "Personal Information Protection and Electronic Documents Act"
      privacy_commissioner: "Federal privacy oversight and enforcement"
      privacy_breach_notification: "Mandatory breach notification requirements"
    
    employment_standards:
      canada_labour_code: "Federal employment standards"
      employment_equity_act: "Workplace diversity and inclusion"
      official_languages_act: "Bilingual service requirements"
  
  provincial_level:
    ontario_requirements:
      - ontario_securities_act: "Provincial securities regulation"
      - personal_health_information_act: "Healthcare privacy protection"
      - employment_standards_act: "Provincial employment law"
    
    quebec_requirements:
      - act_respecting_protection_personal_information: "Quebec privacy law"
      - securities_act_quebec: "AMF oversight and regulation"
      - charter_french_language: "French language requirements"
    
    british_columbia_requirements:
      - personal_information_protection_act: "BC privacy legislation"
      - securities_act_bc: "BCSC oversight and regulation"
      - employment_standards_act_bc: "Provincial employment standards"
  
  cross_jurisdictional:
    securities_regulation:
      - csa_national_instruments: "Harmonized securities rules"
      - passport_system: "Coordinated regulatory review"
      - mutual_reliance_review_system: "Streamlined approval process"
    
    privacy_coordination:
      - federal_provincial_coordination: "Jurisdictional cooperation"
      - substantially_similar_legislation: "Provincial privacy law recognition"
      - cross_border_investigations: "Multi-jurisdictional enforcement"
```

## 🌏 Asia-Pacific Region

### Singapore

#### Singapore Regulatory Framework
```yaml
singapore_compliance:
  financial_services:
    mas_supervision:
      - banking_act: "Banking institution supervision"
      - securities_futures_act: "Capital markets regulation"
      - insurance_act: "Insurance industry oversight"
    
    fintech_regulation:
      - regulatory_sandbox: "Innovation-friendly testing environment"
      - payment_services_act: "Digital payment regulation"
      - variable_capital_companies: "Fund structuring vehicle"
  
  data_protection:
    pdpa_requirements:
      - consent_obligation: "Individual consent for data processing"
      - notification_obligation: "Purpose limitation and notification"
      - access_correction_obligation: "Individual access and correction rights"
      - protection_obligation: "Reasonable security arrangements"
    
    enforcement_mechanisms:
      - pdpc_oversight: "Personal Data Protection Commission"
      - financial_penalties: "Up to S$1 million for organizations"
      - directions_and_undertakings: "Compliance orders and commitments"
  
  employment_law:
    employment_act:
      - work_hours: "44 hours per week maximum"
      - overtime_compensation: "1.5x pay for overtime work"
      - annual_leave: "Minimum 7 days paid annual leave"
    
    foreign_worker_requirements:
      - work_permit_system: "Various pass categories"
      - dependency_ratio_ceiling: "Limits on foreign worker ratios"
      - skills_development_levy: "Training and development contributions"
```

### Hong Kong

#### Hong Kong Regulatory Framework
```yaml
hong_kong_compliance:
  financial_services:
    sfc_regulation:
      - securities_futures_ordinance: "Securities and derivatives markets"
      - collective_investment_schemes: "Fund management and distribution"
      - corporate_finance: "IPO and corporate transaction oversight"
    
    hkma_oversight:
      - banking_ordinance: "Banking institution supervision"
      - payment_systems_oversight: "Payment and settlement systems"
      - technology_risk_management: "Digital banking and fintech"
  
  data_protection:
    personal_data_ordinance:
      - data_protection_principles: "Six data protection principles"
      - data_access_requests: "Individual access to personal data"
      - direct_marketing_regulation: "Opt-out requirements for marketing"
    
    privacy_commissioner_oversight:
      - investigation_powers: "Complaint investigation and resolution"
      - enforcement_notices: "Enforcement and correction directions"
      - guidance_notes: "Sector-specific privacy guidance"
  
  employment_law:
    employment_ordinance:
      - continuous_contract: "4+ weeks employment protection"
      - statutory_holidays: "12 statutory holidays per year"
      - severance_payment: "Redundancy compensation requirements"
```

## 🌏 Compliance Coordination

### Cross-Border Considerations

#### Multi-Jurisdictional Compliance Strategy
```yaml
cross_border_compliance:
  jurisdiction_mapping:
    data_flows:
      - source_jurisdiction: "Where data originates"
      - transit_jurisdictions: "Countries through which data passes"
      - destination_jurisdiction: "Where data is ultimately processed"
    
    regulatory_overlap:
      - primary_regulator: "Lead regulatory authority"
      - secondary_regulators: "Additional regulatory oversight"
      - conflict_resolution: "Regulatory coordination mechanisms"
  
  compliance_frameworks:
    risk_based_approach:
      - jurisdiction_risk_assessment: "Regulatory and enforcement risk"
      - business_impact_analysis: "Operational and commercial impact"
      - compliance_cost_benefit: "Resource allocation optimization"
    
    harmonization_opportunities:
      - international_standards: "ISO, NIST, COSO frameworks"
      - mutual_recognition_agreements: "Bilateral regulatory recognition"
      - multilateral_cooperation: "IOSCO, Basel Committee coordination"
  
  operational_considerations:
    local_presence_requirements:
      - regulatory_representation: "Local regulatory contact requirements"
      - data_localization: "In-country data processing requirements"
      - local_staffing: "Qualified person and key function requirements"
    
    reporting_coordination:
      - consolidated_reporting: "Group-level regulatory reporting"
      - parallel_reporting: "Multiple jurisdiction requirements"
      - regulatory_communication: "Coordinated regulatory engagement"
```

### Emerging Jurisdictions

#### Digital Economy Regulations
```yaml
emerging_regulations:
  digital_services_act:
    jurisdiction: "European Union"
    scope: "Digital services and online platforms"
    key_requirements:
      - due_diligence_obligations: "Risk assessment and mitigation"
      - transparency_reporting: "Content moderation transparency"
      - crisis_response_mechanisms: "Emergency response procedures"
  
  china_cybersecurity_law:
    jurisdiction: "People's Republic of China"
    scope: "Network operators and critical information infrastructure"
    key_requirements:
      - data_localization: "Critical information infrastructure data"
      - cybersecurity_review: "Network products and services review"
      - personal_information_protection: "Individual privacy rights"
  
  india_data_protection_bill:
    jurisdiction: "Republic of India"
    scope: "Processing of personal data"
    key_requirements:
      - data_fiduciary_obligations: "Data protection and security"
      - cross_border_transfers: "Restricted transfer mechanisms"
      - data_protection_authority: "Central oversight and enforcement"
```

---

*This document is updated regularly to reflect changes in jurisdictional requirements. For the most current information, please refer to the specific regulatory authority websites and consult with local legal counsel.*
