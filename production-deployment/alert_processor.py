# Enhanced Alert Processor
# Aggregates alerts, reduces noise, and provides intelligent routing

import json
import boto3
import urllib3
import os
from datetime import datetime, timedelta
from collections import defaultdict
import hashlib

# Global variables for connection reuse
elasticsearch_client = None
sns_client = None
cloudwatch_client = None

def get_elasticsearch_client():
    """Get or create Elasticsearch client"""
    global elasticsearch_client
    if elasticsearch_client is None:
        # Note: In production, use proper Elasticsearch Python client
        elasticsearch_client = urllib3.PoolManager()
    return elasticsearch_client

def get_sns_client():
    """Get or create SNS client"""
    global sns_client
    if sns_client is None:
        sns_client = boto3.client('sns')
    return sns_client

def get_cloudwatch_client():
    """Get or create CloudWatch client"""
    global cloudwatch_client
    if cloudwatch_client is None:
        cloudwatch_client = boto3.client('cloudwatch')
    return cloudwatch_client

def handler(event, context):
    """
    Advanced alert processor that:
    1. Aggregates similar alerts
    2. Reduces notification noise
    3. Provides intelligent routing
    4. Logs all alerts to Elasticsearch
    """
    
    print(f"Processing alert event: {json.dumps(event)}")
    
    for record in event['Records']:
        if record['eventSource'] == 'aws:sns':
            process_sns_alert(record)
        elif record['source'] == 'aws.cloudwatch':
            process_cloudwatch_event(record)
    
    return {
        'statusCode': 200,
        'body': json.dumps('Alert processed successfully')
    }

def process_sns_alert(record):
    """Process SNS-based alerts"""
    sns_message = json.loads(record['Sns']['Message'])
    topic_arn = record['Sns']['TopicArn']
    
    # Extract alert metadata
    alert_data = {
        'timestamp': datetime.utcnow().isoformat(),
        'source': 'sns',
        'topic_arn': topic_arn,
        'message': sns_message,
        'alert_id': generate_alert_id(sns_message)
    }
    
    # Log to Elasticsearch
    log_alert_to_elasticsearch(alert_data)
    
    # Check for alert aggregation
    if should_aggregate_alert(alert_data):
        print(f"Alert {alert_data['alert_id']} aggregated")
        return
    
    # Process based on alert level
    if 'critical' in topic_arn:
        process_critical_alert(alert_data)
    elif 'warning' in topic_arn:
        process_warning_alert(alert_data)
    else:
        process_info_alert(alert_data)

def process_cloudwatch_event(record):
    """Process CloudWatch Events (EventBridge)"""
    detail = record['detail']
    
    alert_data = {
        'timestamp': datetime.utcnow().isoformat(),
        'source': 'cloudwatch_event',
        'alarm_name': detail.get('alarmName'),
        'state': detail.get('state', {}).get('value'),
        'reason': detail.get('state', {}).get('reason'),
        'detail': detail,
        'alert_id': generate_alert_id(detail)
    }
    
    # Log to Elasticsearch
    log_alert_to_elasticsearch(alert_data)
    
    # Enhanced processing for state changes
    if alert_data['state'] == 'ALARM':
        handle_alarm_state(alert_data)
    elif alert_data['state'] == 'OK':
        handle_recovery_state(alert_data)

def generate_alert_id(alert_content):
    """Generate unique alert ID for deduplication"""
    content_str = json.dumps(alert_content, sort_keys=True)
    return hashlib.md5(content_str.encode()).hexdigest()[:16]

def should_aggregate_alert(alert_data):
    """
    Determine if alert should be aggregated (reduce noise)
    Returns True if alert should be suppressed
    """
    
    # Check for recent similar alerts in last 15 minutes
    query_time = datetime.utcnow() - timedelta(minutes=15)
    
    # Query Elasticsearch for similar alerts
    try:
        es_client = get_elasticsearch_client()
        
        # Simplified query - in production use proper ES Python client
        query = {
            "query": {
                "bool": {
                    "must": [
                        {"term": {"alert_id": alert_data['alert_id']}},
                        {"range": {"timestamp": {"gte": query_time.isoformat()}}}
                    ]
                }
            }
        }
        
        # If similar alert found recently, aggregate
        # In production, implement proper ES query
        return False  # Simplified - always process for now
        
    except Exception as e:
        print(f"Error checking alert aggregation: {e}")
        return False

def log_alert_to_elasticsearch(alert_data):
    """Log alert to Elasticsearch for analysis and aggregation"""
    try:
        es_endpoint = os.environ.get('ELASTICSEARCH_ENDPOINT')
        if not es_endpoint:
            print("Elasticsearch endpoint not configured")
            return
        
        es_client = get_elasticsearch_client()
        
        # Create index name based on date
        index_name = f"frontier-alerts-{datetime.utcnow().strftime('%Y.%m.%d')}"
        
        # In production, use proper Elasticsearch Python client
        # This is a simplified example
        print(f"Would log to ES index {index_name}: {json.dumps(alert_data)}")
        
    except Exception as e:
        print(f"Error logging to Elasticsearch: {e}")

def process_critical_alert(alert_data):
    """Enhanced processing for critical alerts"""
    print(f"Processing critical alert: {alert_data['alert_id']}")
    
    # Check for escalation patterns
    if requires_escalation(alert_data):
        escalate_alert(alert_data)
    
    # Create PagerDuty incident if configured
    pagerduty_key = os.environ.get('PAGERDUTY_API_KEY')
    if pagerduty_key:
        create_pagerduty_incident(alert_data, pagerduty_key)
    
    # Send enhanced Slack notification
    send_enhanced_slack_notification(alert_data, 'critical')

def process_warning_alert(alert_data):
    """Enhanced processing for warning alerts"""
    print(f"Processing warning alert: {alert_data['alert_id']}")
    
    # Check if warning is escalating to critical
    if is_escalating_to_critical(alert_data):
        promote_to_critical(alert_data)
        return
    
    # Send Slack notification
    send_enhanced_slack_notification(alert_data, 'warning')

def process_info_alert(alert_data):
    """Processing for informational alerts"""
    print(f"Processing info alert: {alert_data['alert_id']}")
    
    # Usually just log and send to low-priority channel
    send_enhanced_slack_notification(alert_data, 'info')

def handle_alarm_state(alert_data):
    """Handle when alarm goes into ALARM state"""
    alarm_name = alert_data['alarm_name']
    
    # Get alarm history for context
    try:
        cw_client = get_cloudwatch_client()
        
        history = cw_client.describe_alarm_history(
            AlarmName=alarm_name,
            MaxRecords=5
        )
        
        # Check for flapping (rapid state changes)
        if is_alarm_flapping(history['AlarmHistoryItems']):
            alert_data['flapping'] = True
            print(f"Alarm {alarm_name} is flapping")
        
        # Add historical context
        alert_data['alarm_history'] = history['AlarmHistoryItems']
        
    except Exception as e:
        print(f"Error getting alarm history: {e}")

def handle_recovery_state(alert_data):
    """Handle when alarm recovers (goes to OK state)"""
    print(f"Alarm {alert_data['alarm_name']} recovered")
    
    # Send recovery notification
    send_recovery_notification(alert_data)

def requires_escalation(alert_data):
    """Check if critical alert requires escalation"""
    
    # Check for multiple related alarms
    alarm_name = alert_data.get('message', {}).get('AlarmName', '')
    
    if 'api' in alarm_name.lower() and 'error' in alarm_name.lower():
        # API errors might require immediate escalation
        return True
    
    if 'database' in alarm_name.lower() and 'down' in alarm_name.lower():
        # Database issues require immediate escalation
        return True
    
    return False

def escalate_alert(alert_data):
    """Escalate alert to higher priority channels"""
    print(f"Escalating alert: {alert_data['alert_id']}")
    
    # Send to emergency Slack channel
    # Call emergency contact numbers
    # Create high-priority ticket
    
    slack_webhook = os.environ.get('SLACK_WEBHOOK_URL')
    if slack_webhook:
        emergency_message = {
            "username": "Frontier EMERGENCY",
            "icon_emoji": ":rotating_light:",
            "text": "🚨 *CRITICAL ALERT ESCALATED* 🚨",
            "attachments": [{
                "color": "#FF0000",
                "title": "IMMEDIATE ATTENTION REQUIRED",
                "text": f"Alert ID: {alert_data['alert_id']}",
                "fields": [
                    {
                        "title": "Alert Details",
                        "value": json.dumps(alert_data, indent=2),
                        "short": False
                    }
                ]
            }]
        }
        
        # Send escalation notification
        # Implementation would go here

def create_pagerduty_incident(alert_data, api_key):
    """Create PagerDuty incident for critical alerts"""
    try:
        # PagerDuty Events API v2
        pagerduty_payload = {
            "routing_key": api_key,
            "event_action": "trigger",
            "dedup_key": alert_data['alert_id'],
            "payload": {
                "summary": f"Frontier Critical Alert: {alert_data.get('message', {}).get('AlarmName', 'Unknown')}",
                "severity": "critical",
                "source": "Frontier Business API",
                "component": "production-infrastructure",
                "custom_details": alert_data
            }
        }
        
        http = urllib3.PoolManager()
        response = http.request(
            'POST',
            'https://events.pagerduty.com/v2/enqueue',
            body=json.dumps(pagerduty_payload),
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"PagerDuty incident created: {response.status}")
        
    except Exception as e:
        print(f"Error creating PagerDuty incident: {e}")

def is_escalating_to_critical(alert_data):
    """Check if warning alert is escalating to critical"""
    
    # Check metric trends
    # Look for multiple related warnings
    # Analyze time patterns
    
    # Simplified logic - in production, implement sophisticated analysis
    return False

def promote_to_critical(alert_data):
    """Promote warning alert to critical"""
    print(f"Promoting alert {alert_data['alert_id']} to critical")
    
    # Send to critical SNS topic
    sns_client = get_sns_client()
    
    try:
        # Get critical topic ARN from environment or configuration
        critical_topic = os.environ.get('CRITICAL_ALERTS_TOPIC_ARN')
        if critical_topic:
            sns_client.publish(
                TopicArn=critical_topic,
                Message=json.dumps(alert_data),
                Subject=f"PROMOTED TO CRITICAL: {alert_data['alert_id']}"
            )
    except Exception as e:
        print(f"Error promoting alert: {e}")

def is_alarm_flapping(alarm_history):
    """Check if alarm is flapping (rapid state changes)"""
    if len(alarm_history) < 3:
        return False
    
    # Check for multiple state changes in short time
    state_changes = 0
    for item in alarm_history[:5]:  # Check last 5 history items
        if 'StateUpdate' in item['HistoryItemType']:
            state_changes += 1
    
    return state_changes >= 3

def send_enhanced_slack_notification(alert_data, level):
    """Send enhanced Slack notification with context"""
    
    slack_webhook = os.environ.get('SLACK_WEBHOOK_URL')
    if not slack_webhook:
        return
    
    # Enhanced notification with more context
    # Implementation would include rich formatting
    print(f"Would send enhanced {level} Slack notification for {alert_data['alert_id']}")

def send_recovery_notification(alert_data):
    """Send recovery notification"""
    
    slack_webhook = os.environ.get('SLACK_WEBHOOK_URL')
    if not slack_webhook:
        return
    
    recovery_message = {
        "username": "Frontier Recovery",
        "icon_emoji": ":white_check_mark:",
        "text": f"✅ *RECOVERED*: {alert_data['alarm_name']}",
        "attachments": [{
            "color": "#00FF00",
            "title": "Alert Recovered",
            "text": f"Alarm {alert_data['alarm_name']} has returned to OK state",
            "footer": "Frontier Business Operations API"
        }]
    }
    
    print(f"Would send recovery notification for {alert_data['alarm_name']}")
