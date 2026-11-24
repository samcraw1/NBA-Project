resource "aws_s3_bucket" "app_bucket" {
  # S3 bucket names are global across all AWS accounts, lowercase, hyphens only (no underscores).
  # Suffixing with the account ID keeps this unique without guessing.
  bucket = "nba-project-data-506726968427"
}

resource "aws_s3_bucket_public_access_block" "app_bucket" {
  bucket = aws_s3_bucket.app_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_bucket" {
  bucket = aws_s3_bucket.app_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
