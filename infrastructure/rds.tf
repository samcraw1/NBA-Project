variable "my_ip_cidr" {
  type        = string
  description = "My public IP as a /32 CIDR, e.g. 203.0.113.7/32. Only this address can reach the database."


  validation {
    condition     = can(cidrhost(var.my_ip_cidr, 0)) && var.my_ip_cidr != "0.0.0.0/0"
    error_message = "Must be a valid CIDR and must not be 0.0.0.0/0 (that would open the database to the whole internet)."

  }
}


data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "rds" {
  name        = "nba-project-rds"
  description = "Postgres access from my IP only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "Postgres from my IP"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]

  }

  ingress {
    description     = "PostgreSQL from the NBA project App Runner service"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.apprunner_vpc.id]
  }

  ingress {
    description     = "PostgreSQL from the NBA project ECS Express API"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_api.id]
  }
}

resource "aws_db_subnet_group" "main" {
  name = "nba-project"
  subnet_ids = [
    for subnet_id in data.aws_subnets.default.ids : subnet_id
    if subnet_id != aws_subnet.apprunner_a.id && subnet_id != aws_subnet.apprunner_b.id
  ]

}

resource "aws_db_instance" "main" {
  identifier     = "nba-project"
  engine         = "postgres"
  engine_version = "14"
  instance_class = "db.t4g.micro"

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "nba_project"
  username = "nba_admin"

  # RDS generates the password and stores it in Secrets Manager.
  # It never appears in this repo or in a variable.

  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = true

  multi_az                = false
  backup_retention_period = 1

  skip_final_snapshot = true
  deletion_protection = false
}

output "rds_endpoint" {
  value = aws_db_instance.main.address

}

output "rds_password_secret_arn" {
  value = aws_db_instance.main.master_user_secret[0].secret_arn
}





