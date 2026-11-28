# Portfolio hosting. The existing RDS instance is retained. ECS Express runs the API
# in public subnets and uses a dedicated task security group for PostgreSQL access.
# The Express service is created with the AWS CLI because AWS provider 5.x does not
# expose the ECS Express Gateway service operation. Keep its current identity below.

variable "api_image_tag" {
  description = "Immutable ECR tag for this portfolio deployment."
  type        = string
  default     = "portfolio-20261127-fix2"
}

resource "aws_ecr_repository" "api" {
  provider             = aws.admin
  name                 = "nba-project-api"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration { scan_on_push = true }
  encryption_configuration { encryption_type = "AES256" }
}

resource "aws_amplify_app" "frontend" {
  provider                 = aws.admin
  name                     = "nba-project-portfolio"
  platform                 = "WEB"
  enable_branch_auto_build = false
}

resource "aws_amplify_branch" "frontend" {
  provider          = aws.admin
  app_id            = aws_amplify_app.frontend.id
  branch_name       = "main"
  stage             = "PRODUCTION"
  framework         = "React"
  enable_auto_build = false
}

resource "aws_subnet" "apprunner_a" {
  provider                = aws.admin
  vpc_id                  = data.aws_vpc.default.id
  cidr_block              = "172.31.96.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = false
  tags                    = { Name = "nba-apprunner-private-a" }
}

resource "aws_subnet" "apprunner_b" {
  provider                = aws.admin
  vpc_id                  = data.aws_vpc.default.id
  cidr_block              = "172.31.97.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = false
  tags                    = { Name = "nba-apprunner-private-b" }
}

resource "aws_route_table" "apprunner_private" {
  provider = aws.admin
  vpc_id   = data.aws_vpc.default.id
  tags     = { Name = "nba-apprunner-private" }
}

resource "aws_route_table_association" "apprunner_a" {
  provider       = aws.admin
  subnet_id      = aws_subnet.apprunner_a.id
  route_table_id = aws_route_table.apprunner_private.id
}

resource "aws_route_table_association" "apprunner_b" {
  provider       = aws.admin
  subnet_id      = aws_subnet.apprunner_b.id
  route_table_id = aws_route_table.apprunner_private.id
}

resource "aws_security_group" "apprunner_vpc" {
  provider    = aws.admin
  name        = "nba-apprunner-rds-client"
  description = "App Runner outbound PostgreSQL access to the NBA project RDS instance"
  vpc_id      = data.aws_vpc.default.id

  egress {
    description = "PostgreSQL traffic inside the project VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }
}

resource "aws_apprunner_vpc_connector" "api" {
  provider           = aws.admin
  vpc_connector_name = "nba-project-api-rds"
  subnets            = [aws_subnet.apprunner_a.id, aws_subnet.apprunner_b.id]
  security_groups    = [aws_security_group.apprunner_vpc.id]
}

resource "aws_iam_role" "apprunner_ecr_access" {
  provider = aws.admin
  name     = "nba-project-apprunner-ecr-access"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "build.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "apprunner_ecr_access" {
  provider = aws.admin
  name     = "read-nba-project-api-image"
  role     = aws_iam_role.apprunner_ecr_access.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"]
        Resource = aws_ecr_repository.api.arn
      }
    ]
  })
}

resource "aws_iam_role" "apprunner_instance" {
  provider = aws.admin
  name     = "nba-project-apprunner-instance"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "tasks.apprunner.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "apprunner_database_secret" {
  provider = aws.admin
  name     = "read-existing-rds-master-secret"
  role     = aws_iam_role.apprunner_instance.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = aws_db_instance.main.master_user_secret[0].secret_arn
    }]
  })
}

resource "aws_apprunner_auto_scaling_configuration_version" "api" {
  provider                        = aws.admin
  auto_scaling_configuration_name = "nba-project-api-single-instance"
  max_concurrency                 = 100
  min_size                        = 1
  max_size                        = 1
}

resource "aws_cloudwatch_log_group" "api" {
  provider          = aws.admin
  name              = "/ecs/nba-project-api"
  retention_in_days = 14
}

resource "aws_iam_role" "ecs_execution" {
  provider = aws.admin
  name     = "nba-project-ecs-execution"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  provider   = aws.admin
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_database_secret" {
  provider = aws.admin
  name     = "read-nba-project-rds-secret"
  role     = aws_iam_role.ecs_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = aws_db_instance.main.master_user_secret[0].secret_arn
    }]
  })
}

resource "aws_iam_role" "ecs_infrastructure" {
  provider = aws.admin
  name     = "nba-project-ecs-express-infrastructure"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_infrastructure" {
  provider   = aws.admin
  role       = aws_iam_role.ecs_infrastructure.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRoleforExpressGatewayServices"
}

resource "aws_security_group" "ecs_api" {
  provider    = aws.admin
  name        = "nba-project-ecs-api-rds-client"
  description = "ECS Express API outbound PostgreSQL access to NBA project RDS"
  vpc_id      = data.aws_vpc.default.id

  egress {
    description = "PostgreSQL traffic inside the project VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.default.cidr_block]
  }
}

output "amplify_app_id" {
  value = aws_amplify_app.frontend.id
}

output "frontend_url" {
  value = "https://main.${aws_amplify_app.frontend.default_domain}"
}

output "api_ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "api_service_url" {
  value = "https://nb-5686130c8fd74b6396787bddc1ee8f70.ecs.us-east-1.on.aws"
}

output "api_service_name" {
  value = "nba-project-api-clean"
}

output "api_service_arn" {
  value = "arn:aws:ecs:us-east-1:506726968427:service/allthecats/nba-project-api-clean"
}
