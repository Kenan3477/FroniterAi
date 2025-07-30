"""
Retail Inventory and Forecasting Module
Comprehensive inventory management and demand forecasting for retail businesses
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import pandas as pd
import numpy as np
from dateutil.relativedelta import relativedelta
import statistics

class InventoryStatus(Enum):
    """Inventory status types"""
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    OVERSTOCK = "overstock"
    DISCONTINUED = "discontinued"

class ForecastMethod(Enum):
    """Forecasting methods"""
    MOVING_AVERAGE = "moving_average"
    EXPONENTIAL_SMOOTHING = "exponential_smoothing"
    LINEAR_TREND = "linear_trend"
    SEASONAL_DECOMPOSITION = "seasonal_decomposition"
    ARIMA = "arima"

class SeasonalityType(Enum):
    """Seasonality patterns"""
    NONE = "none"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"

@dataclass
class Product:
    """Product data structure"""
    id: str
    sku: str
    name: str
    category: str
    subcategory: str = ""
    brand: str = ""
    supplier_id: str = ""
    cost_price: float = 0.0
    selling_price: float = 0.0
    weight: float = 0.0
    dimensions: Dict[str, float] = field(default_factory=dict)
    is_active: bool = True
    created_date: datetime = field(default_factory=datetime.now)
    tags: List[str] = field(default_factory=list)

@dataclass
class InventoryItem:
    """Inventory item data structure"""
    product_id: str
    location_id: str
    quantity_on_hand: int
    quantity_available: int  # On hand - reserved
    quantity_reserved: int
    quantity_on_order: int
    minimum_stock_level: int
    maximum_stock_level: int
    reorder_point: int
    reorder_quantity: int
    last_updated: datetime = field(default_factory=datetime.now)
    cost_per_unit: float = 0.0
    total_value: float = 0.0
    abc_classification: str = "C"  # A, B, or C
    velocity: str = "slow"  # fast, medium, slow
    status: InventoryStatus = InventoryStatus.IN_STOCK

@dataclass
class SalesTransaction:
    """Sales transaction data"""
    id: str
    product_id: str
    location_id: str
    quantity_sold: int
    unit_price: float
    total_amount: float
    transaction_date: datetime
    customer_id: str = ""
    sales_channel: str = "store"  # store, online, mobile
    promotion_code: str = ""
    season: str = ""

@dataclass
class PurchaseOrder:
    """Purchase order data"""
    id: str
    supplier_id: str
    order_date: datetime
    expected_delivery_date: datetime
    actual_delivery_date: Optional[datetime] = None
    status: str = "pending"  # pending, confirmed, shipped, delivered, cancelled
    items: List[Dict[str, Any]] = field(default_factory=list)
    total_cost: float = 0.0

@dataclass
class StockMovement:
    """Stock movement tracking"""
    id: str
    product_id: str
    location_id: str
    movement_type: str  # sale, purchase, adjustment, transfer, return
    quantity_change: int  # Positive for inbound, negative for outbound
    reference_id: str  # Order ID, adjustment ID, etc.
    movement_date: datetime
    reason: str = ""
    cost_impact: float = 0.0

class InventoryManager:
    """Inventory management system"""
    
    def __init__(self):
        self.products: List[Product] = []
        self.inventory: List[InventoryItem] = []
        self.sales_transactions: List[SalesTransaction] = []
        self.purchase_orders: List[PurchaseOrder] = []
        self.stock_movements: List[StockMovement] = []
    
    def add_product(self, product: Product):
        """Add product to catalog"""
        self.products.append(product)
    
    def add_inventory_item(self, item: InventoryItem):
        """Add inventory item"""
        self.inventory.append(item)
    
    def add_sales_transaction(self, transaction: SalesTransaction):
        """Add sales transaction"""
        self.sales_transactions.append(transaction)
        
        # Update inventory
        self.update_inventory_from_sale(transaction)
    
    def update_inventory_from_sale(self, transaction: SalesTransaction):
        """Update inventory quantities after sale"""
        for item in self.inventory:
            if (item.product_id == transaction.product_id and 
                item.location_id == transaction.location_id):
                
                item.quantity_on_hand -= transaction.quantity_sold
                item.quantity_available = max(0, item.quantity_on_hand - item.quantity_reserved)
                item.last_updated = datetime.now()
                
                # Update status
                item.status = self.determine_inventory_status(item)
                
                # Record stock movement
                movement = StockMovement(
                    id=f"mov_{len(self.stock_movements) + 1}",
                    product_id=transaction.product_id,
                    location_id=transaction.location_id,
                    movement_type="sale",
                    quantity_change=-transaction.quantity_sold,
                    reference_id=transaction.id,
                    movement_date=transaction.transaction_date
                )
                self.stock_movements.append(movement)
                break
    
    def determine_inventory_status(self, item: InventoryItem) -> InventoryStatus:
        """Determine inventory status based on quantity levels"""
        if item.quantity_on_hand == 0:
            return InventoryStatus.OUT_OF_STOCK
        elif item.quantity_on_hand <= item.reorder_point:
            return InventoryStatus.LOW_STOCK
        elif item.quantity_on_hand >= item.maximum_stock_level:
            return InventoryStatus.OVERSTOCK
        else:
            return InventoryStatus.IN_STOCK
    
    # Inventory Analysis
    
    def calculate_inventory_turnover(self, product_id: str, location_id: str, 
                                   days: int = 365) -> Dict[str, float]:
        """Calculate inventory turnover ratio"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get sales for the period
        period_sales = [
            t for t in self.sales_transactions
            if (t.product_id == product_id and 
                t.location_id == location_id and
                start_date <= t.transaction_date <= end_date)
        ]
        
        total_sold = sum([t.quantity_sold for t in period_sales])
        cogs = sum([t.quantity_sold * t.unit_price * 0.7 for t in period_sales])  # Assuming 30% margin
        
        # Get average inventory
        inventory_item = next(
            (item for item in self.inventory 
             if item.product_id == product_id and item.location_id == location_id), 
            None
        )
        
        if not inventory_item:
            return {"error": "Inventory item not found"}
        
        avg_inventory_value = inventory_item.quantity_on_hand * inventory_item.cost_per_unit
        
        turnover_ratio = cogs / avg_inventory_value if avg_inventory_value > 0 else 0
        days_in_inventory = 365 / turnover_ratio if turnover_ratio > 0 else 365
        
        return {
            "turnover_ratio": turnover_ratio,
            "days_in_inventory": days_in_inventory,
            "total_sold": total_sold,
            "cogs": cogs,
            "avg_inventory_value": avg_inventory_value
        }
    
    def calculate_abc_analysis(self, location_id: str = None) -> Dict[str, Any]:
        """Perform ABC analysis on products"""
        # Calculate annual sales value for each product
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        
        product_values = {}
        
        for transaction in self.sales_transactions:
            if start_date <= transaction.transaction_date <= end_date:
                if location_id is None or transaction.location_id == location_id:
                    if transaction.product_id not in product_values:
                        product_values[transaction.product_id] = 0
                    product_values[transaction.product_id] += transaction.total_amount
        
        # Sort by value
        sorted_products = sorted(product_values.items(), key=lambda x: x[1], reverse=True)
        total_value = sum(product_values.values())
        
        # Classify products
        classifications = {}
        cumulative_value = 0
        cumulative_percentage = 0
        
        for i, (product_id, value) in enumerate(sorted_products):
            cumulative_value += value
            cumulative_percentage = cumulative_value / total_value * 100
            
            if cumulative_percentage <= 80:
                classification = "A"
            elif cumulative_percentage <= 95:
                classification = "B"
            else:
                classification = "C"
            
            classifications[product_id] = {
                "classification": classification,
                "annual_value": value,
                "percentage_of_total": value / total_value * 100,
                "cumulative_percentage": cumulative_percentage,
                "rank": i + 1
            }
            
            # Update inventory item classification
            for item in self.inventory:
                if item.product_id == product_id:
                    item.abc_classification = classification
        
        # Summary statistics
        a_count = len([c for c in classifications.values() if c["classification"] == "A"])
        b_count = len([c for c in classifications.values() if c["classification"] == "B"])
        c_count = len([c for c in classifications.values() if c["classification"] == "C"])
        
        return {
            "classifications": classifications,
            "summary": {
                "total_products": len(sorted_products),
                "a_products": a_count,
                "b_products": b_count,
                "c_products": c_count,
                "total_value": total_value
            }
        }
    
    def identify_slow_moving_items(self, days_threshold: int = 90) -> List[Dict[str, Any]]:
        """Identify slow-moving inventory items"""
        end_date = datetime.now()
        threshold_date = end_date - timedelta(days=days_threshold)
        
        slow_moving_items = []
        
        for item in self.inventory:
            if item.status == InventoryStatus.DISCONTINUED:
                continue
            
            # Check recent sales
            recent_sales = [
                t for t in self.sales_transactions
                if (t.product_id == item.product_id and 
                    t.location_id == item.location_id and
                    t.transaction_date >= threshold_date)
            ]
            
            total_sold = sum([t.quantity_sold for t in recent_sales])
            
            if total_sold == 0 and item.quantity_on_hand > 0:
                product = next((p for p in self.products if p.id == item.product_id), None)
                
                slow_moving_items.append({
                    "product_id": item.product_id,
                    "product_name": product.name if product else "Unknown",
                    "sku": product.sku if product else "Unknown",
                    "location_id": item.location_id,
                    "quantity_on_hand": item.quantity_on_hand,
                    "inventory_value": item.quantity_on_hand * item.cost_per_unit,
                    "days_without_sale": days_threshold,
                    "last_sale_date": self.get_last_sale_date(item.product_id, item.location_id)
                })
        
        return sorted(slow_moving_items, key=lambda x: x["inventory_value"], reverse=True)
    
    def get_last_sale_date(self, product_id: str, location_id: str) -> Optional[datetime]:
        """Get the last sale date for a product"""
        relevant_sales = [
            t for t in self.sales_transactions
            if t.product_id == product_id and t.location_id == location_id
        ]
        
        if relevant_sales:
            return max([t.transaction_date for t in relevant_sales])
        return None
    
    def generate_reorder_recommendations(self) -> List[Dict[str, Any]]:
        """Generate reorder recommendations"""
        recommendations = []
        
        for item in self.inventory:
            if item.quantity_available <= item.reorder_point:
                product = next((p for p in self.products if p.id == item.product_id), None)
                
                # Calculate suggested order quantity based on lead time and sales velocity
                sales_velocity = self.calculate_sales_velocity(item.product_id, item.location_id)
                lead_time_days = 14  # Default lead time
                safety_stock = max(item.minimum_stock_level, sales_velocity * 7)  # 1 week safety stock
                
                suggested_quantity = max(
                    item.reorder_quantity,
                    (sales_velocity * lead_time_days) + safety_stock - item.quantity_available
                )
                
                recommendations.append({
                    "product_id": item.product_id,
                    "product_name": product.name if product else "Unknown",
                    "sku": product.sku if product else "Unknown",
                    "location_id": item.location_id,
                    "current_quantity": item.quantity_available,
                    "reorder_point": item.reorder_point,
                    "suggested_quantity": int(suggested_quantity),
                    "estimated_cost": suggested_quantity * item.cost_per_unit,
                    "priority": self.calculate_reorder_priority(item),
                    "supplier_id": product.supplier_id if product else ""
                })
        
        return sorted(recommendations, key=lambda x: x["priority"], reverse=True)
    
    def calculate_sales_velocity(self, product_id: str, location_id: str, days: int = 30) -> float:
        """Calculate average daily sales velocity"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        period_sales = [
            t for t in self.sales_transactions
            if (t.product_id == product_id and 
                t.location_id == location_id and
                start_date <= t.transaction_date <= end_date)
        ]
        
        total_sold = sum([t.quantity_sold for t in period_sales])
        return total_sold / days if days > 0 else 0
    
    def calculate_reorder_priority(self, item: InventoryItem) -> int:
        """Calculate reorder priority (1-10, 10 being highest)"""
        if item.quantity_available <= 0:
            return 10  # Out of stock
        elif item.quantity_available <= item.minimum_stock_level * 0.5:
            return 9   # Critical low
        elif item.quantity_available <= item.reorder_point:
            return 7   # Below reorder point
        else:
            return 5   # Standard reorder

class DemandForecaster:
    """Demand forecasting engine"""
    
    def __init__(self, inventory_manager: InventoryManager):
        self.inventory_manager = inventory_manager
    
    def generate_forecast(self, product_id: str, location_id: str, 
                         forecast_days: int = 30, 
                         method: ForecastMethod = ForecastMethod.EXPONENTIAL_SMOOTHING) -> Dict[str, Any]:
        """Generate demand forecast"""
        
        # Get historical sales data
        historical_data = self.get_historical_sales_data(product_id, location_id, days=365)
        
        if len(historical_data) < 7:  # Need at least 1 week of data
            return {"error": "Insufficient historical data for forecasting"}
        
        # Apply forecasting method
        if method == ForecastMethod.MOVING_AVERAGE:
            forecast = self.moving_average_forecast(historical_data, forecast_days)
        elif method == ForecastMethod.EXPONENTIAL_SMOOTHING:
            forecast = self.exponential_smoothing_forecast(historical_data, forecast_days)
        elif method == ForecastMethod.LINEAR_TREND:
            forecast = self.linear_trend_forecast(historical_data, forecast_days)
        else:
            forecast = self.exponential_smoothing_forecast(historical_data, forecast_days)  # Default
        
        # Add seasonality adjustments
        forecast = self.apply_seasonality_adjustments(forecast, product_id)
        
        # Calculate confidence intervals
        forecast = self.calculate_confidence_intervals(forecast, historical_data)
        
        return {
            "product_id": product_id,
            "location_id": location_id,
            "forecast_method": method.value,
            "forecast_days": forecast_days,
            "historical_data_points": len(historical_data),
            "forecast": forecast,
            "accuracy_metrics": self.calculate_forecast_accuracy(historical_data[-30:], method),
            "generated_at": datetime.now().isoformat()
        }
    
    def get_historical_sales_data(self, product_id: str, location_id: str, days: int = 365) -> List[Dict[str, Any]]:
        """Get historical sales data for forecasting"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Group sales by day
        daily_sales = {}
        
        for transaction in self.inventory_manager.sales_transactions:
            if (transaction.product_id == product_id and 
                transaction.location_id == location_id and
                start_date <= transaction.transaction_date <= end_date):
                
                date_key = transaction.transaction_date.strftime('%Y-%m-%d')
                
                if date_key not in daily_sales:
                    daily_sales[date_key] = {
                        "date": transaction.transaction_date,
                        "quantity": 0,
                        "revenue": 0.0
                    }
                
                daily_sales[date_key]["quantity"] += transaction.quantity_sold
                daily_sales[date_key]["revenue"] += transaction.total_amount
        
        # Fill in missing days with zero sales
        current_date = start_date
        complete_data = []
        
        while current_date <= end_date:
            date_key = current_date.strftime('%Y-%m-%d')
            
            if date_key in daily_sales:
                complete_data.append(daily_sales[date_key])
            else:
                complete_data.append({
                    "date": current_date,
                    "quantity": 0,
                    "revenue": 0.0
                })
            
            current_date += timedelta(days=1)
        
        return complete_data
    
    def moving_average_forecast(self, historical_data: List[Dict[str, Any]], 
                              forecast_days: int, window: int = 7) -> List[Dict[str, Any]]:
        """Generate forecast using moving average"""
        quantities = [data["quantity"] for data in historical_data[-window:]]
        avg_quantity = sum(quantities) / len(quantities)
        
        forecast = []
        base_date = historical_data[-1]["date"]
        
        for i in range(1, forecast_days + 1):
            forecast_date = base_date + timedelta(days=i)
            forecast.append({
                "date": forecast_date,
                "forecasted_quantity": avg_quantity,
                "method": "moving_average"
            })
        
        return forecast
    
    def exponential_smoothing_forecast(self, historical_data: List[Dict[str, Any]], 
                                     forecast_days: int, alpha: float = 0.3) -> List[Dict[str, Any]]:
        """Generate forecast using exponential smoothing"""
        if not historical_data:
            return []
        
        # Initialize with first value
        smoothed_value = historical_data[0]["quantity"]
        
        # Apply exponential smoothing
        for data in historical_data[1:]:
            smoothed_value = alpha * data["quantity"] + (1 - alpha) * smoothed_value
        
        forecast = []
        base_date = historical_data[-1]["date"]
        
        for i in range(1, forecast_days + 1):
            forecast_date = base_date + timedelta(days=i)
            forecast.append({
                "date": forecast_date,
                "forecasted_quantity": max(0, smoothed_value),
                "method": "exponential_smoothing"
            })
        
        return forecast
    
    def linear_trend_forecast(self, historical_data: List[Dict[str, Any]], 
                            forecast_days: int) -> List[Dict[str, Any]]:
        """Generate forecast using linear trend"""
        if len(historical_data) < 2:
            return self.moving_average_forecast(historical_data, forecast_days)
        
        # Calculate linear trend
        x_values = list(range(len(historical_data)))
        y_values = [data["quantity"] for data in historical_data]
        
        # Simple linear regression
        n = len(x_values)
        sum_x = sum(x_values)
        sum_y = sum(y_values)
        sum_xy = sum(x * y for x, y in zip(x_values, y_values))
        sum_x2 = sum(x * x for x in x_values)
        
        if n * sum_x2 - sum_x * sum_x != 0:
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
            intercept = (sum_y - slope * sum_x) / n
        else:
            slope = 0
            intercept = sum_y / n if n > 0 else 0
        
        forecast = []
        base_date = historical_data[-1]["date"]
        start_x = len(historical_data)
        
        for i in range(1, forecast_days + 1):
            forecast_date = base_date + timedelta(days=i)
            forecasted_quantity = max(0, intercept + slope * (start_x + i - 1))
            
            forecast.append({
                "date": forecast_date,
                "forecasted_quantity": forecasted_quantity,
                "method": "linear_trend"
            })
        
        return forecast
    
    def apply_seasonality_adjustments(self, forecast: List[Dict[str, Any]], 
                                    product_id: str) -> List[Dict[str, Any]]:
        """Apply seasonality adjustments to forecast"""
        # Calculate seasonal patterns from historical data
        seasonal_factors = self.calculate_seasonal_factors(product_id)
        
        for forecast_point in forecast:
            month = forecast_point["date"].month
            day_of_week = forecast_point["date"].weekday()
            
            # Apply monthly seasonality
            monthly_factor = seasonal_factors.get("monthly", {}).get(month, 1.0)
            
            # Apply weekly seasonality
            weekly_factor = seasonal_factors.get("weekly", {}).get(day_of_week, 1.0)
            
            # Combine factors
            combined_factor = monthly_factor * weekly_factor
            
            forecast_point["forecasted_quantity"] *= combined_factor
            forecast_point["seasonal_adjustment"] = combined_factor
        
        return forecast
    
    def calculate_seasonal_factors(self, product_id: str) -> Dict[str, Dict[int, float]]:
        """Calculate seasonal adjustment factors"""
        # Get all sales data for the product
        all_sales = [
            t for t in self.inventory_manager.sales_transactions
            if t.product_id == product_id
        ]
        
        if len(all_sales) < 30:  # Need sufficient data
            return {"monthly": {}, "weekly": {}}
        
        # Calculate monthly patterns
        monthly_sales = {}
        for transaction in all_sales:
            month = transaction.transaction_date.month
            if month not in monthly_sales:
                monthly_sales[month] = []
            monthly_sales[month].append(transaction.quantity_sold)
        
        # Calculate weekly patterns
        weekly_sales = {}
        for transaction in all_sales:
            day_of_week = transaction.transaction_date.weekday()
            if day_of_week not in weekly_sales:
                weekly_sales[day_of_week] = []
            weekly_sales[day_of_week].append(transaction.quantity_sold)
        
        # Calculate average and factors
        overall_avg = sum([t.quantity_sold for t in all_sales]) / len(all_sales)
        
        monthly_factors = {}
        for month, sales in monthly_sales.items():
            monthly_avg = sum(sales) / len(sales)
            monthly_factors[month] = monthly_avg / overall_avg if overall_avg > 0 else 1.0
        
        weekly_factors = {}
        for day, sales in weekly_sales.items():
            weekly_avg = sum(sales) / len(sales)
            weekly_factors[day] = weekly_avg / overall_avg if overall_avg > 0 else 1.0
        
        return {
            "monthly": monthly_factors,
            "weekly": weekly_factors
        }
    
    def calculate_confidence_intervals(self, forecast: List[Dict[str, Any]], 
                                     historical_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calculate confidence intervals for forecast"""
        # Calculate historical forecast errors
        recent_data = historical_data[-30:] if len(historical_data) >= 30 else historical_data
        quantities = [data["quantity"] for data in recent_data]
        
        if len(quantities) > 1:
            std_dev = statistics.stdev(quantities)
            mean = statistics.mean(quantities)
        else:
            std_dev = 0
            mean = quantities[0] if quantities else 0
        
        # Add confidence intervals to forecast
        for forecast_point in forecast:
            base_quantity = forecast_point["forecasted_quantity"]
            
            # 95% confidence interval (approximately 2 standard deviations)
            confidence_interval = 1.96 * std_dev
            
            forecast_point["confidence_interval_lower"] = max(0, base_quantity - confidence_interval)
            forecast_point["confidence_interval_upper"] = base_quantity + confidence_interval
            forecast_point["confidence_level"] = 0.95
        
        return forecast
    
    def calculate_forecast_accuracy(self, recent_data: List[Dict[str, Any]], 
                                  method: ForecastMethod) -> Dict[str, float]:
        """Calculate forecast accuracy metrics"""
        if len(recent_data) < 7:
            return {"error": "Insufficient data for accuracy calculation"}
        
        # Use first part of data to forecast last part
        train_data = recent_data[:-7]
        test_data = recent_data[-7:]
        
        if method == ForecastMethod.EXPONENTIAL_SMOOTHING:
            forecast_values = self.exponential_smoothing_forecast(train_data, 7)
        else:
            forecast_values = self.moving_average_forecast(train_data, 7)
        
        # Calculate accuracy metrics
        actual_values = [data["quantity"] for data in test_data]
        predicted_values = [f["forecasted_quantity"] for f in forecast_values]
        
        if len(actual_values) != len(predicted_values):
            return {"error": "Forecast length mismatch"}
        
        # Mean Absolute Error (MAE)
        mae = sum(abs(a - p) for a, p in zip(actual_values, predicted_values)) / len(actual_values)
        
        # Mean Absolute Percentage Error (MAPE)
        mape_values = []
        for a, p in zip(actual_values, predicted_values):
            if a != 0:
                mape_values.append(abs((a - p) / a) * 100)
        mape = sum(mape_values) / len(mape_values) if mape_values else 0
        
        # Root Mean Square Error (RMSE)
        rmse = (sum((a - p) ** 2 for a, p in zip(actual_values, predicted_values)) / len(actual_values)) ** 0.5
        
        return {
            "mae": mae,
            "mape": mape,
            "rmse": rmse,
            "accuracy_percentage": max(0, 100 - mape)
        }

class RetailAnalytics:
    """Advanced retail analytics and insights"""
    
    def __init__(self, inventory_manager: InventoryManager):
        self.inventory_manager = inventory_manager
    
    def calculate_stockout_probability(self, product_id: str, location_id: str, 
                                     days_ahead: int = 30) -> Dict[str, Any]:
        """Calculate probability of stockout"""
        # Get current inventory level
        inventory_item = next(
            (item for item in self.inventory_manager.inventory 
             if item.product_id == product_id and item.location_id == location_id), 
            None
        )
        
        if not inventory_item:
            return {"error": "Inventory item not found"}
        
        # Calculate sales velocity and variability
        velocity = self.inventory_manager.calculate_sales_velocity(product_id, location_id, 30)
        
        # Get historical daily sales for variability calculation
        historical_data = self.inventory_manager.get_historical_sales_data(
            product_id, location_id, 60
        )
        daily_quantities = [data["quantity"] for data in historical_data]
        
        if len(daily_quantities) > 1:
            sales_std = statistics.stdev(daily_quantities)
        else:
            sales_std = 0
        
        # Monte Carlo simulation for stockout probability
        simulations = 1000
        stockout_count = 0
        
        for _ in range(simulations):
            current_stock = inventory_item.quantity_available
            
            for day in range(days_ahead):
                # Simulate daily demand with normal distribution
                daily_demand = max(0, np.random.normal(velocity, sales_std))
                current_stock -= daily_demand
                
                if current_stock <= 0:
                    stockout_count += 1
                    break
        
        stockout_probability = stockout_count / simulations
        
        return {
            "product_id": product_id,
            "location_id": location_id,
            "current_stock": inventory_item.quantity_available,
            "daily_velocity": velocity,
            "days_ahead": days_ahead,
            "stockout_probability": stockout_probability,
            "risk_level": self.categorize_stockout_risk(stockout_probability)
        }
    
    def categorize_stockout_risk(self, probability: float) -> str:
        """Categorize stockout risk level"""
        if probability <= 0.05:
            return "low"
        elif probability <= 0.15:
            return "medium"
        elif probability <= 0.30:
            return "high"
        else:
            return "critical"
    
    def analyze_product_performance(self, days: int = 90) -> List[Dict[str, Any]]:
        """Analyze product performance across multiple metrics"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        product_performance = []
        
        for product in self.inventory_manager.products:
            if not product.is_active:
                continue
            
            # Get sales data
            product_sales = [
                t for t in self.inventory_manager.sales_transactions
                if t.product_id == product.id and start_date <= t.transaction_date <= end_date
            ]
            
            total_quantity_sold = sum([s.quantity_sold for s in product_sales])
            total_revenue = sum([s.total_amount for s in product_sales])
            
            # Get inventory data
            inventory_items = [
                item for item in self.inventory_manager.inventory
                if item.product_id == product.id
            ]
            
            total_inventory_value = sum([
                item.quantity_on_hand * item.cost_per_unit for item in inventory_items
            ])
            
            total_on_hand = sum([item.quantity_on_hand for item in inventory_items])
            
            # Calculate metrics
            if total_on_hand > 0 and days > 0:
                sales_velocity = total_quantity_sold / days
                days_of_inventory = total_on_hand / sales_velocity if sales_velocity > 0 else 999
            else:
                sales_velocity = 0
                days_of_inventory = 0
            
            # Calculate margin
            avg_cost = product.cost_price
            avg_selling_price = product.selling_price
            margin_percentage = ((avg_selling_price - avg_cost) / avg_selling_price * 100) if avg_selling_price > 0 else 0
            
            performance_data = {
                "product_id": product.id,
                "product_name": product.name,
                "sku": product.sku,
                "category": product.category,
                "total_quantity_sold": total_quantity_sold,
                "total_revenue": total_revenue,
                "sales_velocity": sales_velocity,
                "total_on_hand": total_on_hand,
                "inventory_value": total_inventory_value,
                "days_of_inventory": days_of_inventory,
                "margin_percentage": margin_percentage,
                "abc_classification": inventory_items[0].abc_classification if inventory_items else "C",
                "performance_score": self.calculate_performance_score(
                    total_revenue, sales_velocity, days_of_inventory, margin_percentage
                )
            }
            
            product_performance.append(performance_data)
        
        return sorted(product_performance, key=lambda x: x["performance_score"], reverse=True)
    
    def calculate_performance_score(self, revenue: float, velocity: float, 
                                  days_inventory: float, margin: float) -> float:
        """Calculate overall product performance score (0-100)"""
        # Normalize metrics (simple scoring)
        revenue_score = min(100, revenue / 10000 * 100)  # $10k = 100 points
        velocity_score = min(100, velocity * 10)  # 10 units/day = 100 points
        
        # Inventory efficiency (lower days = higher score)
        if days_inventory <= 30:
            inventory_score = 100
        elif days_inventory <= 60:
            inventory_score = 80
        elif days_inventory <= 90:
            inventory_score = 60
        else:
            inventory_score = max(0, 100 - (days_inventory - 90))
        
        margin_score = min(100, margin * 2)  # 50% margin = 100 points
        
        # Weighted average
        total_score = (revenue_score * 0.3 + velocity_score * 0.3 + 
                      inventory_score * 0.2 + margin_score * 0.2)
        
        return round(total_score, 2)
    
    def generate_retail_dashboard(self, location_id: str = None) -> Dict[str, Any]:
        """Generate comprehensive retail dashboard"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        # Filter inventory by location if specified
        if location_id:
            inventory_items = [
                item for item in self.inventory_manager.inventory
                if item.location_id == location_id
            ]
            sales_transactions = [
                t for t in self.inventory_manager.sales_transactions
                if t.location_id == location_id
            ]
        else:
            inventory_items = self.inventory_manager.inventory
            sales_transactions = self.inventory_manager.sales_transactions
        
        # Calculate key metrics
        total_inventory_value = sum([
            item.quantity_on_hand * item.cost_per_unit for item in inventory_items
        ])
        
        total_inventory_items = len(inventory_items)
        
        # Stock status summary
        stock_status = {
            "in_stock": len([i for i in inventory_items if i.status == InventoryStatus.IN_STOCK]),
            "low_stock": len([i for i in inventory_items if i.status == InventoryStatus.LOW_STOCK]),
            "out_of_stock": len([i for i in inventory_items if i.status == InventoryStatus.OUT_OF_STOCK]),
            "overstock": len([i for i in inventory_items if i.status == InventoryStatus.OVERSTOCK])
        }
        
        # Sales metrics
        period_sales = [
            t for t in sales_transactions
            if start_date <= t.transaction_date <= end_date
        ]
        
        total_sales_revenue = sum([s.total_amount for s in period_sales])
        total_units_sold = sum([s.quantity_sold for s in period_sales])
        
        # Top products
        product_sales = {}
        for sale in period_sales:
            if sale.product_id not in product_sales:
                product_sales[sale.product_id] = {"quantity": 0, "revenue": 0}
            product_sales[sale.product_id]["quantity"] += sale.quantity_sold
            product_sales[sale.product_id]["revenue"] += sale.total_amount
        
        top_products_by_revenue = sorted(
            product_sales.items(), 
            key=lambda x: x[1]["revenue"], 
            reverse=True
        )[:10]
        
        # Reorder recommendations
        reorder_recommendations = self.inventory_manager.generate_reorder_recommendations()
        
        return {
            "location_id": location_id,
            "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
            "inventory_summary": {
                "total_value": total_inventory_value,
                "total_items": total_inventory_items,
                "stock_status": stock_status
            },
            "sales_summary": {
                "total_revenue": total_sales_revenue,
                "total_units_sold": total_units_sold,
                "average_transaction_value": total_sales_revenue / len(period_sales) if period_sales else 0
            },
            "top_products": [
                {
                    "product_id": product_id,
                    "quantity_sold": data["quantity"],
                    "revenue": data["revenue"]
                }
                for product_id, data in top_products_by_revenue
            ],
            "reorder_alerts": len([r for r in reorder_recommendations if r["priority"] >= 7]),
            "slow_moving_items": len(self.inventory_manager.identify_slow_moving_items()),
            "generated_at": datetime.now().isoformat()
        }

# Example usage and testing

async def example_retail_analysis():
    """Example of retail inventory and forecasting analysis"""
    
    # Initialize system
    inventory_manager = InventoryManager()
    forecaster = DemandForecaster(inventory_manager)
    analytics = RetailAnalytics(inventory_manager)
    
    # Add sample products
    products = [
        Product(
            id="prod_001",
            sku="WIDGET-001",
            name="Premium Widget",
            category="Electronics",
            cost_price=50.0,
            selling_price=79.99
        ),
        Product(
            id="prod_002",
            sku="GADGET-002",
            name="Smart Gadget",
            category="Electronics",
            cost_price=30.0,
            selling_price=49.99
        )
    ]
    
    for product in products:
        inventory_manager.add_product(product)
    
    # Add inventory items
    inventory_items = [
        InventoryItem(
            product_id="prod_001",
            location_id="store_001",
            quantity_on_hand=100,
            quantity_available=100,
            quantity_reserved=0,
            quantity_on_order=0,
            minimum_stock_level=20,
            maximum_stock_level=200,
            reorder_point=30,
            reorder_quantity=50,
            cost_per_unit=50.0
        ),
        InventoryItem(
            product_id="prod_002",
            location_id="store_001",
            quantity_on_hand=150,
            quantity_available=150,
            quantity_reserved=0,
            quantity_on_order=0,
            minimum_stock_level=30,
            maximum_stock_level=300,
            reorder_point=40,
            reorder_quantity=75,
            cost_per_unit=30.0
        )
    ]
    
    for item in inventory_items:
        inventory_manager.add_inventory_item(item)
    
    # Add sample sales transactions
    base_date = datetime.now() - timedelta(days=60)
    for i in range(60):
        # Simulate daily sales
        for product_id in ["prod_001", "prod_002"]:
            quantity = np.random.poisson(3)  # Average 3 units per day
            if quantity > 0:
                product = next(p for p in products if p.id == product_id)
                transaction = SalesTransaction(
                    id=f"sale_{i}_{product_id}",
                    product_id=product_id,
                    location_id="store_001",
                    quantity_sold=quantity,
                    unit_price=product.selling_price,
                    total_amount=quantity * product.selling_price,
                    transaction_date=base_date + timedelta(days=i)
                )
                inventory_manager.add_sales_transaction(transaction)
    
    # Generate forecast
    forecast = forecaster.generate_forecast("prod_001", "store_001", 30)
    print(f"30-day forecast for Premium Widget: {len(forecast['forecast'])} days")
    
    # Analyze performance
    performance = analytics.analyze_product_performance()
    print(f"Analyzed {len(performance)} products")
    
    # Generate dashboard
    dashboard = analytics.generate_retail_dashboard("store_001")
    print(f"Dashboard generated for location: {dashboard['location_id']}")
    print(f"Total inventory value: ${dashboard['inventory_summary']['total_value']:,.2f}")
    
    return dashboard

if __name__ == "__main__":
    asyncio.run(example_retail_analysis())
