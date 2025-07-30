# Azure Infrastructure Configuration for Frontier

terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
  
  backend "azurerm" {
    resource_group_name  = "frontier-terraform-rg"
    storage_account_name = "frontiertfstate"
    container_name       = "tfstate"
    key                  = "infrastructure.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

# Data sources
data "azurerm_client_config" "current" {}

# Resource Group
resource "azurerm_resource_group" "frontier_rg" {
  name     = "frontier-${var.environment}-rg"
  location = var.azure_region

  tags = {
    Environment = var.environment
    Project     = "Frontier"
    ManagedBy   = "Terraform"
  }
}

# Virtual Network
resource "azurerm_virtual_network" "frontier_vnet" {
  name                = "frontier-vnet-${var.environment}"
  address_space       = [var.vnet_cidr]
  location            = azurerm_resource_group.frontier_rg.location
  resource_group_name = azurerm_resource_group.frontier_rg.name

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

# Subnets
resource "azurerm_subnet" "aks_subnet" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.frontier_rg.name
  virtual_network_name = azurerm_virtual_network.frontier_vnet.name
  address_prefixes     = [var.aks_subnet_cidr]
}

resource "azurerm_subnet" "db_subnet" {
  name                 = "db-subnet"
  resource_group_name  = azurerm_resource_group.frontier_rg.name
  virtual_network_name = azurerm_virtual_network.frontier_vnet.name
  address_prefixes     = [var.db_subnet_cidr]
  
  delegation {
    name = "fs"
    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

resource "azurerm_subnet" "gateway_subnet" {
  name                 = "GatewaySubnet"
  resource_group_name  = azurerm_resource_group.frontier_rg.name
  virtual_network_name = azurerm_virtual_network.frontier_vnet.name
  address_prefixes     = [var.gateway_subnet_cidr]
}

# Network Security Groups
resource "azurerm_network_security_group" "aks_nsg" {
  name                = "aks-nsg-${var.environment}"
  location            = azurerm_resource_group.frontier_rg.location
  resource_group_name = azurerm_resource_group.frontier_rg.name

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "AllowHTTP"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

resource "azurerm_network_security_group" "db_nsg" {
  name                = "db-nsg-${var.environment}"
  location            = azurerm_resource_group.frontier_rg.location
  resource_group_name = azurerm_resource_group.frontier_rg.name

  security_rule {
    name                       = "AllowPostgreSQL"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5432"
    source_address_prefix      = var.aks_subnet_cidr
    destination_address_prefix = "*"
  }

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

# Associate NSGs with subnets
resource "azurerm_subnet_network_security_group_association" "aks_nsg_association" {
  subnet_id                 = azurerm_subnet.aks_subnet.id
  network_security_group_id = azurerm_network_security_group.aks_nsg.id
}

resource "azurerm_subnet_network_security_group_association" "db_nsg_association" {
  subnet_id                 = azurerm_subnet.db_subnet.id
  network_security_group_id = azurerm_network_security_group.db_nsg.id
}

# Azure Kubernetes Service (AKS)
resource "azurerm_kubernetes_cluster" "frontier_aks" {
  name                = "frontier-aks-${var.environment}"
  location            = azurerm_resource_group.frontier_rg.location
  resource_group_name = azurerm_resource_group.frontier_rg.name
  dns_prefix          = "frontier-${var.environment}"
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name           = "default"
    node_count     = var.node_count
    vm_size        = var.node_vm_size
    vnet_subnet_id = azurerm_subnet.aks_subnet.id
    
    enable_auto_scaling = true
    min_count          = var.node_min_count
    max_count          = var.node_max_count
    
    upgrade_settings {
      max_surge = "10%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    service_cidr      = var.service_cidr
    dns_service_ip    = var.dns_service_ip
    docker_bridge_cidr = var.docker_bridge_cidr
  }

  azure_policy_enabled = true
  
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.frontier_logs.id
  }

  role_based_access_control_enabled = true

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

# Additional Node Pool for ML workloads
resource "azurerm_kubernetes_cluster_node_pool" "ml_pool" {
  name                  = "mlpool"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.frontier_aks.id
  vm_size              = var.ml_node_vm_size
  node_count           = var.ml_node_count
  vnet_subnet_id       = azurerm_subnet.aks_subnet.id
  
  enable_auto_scaling = true
  min_count          = 0
  max_count          = var.ml_node_max_count
  
  node_taints = ["workload=ml:NoSchedule"]
  
  tags = {
    Environment = var.environment
    Project     = "Frontier"
    Workload    = "ML"
  }
}

# PostgreSQL Flexible Server
resource "azurerm_private_dns_zone" "postgres_dns" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.frontier_rg.name

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres_dns_link" {
  name                  = "postgres-dns-link"
  resource_group_name   = azurerm_resource_group.frontier_rg.name
  private_dns_zone_name = azurerm_private_dns_zone.postgres_dns.name
  virtual_network_id    = azurerm_virtual_network.frontier_vnet.id

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

resource "azurerm_postgresql_flexible_server" "frontier_db" {
  name                   = "frontier-db-${var.environment}"
  resource_group_name    = azurerm_resource_group.frontier_rg.name
  location              = azurerm_resource_group.frontier_rg.location
  version               = var.postgres_version
  delegated_subnet_id   = azurerm_subnet.db_subnet.id
  private_dns_zone_id   = azurerm_private_dns_zone.postgres_dns.id
  administrator_login   = var.database_username
  administrator_password = var.database_password
  zone                  = "1"

  storage_mb = var.db_storage_mb
  sku_name   = var.db_sku_name

  backup_retention_days        = var.db_backup_retention_days
  geo_redundant_backup_enabled = var.environment == "prod"

  high_availability {
    mode                      = var.environment == "prod" ? "ZoneRedundant" : "SameZone"
    standby_availability_zone = var.environment == "prod" ? "2" : null
  }

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres_dns_link]

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

resource "azurerm_postgresql_flexible_server_database" "frontier_database" {
  name      = var.database_name
  server_id = azurerm_postgresql_flexible_server.frontier_db.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Redis Cache
resource "azurerm_redis_cache" "frontier_redis" {
  name                = "frontier-redis-${var.environment}"
  location            = azurerm_resource_group.frontier_rg.location
  resource_group_name = azurerm_resource_group.frontier_rg.name
  capacity            = var.redis_capacity
  family              = var.redis_family
  sku_name            = var.redis_sku_name
  enable_non_ssl_port = false
  minimum_tls_version = "1.2"

  redis_configuration {
    maxmemory_reserved = var.redis_maxmemory_reserved
    maxmemory_delta    = var.redis_maxmemory_delta
    maxmemory_policy   = "allkeys-lru"
  }

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

# Storage Account
resource "azurerm_storage_account" "frontier_storage" {
  name                     = "frontierstorage${var.environment}${random_string.storage_suffix.result}"
  resource_group_name      = azurerm_resource_group.frontier_rg.name
  location                = azurerm_resource_group.frontier_rg.location
  account_tier             = "Standard"
  account_replication_type = var.environment == "prod" ? "GRS" : "LRS"
  min_tls_version         = "TLS1_2"

  blob_properties {
    versioning_enabled = true
    
    delete_retention_policy {
      days = var.blob_retention_days
    }
  }

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

resource "random_string" "storage_suffix" {
  length  = 6
  special = false
  upper   = false
}

# Storage Containers
resource "azurerm_storage_container" "app_container" {
  name                  = "app-assets"
  storage_account_name  = azurerm_storage_account.frontier_storage.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "data_container" {
  name                  = "data"
  storage_account_name  = azurerm_storage_account.frontier_storage.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "backup_container" {
  name                  = "backups"
  storage_account_name  = azurerm_storage_account.frontier_storage.name
  container_access_type = "private"
}

# Container Registry
resource "azurerm_container_registry" "frontier_acr" {
  name                = "frontieracr${var.environment}${random_string.acr_suffix.result}"
  resource_group_name = azurerm_resource_group.frontier_rg.name
  location           = azurerm_resource_group.frontier_rg.location
  sku                = var.acr_sku
  admin_enabled      = false

  identity {
    type = "SystemAssigned"
  }

  encryption {
    enabled = true
  }

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

resource "random_string" "acr_suffix" {
  length  = 6
  special = false
  upper   = false
}

# Key Vault
resource "azurerm_key_vault" "frontier_kv" {
  name                       = "frontier-kv-${var.environment}-${random_string.kv_suffix.result}"
  location                   = azurerm_resource_group.frontier_rg.location
  resource_group_name        = azurerm_resource_group.frontier_rg.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = var.environment == "prod"

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    secret_permissions = [
      "Get",
      "List",
      "Set",
      "Delete",
      "Backup",
      "Restore",
      "Recover"
    ]
  }

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

resource "random_string" "kv_suffix" {
  length  = 6
  special = false
  upper   = false
}

# Key Vault Secrets
resource "azurerm_key_vault_secret" "database_connection_string" {
  name         = "database-connection-string"
  value        = "postgresql://${var.database_username}:${var.database_password}@${azurerm_postgresql_flexible_server.frontier_db.fqdn}:5432/${var.database_name}?sslmode=require"
  key_vault_id = azurerm_key_vault.frontier_kv.id

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

resource "azurerm_key_vault_secret" "redis_connection_string" {
  name         = "redis-connection-string"
  value        = "${azurerm_redis_cache.frontier_redis.hostname}:${azurerm_redis_cache.frontier_redis.ssl_port}"
  key_vault_id = azurerm_key_vault.frontier_kv.id

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "frontier_logs" {
  name                = "frontier-logs-${var.environment}"
  location            = azurerm_resource_group.frontier_rg.location
  resource_group_name = azurerm_resource_group.frontier_rg.name
  sku                = "PerGB2018"
  retention_in_days   = var.log_retention_days

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

# Application Insights
resource "azurerm_application_insights" "frontier_ai" {
  name                = "frontier-ai-${var.environment}"
  location            = azurerm_resource_group.frontier_rg.location
  resource_group_name = azurerm_resource_group.frontier_rg.name
  workspace_id        = azurerm_log_analytics_workspace.frontier_logs.id
  application_type    = "web"

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

# Application Gateway (optional for production)
resource "azurerm_public_ip" "gateway_pip" {
  count               = var.create_application_gateway ? 1 : 0
  name                = "frontier-gateway-pip-${var.environment}"
  resource_group_name = azurerm_resource_group.frontier_rg.name
  location            = azurerm_resource_group.frontier_rg.location
  allocation_method   = "Static"
  sku                = "Standard"

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}

resource "azurerm_application_gateway" "frontier_gateway" {
  count               = var.create_application_gateway ? 1 : 0
  name                = "frontier-gateway-${var.environment}"
  resource_group_name = azurerm_resource_group.frontier_rg.name
  location            = azurerm_resource_group.frontier_rg.location

  sku {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 2
  }

  gateway_ip_configuration {
    name      = "gateway-ip-configuration"
    subnet_id = azurerm_subnet.gateway_subnet.id
  }

  frontend_port {
    name = "frontend-port-80"
    port = 80
  }

  frontend_port {
    name = "frontend-port-443"
    port = 443
  }

  frontend_ip_configuration {
    name                 = "frontend-ip-configuration"
    public_ip_address_id = azurerm_public_ip.gateway_pip[0].id
  }

  backend_address_pool {
    name = "backend-pool"
  }

  backend_http_settings {
    name                  = "backend-http-settings"
    cookie_based_affinity = "Disabled"
    port                  = 80
    protocol              = "Http"
    request_timeout       = 60
  }

  http_listener {
    name                           = "http-listener"
    frontend_ip_configuration_name = "frontend-ip-configuration"
    frontend_port_name             = "frontend-port-80"
    protocol                       = "Http"
  }

  request_routing_rule {
    name                       = "routing-rule"
    rule_type                  = "Basic"
    http_listener_name         = "http-listener"
    backend_address_pool_name  = "backend-pool"
    backend_http_settings_name = "backend-http-settings"
    priority                   = 1
  }

  tags = {
    Environment = var.environment
    Project     = "Frontier"
  }
}
