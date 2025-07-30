# Lambda Functions for Alerting System
# Slack Notifier and Alert Processor implementations

import json
import urllib3
import os
from datetime import datetime

def handler(event, context):
    """
    Enhanced Slack notification handler for AWS SNS alerts
    Formats and sends notifications to Slack with rich formatting
    """
    
    slack_webhook_url = os.environ['SLACK_WEBHOOK_URL']
    environment = os.environ.get('ENVIRONMENT', 'production')
    
    http = urllib3.PoolManager()
    
    # Parse SNS message
    for record in event['Records']:
        sns_message = json.loads(record['Sns']['Message'])
        topic_arn = record['Sns']['TopicArn']
        
        # Determine alert level from topic
        if 'critical' in topic_arn:
            alert_level = 'critical'
            color = '#FF0000'  # Red
            emoji = '🚨'
        elif 'warning' in topic_arn:
            alert_level = 'warning'
            color = '#FFA500'  # Orange
            emoji = '⚠️'
        else:
            alert_level = 'info'
            color = '#00FF00'  # Green
            emoji = 'ℹ️'
        
        # Parse CloudWatch alarm if present
        if 'AlarmName' in sns_message:
            alarm_name = sns_message['AlarmName']
            alarm_description = sns_message.get('AlarmDescription', 'No description')
            new_state = sns_message['NewStateValue']
            old_state = sns_message['OldStateValue']
            reason = sns_message['NewStateReason']
            timestamp = sns_message['StateChangeTime']
            
            # Format timestamp
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            formatted_time = dt.strftime('%Y-%m-%d %H:%M:%S UTC')
            
            # Create Slack attachment
            attachment = {
                "color": color,
                "title": f"{emoji} {alarm_name}",
                "text": alarm_description,
                "fields": [
                    {
                        "title": "State Change",
                        "value": f"{old_state} → {new_state}",
                        "short": True
                    },
                    {
                        "title": "Environment",
                        "value": environment.upper(),
                        "short": True
                    },
                    {
                        "title": "Alert Level",
                        "value": alert_level.upper(),
                        "short": True
                    },
                    {
                        "title": "Time",
                        "value": formatted_time,
                        "short": True
                    },
                    {
                        "title": "Reason",
                        "value": reason,
                        "short": False
                    }
                ],
                "footer": "Frontier Business Operations API",
                "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
                "ts": int(dt.timestamp())
            }
            
            # Add actions for critical alerts
            if alert_level == 'critical':
                attachment["actions"] = [
                    {
                        "type": "button",
                        "text": "View in CloudWatch",
                        "url": f"https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:alarm/{alarm_name}",
                        "style": "primary"
                    },
                    {
                        "type": "button", 
                        "text": "View Dashboard",
                        "url": "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=Frontier-Production-Monitoring"
                    }
                ]
            
            slack_message = {
                "username": "Frontier Alerts",
                "icon_emoji": ":warning:",
                "attachments": [attachment]
            }
            
        else:
            # Generic message format
            slack_message = {
                "username": "Frontier Alerts",
                "icon_emoji": ":warning:",
                "text": f"{emoji} *{alert_level.upper()} Alert*",
                "attachments": [{
                    "color": color,
                    "text": json.dumps(sns_message, indent=2),
                    "footer": "Frontier Business Operations API"
                }]
            }
        
        # Send to Slack
        encoded_msg = json.dumps(slack_message).encode('utf-8')
        resp = http.request('POST', slack_webhook_url, body=encoded_msg)
        
        print(f"Slack notification sent: {resp.status}")
    
    return {
        'statusCode': 200,
        'body': json.dumps('Notifications sent successfully')
    }
