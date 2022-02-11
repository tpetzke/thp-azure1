variable "env_id" {
  default     = "2"
  description = "id for the environment to have multiple copies"
}

variable "env" {
  default     = "rg-trn-webapp-${env_id}"
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
  default = "chess-trnreg-${env_id}"
  description = "Name of the web app. Will create the WebApp under the URL <webapp_name>.azurewebsites.net"
}

