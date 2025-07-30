"""
Financial Services Risk and Compliance Module
Comprehensive risk management and regulatory compliance for financial institutions
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import pandas as pd
import numpy as np
from decimal import Decimal
import hashlib
import uuid
import statistics

class RiskCategory(Enum):
    """Risk category types"""
    CREDIT_RISK = "credit_risk"
    MARKET_RISK = "market_risk"
    OPERATIONAL_RISK = "operational_risk"
    LIQUIDITY_RISK = "liquidity_risk"
    COMPLIANCE_RISK = "compliance_risk"
    REPUTATION_RISK = "reputation_risk"

class RiskLevel(Enum):
    """Risk severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ComplianceFramework(Enum):
    """Regulatory compliance frameworks"""
    BASEL_III = "basel_iii"
    SOX = "sarbanes_oxley"
    DODD_FRANK = "dodd_frank"
    MiFID_II = "mifid_ii"
    GDPR = "gdpr"
    AML_BSA = "aml_bsa"
    CCAR = "ccar"
    IFRS = "ifrs"

class TransactionType(Enum):
    """Financial transaction types"""
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRANSFER = "transfer"
    LOAN_DISBURSEMENT = "loan_disbursement"
    LOAN_PAYMENT = "loan_payment"
    INVESTMENT = "investment"
    TRADING = "trading"
    FEE = "fee"

@dataclass
class Customer:
    """Customer profile for risk assessment"""
    id: str
    customer_type: str  # individual, corporate, institutional
    name: str
    registration_date: datetime
    country_of_residence: str
    industry_sector: str = ""
    annual_income: Decimal = Decimal('0')
    net_worth: Decimal = Decimal('0')
    credit_score: int = 0
    risk_rating: str = "medium"  # low, medium, high, prohibited
    kyc_status: str = "pending"  # pending, verified, expired
    kyc_last_updated: Optional[datetime] = None
    aml_flags: List[str] = field(default_factory=list)
    sanctions_check_date: Optional[datetime] = None
    is_pep: bool = False  # Politically Exposed Person
    is_active: bool = True

@dataclass
class Account:
    """Financial account"""
    id: str
    customer_id: str
    account_type: str  # checking, savings, loan, investment, trading
    currency: str
    balance: Decimal
    available_balance: Decimal
    credit_limit: Decimal = Decimal('0')
    interest_rate: Decimal = Decimal('0')
    opened_date: datetime
    status: str = "active"  # active, suspended, closed
    risk_classification: str = "normal"  # normal, watch, restricted

@dataclass
class Transaction:
    """Financial transaction"""
    id: str
    account_id: str
    customer_id: str
    transaction_type: TransactionType
    amount: Decimal
    currency: str
    description: str
    transaction_date: datetime
    value_date: datetime
    counterparty_name: str = ""
    counterparty_account: str = ""
    country_of_origin: str = ""
    country_of_destination: str = ""
    reference_number: str = ""
    channel: str = "branch"  # branch, online, mobile, atm
    is_suspicious: bool = False
    aml_flags: List[str] = field(default_factory=list)
    risk_score: float = 0.0

@dataclass
class RiskEvent:
    """Risk event occurrence"""
    id: str
    event_type: str
    risk_category: RiskCategory
    risk_level: RiskLevel
    entity_id: str  # Customer, account, or transaction ID
    entity_type: str  # customer, account, transaction, system
    event_date: datetime
    description: str
    impact_amount: Decimal = Decimal('0')
    probability: float = 0.0  # 0-1
    risk_score: float = 0.0
    mitigation_actions: List[str] = field(default_factory=list)
    status: str = "open"  # open, in_progress, closed
    assigned_to: str = ""
    resolution_date: Optional[datetime] = None

@dataclass
class ComplianceRule:
    """Compliance rule definition"""
    id: str
    name: str
    framework: ComplianceFramework
    description: str
    rule_type: str  # threshold, pattern, calculation
    parameters: Dict[str, Any]
    severity: RiskLevel
    is_active: bool = True
    effective_date: datetime = field(default_factory=datetime.now)
    review_frequency_days: int = 90
    automated_check: bool = False

@dataclass
class ComplianceViolation:
    """Compliance violation occurrence"""
    id: str
    rule_id: str
    entity_id: str
    entity_type: str
    violation_date: datetime
    description: str
    severity: RiskLevel
    regulatory_framework: str
    potential_penalty: Decimal = Decimal('0')
    remediation_deadline: Optional[datetime] = None
    status: str = "open"  # open, investigating, remediated, closed
    assigned_to: str = ""

class RiskCalculationEngine:
    """Risk calculation and assessment engine"""
    
    def __init__(self):
        self.customers: List[Customer] = []
        self.accounts: List[Account] = []
        self.transactions: List[Transaction] = []
        self.risk_events: List[RiskEvent] = []
        self.compliance_rules: List[ComplianceRule] = []
        self.compliance_violations: List[ComplianceViolation] = []
        
        # Initialize default compliance rules
        self._initialize_compliance_rules()
    
    def _initialize_compliance_rules(self):
        """Initialize default compliance rules"""
        default_rules = [
            ComplianceRule(
                id="aml_001",
                name="Large Cash Transaction Reporting",
                framework=ComplianceFramework.AML_BSA,
                description="Report cash transactions over $10,000",
                rule_type="threshold",
                parameters={"threshold": 10000, "transaction_types": ["deposit", "withdrawal"]},
                severity=RiskLevel.HIGH,
                automated_check=True
            ),
            ComplianceRule(
                id="aml_002",
                name="Suspicious Activity Monitoring",
                framework=ComplianceFramework.AML_BSA,
                description="Monitor for structuring and unusual patterns",
                rule_type="pattern",
                parameters={"multiple_transactions_threshold": 5, "time_window_hours": 24},
                severity=RiskLevel.CRITICAL,
                automated_check=True
            ),
            ComplianceRule(
                id="basel_001",
                name="Capital Adequacy Ratio",
                framework=ComplianceFramework.BASEL_III,
                description="Maintain minimum capital adequacy ratio",
                rule_type="calculation",
                parameters={"minimum_ratio": 0.08, "calculation_method": "risk_weighted_assets"},
                severity=RiskLevel.CRITICAL,
                automated_check=True
            ),
            ComplianceRule(
                id="gdpr_001",
                name="Data Retention Limits",
                framework=ComplianceFramework.GDPR,
                description="Customer data retention time limits",
                rule_type="threshold",
                parameters={"retention_years": 7, "exceptions": ["legal_hold"]},
                severity=RiskLevel.MEDIUM,
                automated_check=True
            )
        ]
        
        self.compliance_rules.extend(default_rules)
    
    def calculate_credit_risk(self, customer_id: str) -> Dict[str, Any]:
        """Calculate credit risk for a customer"""
        customer = next((c for c in self.customers if c.id == customer_id), None)
        if not customer:
            return {"error": "Customer not found"}
        
        # Get customer accounts
        customer_accounts = [a for a in self.accounts if a.customer_id == customer_id]
        
        # Get recent transactions (last 90 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        recent_transactions = [
            t for t in self.transactions
            if t.customer_id == customer_id and start_date <= t.transaction_date <= end_date
        ]
        
        # Calculate risk factors
        risk_factors = {}
        
        # Credit score factor (higher score = lower risk)
        if customer.credit_score > 0:
            credit_score_factor = max(0, (850 - customer.credit_score) / 850)
            risk_factors["credit_score"] = {
                "value": customer.credit_score,
                "risk_contribution": credit_score_factor * 30,  # 30% weight
                "description": f"Credit score: {customer.credit_score}"
            }
        
        # Debt-to-income ratio
        total_credit_limits = sum([a.credit_limit for a in customer_accounts])
        if customer.annual_income > 0:
            debt_to_income = float(total_credit_limits / customer.annual_income)
            dti_risk = min(1.0, debt_to_income / 0.4)  # 40% DTI threshold
            risk_factors["debt_to_income"] = {
                "value": debt_to_income,
                "risk_contribution": dti_risk * 25,  # 25% weight
                "description": f"Debt-to-income ratio: {debt_to_income:.2%}"
            }
        
        # Account utilization
        utilization_rates = []
        for account in customer_accounts:
            if account.credit_limit > 0:
                utilization = float(account.balance / account.credit_limit)
                utilization_rates.append(utilization)
        
        if utilization_rates:
            avg_utilization = statistics.mean(utilization_rates)
            utilization_risk = min(1.0, avg_utilization / 0.9)  # 90% utilization threshold
            risk_factors["credit_utilization"] = {
                "value": avg_utilization,
                "risk_contribution": utilization_risk * 20,  # 20% weight
                "description": f"Average credit utilization: {avg_utilization:.2%}"
            }
        
        # Transaction pattern analysis
        transaction_risk = self._analyze_transaction_patterns(recent_transactions)
        risk_factors["transaction_patterns"] = {
            "value": transaction_risk,
            "risk_contribution": transaction_risk * 15,  # 15% weight
            "description": "Transaction pattern analysis"
        }
        
        # Payment history (simulated)
        payment_history_score = 0.85  # Would calculate from actual payment data
        payment_risk = (1 - payment_history_score)
        risk_factors["payment_history"] = {
            "value": payment_history_score,
            "risk_contribution": payment_risk * 10,  # 10% weight
            "description": f"Payment history score: {payment_history_score:.2%}"
        }
        
        # Calculate overall credit risk score
        total_risk_score = sum([factor["risk_contribution"] for factor in risk_factors.values()])
        normalized_risk_score = min(100, total_risk_score)
        
        # Determine risk rating
        if normalized_risk_score <= 25:
            risk_rating = "low"
        elif normalized_risk_score <= 50:
            risk_rating = "medium"
        elif normalized_risk_score <= 75:
            risk_rating = "high"
        else:
            risk_rating = "critical"
        
        return {
            "customer_id": customer_id,
            "credit_risk_score": round(normalized_risk_score, 2),
            "risk_rating": risk_rating,
            "risk_factors": risk_factors,
            "recommendations": self._generate_credit_risk_recommendations(risk_rating, risk_factors),
            "assessment_date": datetime.now()
        }
    
    def _analyze_transaction_patterns(self, transactions: List[Transaction]) -> float:
        """Analyze transaction patterns for risk indicators"""
        if not transactions:
            return 0.0
        
        risk_indicators = 0
        
        # Check for unusual transaction amounts
        amounts = [float(t.amount) for t in transactions]
        if amounts:
            avg_amount = statistics.mean(amounts)
            std_dev = statistics.stdev(amounts) if len(amounts) > 1 else 0
            
            # Look for transactions significantly above average
            for amount in amounts:
                if std_dev > 0 and amount > avg_amount + (2 * std_dev):
                    risk_indicators += 0.1
        
        # Check for high transaction frequency
        daily_counts = {}
        for transaction in transactions:
            date_key = transaction.transaction_date.strftime('%Y-%m-%d')
            daily_counts[date_key] = daily_counts.get(date_key, 0) + 1
        
        max_daily_transactions = max(daily_counts.values()) if daily_counts else 0
        if max_daily_transactions > 10:  # Threshold
            risk_indicators += 0.2
        
        # Check for international transactions
        international_count = len([t for t in transactions if t.country_of_destination and t.country_of_destination != "US"])
        international_ratio = international_count / len(transactions)
        if international_ratio > 0.3:  # >30% international
            risk_indicators += 0.1
        
        return min(1.0, risk_indicators)
    
    def _generate_credit_risk_recommendations(self, risk_rating: str, 
                                            risk_factors: Dict[str, Any]) -> List[str]:
        """Generate credit risk management recommendations"""
        recommendations = []
        
        if risk_rating in ["high", "critical"]:
            recommendations.append("Consider reducing credit limits")
            recommendations.append("Implement enhanced monitoring")
            recommendations.append("Require additional documentation for large transactions")
        
        # Specific recommendations based on risk factors
        for factor_name, factor_data in risk_factors.items():
            if factor_data["risk_contribution"] > 20:  # High contribution factor
                if factor_name == "credit_score":
                    recommendations.append("Request updated credit report")
                elif factor_name == "debt_to_income":
                    recommendations.append("Review debt consolidation options")
                elif factor_name == "credit_utilization":
                    recommendations.append("Discuss credit limit management")
                elif factor_name == "payment_history":
                    recommendations.append("Implement payment reminder system")
        
        if risk_rating == "low":
            recommendations.append("Consider offering additional products/services")
        
        return recommendations[:5]  # Limit to top 5 recommendations
    
    def calculate_market_risk(self, portfolio_id: str) -> Dict[str, Any]:
        """Calculate market risk metrics (VaR, etc.)"""
        # This would typically calculate Value at Risk (VaR) and other market risk metrics
        # For demonstration, we'll simulate market risk calculation
        
        # Simulated portfolio data
        portfolio_value = Decimal('1000000')  # $1M portfolio
        volatility = 0.15  # 15% annual volatility
        confidence_level = 0.95  # 95% confidence
        
        # Calculate 1-day VaR using parametric method
        # VaR = Portfolio Value × Volatility × Z-score × sqrt(Time)
        z_score = 1.645  # 95% confidence level
        time_horizon = 1/252  # 1 day in trading year
        
        var_1d = float(portfolio_value) * volatility * z_score * (time_horizon ** 0.5)
        
        # Calculate other risk metrics
        expected_shortfall = var_1d * 1.3  # Simplified ES calculation
        
        return {
            "portfolio_id": portfolio_id,
            "portfolio_value": float(portfolio_value),
            "value_at_risk_1d": round(var_1d, 2),
            "value_at_risk_10d": round(var_1d * (10 ** 0.5), 2),
            "expected_shortfall": round(expected_shortfall, 2),
            "volatility": volatility,
            "confidence_level": confidence_level,
            "risk_metrics": {
                "beta": 1.2,  # Market beta
                "sharpe_ratio": 0.8,  # Risk-adjusted return
                "maximum_drawdown": 0.12,  # Max historical loss
                "correlation_to_market": 0.85
            },
            "stress_test_results": self._perform_stress_tests(portfolio_value),
            "calculation_date": datetime.now()
        }
    
    def _perform_stress_tests(self, portfolio_value: Decimal) -> Dict[str, float]:
        """Perform stress testing scenarios"""
        base_value = float(portfolio_value)
        
        stress_scenarios = {
            "market_crash_2008": base_value * -0.37,  # -37% market decline
            "interest_rate_shock": base_value * -0.15,  # +300bp rate increase
            "credit_spread_widening": base_value * -0.08,  # Credit spread shock
            "currency_devaluation": base_value * -0.12,  # 20% currency decline
            "liquidity_crisis": base_value * -0.25  # Liquidity squeeze
        }
        
        return stress_scenarios
    
    def monitor_aml_compliance(self, customer_id: str = None) -> Dict[str, Any]:
        """Monitor Anti-Money Laundering compliance"""
        # Filter transactions for analysis
        if customer_id:
            transactions_to_analyze = [t for t in self.transactions if t.customer_id == customer_id]
        else:
            # Analyze last 30 days of all transactions
            cutoff_date = datetime.now() - timedelta(days=30)
            transactions_to_analyze = [
                t for t in self.transactions 
                if t.transaction_date >= cutoff_date
            ]
        
        aml_alerts = []
        suspicious_patterns = {}
        
        # Check for large cash transactions (CTR - Currency Transaction Report)
        large_cash_transactions = [
            t for t in transactions_to_analyze
            if t.transaction_type in [TransactionType.DEPOSIT, TransactionType.WITHDRAWAL] 
            and t.amount >= 10000
        ]
        
        for transaction in large_cash_transactions:
            aml_alerts.append({
                "alert_type": "CTR_Required",
                "transaction_id": transaction.id,
                "customer_id": transaction.customer_id,
                "amount": float(transaction.amount),
                "description": "Large cash transaction requires CTR filing",
                "severity": "high",
                "regulatory_requirement": "31 CFR 1010.311"
            })
        
        # Check for structuring (multiple transactions just under reporting threshold)
        self._detect_structuring_patterns(transactions_to_analyze, aml_alerts)
        
        # Check for unusual transaction patterns
        self._detect_unusual_patterns(transactions_to_analyze, aml_alerts)
        
        # Check sanctions and PEP screening
        self._check_sanctions_screening(transactions_to_analyze, aml_alerts)
        
        # Calculate risk scores
        customer_risk_scores = self._calculate_customer_aml_risk_scores(transactions_to_analyze)
        
        return {
            "analysis_period": f"Last 30 days" if not customer_id else f"Customer {customer_id}",
            "total_transactions_analyzed": len(transactions_to_analyze),
            "total_alerts": len(aml_alerts),
            "alerts_by_severity": {
                "critical": len([a for a in aml_alerts if a["severity"] == "critical"]),
                "high": len([a for a in aml_alerts if a["severity"] == "high"]),
                "medium": len([a for a in aml_alerts if a["severity"] == "medium"]),
                "low": len([a for a in aml_alerts if a["severity"] == "low"])
            },
            "aml_alerts": aml_alerts,
            "customer_risk_scores": customer_risk_scores,
            "compliance_status": self._assess_aml_compliance_status(aml_alerts),
            "recommendations": self._generate_aml_recommendations(aml_alerts)
        }
    
    def _detect_structuring_patterns(self, transactions: List[Transaction], 
                                   alerts: List[Dict[str, Any]]):
        """Detect potential structuring patterns"""
        # Group transactions by customer and day
        customer_daily_transactions = {}
        
        for transaction in transactions:
            if transaction.transaction_type in [TransactionType.DEPOSIT, TransactionType.WITHDRAWAL]:
                customer_id = transaction.customer_id
                date_key = transaction.transaction_date.strftime('%Y-%m-%d')
                key = f"{customer_id}_{date_key}"
                
                if key not in customer_daily_transactions:
                    customer_daily_transactions[key] = []
                customer_daily_transactions[key].append(transaction)
        
        # Check for multiple transactions just under $10k threshold
        for key, daily_transactions in customer_daily_transactions.items():
            if len(daily_transactions) >= 3:  # Multiple transactions in one day
                total_amount = sum([t.amount for t in daily_transactions])
                avg_amount = total_amount / len(daily_transactions)
                
                # Potential structuring if multiple transactions average just under threshold
                if 8000 <= avg_amount <= 9999 and total_amount >= 15000:
                    alerts.append({
                        "alert_type": "Potential_Structuring",
                        "customer_id": daily_transactions[0].customer_id,
                        "transaction_count": len(daily_transactions),
                        "total_amount": float(total_amount),
                        "average_amount": float(avg_amount),
                        "date": daily_transactions[0].transaction_date.strftime('%Y-%m-%d'),
                        "description": "Multiple transactions potentially structured to avoid reporting",
                        "severity": "critical",
                        "regulatory_requirement": "31 CFR 1010.314"
                    })
    
    def _detect_unusual_patterns(self, transactions: List[Transaction], 
                               alerts: List[Dict[str, Any]]):
        """Detect unusual transaction patterns"""
        # Group by customer for pattern analysis
        customer_transactions = {}
        for transaction in transactions:
            customer_id = transaction.customer_id
            if customer_id not in customer_transactions:
                customer_transactions[customer_id] = []
            customer_transactions[customer_id].append(transaction)
        
        for customer_id, customer_txns in customer_transactions.items():
            if len(customer_txns) < 5:  # Need sufficient data
                continue
            
            # Analyze transaction amounts
            amounts = [float(t.amount) for t in customer_txns]
            avg_amount = statistics.mean(amounts)
            
            # Check for transactions significantly above customer's normal pattern
            for transaction in customer_txns:
                if transaction.amount > avg_amount * 5:  # 5x above average
                    alerts.append({
                        "alert_type": "Unusual_Amount",
                        "transaction_id": transaction.id,
                        "customer_id": customer_id,
                        "amount": float(transaction.amount),
                        "customer_average": avg_amount,
                        "description": f"Transaction amount {transaction.amount} significantly above customer average {avg_amount:.2f}",
                        "severity": "medium",
                        "regulatory_requirement": "SAR Filing Consideration"
                    })
            
            # Check for rapid succession of transactions
            sorted_txns = sorted(customer_txns, key=lambda x: x.transaction_date)
            for i in range(len(sorted_txns) - 2):
                time_window = sorted_txns[i+2].transaction_date - sorted_txns[i].transaction_date
                if time_window <= timedelta(hours=1):  # 3 transactions within 1 hour
                    total_amount = sum([t.amount for t in sorted_txns[i:i+3]])
                    alerts.append({
                        "alert_type": "Rapid_Transactions",
                        "customer_id": customer_id,
                        "transaction_count": 3,
                        "total_amount": float(total_amount),
                        "time_window_minutes": time_window.total_seconds() / 60,
                        "description": "Rapid succession of transactions within short time window",
                        "severity": "medium",
                        "regulatory_requirement": "Pattern Monitoring"
                    })
    
    def _check_sanctions_screening(self, transactions: List[Transaction], 
                                 alerts: List[Dict[str, Any]]):
        """Check for sanctions and PEP screening alerts"""
        # Simulate sanctions list checking
        sanctioned_entities = ["Sanctioned Corp", "Blocked Individual", "Prohibited Bank"]
        
        for transaction in transactions:
            if transaction.counterparty_name in sanctioned_entities:
                alerts.append({
                    "alert_type": "Sanctions_Match",
                    "transaction_id": transaction.id,
                    "customer_id": transaction.customer_id,
                    "counterparty": transaction.counterparty_name,
                    "amount": float(transaction.amount),
                    "description": f"Transaction with sanctioned entity: {transaction.counterparty_name}",
                    "severity": "critical",
                    "regulatory_requirement": "OFAC Compliance"
                })
        
        # Check for PEP involvement
        pep_customers = [c.id for c in self.customers if c.is_pep]
        pep_transactions = [t for t in transactions if t.customer_id in pep_customers]
        
        for transaction in pep_transactions:
            if transaction.amount >= 50000:  # Large transactions for PEPs
                alerts.append({
                    "alert_type": "PEP_Large_Transaction",
                    "transaction_id": transaction.id,
                    "customer_id": transaction.customer_id,
                    "amount": float(transaction.amount),
                    "description": "Large transaction involving Politically Exposed Person",
                    "severity": "high",
                    "regulatory_requirement": "Enhanced Due Diligence"
                })
    
    def _calculate_customer_aml_risk_scores(self, transactions: List[Transaction]) -> Dict[str, float]:
        """Calculate AML risk scores for customers"""
        customer_scores = {}
        customer_transactions = {}
        
        # Group transactions by customer
        for transaction in transactions:
            customer_id = transaction.customer_id
            if customer_id not in customer_transactions:
                customer_transactions[customer_id] = []
            customer_transactions[customer_id].append(transaction)
        
        for customer_id, txns in customer_transactions.items():
            risk_score = 0.0
            
            # Volume factor
            total_volume = sum([t.amount for t in txns])
            if total_volume > 100000:  # High volume
                risk_score += 2.0
            elif total_volume > 50000:
                risk_score += 1.0
            
            # Frequency factor
            if len(txns) > 50:  # High frequency
                risk_score += 1.5
            elif len(txns) > 20:
                risk_score += 0.5
            
            # International transactions
            international_txns = [t for t in txns if t.country_of_destination and t.country_of_destination != "US"]
            if len(international_txns) / len(txns) > 0.3:  # >30% international
                risk_score += 1.0
            
            # Cash transactions
            cash_txns = [t for t in txns if t.transaction_type in [TransactionType.DEPOSIT, TransactionType.WITHDRAWAL]]
            if len(cash_txns) / len(txns) > 0.5:  # >50% cash
                risk_score += 1.5
            
            # Customer risk factors
            customer = next((c for c in self.customers if c.id == customer_id), None)
            if customer:
                if customer.is_pep:
                    risk_score += 2.0
                if customer.aml_flags:
                    risk_score += len(customer.aml_flags) * 0.5
                if customer.country_of_residence != "US":
                    risk_score += 0.5
            
            customer_scores[customer_id] = min(10.0, risk_score)  # Cap at 10
        
        return customer_scores
    
    def _assess_aml_compliance_status(self, alerts: List[Dict[str, Any]]) -> str:
        """Assess overall AML compliance status"""
        critical_alerts = len([a for a in alerts if a["severity"] == "critical"])
        high_alerts = len([a for a in alerts if a["severity"] == "high"])
        
        if critical_alerts > 0:
            return "Critical - Immediate Action Required"
        elif high_alerts > 5:
            return "High Risk - Enhanced Monitoring Required"
        elif len(alerts) > 10:
            return "Medium Risk - Increased Vigilance"
        else:
            return "Acceptable - Continue Standard Monitoring"
    
    def _generate_aml_recommendations(self, alerts: List[Dict[str, Any]]) -> List[str]:
        """Generate AML compliance recommendations"""
        recommendations = []
        
        critical_alerts = [a for a in alerts if a["severity"] == "critical"]
        high_alerts = [a for a in alerts if a["severity"] == "high"]
        
        if critical_alerts:
            recommendations.append("File Suspicious Activity Reports (SARs) for critical alerts immediately")
            recommendations.append("Conduct enhanced due diligence on flagged customers")
            recommendations.append("Consider account restrictions pending investigation")
        
        if high_alerts:
            recommendations.append("Investigate high-priority alerts within 24 hours")
            recommendations.append("Document investigation findings in compliance system")
        
        # Alert-specific recommendations
        alert_types = set([a["alert_type"] for a in alerts])
        
        if "Potential_Structuring" in alert_types:
            recommendations.append("Review transaction monitoring rules for structuring detection")
        
        if "Sanctions_Match" in alert_types:
            recommendations.append("Update sanctions screening lists and procedures")
        
        if "PEP_Large_Transaction" in alert_types:
            recommendations.append("Implement enhanced PEP monitoring procedures")
        
        recommendations.extend([
            "Conduct regular AML training for staff",
            "Review and update AML policies and procedures",
            "Perform quarterly compliance risk assessment"
        ])
        
        return recommendations[:8]  # Limit to top 8 recommendations
    
    def run_compliance_stress_test(self, framework: ComplianceFramework) -> Dict[str, Any]:
        """Run compliance stress testing"""
        stress_test_results = {
            "framework": framework.value,
            "test_date": datetime.now(),
            "scenarios_tested": [],
            "violations_identified": [],
            "risk_exposure": {},
            "recommendations": []
        }
        
        if framework == ComplianceFramework.BASEL_III:
            # Basel III capital adequacy stress test
            scenarios = [
                {"name": "Severe Economic Downturn", "credit_loss_rate": 0.15, "market_shock": -0.30},
                {"name": "Interest Rate Shock", "rate_increase": 0.03, "duration_risk": 0.20},
                {"name": "Liquidity Crisis", "funding_stress": 0.40, "deposit_outflow": 0.25}
            ]
            
            for scenario in scenarios:
                # Simulate stress test calculations
                capital_ratio_impact = self._simulate_capital_stress(scenario)
                stress_test_results["scenarios_tested"].append({
                    "scenario": scenario["name"],
                    "parameters": scenario,
                    "capital_ratio_post_stress": capital_ratio_impact,
                    "meets_minimum": capital_ratio_impact >= 0.08,
                    "buffer_remaining": max(0, capital_ratio_impact - 0.08)
                })
        
        elif framework == ComplianceFramework.AML_BSA:
            # AML stress test scenarios
            aml_scenarios = [
                {"name": "High Volume Period", "transaction_increase": 3.0},
                {"name": "New High-Risk Geography", "risk_country_exposure": 0.20},
                {"name": "Sanctions Update", "new_sanctions_entities": 100}
            ]
            
            for scenario in aml_scenarios:
                monitoring_capacity = self._assess_aml_monitoring_capacity(scenario)
                stress_test_results["scenarios_tested"].append({
                    "scenario": scenario["name"],
                    "parameters": scenario,
                    "monitoring_adequacy": monitoring_capacity,
                    "additional_resources_needed": monitoring_capacity < 0.80
                })
        
        # Generate overall assessment
        passing_scenarios = len([s for s in stress_test_results["scenarios_tested"] 
                               if s.get("meets_minimum", True)])
        total_scenarios = len(stress_test_results["scenarios_tested"])
        
        stress_test_results["overall_result"] = {
            "passing_scenarios": passing_scenarios,
            "total_scenarios": total_scenarios,
            "pass_rate": (passing_scenarios / total_scenarios * 100) if total_scenarios > 0 else 0,
            "overall_status": "Pass" if passing_scenarios == total_scenarios else "Fail"
        }
        
        return stress_test_results
    
    def _simulate_capital_stress(self, scenario: Dict[str, Any]) -> float:
        """Simulate capital adequacy under stress scenario"""
        # Simplified capital adequacy calculation
        base_capital_ratio = 0.12  # 12% current capital ratio
        
        # Apply stress factors
        credit_loss_impact = scenario.get("credit_loss_rate", 0) * 0.5  # Credit losses reduce capital
        market_shock_impact = abs(scenario.get("market_shock", 0)) * 0.3  # Market losses
        
        stressed_ratio = base_capital_ratio - credit_loss_impact - market_shock_impact
        return max(0, stressed_ratio)
    
    def _assess_aml_monitoring_capacity(self, scenario: Dict[str, Any]) -> float:
        """Assess AML monitoring system capacity under stress"""
        base_capacity = 0.85  # 85% current capacity utilization
        
        # Apply stress factors
        volume_stress = (scenario.get("transaction_increase", 1.0) - 1.0) * 0.5
        complexity_stress = scenario.get("risk_country_exposure", 0) * 0.3
        
        stressed_capacity = base_capacity + volume_stress + complexity_stress
        return min(1.0, stressed_capacity)
    
    def generate_risk_dashboard(self, period_days: int = 30) -> Dict[str, Any]:
        """Generate comprehensive risk management dashboard"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=period_days)
        
        # Filter data for the period
        period_transactions = [
            t for t in self.transactions
            if start_date <= t.transaction_date <= end_date
        ]
        
        period_risk_events = [
            re for re in self.risk_events
            if start_date <= re.event_date <= end_date
        ]
        
        dashboard = {
            "dashboard_date": datetime.now(),
            "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            "risk_summary": {},
            "compliance_summary": {},
            "key_metrics": {},
            "alerts": [],
            "recommendations": []
        }
        
        # Risk Summary
        risk_events_by_category = {}
        for event in period_risk_events:
            category = event.risk_category.value
            if category not in risk_events_by_category:
                risk_events_by_category[category] = []
            risk_events_by_category[category].append(event)
        
        dashboard["risk_summary"] = {
            "total_risk_events": len(period_risk_events),
            "events_by_category": {
                category: len(events) for category, events in risk_events_by_category.items()
            },
            "events_by_severity": {
                level.value: len([e for e in period_risk_events if e.risk_level == level])
                for level in RiskLevel
            },
            "total_impact_amount": float(sum([e.impact_amount for e in period_risk_events]))
        }
        
        # Compliance Summary
        aml_analysis = self.monitor_aml_compliance()
        
        dashboard["compliance_summary"] = {
            "aml_alerts": aml_analysis["total_alerts"],
            "aml_status": aml_analysis["compliance_status"],
            "critical_compliance_issues": len([a for a in aml_analysis["aml_alerts"] if a["severity"] == "critical"]),
            "transactions_monitored": aml_analysis["total_transactions_analyzed"]
        }
        
        # Key Metrics
        total_transaction_volume = sum([t.amount for t in period_transactions])
        avg_transaction_size = total_transaction_volume / len(period_transactions) if period_transactions else 0
        
        dashboard["key_metrics"] = {
            "total_transaction_volume": float(total_transaction_volume),
            "transaction_count": len(period_transactions),
            "average_transaction_size": float(avg_transaction_size),
            "risk_adjusted_return": 0.085,  # Would calculate from actual data
            "capital_adequacy_ratio": 0.12,  # 12%
            "liquidity_coverage_ratio": 1.15,  # 115%
            "operational_risk_loss": float(sum([e.impact_amount for e in period_risk_events 
                                               if e.risk_category == RiskCategory.OPERATIONAL_RISK]))
        }
        
        # Generate Alerts
        alerts = []
        
        # High-risk events
        critical_events = [e for e in period_risk_events if e.risk_level == RiskLevel.CRITICAL]
        if critical_events:
            alerts.append({
                "type": "critical_risk_events",
                "severity": "critical",
                "message": f"{len(critical_events)} critical risk events require immediate attention",
                "action": "Review and address critical risk events"
            })
        
        # AML compliance alerts
        if aml_analysis["alerts_by_severity"]["critical"] > 0:
            alerts.append({
                "type": "aml_compliance",
                "severity": "critical",
                "message": f"{aml_analysis['alerts_by_severity']['critical']} critical AML alerts",
                "action": "File SARs and conduct investigations"
            })
        
        # Capital adequacy
        if dashboard["key_metrics"]["capital_adequacy_ratio"] < 0.10:
            alerts.append({
                "type": "capital_adequacy",
                "severity": "high",
                "message": "Capital adequacy ratio below target threshold",
                "action": "Review capital planning and risk appetite"
            })
        
        dashboard["alerts"] = alerts
        
        # Generate Recommendations
        recommendations = []
        
        if len(period_risk_events) > len(period_risk_events) // 7:  # Increasing trend
            recommendations.append("Implement enhanced risk monitoring procedures")
        
        recommendations.extend(aml_analysis["recommendations"][:3])
        
        recommendations.extend([
            "Conduct quarterly risk assessment review",
            "Update risk appetite statements",
            "Enhance staff training on risk identification"
        ])
        
        dashboard["recommendations"] = recommendations[:8]
        
        return dashboard

# Example usage

async def example_financial_risk_analysis():
    """Example of financial services risk and compliance analysis"""
    
    # Initialize system
    risk_engine = RiskCalculationEngine()
    
    # Add sample customer
    customer = Customer(
        id="cust_001",
        customer_type="individual",
        name="John Doe",
        registration_date=datetime(2020, 1, 15),
        country_of_residence="US",
        annual_income=Decimal('75000'),
        credit_score=720,
        kyc_status="verified",
        kyc_last_updated=datetime.now() - timedelta(days=30)
    )
    
    risk_engine.customers.append(customer)
    
    # Add sample account
    account = Account(
        id="acc_001",
        customer_id="cust_001",
        account_type="checking",
        currency="USD",
        balance=Decimal('15000'),
        available_balance=Decimal('15000'),
        credit_limit=Decimal('5000'),
        opened_date=datetime(2020, 2, 1)
    )
    
    risk_engine.accounts.append(account)
    
    # Add sample transactions
    base_date = datetime.now() - timedelta(days=30)
    for i in range(20):
        transaction = Transaction(
            id=f"txn_{i+1:03d}",
            account_id="acc_001",
            customer_id="cust_001",
            transaction_type=TransactionType.TRANSFER,
            amount=Decimal(str(np.random.normal(2000, 500))),
            currency="USD",
            description=f"Transfer transaction {i+1}",
            transaction_date=base_date + timedelta(days=np.random.randint(0, 30)),
            value_date=base_date + timedelta(days=np.random.randint(0, 30)),
            counterparty_name=f"Counterparty {i%5 + 1}"
        )
        
        # Add some large transactions for testing
        if i in [5, 15]:
            transaction.amount = Decimal('12000')
        
        risk_engine.transactions.append(transaction)
    
    # Calculate credit risk
    credit_risk = risk_engine.calculate_credit_risk("cust_001")
    print(f"Credit risk score: {credit_risk['credit_risk_score']} ({credit_risk['risk_rating']})")
    
    # Calculate market risk
    market_risk = risk_engine.calculate_market_risk("portfolio_001")
    print(f"1-day VaR: ${market_risk['value_at_risk_1d']:,.2f}")
    
    # Monitor AML compliance
    aml_monitoring = risk_engine.monitor_aml_compliance("cust_001")
    print(f"AML alerts for customer: {aml_monitoring['total_alerts']}")
    
    # Run Basel III stress test
    stress_test = risk_engine.run_compliance_stress_test(ComplianceFramework.BASEL_III)
    print(f"Stress test result: {stress_test['overall_result']['overall_status']}")
    
    # Generate risk dashboard
    dashboard = risk_engine.generate_risk_dashboard()
    print(f"Risk dashboard generated with {len(dashboard['alerts'])} alerts")
    
    return {
        "credit_risk": credit_risk,
        "market_risk": market_risk,
        "aml_monitoring": aml_monitoring,
        "stress_test": stress_test,
        "dashboard": dashboard
    }

if __name__ == "__main__":
    asyncio.run(example_financial_risk_analysis())
