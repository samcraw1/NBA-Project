resource "aws_cloudwatch_event_rule" "daily_ingestion" {
    name = "nba-daily-ingestion"
    schedule_expression = "cron(0 10 * * ? *)"
  


}


resource "aws_cloudwatch_event_target" "ingestion" {

    rule = aws_cloudwatch_event_rule.daily_ingestion.name
    arn = aws_lambda_function.nba_ingestion.arn
  
}

resource "aws_lambda_permission" "eventbridge" {

    statement_id = "AllowEventBridge"
    action = "lambda:InvokeFunction"
    function_name = aws_lambda_function.nba_ingestion.function_name
    principal = "events.amazonaws.com"
    source_arn = aws_cloudwatch_event_rule.daily_ingestion.arn
  
}