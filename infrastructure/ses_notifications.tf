data "archive_file" "glue_notification_lambda" {
  type        = "zip"
  source_file = "${path.module}/ses.py"
  output_path = "${path.module}/.terraform/glue_notification_lambda.zip"
}

resource "aws_ses_email_identity" "glue_notifications" {
  provider = aws.admin
  email    = var.alert_email
}

resource "aws_iam_role" "glue_notification_lambda" {
  provider = aws.admin
  name     = "nba-glue-notification-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRole"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "glue_notification_lambda" {
  provider = aws.admin
  name     = "nba-glue-notification-ses-send"
  role     = aws_iam_role.glue_notification_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail"]
        Resource = aws_ses_email_identity.glue_notifications.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:us-east-1:*:log-group:/aws/lambda/nba-glue-etl-email:*"
      }
    ]
  })
}

resource "aws_lambda_function" "glue_notification" {
  provider         = aws.admin
  function_name    = "nba-glue-etl-email"
  filename         = data.archive_file.glue_notification_lambda.output_path
  source_code_hash = data.archive_file.glue_notification_lambda.output_base64sha256
  role             = aws_iam_role.glue_notification_lambda.arn
  handler          = "ses.lambda_handler"
  runtime          = "python3.12"
  timeout          = 30

  environment {
    variables = {
      SENDER_EMAIL    = var.alert_email
      RECIPIENT_EMAIL = var.alert_email
    }
  }

  depends_on = [aws_iam_role_policy.glue_notification_lambda]
}

resource "aws_cloudwatch_event_rule" "glue_job_terminal_state" {
  provider    = aws.admin
  name        = "nba-glue-job-terminal-state"
  description = "Notify by email when the NBA player stats Glue job finishes."

  event_pattern = jsonencode({
    source        = ["aws.glue"]
    "detail-type" = ["Glue Job State Change"]
    detail = {
      jobName = [aws_glue_job.player_stats_to_parquet.name]
      state   = ["SUCCEEDED", "FAILED", "TIMEOUT", "STOPPED"]
    }
  })
}

resource "aws_cloudwatch_event_target" "glue_job_notification" {
  provider  = aws.admin
  rule      = aws_cloudwatch_event_rule.glue_job_terminal_state.name
  target_id = "nba-glue-etl-email"
  arn       = aws_lambda_function.glue_notification.arn

  depends_on = [aws_lambda_permission.allow_eventbridge_glue_notification]
}

resource "aws_lambda_permission" "allow_eventbridge_glue_notification" {
  provider      = aws.admin
  statement_id  = "AllowEventBridgeInvokeForGlueJobState"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.glue_notification.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.glue_job_terminal_state.arn
}
