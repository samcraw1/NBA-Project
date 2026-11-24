variable "alert_email" {
  type        = string
  description = "Email address that receives AWS budget alert notifications"
}

variable "monthly_budget_limit" {
    type = number
    description = "Monthly budget limit in USD before alerts fire"
    default = 10
  
}