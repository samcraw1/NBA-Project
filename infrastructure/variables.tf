variable "alert_email" {
  type        = string
  description = "Email address that receives AWS budget alert notifications"
}

variable "monthly_budget_limit" {
  type        = number
  description = "Monthly budget limit in USD before alerts fire"

  # This budget covers the WHOLE AWS account, not just this project. About $31/month of the
  # account's spend comes from an earlier project (month to date on 2026-11-26: $26.63, forecast
  # $30.90). This project adds roughly $17/month (RDS ~$14, Secrets Manager ~$0.40, S3/Athena
  # pennies; estimates). 50 leaves room for both; the alert at 80% fires at $40.
  # Revisit around Dec 1: the other project's baseline may change.
  default = 50
}
