# Integration Guide

## Overview

This comprehensive integration guide provides step-by-step instructions for integrating the Business Operations module with external systems, platforms, and workflows. It covers authentication, data synchronization, API integration patterns, and best practices for seamless enterprise integration.

## Authentication & Authorization

### API Key Authentication

The simplest authentication method for getting started:

```python
import requests

# Basic API key authentication
headers = {
    'Authorization': 'Bearer your-api-key-here',
    'Content-Type': 'application/json'
}

response = requests.post(
    'https://api.frontier.ai/v1/business-operations/financial-analysis/analyze-company',
    headers=headers,
    json=your_data
)
```

### OAuth 2.0 Integration

For enterprise applications requiring secure user authentication:

```python
from authlib.integrations.requests_client import OAuth2Session

# OAuth 2.0 setup
client_id = 'your-client-id'
client_secret = 'your-client-secret'
authorization_url = 'https://auth.frontier.ai/oauth/authorize'
token_url = 'https://auth.frontier.ai/oauth/token'

# Create OAuth session
oauth = OAuth2Session(client_id, client_secret)

# Get authorization URL
authorization_url, state = oauth.authorization_url(authorization_url)
print(f'Please go to {authorization_url} and authorize access.')

# After user authorization, get the authorization code
authorization_code = input('Enter the authorization code: ')

# Exchange code for access token
token = oauth.fetch_token(
    token_url,
    authorization_response=authorization_code
)

# Use token for API calls
response = oauth.get('https://api.frontier.ai/v1/business-operations/profile')
```

### JWT Token Management

For applications requiring token refresh and management:

```python
import jwt
import time
from datetime import datetime, timedelta

class TokenManager:
    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None
    
    def authenticate(self):
        """Initial authentication"""
        response = requests.post('https://auth.frontier.ai/oauth/token', {
            'grant_type': 'client_credentials',
            'client_id': self.client_id,
            'client_secret': self.client_secret
        })
        
        token_data = response.json()
        self.access_token = token_data['access_token']
        self.refresh_token = token_data.get('refresh_token')
        self.token_expires_at = datetime.now() + timedelta(seconds=token_data['expires_in'])
    
    def get_valid_token(self):
        """Get valid access token, refreshing if necessary"""
        if not self.access_token or datetime.now() >= self.token_expires_at:
            if self.refresh_token:
                self.refresh_access_token()
            else:
                self.authenticate()
        
        return self.access_token
    
    def refresh_access_token(self):
        """Refresh access token using refresh token"""
        response = requests.post('https://auth.frontier.ai/oauth/token', {
            'grant_type': 'refresh_token',
            'refresh_token': self.refresh_token,
            'client_id': self.client_id,
            'client_secret': self.client_secret
        })
        
        token_data = response.json()
        self.access_token = token_data['access_token']
        self.token_expires_at = datetime.now() + timedelta(seconds=token_data['expires_in'])

# Usage
token_manager = TokenManager('your-client-id', 'your-client-secret')
token_manager.authenticate()

# Make authenticated requests
headers = {
    'Authorization': f'Bearer {token_manager.get_valid_token()}',
    'Content-Type': 'application/json'
}
```

## Enterprise System Integration

### ERP System Integration

#### SAP Integration

```python
import asyncio
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class SAPFinancialData:
    company_code: str
    fiscal_year: str
    period: str
    gl_account: str
    amount: float
    currency: str
    document_date: str

class SAPIntegration:
    def __init__(self, sap_config: Dict[str, Any], frontier_client):
        self.sap_config = sap_config
        self.frontier_client = frontier_client
        self.sap_session = None
    
    async def connect_to_sap(self):
        """Establish connection to SAP system"""
        try:
            # SAP RFC connection setup
            import pyrfc
            
            self.sap_session = pyrfc.Connection(
                user=self.sap_config['username'],
                passwd=self.sap_config['password'],
                ashost=self.sap_config['host'],
                sysnr=self.sap_config['system_number'],
                client=self.sap_config['client']
            )
            
            print("✅ SAP connection established")
            return True
            
        except Exception as e:
            print(f"❌ SAP connection failed: {str(e)}")
            return False
    
    async def extract_financial_data(self, company_code: str, fiscal_year: str) -> List[SAPFinancialData]:
        """Extract financial data from SAP"""
        try:
            # Call SAP RFC function to get financial data
            result = self.sap_session.call('RFC_READ_TABLE', 
                                         QUERY_TABLE='BKPF',  # Financial document header
                                         DELIMITER='|',
                                         FIELDS=[
                                             {'FIELDNAME': 'BUKRS'},  # Company code
                                             {'FIELDNAME': 'GJAHR'},  # Fiscal year
                                             {'FIELDNAME': 'MONAT'},  # Period
                                             {'FIELDNAME': 'BLDAT'},  # Document date
                                             {'FIELDNAME': 'WAERS'}   # Currency
                                         ],
                                         OPTIONS=[
                                             {'TEXT': f"BUKRS = '{company_code}'"},
                                             {'TEXT': f"GJAHR = '{fiscal_year}'"}
                                         ])
            
            financial_data = []
            for row in result['DATA']:
                fields = row['WA'].split('|')
                financial_data.append(SAPFinancialData(
                    company_code=fields[0],
                    fiscal_year=fields[1],
                    period=fields[2],
                    document_date=fields[3],
                    currency=fields[4],
                    gl_account='',  # Get from detail table
                    amount=0.0     # Get from detail table
                ))
            
            return financial_data
            
        except Exception as e:
            print(f"❌ SAP data extraction failed: {str(e)}")
            return []
    
    async def transform_sap_data(self, sap_data: List[SAPFinancialData]) -> Dict[str, Any]:
        """Transform SAP data to Frontier format"""
        # Aggregate data by company and period
        aggregated_data = {}
        
        for record in sap_data:
            key = f"{record.company_code}_{record.fiscal_year}_{record.period}"
            if key not in aggregated_data:
                aggregated_data[key] = {
                    'company_code': record.company_code,
                    'fiscal_year': record.fiscal_year,
                    'period': record.period,
                    'currency': record.currency,
                    'total_revenue': 0.0,
                    'total_expenses': 0.0,
                    'assets': 0.0,
                    'liabilities': 0.0
                }
            
            # Map GL accounts to financial statement categories
            if record.gl_account.startswith('4'):  # Revenue accounts
                aggregated_data[key]['total_revenue'] += record.amount
            elif record.gl_account.startswith('6'):  # Expense accounts
                aggregated_data[key]['total_expenses'] += record.amount
            # Add more mappings as needed
        
        return aggregated_data
    
    async def sync_to_frontier(self, transformed_data: Dict[str, Any]):
        """Synchronize transformed data to Frontier"""
        for key, data in transformed_data.items():
            frontier_data = {
                'company_name': f"Company_{data['company_code']}",
                'financial_statements': {
                    'income_statement': {
                        'revenue': data['total_revenue'],
                        'total_expenses': data['total_expenses'],
                        'net_income': data['total_revenue'] - data['total_expenses']
                    },
                    'balance_sheet': {
                        'total_assets': data['assets'],
                        'total_liabilities': data['liabilities'],
                        'shareholders_equity': data['assets'] - data['liabilities']
                    }
                },
                'reporting_period': {
                    'year': data['fiscal_year'],
                    'period': data['period']
                }
            }
            
            # Send to Frontier for analysis
            try:
                analysis_result = await self.frontier_client.financial_analysis.analyze_company(frontier_data)
                print(f"✅ Analysis completed for {key}: Score {analysis_result['financial_health_score']}")
                
            except Exception as e:
                print(f"❌ Frontier analysis failed for {key}: {str(e)}")

# Usage example
async def run_sap_integration():
    sap_config = {
        'username': 'sap_user',
        'password': 'sap_password',
        'host': 'sap-server.company.com',
        'system_number': '00',
        'client': '100'
    }
    
    sap_integration = SAPIntegration(sap_config, frontier_client)
    
    if await sap_integration.connect_to_sap():
        sap_data = await sap_integration.extract_financial_data('1000', '2024')
        transformed_data = await sap_integration.transform_sap_data(sap_data)
        await sap_integration.sync_to_frontier(transformed_data)

# Run the integration
# asyncio.run(run_sap_integration())
```

#### Oracle ERP Integration

```python
import cx_Oracle
from contextlib import asynccontextmanager

class OracleERPIntegration:
    def __init__(self, oracle_config: Dict[str, Any], frontier_client):
        self.oracle_config = oracle_config
        self.frontier_client = frontier_client
    
    @asynccontextmanager
    async def oracle_connection(self):
        """Context manager for Oracle database connection"""
        connection = None
        try:
            # Create Oracle connection
            dsn = cx_Oracle.makedsn(
                self.oracle_config['host'],
                self.oracle_config['port'],
                service_name=self.oracle_config['service_name']
            )
            
            connection = cx_Oracle.connect(
                self.oracle_config['username'],
                self.oracle_config['password'],
                dsn
            )
            
            yield connection
            
        except Exception as e:
            print(f"❌ Oracle connection failed: {str(e)}")
            raise
        finally:
            if connection:
                connection.close()
    
    async def extract_gl_data(self, period_start: str, period_end: str) -> Dict[str, Any]:
        """Extract General Ledger data from Oracle ERP"""
        async with self.oracle_connection() as conn:
            cursor = conn.cursor()
            
            # Query GL data
            query = """
            SELECT 
                gcc.segment1 AS company,
                gcc.segment2 AS account,
                glb.period_name,
                SUM(glb.accounted_dr) AS debit_amount,
                SUM(glb.accounted_cr) AS credit_amount,
                glb.currency_code
            FROM 
                gl_balances glb
                JOIN gl_code_combinations gcc ON glb.code_combination_id = gcc.code_combination_id
            WHERE 
                glb.period_name BETWEEN :period_start AND :period_end
                AND glb.actual_flag = 'A'
            GROUP BY 
                gcc.segment1, gcc.segment2, glb.period_name, glb.currency_code
            ORDER BY 
                gcc.segment1, gcc.segment2, glb.period_name
            """
            
            cursor.execute(query, period_start=period_start, period_end=period_end)
            
            gl_data = []
            for row in cursor:
                gl_data.append({
                    'company': row[0],
                    'account': row[1],
                    'period': row[2],
                    'debit_amount': float(row[3] or 0),
                    'credit_amount': float(row[4] or 0),
                    'currency': row[5]
                })
            
            return gl_data
    
    async def create_trial_balance(self, gl_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create trial balance from GL data"""
        trial_balance = {}
        
        for record in gl_data:
            company = record['company']
            account = record['account']
            
            if company not in trial_balance:
                trial_balance[company] = {}
            
            if account not in trial_balance[company]:
                trial_balance[company][account] = {
                    'debit_total': 0.0,
                    'credit_total': 0.0,
                    'net_balance': 0.0
                }
            
            trial_balance[company][account]['debit_total'] += record['debit_amount']
            trial_balance[company][account]['credit_total'] += record['credit_amount']
            trial_balance[company][account]['net_balance'] = (
                trial_balance[company][account]['debit_total'] - 
                trial_balance[company][account]['credit_total']
            )
        
        return trial_balance
    
    async def map_to_financial_statements(self, trial_balance: Dict[str, Any]) -> Dict[str, Any]:
        """Map trial balance to standard financial statements"""
        financial_statements = {}
        
        # Account mapping configuration
        account_mapping = {
            'assets': ['1000', '1100', '1200', '1300', '1400'],
            'liabilities': ['2000', '2100', '2200'],
            'equity': ['3000', '3100'],
            'revenue': ['4000', '4100', '4200'],
            'expenses': ['5000', '6000', '7000', '8000']
        }
        
        for company, accounts in trial_balance.items():
            financial_statements[company] = {
                'balance_sheet': {
                    'current_assets': 0.0,
                    'total_assets': 0.0,
                    'current_liabilities': 0.0,
                    'total_liabilities': 0.0,
                    'shareholders_equity': 0.0
                },
                'income_statement': {
                    'revenue': 0.0,
                    'total_expenses': 0.0,
                    'net_income': 0.0
                }
            }
            
            for account, balance in accounts.items():
                # Map accounts to financial statement categories
                for category, account_prefixes in account_mapping.items():
                    if any(account.startswith(prefix) for prefix in account_prefixes):
                        if category == 'assets':
                            financial_statements[company]['balance_sheet']['total_assets'] += balance['net_balance']
                        elif category == 'liabilities':
                            financial_statements[company]['balance_sheet']['total_liabilities'] += abs(balance['net_balance'])
                        elif category == 'equity':
                            financial_statements[company]['balance_sheet']['shareholders_equity'] += abs(balance['net_balance'])
                        elif category == 'revenue':
                            financial_statements[company]['income_statement']['revenue'] += abs(balance['net_balance'])
                        elif category == 'expenses':
                            financial_statements[company]['income_statement']['total_expenses'] += balance['net_balance']
            
            # Calculate net income
            financial_statements[company]['income_statement']['net_income'] = (
                financial_statements[company]['income_statement']['revenue'] -
                financial_statements[company]['income_statement']['total_expenses']
            )
        
        return financial_statements

# Usage example
async def run_oracle_integration():
    oracle_config = {
        'username': 'erp_user',
        'password': 'erp_password',
        'host': 'oracle-db.company.com',
        'port': 1521,
        'service_name': 'PROD'
    }
    
    oracle_integration = OracleERPIntegration(oracle_config, frontier_client)
    
    # Extract data for Q4 2024
    gl_data = await oracle_integration.extract_gl_data('2024-10', '2024-12')
    trial_balance = await oracle_integration.create_trial_balance(gl_data)
    financial_statements = await oracle_integration.map_to_financial_statements(trial_balance)
    
    # Analyze each company
    for company, statements in financial_statements.items():
        analysis_data = {
            'company_name': company,
            'financial_statements': statements
        }
        
        result = await frontier_client.financial_analysis.analyze_company(analysis_data)
        print(f"Analysis for {company}: {result['financial_health_score']}")
```

### CRM System Integration

#### Salesforce Integration

```python
from simple_salesforce import Salesforce
import asyncio
from datetime import datetime, timedelta

class SalesforceIntegration:
    def __init__(self, sf_config: Dict[str, Any], frontier_client):
        self.sf_config = sf_config
        self.frontier_client = frontier_client
        self.sf = None
    
    async def connect_salesforce(self):
        """Connect to Salesforce"""
        try:
            self.sf = Salesforce(
                username=self.sf_config['username'],
                password=self.sf_config['password'],
                security_token=self.sf_config['security_token'],
                domain=self.sf_config.get('domain', 'login')
            )
            print("✅ Salesforce connection established")
            return True
        except Exception as e:
            print(f"❌ Salesforce connection failed: {str(e)}")
            return False
    
    async def extract_customer_data(self) -> List[Dict[str, Any]]:
        """Extract customer data from Salesforce"""
        # SOQL query to get account data
        query = """
        SELECT 
            Id, Name, Industry, AnnualRevenue, NumberOfEmployees,
            BillingCountry, Type, CreatedDate, LastModifiedDate,
            (SELECT Amount, StageName, CloseDate FROM Opportunities)
        FROM Account 
        WHERE Type = 'Customer' AND AnnualRevenue != NULL
        """
        
        result = self.sf.query_all(query)
        
        customers = []
        for record in result['records']:
            # Calculate opportunity metrics
            total_pipeline = 0
            won_opportunities = 0
            total_opportunities = len(record.get('Opportunities', {}).get('records', []))
            
            for opp in record.get('Opportunities', {}).get('records', []):
                total_pipeline += opp['Amount'] or 0
                if opp['StageName'] == 'Closed Won':
                    won_opportunities += 1
            
            customers.append({
                'customer_id': record['Id'],
                'company_name': record['Name'],
                'industry': record['Industry'],
                'annual_revenue': record['AnnualRevenue'],
                'employee_count': record['NumberOfEmployees'],
                'country': record['BillingCountry'],
                'customer_since': record['CreatedDate'],
                'last_updated': record['LastModifiedDate'],
                'total_pipeline': total_pipeline,
                'win_rate': won_opportunities / total_opportunities if total_opportunities > 0 else 0,
                'total_opportunities': total_opportunities
            })
        
        return customers
    
    async def analyze_customer_portfolio(self, customers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze customer portfolio using Frontier"""
        # Prepare data for Frontier analysis
        portfolio_data = {
            'portfolio_name': 'Customer Portfolio Analysis',
            'analysis_date': datetime.now().isoformat(),
            'customers': customers,
            'analysis_scope': {
                'financial_health': True,
                'industry_analysis': True,
                'risk_assessment': True,
                'growth_potential': True
            }
        }
        
        # Call Frontier customer portfolio analysis
        analysis_result = await self.frontier_client.strategic_planning.analyze_customer_portfolio(portfolio_data)
        
        return analysis_result
    
    async def assess_customer_credit_risk(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess credit risk for individual customer"""
        # Prepare customer financial profile
        financial_profile = {
            'company_name': customer_data['company_name'],
            'industry': customer_data['industry'],
            'annual_revenue': customer_data['annual_revenue'],
            'employee_count': customer_data['employee_count'],
            'business_relationship': {
                'customer_since': customer_data['customer_since'],
                'total_pipeline': customer_data['total_pipeline'],
                'payment_history': 'good',  # Would come from billing system
                'average_deal_size': customer_data['total_pipeline'] / max(customer_data['total_opportunities'], 1)
            }
        }
        
        # Call Frontier credit risk assessment
        risk_result = await self.frontier_client.risk_management.assess_customer_credit_risk(financial_profile)
        
        return risk_result
    
    async def update_salesforce_with_insights(self, customer_id: str, insights: Dict[str, Any]):
        """Update Salesforce with Frontier insights"""
        try:
            # Create custom fields update
            update_data = {
                'Frontier_Financial_Score__c': insights.get('financial_health_score'),
                'Frontier_Risk_Level__c': insights.get('risk_level'),
                'Frontier_Growth_Potential__c': insights.get('growth_potential_score'),
                'Frontier_Last_Analysis__c': datetime.now().strftime('%Y-%m-%d'),
                'Frontier_Recommendations__c': '; '.join(insights.get('recommendations', []))
            }
            
            # Update account record
            self.sf.Account.update(customer_id, update_data)
            print(f"✅ Updated Salesforce record for customer {customer_id}")
            
        except Exception as e:
            print(f"❌ Failed to update Salesforce for customer {customer_id}: {str(e)}")

# Usage example
async def run_salesforce_integration():
    sf_config = {
        'username': 'sf_user@company.com',
        'password': 'sf_password',
        'security_token': 'sf_security_token',
        'domain': 'login'  # or 'test' for sandbox
    }
    
    sf_integration = SalesforceIntegration(sf_config, frontier_client)
    
    if await sf_integration.connect_salesforce():
        # Extract and analyze customer data
        customers = await sf_integration.extract_customer_data()
        portfolio_analysis = await sf_integration.analyze_customer_portfolio(customers)
        
        print(f"📊 Portfolio Analysis Results:")
        print(f"   Total Customers: {len(customers)}")
        print(f"   Portfolio Health Score: {portfolio_analysis['portfolio_health_score']}")
        print(f"   High Risk Customers: {len(portfolio_analysis['high_risk_customers'])}")
        
        # Analyze individual customers and update Salesforce
        for customer in customers[:10]:  # Process first 10 customers
            risk_assessment = await sf_integration.assess_customer_credit_risk(customer)
            
            insights = {
                'financial_health_score': risk_assessment['financial_health_score'],
                'risk_level': risk_assessment['risk_level'],
                'growth_potential_score': risk_assessment['growth_potential_score'],
                'recommendations': risk_assessment['recommendations']
            }
            
            await sf_integration.update_salesforce_with_insights(customer['customer_id'], insights)
```

### Business Intelligence Integration

#### Tableau Integration

```python
import tableauserverclient as TSC
import pandas as pd
from io import StringIO

class TableauIntegration:
    def __init__(self, tableau_config: Dict[str, Any], frontier_client):
        self.tableau_config = tableau_config
        self.frontier_client = frontier_client
        self.server = None
    
    async def connect_tableau(self):
        """Connect to Tableau Server"""
        try:
            # Create Tableau Server connection
            server_url = self.tableau_config['server_url']
            self.server = TSC.Server(server_url, use_server_version=True)
            
            # Sign in to server
            tableau_auth = TSC.TableauAuth(
                self.tableau_config['username'],
                self.tableau_config['password'],
                site_id=self.tableau_config.get('site_id', '')
            )
            
            self.server.auth.sign_in(tableau_auth)
            print("✅ Tableau Server connection established")
            return True
            
        except Exception as e:
            print(f"❌ Tableau connection failed: {str(e)}")
            return False
    
    async def create_frontier_data_source(self, analysis_results: Dict[str, Any]):
        """Create Tableau data source from Frontier analysis results"""
        # Convert Frontier results to DataFrame
        df_data = []
        
        for company, analysis in analysis_results.items():
            df_data.append({
                'Company': company,
                'Financial_Health_Score': analysis['financial_health_score'],
                'Current_Ratio': analysis['financial_ratios']['liquidity']['current_ratio'],
                'ROE': analysis['financial_ratios']['profitability']['roe'],
                'Debt_to_Equity': analysis['financial_ratios']['leverage']['debt_to_equity'],
                'Risk_Level': analysis['risk_assessment']['overall_risk'],
                'Credit_Rating': analysis['risk_assessment']['credit_rating'],
                'Industry': analysis['company_profile']['industry'],
                'Analysis_Date': analysis['analysis_date']
            })
        
        df = pd.DataFrame(df_data)
        
        # Convert to Tableau-compatible format
        csv_data = df.to_csv(index=False)
        
        # Create data source on Tableau Server
        try:
            # Create datasource object
            datasource = TSC.DatasourceItem(
                project_id=self.tableau_config['project_id'],
                name='Frontier_Financial_Analysis'
            )
            
            # Upload datasource
            datasource = self.server.datasources.publish(
                datasource, 
                StringIO(csv_data), 
                mode=TSC.Server.PublishMode.Overwrite
            )
            
            print(f"✅ Data source published: {datasource.id}")
            return datasource.id
            
        except Exception as e:
            print(f"❌ Failed to publish data source: {str(e)}")
            return None
    
    async def create_financial_dashboard(self, datasource_id: str):
        """Create financial analysis dashboard in Tableau"""
        # Dashboard configuration
        dashboard_config = {
            'name': 'Frontier Financial Analysis Dashboard',
            'sheets': [
                {
                    'name': 'Financial Health Overview',
                    'type': 'scatter_plot',
                    'x_axis': 'Current_Ratio',
                    'y_axis': 'ROE',
                    'color': 'Financial_Health_Score',
                    'size': 'Company'
                },
                {
                    'name': 'Risk Distribution',
                    'type': 'bar_chart',
                    'dimension': 'Risk_Level',
                    'measure': 'COUNT(Company)'
                },
                {
                    'name': 'Industry Comparison',
                    'type': 'box_plot',
                    'dimension': 'Industry',
                    'measure': 'Financial_Health_Score'
                }
            ]
        }
        
        # Create workbook with dashboard
        # Note: Tableau REST API doesn't support creating workbooks programmatically
        # This would typically be done through Tableau's native tools or templates
        
        print(f"📊 Dashboard configuration created for data source {datasource_id}")
        return dashboard_config
    
    async def schedule_data_refresh(self, datasource_id: str, schedule_config: Dict[str, Any]):
        """Schedule automatic data refresh for Tableau data source"""
        try:
            # Get existing schedules
            schedules, pagination = self.server.schedules.get()
            
            # Find or create refresh schedule
            target_schedule = None
            for schedule in schedules:
                if schedule.name == schedule_config['name']:
                    target_schedule = schedule
                    break
            
            if not target_schedule:
                # Create new schedule
                target_schedule = TSC.ScheduleItem(
                    name=schedule_config['name'],
                    priority=schedule_config.get('priority', 50),
                    schedule_type=TSC.ScheduleItem.Type.Extract,
                    execution_order=TSC.ScheduleItem.ExecutionOrder.Parallel,
                    interval_item=TSC.IntervalItem(
                        start_time=schedule_config['start_time'],
                        end_time=schedule_config.get('end_time'),
                        interval_value=schedule_config['interval_hours'],
                        interval_type=TSC.IntervalItem.Type.Hourly
                    )
                )
                
                target_schedule = self.server.schedules.create(target_schedule)
            
            # Add data source to schedule
            self.server.schedules.add_to_schedule(target_schedule.id, datasource=datasource_id)
            
            print(f"✅ Data refresh scheduled for {schedule_config['name']}")
            return target_schedule.id
            
        except Exception as e:
            print(f"❌ Failed to schedule data refresh: {str(e)}")
            return None

# Usage example
async def run_tableau_integration():
    tableau_config = {
        'server_url': 'https://tableau.company.com',
        'username': 'tableau_user',
        'password': 'tableau_password',
        'site_id': 'finance_analytics',
        'project_id': 'project_123'
    }
    
    tableau_integration = TableauIntegration(tableau_config, frontier_client)
    
    if await tableau_integration.connect_tableau():
        # Get analysis results from previous integrations
        analysis_results = {
            'Company_A': {
                'financial_health_score': 8.5,
                'financial_ratios': {
                    'liquidity': {'current_ratio': 1.8},
                    'profitability': {'roe': 0.15},
                    'leverage': {'debt_to_equity': 0.6}
                },
                'risk_assessment': {
                    'overall_risk': 'moderate',
                    'credit_rating': 'A-'
                },
                'company_profile': {'industry': 'technology'},
                'analysis_date': '2024-12-14'
            }
            # Add more companies...
        }
        
        # Create and publish data source
        datasource_id = await tableau_integration.create_frontier_data_source(analysis_results)
        
        if datasource_id:
            # Create dashboard
            dashboard_config = await tableau_integration.create_financial_dashboard(datasource_id)
            
            # Schedule daily refresh
            schedule_config = {
                'name': 'Frontier_Daily_Refresh',
                'start_time': '06:00:00',
                'interval_hours': 24,
                'priority': 75
            }
            
            schedule_id = await tableau_integration.schedule_data_refresh(datasource_id, schedule_config)
```

## Real-time Data Streaming

### Apache Kafka Integration

```python
from kafka import KafkaProducer, KafkaConsumer
import json
import asyncio
from typing import Dict, Any, Callable

class KafkaIntegration:
    def __init__(self, kafka_config: Dict[str, Any], frontier_client):
        self.kafka_config = kafka_config
        self.frontier_client = frontier_client
        self.producer = None
        self.consumer = None
    
    def create_producer(self) -> KafkaProducer:
        """Create Kafka producer"""
        return KafkaProducer(
            bootstrap_servers=self.kafka_config['bootstrap_servers'],
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None,
            security_protocol=self.kafka_config.get('security_protocol', 'PLAINTEXT'),
            sasl_mechanism=self.kafka_config.get('sasl_mechanism'),
            sasl_plain_username=self.kafka_config.get('username'),
            sasl_plain_password=self.kafka_config.get('password')
        )
    
    def create_consumer(self, topics: List[str]) -> KafkaConsumer:
        """Create Kafka consumer"""
        return KafkaConsumer(
            *topics,
            bootstrap_servers=self.kafka_config['bootstrap_servers'],
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            key_deserializer=lambda k: k.decode('utf-8') if k else None,
            security_protocol=self.kafka_config.get('security_protocol', 'PLAINTEXT'),
            sasl_mechanism=self.kafka_config.get('sasl_mechanism'),
            sasl_plain_username=self.kafka_config.get('username'),
            sasl_plain_password=self.kafka_config.get('password'),
            group_id=self.kafka_config.get('consumer_group', 'frontier_consumers'),
            auto_offset_reset='latest'
        )
    
    async def publish_analysis_results(self, topic: str, analysis_results: Dict[str, Any]):
        """Publish Frontier analysis results to Kafka topic"""
        if not self.producer:
            self.producer = self.create_producer()
        
        try:
            # Add metadata to analysis results
            enriched_results = {
                'timestamp': datetime.now().isoformat(),
                'source': 'frontier_business_operations',
                'version': '1.0',
                'data': analysis_results
            }
            
            # Send to Kafka
            future = self.producer.send(
                topic,
                key=analysis_results.get('company_id', 'unknown'),
                value=enriched_results
            )
            
            # Wait for acknowledgment
            record_metadata = future.get(timeout=10)
            
            print(f"✅ Published to {record_metadata.topic}:{record_metadata.partition}:{record_metadata.offset}")
            
        except Exception as e:
            print(f"❌ Failed to publish to Kafka: {str(e)}")
    
    async def stream_financial_data_processor(self, topics: List[str]):
        """Stream processor for incoming financial data"""
        consumer = self.create_consumer(topics)
        
        print(f"🔄 Starting stream processor for topics: {topics}")
        
        try:
            for message in consumer:
                try:
                    # Process incoming financial data
                    financial_data = message.value
                    
                    print(f"📥 Received data for company: {financial_data.get('company_name', 'Unknown')}")
                    
                    # Transform data for Frontier analysis
                    frontier_data = await self.transform_streaming_data(financial_data)
                    
                    # Analyze with Frontier
                    analysis_result = await self.frontier_client.financial_analysis.analyze_company(frontier_data)
                    
                    # Publish results
                    await self.publish_analysis_results('frontier_analysis_results', {
                        'original_message_key': message.key,
                        'analysis_result': analysis_result,
                        'processing_timestamp': datetime.now().isoformat()
                    })
                    
                except Exception as e:
                    print(f"❌ Error processing message: {str(e)}")
                    # Publish to error topic
                    await self.publish_analysis_results('frontier_analysis_errors', {
                        'original_message': message.value,
                        'error': str(e),
                        'timestamp': datetime.now().isoformat()
                    })
        
        except KeyboardInterrupt:
            print("🛑 Stream processor stopped")
        finally:
            consumer.close()
    
    async def transform_streaming_data(self, streaming_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform streaming data to Frontier format"""
        # Map streaming data fields to Frontier expected format
        transformed_data = {
            'company_name': streaming_data.get('companyName') or streaming_data.get('company_name'),
            'industry': streaming_data.get('industry', 'unknown'),
            'financial_statements': {}
        }
        
        # Transform balance sheet data
        if 'balanceSheet' in streaming_data:
            balance_sheet = streaming_data['balanceSheet']
            transformed_data['financial_statements']['balance_sheet'] = {
                'current_assets': balance_sheet.get('currentAssets', 0),
                'total_assets': balance_sheet.get('totalAssets', 0),
                'current_liabilities': balance_sheet.get('currentLiabilities', 0),
                'total_liabilities': balance_sheet.get('totalLiabilities', 0),
                'shareholders_equity': balance_sheet.get('shareholdersEquity', 0)
            }
        
        # Transform income statement data
        if 'incomeStatement' in streaming_data:
            income_statement = streaming_data['incomeStatement']
            transformed_data['financial_statements']['income_statement'] = {
                'revenue': income_statement.get('revenue', 0),
                'gross_profit': income_statement.get('grossProfit', 0),
                'operating_income': income_statement.get('operatingIncome', 0),
                'net_income': income_statement.get('netIncome', 0)
            }
        
        return transformed_data

# Usage example
async def run_kafka_integration():
    kafka_config = {
        'bootstrap_servers': ['kafka1:9092', 'kafka2:9092', 'kafka3:9092'],
        'security_protocol': 'SASL_SSL',
        'sasl_mechanism': 'SCRAM-SHA-256',
        'username': 'kafka_user',
        'password': 'kafka_password',
        'consumer_group': 'frontier_financial_analysis'
    }
    
    kafka_integration = KafkaIntegration(kafka_config, frontier_client)
    
    # Start stream processor
    await kafka_integration.stream_financial_data_processor([
        'financial_data_stream',
        'company_updates',
        'market_data_feed'
    ])
```

## Webhook Integration

### Setting Up Webhooks

```python
from fastapi import FastAPI, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import hashlib
import hmac
import json

app = FastAPI()
security = HTTPBearer()

class WebhookHandler:
    def __init__(self, frontier_client, webhook_secret: str):
        self.frontier_client = frontier_client
        self.webhook_secret = webhook_secret
    
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """Verify webhook signature for security"""
        expected_signature = hmac.new(
            self.webhook_secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(f"sha256={expected_signature}", signature)
    
    async def handle_financial_data_webhook(self, data: Dict[str, Any]):
        """Handle incoming financial data webhook"""
        try:
            # Validate required fields
            required_fields = ['company_id', 'financial_statements']
            if not all(field in data for field in required_fields):
                raise ValueError("Missing required fields")
            
            # Process with Frontier
            analysis_result = await self.frontier_client.financial_analysis.analyze_company(data)
            
            # Store or forward results
            await self.process_analysis_result(analysis_result)
            
            return {"status": "success", "analysis_id": analysis_result['analysis_id']}
            
        except Exception as e:
            print(f"❌ Webhook processing error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def handle_compliance_update_webhook(self, data: Dict[str, Any]):
        """Handle regulatory compliance update webhook"""
        try:
            # Process compliance update
            compliance_result = await self.frontier_client.compliance.process_regulatory_update(data)
            
            # Trigger compliance review if needed
            if compliance_result.get('requires_review'):
                await self.trigger_compliance_review(compliance_result)
            
            return {"status": "success", "compliance_id": compliance_result['update_id']}
            
        except Exception as e:
            print(f"❌ Compliance webhook error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def process_analysis_result(self, analysis_result: Dict[str, Any]):
        """Process and distribute analysis results"""
        # Send to downstream systems
        if analysis_result['financial_health_score'] < 5.0:
            # Alert risk management team
            await self.send_risk_alert(analysis_result)
        
        # Update dashboard
        await self.update_dashboard(analysis_result)
        
        # Store in data warehouse
        await self.store_analysis_result(analysis_result)

webhook_handler = WebhookHandler(frontier_client, "your-webhook-secret")

@app.post("/webhooks/financial-data")
async def financial_data_webhook(request: Request, credentials: HTTPAuthorizationCredentials = security):
    """Endpoint for financial data webhooks"""
    # Get raw payload for signature verification
    payload = await request.body()
    signature = request.headers.get("X-Frontier-Signature")
    
    # Verify signature
    if not webhook_handler.verify_webhook_signature(payload, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Parse JSON payload
    data = json.loads(payload.decode('utf-8'))
    
    # Process webhook
    return await webhook_handler.handle_financial_data_webhook(data)

@app.post("/webhooks/compliance-update")
async def compliance_update_webhook(request: Request, credentials: HTTPAuthorizationCredentials = security):
    """Endpoint for compliance update webhooks"""
    payload = await request.body()
    signature = request.headers.get("X-Frontier-Signature")
    
    if not webhook_handler.verify_webhook_signature(payload, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    data = json.loads(payload.decode('utf-8'))
    return await webhook_handler.handle_compliance_update_webhook(data)
```

## Error Handling and Monitoring

### Comprehensive Error Handling

```python
import logging
import traceback
from enum import Enum
from dataclasses import dataclass
from typing import Optional, Dict, Any, List

class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class IntegrationError:
    error_id: str
    timestamp: str
    severity: ErrorSeverity
    component: str
    error_message: str
    error_details: Dict[str, Any]
    resolution_steps: List[str]

class IntegrationMonitor:
    def __init__(self, frontier_client):
        self.frontier_client = frontier_client
        self.logger = logging.getLogger(__name__)
        self.error_log = []
    
    async def handle_integration_error(self, error: Exception, context: Dict[str, Any]) -> IntegrationError:
        """Handle and categorize integration errors"""
        error_details = {
            'exception_type': type(error).__name__,
            'exception_message': str(error),
            'traceback': traceback.format_exc(),
            'context': context
        }
        
        # Categorize error severity
        severity = self.categorize_error_severity(error, context)
        
        # Generate error ID
        error_id = f"INT_{int(datetime.now().timestamp())}_{hash(str(error)) % 10000:04d}"
        
        integration_error = IntegrationError(
            error_id=error_id,
            timestamp=datetime.now().isoformat(),
            severity=severity,
            component=context.get('component', 'unknown'),
            error_message=str(error),
            error_details=error_details,
            resolution_steps=self.get_resolution_steps(error, context)
        )
        
        # Log error
        self.logger.error(f"Integration error {error_id}: {error_details}")
        self.error_log.append(integration_error)
        
        # Send alerts for high severity errors
        if severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
            await self.send_error_alert(integration_error)
        
        return integration_error
    
    def categorize_error_severity(self, error: Exception, context: Dict[str, Any]) -> ErrorSeverity:
        """Categorize error severity based on type and context"""
        if isinstance(error, (ConnectionError, TimeoutError)):
            return ErrorSeverity.HIGH
        elif isinstance(error, AuthenticationError):
            return ErrorSeverity.CRITICAL
        elif isinstance(error, ValueError):
            return ErrorSeverity.MEDIUM
        else:
            return ErrorSeverity.LOW
    
    def get_resolution_steps(self, error: Exception, context: Dict[str, Any]) -> List[str]:
        """Get suggested resolution steps for error"""
        if isinstance(error, ConnectionError):
            return [
                "Check network connectivity",
                "Verify service endpoints are accessible",
                "Check firewall and security group settings",
                "Retry with exponential backoff"
            ]
        elif isinstance(error, AuthenticationError):
            return [
                "Verify API credentials",
                "Check token expiration",
                "Refresh authentication tokens",
                "Contact system administrator"
            ]
        elif isinstance(error, ValueError):
            return [
                "Validate input data format",
                "Check data mapping configuration",
                "Review data transformation logic",
                "Test with known good data"
            ]
        else:
            return [
                "Review error logs for details",
                "Check system status",
                "Contact technical support"
            ]
    
    async def send_error_alert(self, error: IntegrationError):
        """Send error alert to monitoring systems"""
        alert_data = {
            'error_id': error.error_id,
            'severity': error.severity.value,
            'component': error.component,
            'message': error.error_message,
            'timestamp': error.timestamp
        }
        
        # Send to monitoring system (e.g., PagerDuty, Slack, email)
        # Implementation depends on your monitoring setup
        print(f"🚨 ALERT: {error.severity.value.upper()} error in {error.component}: {error.error_message}")

# Usage with retry logic
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    retry=retry_if_exception_type(ConnectionError)
)
async def robust_frontier_call(client, operation, data, monitor: IntegrationMonitor):
    """Make Frontier API call with error handling and retry logic"""
    try:
        return await operation(data)
    except Exception as e:
        context = {
            'component': 'frontier_api',
            'operation': operation.__name__,
            'data_size': len(str(data))
        }
        
        await monitor.handle_integration_error(e, context)
        raise
```

## Performance Optimization

### Connection Pooling and Caching

```python
import aiohttp
import asyncio
from aiohttp_client_cache import CachedSession, RedisBackend
import redis.asyncio as redis

class OptimizedIntegration:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.session = None
        self.cache_backend = None
        self.connection_pool = None
    
    async def initialize(self):
        """Initialize optimized connections and caching"""
        # Setup connection pool
        connector = aiohttp.TCPConnector(
            limit=100,  # Total connection pool size
            limit_per_host=30,  # Connections per host
            ttl_dns_cache=300,  # DNS cache TTL
            use_dns_cache=True,
            keepalive_timeout=30,
            enable_cleanup_closed=True
        )
        
        # Setup Redis cache backend
        self.cache_backend = RedisBackend(
            cache_name='frontier_integration_cache',
            address=self.config['redis_url'],
            expire_after=3600  # 1 hour default expiration
        )
        
        # Create cached session
        self.session = CachedSession(
            cache=self.cache_backend,
            connector=connector,
            timeout=aiohttp.ClientTimeout(total=30)
        )
    
    async def cached_api_call(self, url: str, data: Dict[str, Any], cache_ttl: int = 3600) -> Dict[str, Any]:
        """Make cached API call with optimized connection handling"""
        headers = {
            'Authorization': f'Bearer {self.config["api_token"]}',
            'Content-Type': 'application/json'
        }
        
        # Use cache-specific headers
        cache_headers = headers.copy()
        cache_headers['Cache-Control'] = f'max-age={cache_ttl}'
        
        async with self.session.post(url, json=data, headers=cache_headers) as response:
            response.raise_for_status()
            return await response.json()
    
    async def batch_process_with_concurrency_limit(self, items: List[Dict[str, Any]], max_concurrent: int = 10):
        """Process items in batches with concurrency control"""
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_item(item):
            async with semaphore:
                return await self.process_single_item(item)
        
        # Process all items concurrently but with limit
        tasks = [process_item(item) for item in items]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return results
    
    async def cleanup(self):
        """Clean up resources"""
        if self.session:
            await self.session.close()
        if self.cache_backend:
            await self.cache_backend.close()
```

---

This comprehensive integration guide provides detailed implementation patterns for connecting the Business Operations module with various enterprise systems, ensuring secure, reliable, and performant integrations across different platforms and use cases.
