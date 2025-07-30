#!/usr/bin/env python3
"""
Blue-Green Deployment Script for Frontier

This script implements a blue-green deployment strategy for Kubernetes deployments.
It creates a new deployment (green), tests it, switches traffic, and cleans up the old deployment (blue).
"""

import argparse
import json
import subprocess
import time
import sys
from typing import Dict, List, Optional
import requests
import yaml


class BlueGreenDeployment:
    def __init__(self, namespace: str, timeout: int = 600):
        self.namespace = namespace
        self.timeout = timeout
        self.blue_suffix = "-blue"
        self.green_suffix = "-green"
        
    def run_kubectl(self, args: List[str]) -> str:
        """Run kubectl command and return output"""
        cmd = ["kubectl"] + args
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"kubectl command failed: {' '.join(cmd)}\n{result.stderr}")
        return result.stdout
    
    def get_current_deployment_color(self, deployment_name: str) -> Optional[str]:
        """Get the current color (blue/green) of the deployment"""
        try:
            output = self.run_kubectl([
                "get", "deployment", f"{deployment_name}-blue",
                "-n", self.namespace, "-o", "json"
            ])
            blue_deployment = json.loads(output)
            if blue_deployment.get("spec", {}).get("replicas", 0) > 0:
                return "blue"
        except RuntimeError:
            pass
        
        try:
            output = self.run_kubectl([
                "get", "deployment", f"{deployment_name}-green",
                "-n", self.namespace, "-o", "json"
            ])
            green_deployment = json.loads(output)
            if green_deployment.get("spec", {}).get("replicas", 0) > 0:
                return "green"
        except RuntimeError:
            pass
        
        return None
    
    def create_deployment_manifest(self, deployment_name: str, image: str, color: str) -> Dict:
        """Create deployment manifest for the specified color"""
        base_manifest = self.get_base_deployment_manifest(deployment_name)
        
        # Modify manifest for blue-green deployment
        manifest = base_manifest.copy()
        manifest["metadata"]["name"] = f"{deployment_name}-{color}"
        manifest["metadata"]["labels"] = manifest["metadata"].get("labels", {})
        manifest["metadata"]["labels"]["color"] = color
        
        # Update selector and template labels
        manifest["spec"]["selector"]["matchLabels"]["color"] = color
        manifest["spec"]["template"]["metadata"]["labels"]["color"] = color
        
        # Update image
        for container in manifest["spec"]["template"]["spec"]["containers"]:
            if container["name"] in ["api", "web", "ml-service"]:
                container["image"] = image
        
        return manifest
    
    def get_base_deployment_manifest(self, deployment_name: str) -> Dict:
        """Get the base deployment manifest"""
        try:
            output = self.run_kubectl([
                "get", "deployment", deployment_name,
                "-n", self.namespace, "-o", "json"
            ])
            return json.loads(output)
        except RuntimeError:
            # If deployment doesn't exist, create a basic manifest
            return self.create_basic_deployment_manifest(deployment_name)
    
    def create_basic_deployment_manifest(self, deployment_name: str) -> Dict:
        """Create a basic deployment manifest"""
        return {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": deployment_name,
                "namespace": self.namespace,
                "labels": {
                    "app": deployment_name
                }
            },
            "spec": {
                "replicas": 3,
                "selector": {
                    "matchLabels": {
                        "app": deployment_name
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": deployment_name
                        }
                    },
                    "spec": {
                        "containers": [
                            {
                                "name": deployment_name.split("-")[-1],
                                "image": "placeholder",
                                "ports": [
                                    {
                                        "containerPort": 8000
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }
    
    def apply_manifest(self, manifest: Dict) -> None:
        """Apply Kubernetes manifest"""
        manifest_yaml = yaml.dump(manifest)
        process = subprocess.Popen(
            ["kubectl", "apply", "-f", "-"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate(input=manifest_yaml)
        
        if process.returncode != 0:
            raise RuntimeError(f"Failed to apply manifest: {stderr}")
        
        print(f"Applied manifest for {manifest['metadata']['name']}")
    
    def wait_for_deployment_ready(self, deployment_name: str) -> None:
        """Wait for deployment to be ready"""
        print(f"Waiting for deployment {deployment_name} to be ready...")
        
        self.run_kubectl([
            "rollout", "status", "deployment", deployment_name,
            "-n", self.namespace, f"--timeout={self.timeout}s"
        ])
        
        print(f"Deployment {deployment_name} is ready")
    
    def run_health_checks(self, deployment_name: str, color: str) -> bool:
        """Run health checks against the deployment"""
        print(f"Running health checks for {deployment_name}-{color}...")
        
        # Get service endpoint
        try:
            service_name = deployment_name.replace("frontier-", "frontier-") + "-service"
            output = self.run_kubectl([
                "get", "service", service_name,
                "-n", self.namespace, "-o", "json"
            ])
            service = json.loads(output)
            
            # Create a temporary service for the green deployment if needed
            if color == "green":
                temp_service_name = f"{service_name}-{color}"
                self.create_temporary_service(deployment_name, color, temp_service_name)
                service_endpoint = self.get_service_endpoint(temp_service_name)
            else:
                service_endpoint = self.get_service_endpoint(service_name)
            
            # Run health check
            health_url = f"http://{service_endpoint}/health"
            
            for attempt in range(10):
                try:
                    response = requests.get(health_url, timeout=10)
                    if response.status_code == 200:
                        print(f"Health check passed for {deployment_name}-{color}")
                        return True
                except requests.RequestException as e:
                    print(f"Health check attempt {attempt + 1} failed: {e}")
                    time.sleep(10)
            
            print(f"Health checks failed for {deployment_name}-{color}")
            return False
            
        except Exception as e:
            print(f"Error running health checks: {e}")
            return False
    
    def create_temporary_service(self, deployment_name: str, color: str, service_name: str) -> None:
        """Create a temporary service for testing the green deployment"""
        service_manifest = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": service_name,
                "namespace": self.namespace,
                "labels": {
                    "app": deployment_name,
                    "color": color,
                    "temporary": "true"
                }
            },
            "spec": {
                "selector": {
                    "app": deployment_name.replace("frontier-", "frontier-"),
                    "color": color
                },
                "ports": [
                    {
                        "port": 80,
                        "targetPort": 8000 if "api" in deployment_name else 3000,
                        "protocol": "TCP"
                    }
                ],
                "type": "ClusterIP"
            }
        }
        
        self.apply_manifest(service_manifest)
    
    def get_service_endpoint(self, service_name: str) -> str:
        """Get service endpoint for health checks"""
        output = self.run_kubectl([
            "get", "service", service_name,
            "-n", self.namespace, "-o", "json"
        ])
        service = json.loads(output)
        
        cluster_ip = service["spec"]["clusterIP"]
        port = service["spec"]["ports"][0]["port"]
        
        return f"{cluster_ip}:{port}"
    
    def switch_traffic(self, deployment_name: str, new_color: str) -> None:
        """Switch traffic to the new deployment"""
        print(f"Switching traffic to {deployment_name}-{new_color}...")
        
        service_name = deployment_name.replace("frontier-", "frontier-") + "-service"
        
        # Update service selector to point to new color
        patch = {
            "spec": {
                "selector": {
                    "app": deployment_name.replace("frontier-", "frontier-"),
                    "color": new_color
                }
            }
        }
        
        patch_json = json.dumps(patch)
        self.run_kubectl([
            "patch", "service", service_name,
            "-n", self.namespace,
            "--type", "merge",
            "-p", patch_json
        ])
        
        print(f"Traffic switched to {deployment_name}-{new_color}")
    
    def cleanup_old_deployment(self, deployment_name: str, old_color: str) -> None:
        """Clean up the old deployment"""
        print(f"Cleaning up old deployment {deployment_name}-{old_color}...")
        
        try:
            # Scale down old deployment
            self.run_kubectl([
                "scale", "deployment", f"{deployment_name}-{old_color}",
                "-n", self.namespace, "--replicas=0"
            ])
            
            # Wait a bit before deleting
            time.sleep(30)
            
            # Delete old deployment
            self.run_kubectl([
                "delete", "deployment", f"{deployment_name}-{old_color}",
                "-n", self.namespace
            ])
            
            # Clean up temporary services
            try:
                temp_service = f"{deployment_name.replace('frontier-', 'frontier-')}-service-{old_color}"
                self.run_kubectl([
                    "delete", "service", temp_service,
                    "-n", self.namespace
                ])
            except RuntimeError:
                pass  # Service might not exist
                
            print(f"Cleaned up {deployment_name}-{old_color}")
            
        except RuntimeError as e:
            print(f"Warning: Failed to cleanup old deployment: {e}")
    
    def rollback(self, deployment_name: str, old_color: str, new_color: str) -> None:
        """Rollback to the previous deployment"""
        print(f"Rolling back to {deployment_name}-{old_color}...")
        
        # Switch traffic back
        if old_color:
            self.switch_traffic(deployment_name, old_color)
        
        # Clean up failed green deployment
        try:
            self.run_kubectl([
                "delete", "deployment", f"{deployment_name}-{new_color}",
                "-n", self.namespace
            ])
        except RuntimeError:
            pass
        
        print("Rollback completed")
    
    def deploy(self, deployment_name: str, image: str) -> bool:
        """Execute blue-green deployment"""
        print(f"Starting blue-green deployment for {deployment_name}")
        print(f"New image: {image}")
        
        # Determine current color and new color
        current_color = self.get_current_deployment_color(deployment_name)
        new_color = "green" if current_color == "blue" else "blue"
        
        print(f"Current color: {current_color}")
        print(f"New color: {new_color}")
        
        try:
            # Create new deployment
            manifest = self.create_deployment_manifest(deployment_name, image, new_color)
            self.apply_manifest(manifest)
            
            # Wait for new deployment to be ready
            self.wait_for_deployment_ready(f"{deployment_name}-{new_color}")
            
            # Run health checks
            if not self.run_health_checks(deployment_name, new_color):
                raise RuntimeError("Health checks failed")
            
            # Switch traffic
            self.switch_traffic(deployment_name, new_color)
            
            # Final verification
            time.sleep(30)  # Allow time for traffic switch
            if not self.run_health_checks(deployment_name, new_color):
                raise RuntimeError("Post-switch health checks failed")
            
            # Clean up old deployment
            if current_color:
                self.cleanup_old_deployment(deployment_name, current_color)
            
            print(f"Blue-green deployment completed successfully for {deployment_name}")
            return True
            
        except Exception as e:
            print(f"Deployment failed: {e}")
            self.rollback(deployment_name, current_color, new_color)
            return False


def main():
    parser = argparse.ArgumentParser(description="Blue-Green Deployment for Frontier")
    parser.add_argument("--api-image", required=True, help="API container image")
    parser.add_argument("--web-image", required=True, help="Web container image")
    parser.add_argument("--ml-image", required=True, help="ML container image")
    parser.add_argument("--namespace", default="frontier", help="Kubernetes namespace")
    parser.add_argument("--timeout", type=int, default=600, help="Deployment timeout in seconds")
    
    args = parser.parse_args()
    
    deployer = BlueGreenDeployment(args.namespace, args.timeout)
    
    deployments = [
        ("frontier-api", args.api_image),
        ("frontier-web", args.web_image),
        ("frontier-ml", args.ml_image)
    ]
    
    success = True
    for deployment_name, image in deployments:
        if not deployer.deploy(deployment_name, image):
            success = False
            break
    
    if success:
        print("All deployments completed successfully")
        sys.exit(0)
    else:
        print("Deployment failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
