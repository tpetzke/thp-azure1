variable "env_id" {
  default     = "2"
  description = "Id of the envionment we build"
}

variable "env" {
  default     = "rg-trn-webapp"
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
  default = "chess-trnreg"
  description = "Name of the web app. Will create the WebApp under the URL <webapp_name>.azurewebsites.net"
}

