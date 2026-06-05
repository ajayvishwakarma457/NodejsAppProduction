# IAM Role for Lambda execution
resource "aws_iam_role" "lambda_exec" {
  name = "LambdaExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Attach Basic Execution Policy (Allows logs writing to CloudWatch)
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda S3 Event Trigger Policy (Optional)
resource "aws_iam_policy" "lambda_s3_policy" {
  name = "LambdaS3IntegrationPolicy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "arn:aws:s3:::production-roadmap-bucket/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_s3_attach" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = aws_iam_policy.lambda_s3_policy.arn
}

# Lambda Function (Placeholder Code Archive)
resource "aws_lambda_function" "s3_processor" {
  function_name = "s3-event-processor"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  # Simple placeholder zip file (In real setups, build artifact via CI pipeline)
  filename         = "${path.module}/placeholder.zip"
  source_code_hash = fileexists("${path.module}/placeholder.zip") ? filebase64sha256("${path.module}/placeholder.zip") : ""

  # Skip deployment block validation errors if file is created at runtime
  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  environment {
    variables = {
      NODE_ENV = "production"
    }
  }

  tags = {
    Name        = "s3-event-processor"
    Environment = var.environment
  }
}
