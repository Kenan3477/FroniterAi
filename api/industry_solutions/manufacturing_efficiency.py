"""
Manufacturing Efficiency and Supply Chain Module
Comprehensive manufacturing analytics and supply chain optimization
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
import statistics

class ProductionStatus(Enum):
    """Production order status"""
    PLANNED = "planned"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"

class QualityStatus(Enum):
    """Quality control status"""
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    REWORK = "rework"
    QUARANTINE = "quarantine"

class EquipmentStatus(Enum):
    """Equipment status"""
    OPERATIONAL = "operational"
    MAINTENANCE = "maintenance"
    BREAKDOWN = "breakdown"
    IDLE = "idle"
    SETUP = "setup"

class SupplierRating(Enum):
    """Supplier performance rating"""
    EXCELLENT = "excellent"
    GOOD = "good"
    AVERAGE = "average"
    POOR = "poor"
    CRITICAL = "critical"

@dataclass
class Product:
    """Product definition"""
    id: str
    sku: str
    name: str
    description: str
    category: str
    unit_of_measure: str
    standard_cost: Decimal
    selling_price: Decimal
    lead_time_days: int
    safety_stock_level: int
    reorder_point: int
    is_active: bool = True
    created_date: datetime = field(default_factory=datetime.now)

@dataclass
class BillOfMaterials:
    """Bill of Materials (BOM)"""
    id: str
    product_id: str
    version: str
    effective_date: datetime
    components: List[Dict[str, Any]]  # Component materials and quantities
    total_material_cost: Decimal = Decimal('0')
    labor_cost_per_unit: Decimal = Decimal('0')
    overhead_cost_per_unit: Decimal = Decimal('0')
    is_active: bool = True

@dataclass
class WorkCenter:
    """Manufacturing work center"""
    id: str
    name: str
    department: str
    capacity_per_hour: int
    hourly_rate: Decimal
    setup_time_minutes: int
    efficiency_factor: float = 1.0
    utilization_target: float = 0.85
    is_active: bool = True

@dataclass
class Equipment:
    """Manufacturing equipment"""
    id: str
    name: str
    work_center_id: str
    equipment_type: str
    manufacturer: str
    model: str
    serial_number: str
    purchase_date: datetime
    last_maintenance_date: datetime
    next_maintenance_date: datetime
    status: EquipmentStatus = EquipmentStatus.OPERATIONAL
    oee_target: float = 0.85  # Overall Equipment Effectiveness target

@dataclass
class ProductionOrder:
    """Production order"""
    id: str
    product_id: str
    quantity_ordered: int
    quantity_completed: int
    quantity_scrapped: int
    planned_start_date: datetime
    planned_end_date: datetime
    actual_start_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    status: ProductionStatus = ProductionStatus.PLANNED
    priority: int = 5  # 1-10, 10 being highest
    work_center_id: str = ""
    assigned_operator: str = ""
    notes: str = ""

@dataclass
class WorkOrder:
    """Individual work order within production order"""
    id: str
    production_order_id: str
    work_center_id: str
    operation_sequence: int
    operation_description: str
    setup_time_planned: int  # minutes
    run_time_planned: int    # minutes
    setup_time_actual: int = 0
    run_time_actual: int = 0
    quantity_completed: int = 0
    quantity_scrapped: int = 0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    operator_id: str = ""
    status: ProductionStatus = ProductionStatus.PLANNED

@dataclass
class QualityCheck:
    """Quality control check"""
    id: str
    product_id: str
    production_order_id: str
    check_type: str  # incoming, in_process, final
    check_date: datetime
    inspector_id: str
    test_results: Dict[str, Any]
    status: QualityStatus
    defect_codes: List[str] = field(default_factory=list)
    corrective_actions: List[str] = field(default_factory=list)
    notes: str = ""

@dataclass
class MaterialMovement:
    """Material movement tracking"""
    id: str
    material_id: str
    from_location: str
    to_location: str
    quantity: int
    movement_type: str  # receipt, issue, transfer, adjustment
    reference_id: str  # PO, work order, etc.
    movement_date: datetime
    operator_id: str
    cost_per_unit: Decimal = Decimal('0')

@dataclass
class Supplier:
    """Supplier information"""
    id: str
    name: str
    contact_person: str
    email: str
    phone: str
    address: Dict[str, str]
    payment_terms: str
    lead_time_days: int
    minimum_order_quantity: int
    rating: SupplierRating = SupplierRating.AVERAGE
    is_active: bool = True
    certification_status: Dict[str, bool] = field(default_factory=dict)

@dataclass
class PurchaseOrder:
    """Purchase order"""
    id: str
    supplier_id: str
    order_date: datetime
    expected_delivery_date: datetime
    actual_delivery_date: Optional[datetime] = None
    total_amount: Decimal
    status: str = "pending"  # pending, confirmed, shipped, received, cancelled
    line_items: List[Dict[str, Any]] = field(default_factory=list)
    quality_inspection_required: bool = True

class ManufacturingMetricsCalculator:
    """Manufacturing metrics and KPI calculator"""
    
    def __init__(self):
        self.products: List[Product] = []
        self.boms: List[BillOfMaterials] = []
        self.work_centers: List[WorkCenter] = []
        self.equipment: List[Equipment] = []
        self.production_orders: List[ProductionOrder] = []
        self.work_orders: List[WorkOrder] = []
        self.quality_checks: List[QualityCheck] = []
        self.material_movements: List[MaterialMovement] = []
    
    def calculate_oee(self, equipment_id: str, start_date: datetime, 
                     end_date: datetime) -> Dict[str, Any]:
        """Calculate Overall Equipment Effectiveness (OEE)"""
        
        # Get equipment info
        equipment = next((e for e in self.equipment if e.id == equipment_id), None)
        if not equipment:
            return {"error": "Equipment not found"}
        
        # Get work orders for this equipment's work center in the time period
        relevant_work_orders = [
            wo for wo in self.work_orders
            if (wo.work_center_id == equipment.work_center_id and
                wo.start_time and wo.end_time and
                start_date <= wo.start_time <= end_date)
        ]
        
        if not relevant_work_orders:
            return {"error": "No work orders found for the period"}
        
        # Calculate availability
        total_planned_time = (end_date - start_date).total_seconds() / 60  # minutes
        total_downtime = self._calculate_downtime(equipment_id, start_date, end_date)
        available_time = total_planned_time - total_downtime
        availability = available_time / total_planned_time if total_planned_time > 0 else 0
        
        # Calculate performance
        total_runtime = sum([wo.run_time_actual for wo in relevant_work_orders])
        ideal_runtime = sum([wo.run_time_planned for wo in relevant_work_orders])
        performance = ideal_runtime / total_runtime if total_runtime > 0 else 0
        
        # Calculate quality
        total_produced = sum([wo.quantity_completed for wo in relevant_work_orders])
        total_good = total_produced - sum([wo.quantity_scrapped for wo in relevant_work_orders])
        quality = total_good / total_produced if total_produced > 0 else 0
        
        # Calculate OEE
        oee = availability * performance * quality
        
        return {
            "equipment_id": equipment_id,
            "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            "availability": round(availability * 100, 2),
            "performance": round(performance * 100, 2),
            "quality": round(quality * 100, 2),
            "oee": round(oee * 100, 2),
            "target_oee": equipment.oee_target * 100,
            "meets_target": oee >= equipment.oee_target,
            "total_planned_time_minutes": total_planned_time,
            "total_downtime_minutes": total_downtime,
            "total_produced": total_produced,
            "total_good": total_good
        }
    
    def _calculate_downtime(self, equipment_id: str, start_date: datetime, 
                          end_date: datetime) -> float:
        """Calculate equipment downtime in minutes"""
        # This would typically track maintenance, breakdowns, etc.
        # For now, return simulated downtime
        equipment = next((e for e in self.equipment if e.id == equipment_id), None)
        
        if equipment and equipment.status in [EquipmentStatus.MAINTENANCE, EquipmentStatus.BREAKDOWN]:
            # Assume 10% downtime for equipment in maintenance/breakdown status
            total_time = (end_date - start_date).total_seconds() / 60
            return total_time * 0.1
        
        return 0  # No downtime tracked
    
    def calculate_cycle_time(self, product_id: str, days: int = 30) -> Dict[str, Any]:
        """Calculate manufacturing cycle time for a product"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get completed production orders for the product
        completed_orders = [
            po for po in self.production_orders
            if (po.product_id == product_id and
                po.status == ProductionStatus.COMPLETED and
                po.actual_start_date and po.actual_end_date and
                start_date <= po.actual_end_date <= end_date)
        ]
        
        if not completed_orders:
            return {"error": "No completed orders found for the period"}
        
        # Calculate cycle times
        cycle_times = []
        for order in completed_orders:
            cycle_time_hours = (order.actual_end_date - order.actual_start_date).total_seconds() / 3600
            cycle_times.append(cycle_time_hours)
        
        # Calculate statistics
        avg_cycle_time = statistics.mean(cycle_times)
        min_cycle_time = min(cycle_times)
        max_cycle_time = max(cycle_times)
        std_dev = statistics.stdev(cycle_times) if len(cycle_times) > 1 else 0
        
        # Calculate throughput
        total_quantity = sum([order.quantity_completed for order in completed_orders])
        avg_throughput = total_quantity / len(completed_orders) if completed_orders else 0
        
        return {
            "product_id": product_id,
            "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            "orders_analyzed": len(completed_orders),
            "average_cycle_time_hours": round(avg_cycle_time, 2),
            "min_cycle_time_hours": round(min_cycle_time, 2),
            "max_cycle_time_hours": round(max_cycle_time, 2),
            "cycle_time_std_dev": round(std_dev, 2),
            "total_quantity_produced": total_quantity,
            "average_throughput_per_order": round(avg_throughput, 2),
            "cycle_time_distribution": self._calculate_cycle_time_distribution(cycle_times)
        }
    
    def _calculate_cycle_time_distribution(self, cycle_times: List[float]) -> Dict[str, int]:
        """Calculate cycle time distribution buckets"""
        if not cycle_times:
            return {}
        
        max_time = max(cycle_times)
        bucket_size = max_time / 5  # 5 buckets
        
        distribution = {
            f"0-{bucket_size:.1f}h": 0,
            f"{bucket_size:.1f}-{bucket_size*2:.1f}h": 0,
            f"{bucket_size*2:.1f}-{bucket_size*3:.1f}h": 0,
            f"{bucket_size*3:.1f}-{bucket_size*4:.1f}h": 0,
            f"{bucket_size*4:.1f}h+": 0
        }
        
        for cycle_time in cycle_times:
            if cycle_time <= bucket_size:
                distribution[f"0-{bucket_size:.1f}h"] += 1
            elif cycle_time <= bucket_size * 2:
                distribution[f"{bucket_size:.1f}-{bucket_size*2:.1f}h"] += 1
            elif cycle_time <= bucket_size * 3:
                distribution[f"{bucket_size*2:.1f}-{bucket_size*3:.1f}h"] += 1
            elif cycle_time <= bucket_size * 4:
                distribution[f"{bucket_size*3:.1f}-{bucket_size*4:.1f}h"] += 1
            else:
                distribution[f"{bucket_size*4:.1f}h+"] += 1
        
        return distribution
    
    def calculate_first_pass_yield(self, product_id: str = None, days: int = 30) -> Dict[str, Any]:
        """Calculate first pass yield (quality metric)"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Filter quality checks
        quality_checks = [
            qc for qc in self.quality_checks
            if (start_date <= qc.check_date <= end_date and
                qc.check_type == "final" and
                (product_id is None or qc.product_id == product_id))
        ]
        
        if not quality_checks:
            return {"error": "No quality checks found for the period"}
        
        total_checks = len(quality_checks)
        passed_checks = len([qc for qc in quality_checks if qc.status == QualityStatus.PASSED])
        failed_checks = len([qc for qc in quality_checks if qc.status == QualityStatus.FAILED])
        rework_checks = len([qc for qc in quality_checks if qc.status == QualityStatus.REWORK])
        
        first_pass_yield = (passed_checks / total_checks * 100) if total_checks > 0 else 0
        
        # Analyze defect patterns
        all_defects = []
        for qc in quality_checks:
            if qc.status != QualityStatus.PASSED:
                all_defects.extend(qc.defect_codes)
        
        defect_frequency = {}
        for defect in all_defects:
            defect_frequency[defect] = defect_frequency.get(defect, 0) + 1
        
        top_defects = sorted(defect_frequency.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "product_id": product_id or "all_products",
            "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            "total_quality_checks": total_checks,
            "passed": passed_checks,
            "failed": failed_checks,
            "rework": rework_checks,
            "first_pass_yield": round(first_pass_yield, 2),
            "quality_rate": round((passed_checks + rework_checks) / total_checks * 100, 2) if total_checks > 0 else 0,
            "top_defect_codes": [{"defect": defect, "frequency": freq} for defect, freq in top_defects],
            "yield_trend": self._calculate_yield_trend(product_id, start_date, end_date)
        }
    
    def _calculate_yield_trend(self, product_id: str, start_date: datetime, 
                              end_date: datetime) -> List[Dict[str, Any]]:
        """Calculate weekly yield trend"""
        current_date = start_date
        trend_data = []
        
        while current_date < end_date:
            week_end = min(current_date + timedelta(days=7), end_date)
            
            week_checks = [
                qc for qc in self.quality_checks
                if (current_date <= qc.check_date < week_end and
                    qc.check_type == "final" and
                    (product_id is None or qc.product_id == product_id))
            ]
            
            if week_checks:
                total = len(week_checks)
                passed = len([qc for qc in week_checks if qc.status == QualityStatus.PASSED])
                yield_rate = (passed / total * 100) if total > 0 else 0
                
                trend_data.append({
                    "week_start": current_date.strftime('%Y-%m-%d'),
                    "total_checks": total,
                    "yield_rate": round(yield_rate, 2)
                })
            
            current_date = week_end
        
        return trend_data
    
    def calculate_work_center_efficiency(self, work_center_id: str, days: int = 30) -> Dict[str, Any]:
        """Calculate work center efficiency metrics"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        work_center = next((wc for wc in self.work_centers if wc.id == work_center_id), None)
        if not work_center:
            return {"error": "Work center not found"}
        
        # Get work orders for this work center
        work_orders = [
            wo for wo in self.work_orders
            if (wo.work_center_id == work_center_id and
                wo.start_time and wo.end_time and
                start_date <= wo.start_time <= end_date)
        ]
        
        if not work_orders:
            return {"error": "No work orders found for the period"}
        
        # Calculate efficiency metrics
        total_planned_time = sum([wo.setup_time_planned + wo.run_time_planned for wo in work_orders])
        total_actual_time = sum([wo.setup_time_actual + wo.run_time_actual for wo in work_orders])
        
        efficiency = (total_planned_time / total_actual_time * 100) if total_actual_time > 0 else 0
        
        # Calculate utilization
        period_hours = (end_date - start_date).total_seconds() / 3600
        available_hours = period_hours * work_center.efficiency_factor
        actual_hours = total_actual_time / 60  # Convert minutes to hours
        utilization = (actual_hours / available_hours * 100) if available_hours > 0 else 0
        
        # Calculate throughput
        total_quantity = sum([wo.quantity_completed for wo in work_orders])
        throughput = total_quantity / len(work_orders) if work_orders else 0
        
        # Calculate setup efficiency
        total_planned_setup = sum([wo.setup_time_planned for wo in work_orders])
        total_actual_setup = sum([wo.setup_time_actual for wo in work_orders])
        setup_efficiency = (total_planned_setup / total_actual_setup * 100) if total_actual_setup > 0 else 0
        
        return {
            "work_center_id": work_center_id,
            "work_center_name": work_center.name,
            "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            "total_work_orders": len(work_orders),
            "efficiency_percentage": round(efficiency, 2),
            "utilization_percentage": round(utilization, 2),
            "utilization_target": work_center.utilization_target * 100,
            "meets_utilization_target": utilization >= work_center.utilization_target * 100,
            "setup_efficiency_percentage": round(setup_efficiency, 2),
            "average_throughput": round(throughput, 2),
            "total_planned_hours": round(total_planned_time / 60, 2),
            "total_actual_hours": round(total_actual_time / 60, 2),
            "performance_trends": self._calculate_work_center_trends(work_center_id, start_date, end_date)
        }
    
    def _calculate_work_center_trends(self, work_center_id: str, start_date: datetime, 
                                     end_date: datetime) -> List[Dict[str, Any]]:
        """Calculate work center performance trends"""
        current_date = start_date
        trend_data = []
        
        while current_date < end_date:
            week_end = min(current_date + timedelta(days=7), end_date)
            
            week_orders = [
                wo for wo in self.work_orders
                if (wo.work_center_id == work_center_id and
                    wo.start_time and wo.end_time and
                    current_date <= wo.start_time < week_end)
            ]
            
            if week_orders:
                planned_time = sum([wo.setup_time_planned + wo.run_time_planned for wo in week_orders])
                actual_time = sum([wo.setup_time_actual + wo.run_time_actual for wo in week_orders])
                efficiency = (planned_time / actual_time * 100) if actual_time > 0 else 0
                
                trend_data.append({
                    "week_start": current_date.strftime('%Y-%m-%d'),
                    "work_orders": len(week_orders),
                    "efficiency": round(efficiency, 2)
                })
            
            current_date = week_end
        
        return trend_data
    
    def analyze_production_schedule_performance(self, days: int = 30) -> Dict[str, Any]:
        """Analyze production schedule adherence"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get production orders that should have been completed in the period
        scheduled_orders = [
            po for po in self.production_orders
            if start_date <= po.planned_end_date <= end_date
        ]
        
        if not scheduled_orders:
            return {"error": "No scheduled orders found for the period"}
        
        # Analyze schedule performance
        on_time_orders = []
        late_orders = []
        early_orders = []
        
        for order in scheduled_orders:
            if order.status == ProductionStatus.COMPLETED and order.actual_end_date:
                if order.actual_end_date <= order.planned_end_date:
                    if order.actual_end_date < order.planned_end_date - timedelta(days=1):
                        early_orders.append(order)
                    else:
                        on_time_orders.append(order)
                else:
                    late_orders.append(order)
        
        total_completed = len(on_time_orders) + len(late_orders) + len(early_orders)
        on_time_percentage = (len(on_time_orders) / total_completed * 100) if total_completed > 0 else 0
        
        # Calculate average delays
        late_delays = []
        for order in late_orders:
            delay_days = (order.actual_end_date - order.planned_end_date).days
            late_delays.append(delay_days)
        
        avg_delay = statistics.mean(late_delays) if late_delays else 0
        
        # Calculate quantity performance
        total_planned_quantity = sum([order.quantity_ordered for order in scheduled_orders])
        total_completed_quantity = sum([order.quantity_completed for order in scheduled_orders])
        quantity_performance = (total_completed_quantity / total_planned_quantity * 100) if total_planned_quantity > 0 else 0
        
        return {
            "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            "total_scheduled_orders": len(scheduled_orders),
            "completed_orders": total_completed,
            "on_time_orders": len(on_time_orders),
            "late_orders": len(late_orders),
            "early_orders": len(early_orders),
            "on_time_percentage": round(on_time_percentage, 2),
            "average_delay_days": round(avg_delay, 2),
            "quantity_performance": round(quantity_performance, 2),
            "schedule_adherence_trend": self._calculate_schedule_adherence_trend(start_date, end_date),
            "top_delay_reasons": self._analyze_delay_reasons(late_orders)
        }
    
    def _calculate_schedule_adherence_trend(self, start_date: datetime, 
                                          end_date: datetime) -> List[Dict[str, Any]]:
        """Calculate weekly schedule adherence trend"""
        current_date = start_date
        trend_data = []
        
        while current_date < end_date:
            week_end = min(current_date + timedelta(days=7), end_date)
            
            week_orders = [
                po for po in self.production_orders
                if (current_date <= po.planned_end_date < week_end and
                    po.status == ProductionStatus.COMPLETED and
                    po.actual_end_date)
            ]
            
            if week_orders:
                on_time = len([o for o in week_orders if o.actual_end_date <= o.planned_end_date])
                adherence = (on_time / len(week_orders) * 100) if week_orders else 0
                
                trend_data.append({
                    "week_start": current_date.strftime('%Y-%m-%d'),
                    "orders": len(week_orders),
                    "adherence_percentage": round(adherence, 2)
                })
            
            current_date = week_end
        
        return trend_data
    
    def _analyze_delay_reasons(self, late_orders: List[ProductionOrder]) -> List[Dict[str, Any]]:
        """Analyze reasons for production delays"""
        # This would typically analyze detailed delay reason codes
        # For now, return common delay categories
        
        delay_reasons = {
            "Material shortage": len(late_orders) * 0.3,
            "Equipment breakdown": len(late_orders) * 0.2,
            "Quality issues": len(late_orders) * 0.2,
            "Setup time overrun": len(late_orders) * 0.15,
            "Operator unavailability": len(late_orders) * 0.1,
            "Other": len(late_orders) * 0.05
        }
        
        return [
            {"reason": reason, "frequency": int(frequency)}
            for reason, frequency in delay_reasons.items()
            if frequency > 0
        ]

class SupplyChainAnalyzer:
    """Supply chain optimization and analysis"""
    
    def __init__(self):
        self.suppliers: List[Supplier] = []
        self.purchase_orders: List[PurchaseOrder] = []
        self.material_movements: List[MaterialMovement] = []
    
    def calculate_supplier_performance(self, supplier_id: str, days: int = 90) -> Dict[str, Any]:
        """Calculate comprehensive supplier performance metrics"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        supplier = next((s for s in self.suppliers if s.id == supplier_id), None)
        if not supplier:
            return {"error": "Supplier not found"}
        
        # Get purchase orders for the period
        supplier_pos = [
            po for po in self.purchase_orders
            if (po.supplier_id == supplier_id and
                start_date <= po.order_date <= end_date)
        ]
        
        if not supplier_pos:
            return {"error": "No purchase orders found for the period"}
        
        # Calculate delivery performance
        delivered_pos = [po for po in supplier_pos if po.actual_delivery_date]
        on_time_deliveries = [
            po for po in delivered_pos
            if po.actual_delivery_date <= po.expected_delivery_date
        ]
        
        delivery_performance = (len(on_time_deliveries) / len(delivered_pos) * 100) if delivered_pos else 0
        
        # Calculate lead time performance
        lead_times = []
        for po in delivered_pos:
            lead_time = (po.actual_delivery_date - po.order_date).days
            lead_times.append(lead_time)
        
        avg_lead_time = statistics.mean(lead_times) if lead_times else 0
        
        # Calculate quality performance (would need quality inspection data)
        quality_score = 95.0  # Placeholder - would calculate from actual quality data
        
        # Calculate cost performance
        total_spend = sum([po.total_amount for po in supplier_pos])
        avg_order_value = total_spend / len(supplier_pos) if supplier_pos else 0
        
        # Calculate overall performance score
        performance_score = (delivery_performance * 0.4 + quality_score * 0.4 + 
                           min(100, (supplier.lead_time_days / avg_lead_time * 100)) * 0.2) if avg_lead_time > 0 else 0
        
        return {
            "supplier_id": supplier_id,
            "supplier_name": supplier.name,
            "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            "total_orders": len(supplier_pos),
            "total_spend": float(total_spend),
            "average_order_value": float(avg_order_value),
            "delivery_performance": round(delivery_performance, 2),
            "average_lead_time_days": round(avg_lead_time, 2),
            "expected_lead_time_days": supplier.lead_time_days,
            "quality_score": quality_score,
            "overall_performance_score": round(performance_score, 2),
            "current_rating": supplier.rating.value,
            "recommended_rating": self._recommend_supplier_rating(performance_score),
            "performance_trends": self._calculate_supplier_trends(supplier_id, start_date, end_date)
        }
    
    def _recommend_supplier_rating(self, performance_score: float) -> str:
        """Recommend supplier rating based on performance score"""
        if performance_score >= 90:
            return SupplierRating.EXCELLENT.value
        elif performance_score >= 80:
            return SupplierRating.GOOD.value
        elif performance_score >= 70:
            return SupplierRating.AVERAGE.value
        elif performance_score >= 60:
            return SupplierRating.POOR.value
        else:
            return SupplierRating.CRITICAL.value
    
    def _calculate_supplier_trends(self, supplier_id: str, start_date: datetime, 
                                  end_date: datetime) -> List[Dict[str, Any]]:
        """Calculate monthly supplier performance trends"""
        current_date = start_date
        trend_data = []
        
        while current_date < end_date:
            month_end = min(current_date + timedelta(days=30), end_date)
            
            month_pos = [
                po for po in self.purchase_orders
                if (po.supplier_id == supplier_id and
                    current_date <= po.order_date < month_end)
            ]
            
            if month_pos:
                delivered = [po for po in month_pos if po.actual_delivery_date]
                on_time = [
                    po for po in delivered
                    if po.actual_delivery_date <= po.expected_delivery_date
                ]
                
                delivery_perf = (len(on_time) / len(delivered) * 100) if delivered else 0
                
                trend_data.append({
                    "month_start": current_date.strftime('%Y-%m-%d'),
                    "orders": len(month_pos),
                    "delivery_performance": round(delivery_perf, 2)
                })
            
            current_date = month_end
        
        return trend_data
    
    def analyze_inventory_optimization(self) -> Dict[str, Any]:
        """Analyze inventory optimization opportunities"""
        # Calculate ABC analysis for materials
        material_usage = {}
        
        for movement in self.material_movements:
            if movement.movement_type == "issue":  # Material used in production
                material_id = movement.material_id
                if material_id not in material_usage:
                    material_usage[material_id] = {
                        "total_quantity": 0,
                        "total_value": 0,
                        "usage_frequency": 0
                    }
                
                material_usage[material_id]["total_quantity"] += movement.quantity
                material_usage[material_id]["total_value"] += float(movement.quantity * movement.cost_per_unit)
                material_usage[material_id]["usage_frequency"] += 1
        
        # Classify materials using ABC analysis
        sorted_materials = sorted(
            material_usage.items(),
            key=lambda x: x[1]["total_value"],
            reverse=True
        )
        
        total_value = sum([data["total_value"] for _, data in sorted_materials])
        
        abc_classification = {}
        cumulative_value = 0
        
        for i, (material_id, data) in enumerate(sorted_materials):
            cumulative_value += data["total_value"]
            cumulative_percentage = cumulative_value / total_value * 100
            
            if cumulative_percentage <= 80:
                classification = "A"
            elif cumulative_percentage <= 95:
                classification = "B"
            else:
                classification = "C"
            
            abc_classification[material_id] = {
                "classification": classification,
                "total_value": data["total_value"],
                "percentage_of_total": data["total_value"] / total_value * 100,
                "usage_frequency": data["usage_frequency"]
            }
        
        # Identify optimization opportunities
        optimization_opportunities = []
        
        # High-value, low-frequency items (candidates for just-in-time)
        for material_id, data in abc_classification.items():
            if data["classification"] == "A" and data["usage_frequency"] < 10:
                optimization_opportunities.append({
                    "material_id": material_id,
                    "opportunity": "Consider just-in-time delivery",
                    "current_value": data["total_value"],
                    "potential_savings": data["total_value"] * 0.15  # 15% inventory reduction
                })
        
        # Low-value, high-frequency items (candidates for bulk ordering)
        for material_id, data in abc_classification.items():
            if data["classification"] == "C" and data["usage_frequency"] > 50:
                optimization_opportunities.append({
                    "material_id": material_id,
                    "opportunity": "Consider bulk ordering",
                    "current_value": data["total_value"],
                    "potential_savings": data["total_value"] * 0.05  # 5% cost reduction
                })
        
        return {
            "abc_classification": abc_classification,
            "total_inventory_value": total_value,
            "optimization_opportunities": optimization_opportunities,
            "summary": {
                "a_items": len([c for c in abc_classification.values() if c["classification"] == "A"]),
                "b_items": len([c for c in abc_classification.values() if c["classification"] == "B"]),
                "c_items": len([c for c in abc_classification.values() if c["classification"] == "C"]),
                "total_potential_savings": sum([opp["potential_savings"] for opp in optimization_opportunities])
            }
        }
    
    def calculate_supply_chain_risk(self) -> Dict[str, Any]:
        """Calculate supply chain risk assessment"""
        risk_factors = []
        overall_risk_score = 0
        
        # Single supplier dependency risk
        supplier_dependencies = {}
        for po in self.purchase_orders:
            supplier_id = po.supplier_id
            supplier_dependencies[supplier_id] = supplier_dependencies.get(supplier_id, 0) + float(po.total_amount)
        
        total_spend = sum(supplier_dependencies.values())
        max_supplier_spend = max(supplier_dependencies.values()) if supplier_dependencies else 0
        supplier_concentration = (max_supplier_spend / total_spend * 100) if total_spend > 0 else 0
        
        if supplier_concentration > 50:
            risk_factors.append({
                "risk_type": "Supplier Concentration",
                "risk_level": "High",
                "description": f"Single supplier represents {supplier_concentration:.1f}% of total spend",
                "mitigation": "Diversify supplier base"
            })
            overall_risk_score += 30
        elif supplier_concentration > 30:
            risk_factors.append({
                "risk_type": "Supplier Concentration",
                "risk_level": "Medium",
                "description": f"Single supplier represents {supplier_concentration:.1f}% of total spend",
                "mitigation": "Monitor supplier concentration"
            })
            overall_risk_score += 15
        
        # Geographic concentration risk
        supplier_locations = {}
        for supplier in self.suppliers:
            country = supplier.address.get("country", "Unknown")
            supplier_locations[country] = supplier_locations.get(country, 0) + 1
        
        total_suppliers = len(self.suppliers)
        max_country_suppliers = max(supplier_locations.values()) if supplier_locations else 0
        geographic_concentration = (max_country_suppliers / total_suppliers * 100) if total_suppliers > 0 else 0
        
        if geographic_concentration > 70:
            risk_factors.append({
                "risk_type": "Geographic Concentration",
                "risk_level": "High",
                "description": f"{geographic_concentration:.1f}% of suppliers in single country",
                "mitigation": "Diversify supplier geographic locations"
            })
            overall_risk_score += 25
        
        # Performance risk
        poor_performers = len([s for s in self.suppliers if s.rating in [SupplierRating.POOR, SupplierRating.CRITICAL]])
        performance_risk = (poor_performers / total_suppliers * 100) if total_suppliers > 0 else 0
        
        if performance_risk > 20:
            risk_factors.append({
                "risk_type": "Supplier Performance",
                "risk_level": "Medium",
                "description": f"{performance_risk:.1f}% of suppliers have poor performance",
                "mitigation": "Implement supplier improvement programs"
            })
            overall_risk_score += 20
        
        # Determine overall risk level
        if overall_risk_score >= 60:
            overall_risk_level = "High"
        elif overall_risk_score >= 30:
            overall_risk_level = "Medium"
        else:
            overall_risk_level = "Low"
        
        return {
            "overall_risk_score": overall_risk_score,
            "overall_risk_level": overall_risk_level,
            "risk_factors": risk_factors,
            "supplier_concentration": round(supplier_concentration, 2),
            "geographic_concentration": round(geographic_concentration, 2),
            "performance_risk": round(performance_risk, 2),
            "total_suppliers": total_suppliers,
            "recommendations": self._generate_risk_mitigation_recommendations(risk_factors)
        }
    
    def _generate_risk_mitigation_recommendations(self, risk_factors: List[Dict[str, Any]]) -> List[str]:
        """Generate risk mitigation recommendations"""
        recommendations = []
        
        high_risks = [r for r in risk_factors if r["risk_level"] == "High"]
        medium_risks = [r for r in risk_factors if r["risk_level"] == "Medium"]
        
        if high_risks:
            recommendations.append("Prioritize addressing high-risk factors immediately")
            for risk in high_risks:
                recommendations.append(risk["mitigation"])
        
        if medium_risks:
            recommendations.append("Develop action plans for medium-risk factors")
        
        recommendations.extend([
            "Implement regular supplier performance reviews",
            "Establish contingency plans for critical suppliers",
            "Monitor supply chain risk indicators continuously",
            "Consider supply chain insurance for critical materials"
        ])
        
        return recommendations[:10]  # Limit to top 10 recommendations

def generate_manufacturing_dashboard(metrics_calculator: ManufacturingMetricsCalculator,
                                   supply_chain_analyzer: SupplyChainAnalyzer) -> Dict[str, Any]:
    """Generate comprehensive manufacturing dashboard"""
    
    dashboard = {
        "dashboard_date": datetime.now(),
        "production_summary": {},
        "quality_summary": {},
        "efficiency_summary": {},
        "supply_chain_summary": {},
        "alerts": []
    }
    
    # Production Summary
    recent_orders = [
        po for po in metrics_calculator.production_orders
        if po.actual_start_date and po.actual_start_date >= datetime.now() - timedelta(days=30)
    ]
    
    completed_orders = [po for po in recent_orders if po.status == ProductionStatus.COMPLETED]
    
    dashboard["production_summary"] = {
        "total_orders_month": len(recent_orders),
        "completed_orders": len(completed_orders),
        "completion_rate": (len(completed_orders) / len(recent_orders) * 100) if recent_orders else 0,
        "total_production_quantity": sum([po.quantity_completed for po in completed_orders]),
        "average_cycle_time": "Calculate per product",  # Would calculate average
        "schedule_adherence": "Calculate from schedule analysis"
    }
    
    # Quality Summary
    recent_quality_checks = [
        qc for qc in metrics_calculator.quality_checks
        if qc.check_date >= datetime.now() - timedelta(days=30)
    ]
    
    passed_checks = [qc for qc in recent_quality_checks if qc.status == QualityStatus.PASSED]
    
    dashboard["quality_summary"] = {
        "total_quality_checks": len(recent_quality_checks),
        "first_pass_yield": (len(passed_checks) / len(recent_quality_checks) * 100) if recent_quality_checks else 0,
        "defect_rate": ((len(recent_quality_checks) - len(passed_checks)) / len(recent_quality_checks) * 100) if recent_quality_checks else 0,
        "top_defects": "Calculate from defect analysis"
    }
    
    # Efficiency Summary
    dashboard["efficiency_summary"] = {
        "average_oee": 75.5,  # Would calculate from all equipment
        "work_center_utilization": 82.3,  # Would calculate average
        "equipment_uptime": 94.2,  # Would calculate from equipment status
        "productivity_trend": "Calculate trend"
    }
    
    # Supply Chain Summary
    dashboard["supply_chain_summary"] = {
        "supplier_performance": 87.5,  # Average supplier performance
        "on_time_delivery": 92.1,  # Average delivery performance
        "supply_chain_risk": "Medium",  # From risk analysis
        "inventory_turnover": 6.5  # Would calculate from inventory data
    }
    
    # Generate Alerts
    alerts = []
    
    # Low OEE alert
    if dashboard["efficiency_summary"]["average_oee"] < 75:
        alerts.append({
            "type": "efficiency",
            "severity": "medium",
            "message": "Overall Equipment Effectiveness below target",
            "action": "Review equipment maintenance and operator training"
        })
    
    # Quality alert
    if dashboard["quality_summary"]["defect_rate"] > 5:
        alerts.append({
            "type": "quality",
            "severity": "high",
            "message": "Defect rate exceeds 5% threshold",
            "action": "Investigate quality control processes"
        })
    
    dashboard["alerts"] = alerts
    
    return dashboard

# Example usage

async def example_manufacturing_analysis():
    """Example of manufacturing efficiency and supply chain analysis"""
    
    # Initialize systems
    metrics_calculator = ManufacturingMetricsCalculator()
    supply_chain_analyzer = SupplyChainAnalyzer()
    
    # Add sample data
    product = Product(
        id="prod_001",
        sku="WIDGET-001",
        name="Premium Widget",
        description="High-quality widget for industrial use",
        category="Widgets",
        unit_of_measure="EA",
        standard_cost=Decimal('25.00'),
        selling_price=Decimal('50.00'),
        lead_time_days=5,
        safety_stock_level=100,
        reorder_point=50
    )
    
    metrics_calculator.products.append(product)
    
    # Add equipment
    equipment = Equipment(
        id="eq_001",
        name="CNC Machine 1",
        work_center_id="wc_001",
        equipment_type="CNC",
        manufacturer="ACME Corp",
        model="CNC-2000",
        serial_number="12345",
        purchase_date=datetime(2020, 1, 1),
        last_maintenance_date=datetime.now() - timedelta(days=30),
        next_maintenance_date=datetime.now() + timedelta(days=60)
    )
    
    metrics_calculator.equipment.append(equipment)
    
    # Add work center
    work_center = WorkCenter(
        id="wc_001",
        name="Machining Center 1",
        department="Production",
        capacity_per_hour=10,
        hourly_rate=Decimal('75.00'),
        setup_time_minutes=30
    )
    
    metrics_calculator.work_centers.append(work_center)
    
    # Add sample production order
    production_order = ProductionOrder(
        id="po_001",
        product_id="prod_001",
        quantity_ordered=100,
        quantity_completed=95,
        quantity_scrapped=5,
        planned_start_date=datetime.now() - timedelta(days=5),
        planned_end_date=datetime.now() - timedelta(days=1),
        actual_start_date=datetime.now() - timedelta(days=5),
        actual_end_date=datetime.now() - timedelta(hours=2),
        status=ProductionStatus.COMPLETED
    )
    
    metrics_calculator.production_orders.append(production_order)
    
    # Add work order
    work_order = WorkOrder(
        id="wo_001",
        production_order_id="po_001",
        work_center_id="wc_001",
        operation_sequence=1,
        operation_description="Machine widget body",
        setup_time_planned=30,
        run_time_planned=120,
        setup_time_actual=35,
        run_time_actual=130,
        quantity_completed=95,
        quantity_scrapped=5,
        start_time=datetime.now() - timedelta(days=5),
        end_time=datetime.now() - timedelta(hours=2),
        status=ProductionStatus.COMPLETED
    )
    
    metrics_calculator.work_orders.append(work_order)
    
    # Calculate OEE
    oee = metrics_calculator.calculate_oee(
        "eq_001",
        datetime.now() - timedelta(days=7),
        datetime.now()
    )
    print(f"Equipment OEE: {oee['oee']}%")
    
    # Calculate work center efficiency
    efficiency = metrics_calculator.calculate_work_center_efficiency("wc_001")
    print(f"Work center efficiency: {efficiency['efficiency_percentage']}%")
    
    # Calculate first pass yield
    # Add quality check first
    quality_check = QualityCheck(
        id="qc_001",
        product_id="prod_001",
        production_order_id="po_001",
        check_type="final",
        check_date=datetime.now() - timedelta(hours=1),
        inspector_id="inspector_001",
        test_results={"dimensional_check": "pass", "surface_finish": "pass"},
        status=QualityStatus.PASSED
    )
    
    metrics_calculator.quality_checks.append(quality_check)
    
    yield_analysis = metrics_calculator.calculate_first_pass_yield("prod_001")
    print(f"First pass yield: {yield_analysis['first_pass_yield']}%")
    
    # Generate dashboard
    dashboard = generate_manufacturing_dashboard(metrics_calculator, supply_chain_analyzer)
    print(f"Manufacturing dashboard generated with {len(dashboard['alerts'])} alerts")
    
    return dashboard

if __name__ == "__main__":
    asyncio.run(example_manufacturing_analysis())
