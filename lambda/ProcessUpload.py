import json
import boto3
import urllib.parse
from datetime import datetime, timezone

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("CloudDropFiles")


def lambda_handler(event, context):

    for record in event["Records"]:

        bucket = record["s3"]["bucket"]["name"]

        key = urllib.parse.unquote_plus(
            record["s3"]["object"]["key"]
        )

        size = record["s3"]["object"]["size"]

        # uploads/<uuid>/<filename>
        parts = key.split("/")

        if len(parts) >= 3:
            file_id = parts[1]
            filename = "/".join(parts[2:])
        else:
            file_id = key
            filename = key

        table.put_item(
            Item={
                "file_id": file_id,
                "filename": filename,
                "object_key": key,
                "bucket": bucket,
                "size": size,
                "uploaded_at":
                    datetime.now(timezone.utc).isoformat(),
                "status": "READY"
            }
        )

        print(f"Processed {filename}")

    return {
        "statusCode": 200,
        "message": "File processed successfully"
    }