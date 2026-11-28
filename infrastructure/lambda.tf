resource "aws_lambda_function" "nba_ingestion" {
  function_name = "nba-ingestion"


  filename         = "ingestion.zip"
  handler          = "extract.lambda_handler"
  runtime          = "python3.12"
  layers           = ["arn:aws:lambda:us-east-1:336392948345:layer:AWSSDKPandas-Python312:32"]
  source_code_hash = filebase64sha256("ingestion.zip")

  role        = aws_iam_role.lambda_role.arn
  timeout     = 120
  memory_size = 512


  environment {
    variables = {
      BUCKET_NAME = aws_s3_bucket.app_bucket.bucket
    }
  }


}

resource "aws_iam_role" "lambda_role" {

  name = "nba-ingestion-lambda"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

}

resource "aws_iam_role_policy" "lambda_permissions" {
  name = "nba-ingestion-permissions"
  role = aws_iam_role.lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = "s3:PutObject"
        Effect   = "Allow"
        Resource = "${aws_s3_bucket.app_bucket.arn}/*"
      },
      {
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Effect   = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

