# Renderowl 2.0 - R2 Bucket Configuration
# Cloudflare R2 Object Storage Policies

# ============================================================================
# Primary Bucket (US Region)
# ============================================================================

resource "aws_s3_bucket" "renderowl_backups_primary" {
  bucket = "renderowl-backups-primary"
}

# Enable Object Versioning
resource "aws_s3_bucket_versioning" "primary_versioning" {
  bucket = aws_s3_bucket.renderowl_backups_primary.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle Rules for Versioning
resource "aws_s3_bucket_lifecycle_configuration" "primary_lifecycle" {
  bucket = aws_s3_bucket.renderowl_backups_primary.id
  
  rule {
    id     = "cleanup-old-versions"
    status = "Enabled"
    
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
    
    noncurrent_version_transition {
      noncurrent_days = 7
      storage_class   = "GLACIER"
    }
  }
  
  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"
    
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# CORS Configuration for Web Access (if needed)
resource "aws_s3_bucket_cors_configuration" "primary_cors" {
  bucket = aws_s3_bucket.renderowl_backups_primary.id
  
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://renderowl.app"]
    max_age_seconds = 3600
  }
}

# Bucket Policy - Restrict Access
resource "aws_s3_bucket_policy" "primary_policy" {
  bucket = aws_s3_bucket.renderowl_backups_primary.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUnencryptedUploads"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.renderowl_backups_primary.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "AES256"
          }
        }
      },
      {
        Sid    = "AllowBackupService"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::CLOUDFLARE_ACCOUNT_ID:role/backup-service"
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.renderowl_backups_primary.arn,
          "${aws_s3_bucket.renderowl_backups_primary.arn}/*"
        ]
      }
    ]
  })
}

# Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "primary_encryption" {
  bucket = aws_s3_bucket.renderowl_backups_primary.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ============================================================================
# Secondary Bucket (EU Region)
# ============================================================================

resource "aws_s3_bucket" "renderowl_backups_secondary" {
  bucket = "renderowl-backups-secondary"
}

# Enable Object Versioning
resource "aws_s3_bucket_versioning" "secondary_versioning" {
  bucket = aws_s3_bucket.renderowl_backups_secondary.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle Rules
resource "aws_s3_bucket_lifecycle_configuration" "secondary_lifecycle" {
  bucket = aws_s3_bucket.renderowl_backups_secondary.id
  
  rule {
    id     = "cleanup-old-versions"
    status = "Enabled"
    
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
    
    noncurrent_version_transition {
      noncurrent_days = 7
      storage_class   = "GLACIER"
    }
  }
  
  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"
    
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# Bucket Policy
resource "aws_s3_bucket_policy" "secondary_policy" {
  bucket = aws_s3_bucket.renderowl_backups_secondary.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUnencryptedUploads"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.renderowl_backups_secondary.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "AES256"
          }
        }
      },
      {
        Sid    = "AllowBackupService"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::CLOUDFLARE_ACCOUNT_ID:role/backup-service"
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.renderowl_backups_secondary.arn,
          "${aws_s3_bucket.renderowl_backups_secondary.arn}/*"
        ]
      }
    ]
  })
}

# Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "secondary_encryption" {
  bucket = aws_s3_bucket.renderowl_backups_secondary.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ============================================================================
# Cross-Region Replication (CRR)
# ============================================================================

# IAM Role for Replication
resource "aws_iam_role" "replication_role" {
  name = "r2-replication-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "replication_policy" {
  name = "r2-replication-policy"
  role = aws_iam_role.replication_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.renderowl_backups_primary.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersion",
          "s3:GetObjectVersionAcl",
          "s3:GetObjectVersionTagging"
        ]
        Resource = [
          "${aws_s3_bucket.renderowl_backups_primary.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete",
          "s3:ReplicateTags"
        ]
        Resource = [
          "${aws_s3_bucket.renderowl_backups_secondary.arn}/*"
        ]
      }
    ]
  })
}

# Replication Configuration
resource "aws_s3_bucket_replication_configuration" "primary_to_secondary" {
  bucket = aws_s3_bucket.renderowl_backups_primary.id
  role   = aws_iam_role.replication_role.arn
  
  rule {
    id     = "replicate-all-objects"
    status = "Enabled"
    
    filter {
      prefix = ""  # All objects
    }
    
    delete_marker_replication {
      status = "Enabled"
    }
    
    destination {
      bucket = aws_s3_bucket.renderowl_backups_secondary.arn
      
      replication_time {
        status  = "Enabled"
        minutes = 15
      }
      
      metrics {
        status  = "Enabled"
        minutes = 15
      }
    }
  }
  
  depends_on = [aws_s3_bucket_versioning.primary_versioning]
}

# ============================================================================
# AWS CLI / rclone Configuration Template
# ============================================================================

# ~/.aws/config
# [profile renderowl-r2-primary]
# region = auto
# output = json
# 
# [profile renderowl-r2-secondary]
# region = auto
# output = json

# ~/.aws/credentials
# [renderowl-r2-primary]
# aws_access_key_id = YOUR_R2_ACCESS_KEY
# aws_secret_access_key = YOUR_R2_SECRET_KEY
# 
# [renderowl-r2-secondary]
# aws_access_key_id = YOUR_R2_ACCESS_KEY
# aws_secret_access_key = YOUR_R2_SECRET_KEY

# ============================================================================
# rclone Configuration (for rclone-based backups)
# ============================================================================

# ~/.config/rclone/rclone.conf
# [r2-primary]
# type = s3
# provider = Cloudflare
# access_key_id = YOUR_R2_ACCESS_KEY
# secret_access_key = YOUR_R2_SECRET_KEY
# endpoint = https://<account-id>.r2.cloudflarestorage.com
# acl = private
# 
# [r2-secondary]
# type = s3
# provider = Cloudflare
# access_key_id = YOUR_R2_ACCESS_KEY
# secret_access_key = YOUR_R2_SECRET_KEY
# endpoint = https://<account-id>.eu.r2.cloudflarestorage.com
# acl = private
