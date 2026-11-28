import json
import os

import boto3


ses = boto3.client("ses")


def lambda_handler(event, context):
    """Email the configured recipient when the Glue ETL run reaches a final state."""
    detail = event["detail"]
    job_name = detail.get("jobName", "Unknown Glue job")
    job_state = detail.get("state", "UNKNOWN")
    job_run_id = detail.get("jobRunId", "not provided")

    subject = f"NBA Glue ETL {job_state}: {job_name}"
    body = "\n".join(
        [
            f"Glue job: {job_name}",
            f"Final state: {job_state}",
            f"Run ID: {job_run_id}",
            "",
            "Event details:",
            json.dumps(detail, indent=2, default=str),
        ]
    )

    response = ses.send_email(
        Source=os.environ["SENDER_EMAIL"],
        Destination={"ToAddresses": [os.environ["RECIPIENT_EMAIL"]]},
        Message={
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {"Text": {"Data": body, "Charset": "UTF-8"}},
        },
    )

    return {"message_id": response["MessageId"]}
