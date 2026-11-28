terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region  = "us-east-1"
  profile = "nba-terraform"
}

# Use the admin profile only for the Glue job's service role and job resources.
# Existing infrastructure continues to use the restricted nba-terraform profile.
provider "aws" {
  alias   = "admin"
  region  = "us-east-1"
  profile = "default"
}
