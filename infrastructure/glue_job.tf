data "aws_caller_identity" "admin" {
  provider = aws.admin
}

resource "aws_iam_role" "player_stats_glue" {
  provider = aws.admin
  name     = "nba-player-stats-glue-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "glue.amazonaws.com" }
    }]
  })
}

# Scope Glue to the input CSV prefix, its script/temp paths, the new Parquet
# output prefix, and its own CloudWatch log groups.
resource "aws_iam_role_policy" "player_stats_glue" {
  provider = aws.admin
  name     = "nba-player-stats-glue-access"
  role     = aws_iam_role.player_stats_glue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ListBucketPrefixes"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.app_bucket.arn
        Condition = {
          StringLike = {
            "s3:prefix" = [
              "processed/player_game_stats",
              "processed/player_game_stats/*",
              "scripts/glue/player_stats_to_parquet.py",
              "glue-temp",
              "glue-temp/*",
              "curated/player_game_stats_parquet",
              "curated/player_game_stats_parquet/*",
              "curated/player_game_stats_parquet_practice2",
              "curated/player_game_stats_parquet_practice2/*"
            ]
          }
        }
      },
      {
        Sid      = "GetBucketRegion"
        Effect   = "Allow"
        Action   = ["s3:GetBucketLocation"]
        Resource = aws_s3_bucket.app_bucket.arn
      },
      {
        Sid    = "ReadInputsAndJobScript"
        Effect = "Allow"
        Action = ["s3:GetObject"]
        Resource = [
          "${aws_s3_bucket.app_bucket.arn}/processed/player_game_stats/*",
          "${aws_s3_bucket.app_bucket.arn}/scripts/glue/player_stats_to_parquet.py",
          "${aws_s3_bucket.app_bucket.arn}/glue-temp/*",
        ]
      },
      {
        Sid    = "WriteCuratedOutputAndTemporaryFiles"
        Effect = "Allow"
        Action = ["s3:PutObject", "s3:AbortMultipartUpload"]
        Resource = [
          "${aws_s3_bucket.app_bucket.arn}/curated/player_game_stats_parquet/*",
          "${aws_s3_bucket.app_bucket.arn}/glue-temp/*",
          "${aws_s3_bucket.app_bucket.arn}/curated/player_game_stats_parquet_practice2/*"
        ]
      },
      {
        Sid      = "CleanTemporaryFiles"
        Effect   = "Allow"
        Action   = ["s3:DeleteObject"]
        Resource = "${aws_s3_bucket.app_bucket.arn}/glue-temp/*"
      },
      {
        Sid    = "WriteGlueJobLogs"
        Effect = "Allow"
        Action = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = [
          "arn:aws:logs:us-east-1:${data.aws_caller_identity.admin.account_id}:log-group:/aws-glue/*",
          "arn:aws:logs:us-east-1:${data.aws_caller_identity.admin.account_id}:log-group:/aws-glue/*:log-stream:*",
        ]
      },
    ]
  })
}

resource "aws_s3_object" "player_stats_glue_script" {
  provider     = aws.admin
  bucket       = aws_s3_bucket.app_bucket.id
  key          = "scripts/glue/player_stats_to_parquet.py"
  source       = "${path.module}/../glue_job.py"
  source_hash  = filemd5("${path.module}/../glue_job.py")
  content_type = "text/x-python"
}

resource "aws_glue_job" "player_stats_to_parquet" {
  provider          = aws.admin
  name              = "nba-player-stats-csv-to-parquet"
  role_arn          = aws_iam_role.player_stats_glue.arn
  glue_version      = "5.1"
  worker_type       = "G.1X"
  number_of_workers = 2
  timeout           = 5
  max_retries       = 0

  command {
    name            = "glueetl"
    script_location = "s3://${aws_s3_bucket.app_bucket.bucket}/${aws_s3_object.player_stats_glue_script.key}"
    python_version  = "3"
  }

  execution_property {
    max_concurrent_runs = 1
  }

  default_arguments = {
    "--job-language"                     = "python"
    "--TempDir"                          = "s3://${aws_s3_bucket.app_bucket.bucket}/glue-temp/"
    "--enable-metrics"                   = "true"
    "--enable-continuous-cloudwatch-log" = "true"
    "--enable-job-insights"              = "true"
    "--job-bookmark-option"              = "job-bookmark-disable"
  }
}
