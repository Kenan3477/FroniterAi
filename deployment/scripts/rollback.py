#!/usr/bin/env python3
"""
Rollback Script for Frontier Deployments

This script provides automated rollback capabilities for Frontier deployments.
It can rollback to previous versions, specific versions, or handle emergency rollbacks.
"""

import argparse
import json
import subprocess
import time
import sys
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import yaml


class RollbackManager:
    def __init__(self, namespace: str, timeout: int = 300):
        self.namespace = namespace
        self.timeout = timeout
        
    def run_kubectl(self, args: List[str]) -> str:
        """Run kubectl command and return output"""
        cmd = ["kubectl"] + args
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"kubectl command failed: {' '.join(cmd)}\n{result.stderr}")
        return result.stdout
    
    def get_deployment_history(self, deployment_name: str) -> List[Dict]:
        """Get deployment rollout history"""
        try:
            output = self.run_kubectl([
                "rollout", "history", "deployment", deployment_name,
                "-n", self.namespace, "-o", "json"
            ])
            return json.loads(output)
        except RuntimeError as e:
            print(f"Failed to get deployment history for {deployment_name}: {e}")
            return []
    
    def get_current_revision(self, deployment_name: str) -> Optional[int]:
        """Get current revision number of deployment"""
        try:
            output = self.run_kubectl([
                "get", "deployment", deployment_name,
                "-n", self.namespace, "-o", "json"
            ])
            deployment = json.loads(output)
            return deployment.get("metadata", {}).get("annotations", {}).get("deployment.kubernetes.io/revision")
        except RuntimeError:
            return None
    
    def get_deployment_image(self, deployment_name: str, revision: Optional[int] = None) -> Optional[str]:
        """Get the image for a specific revision"""
        try:
            if revision:
                output = self.run_kubectl([
                    "rollout", "history", "deployment", deployment_name,
                    "-n", self.namespace, f"--revision={revision}", "-o", "json"
                ])
            else:
                output = self.run_kubectl([
                    "get", "deployment", deployment_name,
                    "-n", self.namespace, "-o", "json"
                ])
            
            deployment = json.loads(output)
            containers = deployment.get("spec", {}).get("template", {}).get("spec", {}).get("containers", [])
            
            if containers:
                return containers[0].get("image")
                
        except RuntimeError:
            pass
        
        return None
    
    def create_backup(self, deployment_name: str) -> str:
        """Create a backup of current deployment configuration"""
        backup_file = f"{deployment_name}-backup-{int(time.time())}.yaml"
        
        try:
            output = self.run_kubectl([
                "get", "deployment", deployment_name,
                "-n", self.namespace, "-o", "yaml"
            ])
            
            with open(backup_file, 'w') as f:
                f.write(output)
            
            print(f"Created backup: {backup_file}")
            return backup_file
            
        except Exception as e:
            print(f"Failed to create backup: {e}")
            return ""
    
    def rollback_to_revision(self, deployment_name: str, revision: int) -> bool:
        """Rollback deployment to specific revision"""
        print(f"Rolling back {deployment_name} to revision {revision}...")
        
        try:
            # Create backup before rollback
            backup_file = self.create_backup(deployment_name)
            
            # Perform rollback
            self.run_kubectl([
                "rollout", "undo", "deployment", deployment_name,
                "-n", self.namespace, f"--to-revision={revision}"
            ])
            
            # Wait for rollback to complete
            self.run_kubectl([
                "rollout", "status", "deployment", deployment_name,
                "-n", self.namespace, f"--timeout={self.timeout}s"
            ])
            
            print(f"Successfully rolled back {deployment_name} to revision {revision}")
            return True
            
        except RuntimeError as e:
            print(f"Rollback failed for {deployment_name}: {e}")
            return False
    
    def rollback_to_previous(self, deployment_name: str) -> bool:
        """Rollback deployment to previous revision"""
        print(f"Rolling back {deployment_name} to previous revision...")
        
        try:
            # Create backup before rollback
            backup_file = self.create_backup(deployment_name)
            
            # Perform rollback to previous revision
            self.run_kubectl([
                "rollout", "undo", "deployment", deployment_name,
                "-n", self.namespace
            ])
            
            # Wait for rollback to complete
            self.run_kubectl([
                "rollout", "status", "deployment", deployment_name,
                "-n", self.namespace, f"--timeout={self.timeout}s"
            ])
            
            print(f"Successfully rolled back {deployment_name} to previous revision")
            return True
            
        except RuntimeError as e:
            print(f"Rollback failed for {deployment_name}: {e}")
            return False
    
    def rollback_to_image(self, deployment_name: str, image: str) -> bool:
        """Rollback deployment to specific image"""
        print(f"Rolling back {deployment_name} to image {image}...")
        
        try:
            # Create backup before rollback
            backup_file = self.create_backup(deployment_name)
            
            # Update deployment with specific image
            self.run_kubectl([
                "set", "image", f"deployment/{deployment_name}",
                f"{deployment_name.split('-')[-1]}={image}",
                "-n", self.namespace
            ])
            
            # Wait for rollback to complete
            self.run_kubectl([
                "rollout", "status", "deployment", deployment_name,
                "-n", self.namespace, f"--timeout={self.timeout}s"
            ])
            
            print(f"Successfully rolled back {deployment_name} to image {image}")
            return True
            
        except RuntimeError as e:
            print(f"Rollback failed for {deployment_name}: {e}")
            return False
    
    def verify_rollback(self, deployment_name: str) -> bool:
        """Verify that rollback was successful"""
        print(f"Verifying rollback for {deployment_name}...")
        
        try:
            # Check deployment status
            output = self.run_kubectl([
                "get", "deployment", deployment_name,
                "-n", self.namespace, "-o", "json"
            ])
            deployment = json.loads(output)
            
            ready_replicas = deployment.get("status", {}).get("readyReplicas", 0)
            desired_replicas = deployment.get("spec", {}).get("replicas", 0)
            
            if ready_replicas != desired_replicas:
                print(f"Rollback verification failed: {ready_replicas}/{desired_replicas} replicas ready")
                return False
            
            # Check pod status
            output = self.run_kubectl([
                "get", "pods", "-l", f"app={deployment_name.replace('frontier-', 'frontier-')}",
                "-n", self.namespace, "-o", "json"
            ])
            pods = json.loads(output)
            
            for pod in pods.get("items", []):
                pod_status = pod.get("status", {}).get("phase", "")
                if pod_status != "Running":
                    print(f"Pod {pod['metadata']['name']} is not running: {pod_status}")
                    return False
            
            print(f"Rollback verification successful for {deployment_name}")
            return True
            
        except RuntimeError as e:
            print(f"Rollback verification failed: {e}")
            return False
    
    def emergency_rollback(self, deployment_names: List[str]) -> bool:
        """Perform emergency rollback for multiple deployments"""
        print("Starting emergency rollback...")
        
        success = True
        for deployment_name in deployment_names:
            print(f"Emergency rollback for {deployment_name}")
            
            if not self.rollback_to_previous(deployment_name):
                success = False
                continue
            
            if not self.verify_rollback(deployment_name):
                success = False
                print(f"Emergency rollback verification failed for {deployment_name}")
        
        return success
    
    def get_rollback_candidates(self) -> List[Tuple[str, int, str]]:
        """Get list of deployments that can be rolled back"""
        candidates = []
        
        try:
            output = self.run_kubectl([
                "get", "deployments", "-n", self.namespace, "-o", "json"
            ])
            deployments = json.loads(output)
            
            for deployment in deployments.get("items", []):
                name = deployment["metadata"]["name"]
                current_revision = self.get_current_revision(name)
                current_image = self.get_deployment_image(name)
                
                if current_revision and current_image:
                    candidates.append((name, int(current_revision), current_image))
            
        except RuntimeError as e:
            print(f"Failed to get rollback candidates: {e}")
        
        return candidates
    
    def list_available_revisions(self, deployment_name: str) -> None:
        """List available revisions for a deployment"""
        print(f"Available revisions for {deployment_name}:")
        
        try:
            output = self.run_kubectl([
                "rollout", "history", "deployment", deployment_name,
                "-n", self.namespace
            ])
            print(output)
            
        except RuntimeError as e:
            print(f"Failed to get revision history: {e}")
    
    def get_revision_details(self, deployment_name: str, revision: int) -> None:
        """Get details for a specific revision"""
        print(f"Details for {deployment_name} revision {revision}:")
        
        try:
            output = self.run_kubectl([
                "rollout", "history", "deployment", deployment_name,
                "-n", self.namespace, f"--revision={revision}"
            ])
            print(output)
            
        except RuntimeError as e:
            print(f"Failed to get revision details: {e}")


def main():
    parser = argparse.ArgumentParser(description="Rollback Manager for Frontier")
    parser.add_argument("--namespace", default="frontier", help="Kubernetes namespace")
    parser.add_argument("--timeout", type=int, default=300, help="Rollback timeout in seconds")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Rollback to previous revision
    previous_parser = subparsers.add_parser("previous", help="Rollback to previous revision")
    previous_parser.add_argument("deployment", help="Deployment name")
    
    # Rollback to specific revision
    revision_parser = subparsers.add_parser("revision", help="Rollback to specific revision")
    revision_parser.add_argument("deployment", help="Deployment name")
    revision_parser.add_argument("revision", type=int, help="Revision number")
    
    # Rollback to specific image
    image_parser = subparsers.add_parser("image", help="Rollback to specific image")
    image_parser.add_argument("deployment", help="Deployment name")
    image_parser.add_argument("image", help="Container image")
    
    # Emergency rollback
    emergency_parser = subparsers.add_parser("emergency", help="Emergency rollback all deployments")
    
    # List revisions
    list_parser = subparsers.add_parser("list", help="List available revisions")
    list_parser.add_argument("deployment", help="Deployment name")
    
    # Get revision details
    details_parser = subparsers.add_parser("details", help="Get revision details")
    details_parser.add_argument("deployment", help="Deployment name")
    details_parser.add_argument("revision", type=int, help="Revision number")
    
    # Show candidates
    candidates_parser = subparsers.add_parser("candidates", help="Show rollback candidates")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    rollback_manager = RollbackManager(args.namespace, args.timeout)
    
    if args.command == "previous":
        success = rollback_manager.rollback_to_previous(args.deployment)
        if success:
            success = rollback_manager.verify_rollback(args.deployment)
    
    elif args.command == "revision":
        success = rollback_manager.rollback_to_revision(args.deployment, args.revision)
        if success:
            success = rollback_manager.verify_rollback(args.deployment)
    
    elif args.command == "image":
        success = rollback_manager.rollback_to_image(args.deployment, args.image)
        if success:
            success = rollback_manager.verify_rollback(args.deployment)
    
    elif args.command == "emergency":
        deployments = ["frontier-api", "frontier-web", "frontier-ml"]
        success = rollback_manager.emergency_rollback(deployments)
    
    elif args.command == "list":
        rollback_manager.list_available_revisions(args.deployment)
        success = True
    
    elif args.command == "details":
        rollback_manager.get_revision_details(args.deployment, args.revision)
        success = True
    
    elif args.command == "candidates":
        candidates = rollback_manager.get_rollback_candidates()
        print("Rollback candidates:")
        for name, revision, image in candidates:
            print(f"  {name}: revision {revision}, image {image}")
        success = True
    
    else:
        print(f"Unknown command: {args.command}")
        success = False
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
