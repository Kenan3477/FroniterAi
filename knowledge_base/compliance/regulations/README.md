# Regulations Database

## Overview

Comprehensive database of regulatory requirements across multiple jurisdictions and industries. Each regulation entry includes detailed compliance requirements, implementation guidelines, and assessment criteria.

## Database Structure

### Regulation Entry Format
```json
{
  "regulation_id": "GDPR_2016_679",
  "name": "General Data Protection Regulation",
  "short_name": "GDPR",
  "jurisdiction": "EU",
  "status": "active",
  "effective_date": "2018-05-25",
  "last_updated": "2023-12-15",
  "version": "2.1",
  "authority": "European Commission",
  "scope": ["data_protection", "privacy"],
  "industries": ["all"],
  "penalties": {
    "administrative_fines": "Up to €20 million or 4% of annual turnover",
    "criminal_sanctions": "Varies by member state"
  },
  "compliance_requirements": [...],
  "implementation_timeline": {...},
  "assessment_criteria": [...]
}
```

## Major Regulations

### Data Protection & Privacy

#### GDPR - General Data Protection Regulation (EU)
- **Jurisdiction**: European Union
- **Effective**: May 25, 2018
- **Scope**: Personal data processing
- **Key Requirements**:
  - Lawful basis for processing
  - Data subject rights (access, rectification, erasure)
  - Privacy by design and default
  - Data Protection Impact Assessments (DPIA)
  - Breach notification (72 hours to authority, 30 days to subjects)
  - Data Protection Officer (DPO) appointment
- **Penalties**: Up to €20M or 4% annual turnover
- **Assessment Framework**: [GDPR Assessment](../risk_assessment/gdpr_assessment.md)

#### CCPA - California Consumer Privacy Act (USA)
- **Jurisdiction**: California, USA
- **Effective**: January 1, 2020
- **Scope**: Personal information of California residents
- **Key Requirements**:
  - Consumer rights (know, delete, opt-out, non-discrimination)
  - Privacy policy requirements
  - Data inventory and mapping
  - Third-party data sharing disclosures
- **Penalties**: Up to $7,500 per intentional violation
- **Assessment Framework**: [CCPA Assessment](../risk_assessment/ccpa_assessment.md)

#### PIPEDA - Personal Information Protection and Electronic Documents Act (Canada)
- **Jurisdiction**: Canada (federal)
- **Effective**: January 1, 2001
- **Scope**: Personal information in commercial activities
- **Key Requirements**:
  - Consent for collection, use, disclosure
  - Purpose limitation
  - Accuracy and retention limits
  - Safeguards and accountability
- **Penalties**: Up to CAD $100,000
- **Assessment Framework**: [PIPEDA Assessment](../risk_assessment/pipeda_assessment.md)

### Financial Services

#### SOX - Sarbanes-Oxley Act (USA)
- **Jurisdiction**: United States
- **Effective**: July 30, 2002
- **Scope**: Public companies and their auditors
- **Key Requirements**:
  - Section 302: CEO/CFO certification
  - Section 404: Internal controls assessment
  - Section 409: Real-time disclosure
  - Auditor independence
- **Penalties**: Up to $5M fine and 20 years imprisonment
- **Assessment Framework**: [SOX Assessment](../risk_assessment/sox_assessment.md)

#### MiFID II - Markets in Financial Instruments Directive II (EU)
- **Jurisdiction**: European Union
- **Effective**: January 3, 2018
- **Scope**: Investment firms and trading venues
- **Key Requirements**:
  - Best execution
  - Client categorization and protection
  - Product governance
  - Transaction reporting
  - Research unbundling
- **Penalties**: Up to €5M or 10% of annual turnover
- **Assessment Framework**: [MiFID II Assessment](../risk_assessment/mifid2_assessment.md)

#### Basel III (Global)
- **Jurisdiction**: Global (implemented locally)
- **Effective**: Phased implementation 2013-2028
- **Scope**: Banking institutions
- **Key Requirements**:
  - Capital adequacy ratios
  - Leverage ratio
  - Liquidity coverage ratio
  - Net stable funding ratio
- **Assessment Framework**: [Basel III Assessment](../risk_assessment/basel3_assessment.md)

### Healthcare

#### HIPAA - Health Insurance Portability and Accountability Act (USA)
- **Jurisdiction**: United States
- **Effective**: April 14, 2003 (Privacy Rule)
- **Scope**: Covered entities and business associates
- **Key Requirements**:
  - Privacy Rule: PHI protection
  - Security Rule: ePHI safeguards
  - Breach Notification Rule
  - Business Associate Agreements
- **Penalties**: Up to $1.8M per incident
- **Assessment Framework**: [HIPAA Assessment](../risk_assessment/hipaa_assessment.md)

#### FDA 21 CFR Part 11 (USA)
- **Jurisdiction**: United States
- **Effective**: August 20, 1997
- **Scope**: Electronic records and signatures in FDA-regulated industries
- **Key Requirements**:
  - Electronic record integrity
  - Electronic signature authenticity
  - Audit trails
  - System validation
- **Assessment Framework**: [21 CFR Part 11 Assessment](../risk_assessment/fda_part11_assessment.md)

### Industry Standards

#### ISO 27001 - Information Security Management
- **Jurisdiction**: International
- **Current Version**: 2022
- **Scope**: Information security management systems
- **Key Requirements**:
  - ISMS establishment and maintenance
  - Risk assessment and treatment
  - Statement of Applicability
  - Management review and improvement
- **Assessment Framework**: [ISO 27001 Assessment](../risk_assessment/iso27001_assessment.md)

#### SOC 2 - Service Organization Control 2
- **Jurisdiction**: United States (widely adopted)
- **Framework**: AICPA Trust Services Criteria
- **Scope**: Service organizations
- **Key Requirements**:
  - Security (required)
  - Availability (optional)
  - Processing Integrity (optional)
  - Confidentiality (optional)
  - Privacy (optional)
- **Assessment Framework**: [SOC 2 Assessment](../risk_assessment/soc2_assessment.md)

## Regulation Categories

### By Compliance Type
- **Data Protection**: GDPR, CCPA, PIPEDA, DPA 2018
- **Financial Reporting**: SOX, IFRS, GAAP
- **Financial Services**: MiFID II, Dodd-Frank, Basel III
- **Healthcare**: HIPAA, FDA regulations, MDR
- **Cybersecurity**: NIS2, NIST Cybersecurity Framework
- **Industry Standards**: ISO 27001, SOC 2, PCI DSS

### By Industry
- **Banking**: Basel III, PCI DSS, AML regulations
- **Healthcare**: HIPAA, FDA 21 CFR Part 11, MDR
- **Technology**: GDPR, CCPA, SOC 2, ISO 27001
- **Manufacturing**: ISO standards, OSHA, environmental regulations
- **Retail**: PCI DSS, consumer protection laws

### By Jurisdiction
- **European Union**: GDPR, MiFID II, NIS2, AI Act
- **United States**: SOX, HIPAA, CCPA, Dodd-Frank
- **Canada**: PIPEDA, OSFI regulations
- **Asia-Pacific**: PDPA (Singapore), Privacy Act (Australia)

## Compliance Requirements Matrix

| Regulation | Data Protection | Financial Controls | Security | Reporting | Audit |
|------------|-----------------|-------------------|----------|-----------|-------|
| GDPR | ✓✓✓ | - | ✓✓ | ✓ | ✓✓ |
| SOX | - | ✓✓✓ | ✓ | ✓✓✓ | ✓✓✓ |
| HIPAA | ✓✓✓ | - | ✓✓✓ | ✓✓ | ✓✓ |
| ISO 27001 | ✓✓ | ✓ | ✓✓✓ | ✓✓ | ✓✓✓ |
| MiFID II | ✓ | ✓✓✓ | ✓ | ✓✓✓ | ✓✓ |

Legend: ✓ = Required, ✓✓ = Significant, ✓✓✓ = Critical

## Update Schedule

### Regular Reviews
- **Monthly**: New regulation tracking
- **Quarterly**: Comprehensive regulation updates
- **Annually**: Full database review and validation

### Update Sources
- Regulatory body announcements
- Legal database subscriptions
- Industry publication monitoring
- Expert consultation networks

## Search and Filtering

### Search Criteria
- Regulation name or ID
- Jurisdiction
- Industry sector
- Compliance type
- Effective date range
- Penalty severity
- Implementation complexity

### API Access
```python
# Search by multiple criteria
results = kb.search_regulations(
    jurisdiction=["EU", "USA"],
    industry="financial_services",
    compliance_type="data_protection",
    status="active"
)

# Get specific regulation
regulation = kb.get_regulation("GDPR_2016_679")

# Get related regulations
related = kb.get_related_regulations("GDPR_2016_679")
```

## Integration Points

- **Risk Assessment Module**: Automated compliance scoring
- **Policy Management**: Template generation
- **Workflow Engine**: Process automation
- **Update Monitor**: Change detection and notification
- **Audit System**: Compliance tracking and reporting

---

*For detailed regulation information, see individual regulation files in the regulations/ directory.*
