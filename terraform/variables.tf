locals {
  # id of the environment we build
  env_id = "2"
}

variable "env" {
  default     = "rg-trn-webapp-${local.env_id}"
  description = "Resouce Group that holds all the resources"
}

variable "azure_region" {
  default     = "westeurope"
  description = "Location of the resource group."
}

variable "email_key" {
  default     = "xScaHNMZQydmrCb0"
  description = "key to access email backbone"
}

variable "webapp_name" {
  default = "chess-trnreg-${local.env_id}"
  description = "Name of the web app. Will create the WebApp under the URL <webapp_name>.azurewebsites.net"
}

