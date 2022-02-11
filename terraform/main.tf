terraform {

  required_version = ">=0.12"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>2.0"
    }
  }
}

provider "azurerm" {
  features {}
}

#Create a resource group to hold all the resources
resource "azurerm_resource_group" "rg" {
  name     = "${var.env}"
  location = "${var.azure_region}"
}

#Create a LogAnalytics Workspace
resource "azurerm_log_analytics_workspace" "log_ws" {
  name                = "log-ws-webapp"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  sku                 = "PerGB2018"
  retention_in_days   = 180
}

resource "azurerm_application_insights" "app_insights" {
  name                = "chess-trn-ai"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  workspace_id        = azurerm_log_analytics_workspace.log_ws.id
  application_type    = "web"
}

output "instrumentation_key" {
  value = azurerm_application_insights.app_insights.instrumentation_key
  sensitive = true
}

resource "azurerm_cosmosdb_account" "cosmos" {

  name                      = "thpcosmos-${var.env_id}"
  location                  = azurerm_resource_group.rg.location
  resource_group_name       = azurerm_resource_group.rg.name
  offer_type                = "Standard"
  kind                      = "GlobalDocumentDB"
  enable_automatic_failover = false

  consistency_policy {
    consistency_level = "Session"
  }

  geo_location {
    location          = azurerm_resource_group.rg.location
    failover_priority = 0
  }
}

# Create the DB Account, the DB and the 2 collections
resource "azurerm_cosmosdb_sql_database" "db" {
  name                = "thpapp1"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
}

output "cosmosdb_primarykey" {
   description = "cosmos primary key"
   value = "${azurerm_cosmosdb_account.cosmos.primary_master_key}"
   sensitive = true
}

output "cosmosdb_endpoint" {
   description = "cosmos endpoint"
   value = "${azurerm_cosmosdb_account.cosmos.endpoint}"
}

resource "azurerm_cosmosdb_sql_container" "coll_players" {
  name                = "players"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.db.name
  partition_key_path  = "/id"
}

resource "azurerm_cosmosdb_sql_container" "coll_dewis" {
  name                = "dewis"
  resource_group_name = azurerm_resource_group.rg.name
  account_name        = azurerm_cosmosdb_account.cosmos.name
  database_name       = azurerm_cosmosdb_sql_database.db.name
  partition_key_path  = "/id"
}

# Create the App Service Plan and the Web App
resource "azurerm_app_service_plan" "asp_trnreg" {
  name                = "asp-turnier-webapp"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  kind                = "Linux"
  reserved            = true

  sku {
    tier = "Standard"
    size = "S1"
    capacity = 3
  }
}

# Create the Auto Scaling Rules for the App Service
resource "azurerm_monitor_autoscale_setting" "asp_autoscale" {
  name                = "WebApp-AutoScale-CPU"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  target_resource_id  = azurerm_app_service_plan.asp_trnreg.id
  profile {
    name = "default"
    capacity {
      default = 1
      minimum = 1
      maximum = 3
    }
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_app_service_plan.asp_trnreg.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 10
      }
      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT1M"
      }
    }
    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_app_service_plan.asp_trnreg.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 5
      }
      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT1M"
      }
    }
  }  
}

# Create a diagnostic setting to track auto scaling
resource "azurerm_monitor_diagnostic_setting" "asp_diagnostic" {
  name                       = "asp-diagnostic-setting"
  target_resource_id         = azurerm_app_service_plan.asp_trnreg.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.log_ws.id

  metric {
    category = "AllMetrics"

    retention_policy {
      enabled = false
    }
  }
}

# Create the web app, pass in the App Service Plan ID, and deploy code from a public GitHub repo
resource "azurerm_app_service" "webapp" {
  name                = "chess-trnreg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  app_service_plan_id = azurerm_app_service_plan.asp_trnreg.id

  site_config {
    linux_fx_version = "NODE|16-lts"
    health_check_path = "/?"
  }

  connection_string {
    name  = "AccountEndpoint"
    type  = "Custom"
    value = "${azurerm_cosmosdb_account.cosmos.endpoint}"
  }

  connection_string {
    name  = "AccountKey"
    type  = "Custom"
    value = "${azurerm_cosmosdb_account.cosmos.primary_master_key}"
  }

  app_settings = {
    "EMAIL_USER"      = "tpetzke@gmx.de"
    "EMAIL_PASSWORD"  = "${var.email_key}"
    "APPINSIGHTS_INSTRUMENTATIONKEY" = azurerm_application_insights.app_insights.instrumentation_key
  }

}

resource "azurerm_application_insights_web_test" "web_test_index" {
  name                    = "${var.webapp_name} index page can be loaded"
  location                = azurerm_resource_group.rg.location
  resource_group_name     = azurerm_resource_group.rg.name
  application_insights_id = azurerm_application_insights.app_insights.id
  kind                    = "ping"
  frequency               = 300
  timeout                 = 60
  enabled                 = true
  geo_locations           = ["emea-nl-ams-azr", "emea-gb-db3-azr"]

  configuration = <<XML
  <WebTest Name="WebTest1" Id="ABD48585-0831-40CB-9069-682EA6BB3583" Enabled="True" CssProjectStructure="" CssIteration="" Timeout="0" WorkItemIds="" xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010" Description="" CredentialUserName="" CredentialPassword="" PreAuthenticate="True" Proxy="default" StopOnError="False" RecordedResultFile="" ResultsLocale="">
    <Items>
      <Request Method="GET" Guid="a5f10126-e4cd-570d-961c-cea43999a200" Version="1.1" Url="https://${azurerm_app_service.webapp.default_site_hostname}/" ThinkTime="0" Timeout="300" ParseDependentRequests="True" FollowRedirects="True" RecordResult="True" Cache="False" ResponseTimeGoal="0" Encoding="utf-8" ExpectedHttpStatusCode="200" ExpectedResponseUrl="" ReportingName="" IgnoreHttpStatusCode="False" />
    </Items>
  </WebTest>
  XML
}

resource "azurerm_monitor_action_group" "action_group_email" {
  name                = "action-group-email-developper"
  resource_group_name = azurerm_resource_group.rg.name
  short_name          = "mail2dev"

  email_receiver {
    name          = "mail2dev"
    email_address = "tpetzke2@gmail.com"
  }
}

resource "azurerm_monitor_scheduled_query_rules_alert" "alert_mail" {
  name                    = "queryrule-mailvolume"
  location                = azurerm_resource_group.rg.location
  resource_group_name     = azurerm_resource_group.rg.name
  
  action {
    action_group           = [azurerm_monitor_action_group.action_group_email.id]
    email_subject          = "Mail volume exceeds threshold"
    custom_webhook_payload = "{}"
  }
  data_source_id = azurerm_application_insights.app_insights.id
  description    = "Alert if numbers of outgoing mails per day exceed threshold"
  enabled        = true
  # Count all mails sent events per day
  query       = <<-QUERY
  customEvents
  | where name == "Mail Sent" 
  | summarize Count=count() by bin(timestamp, 1d)
  QUERY
  severity    = 2
  frequency   = 5
  time_window = 60*24
  trigger {
    operator  = "GreaterThan"
    threshold = 2
    metric_trigger {
      operator            = "GreaterThan"
      threshold           = 1
      metric_trigger_type = "Total"
      metric_column       = "Count"
    }
  }
}