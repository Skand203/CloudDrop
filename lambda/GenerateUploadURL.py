import boto3
import json
import uuid

s3 = boto3.client("s3")

BUCKET_NAME = "clouddrop-skand-2026"


def lambda_handler(event, context):

    try:
        body = json.loads(event.get("body", "{}"))

        filename = body.get("filename")
        content_type = body.get("contentType", "application/octet-stream")

        if not filename:
            return {
                "statusCode": 400,
                "body": json.dumps({
                    "error": "filename is required"
                })
            }

        file_id = str(uuid.uuid4())

        object_key = f"uploads/{file_id}/{filename}"

        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": BUCKET_NAME,
                "Key": object_key,
                "ContentType": content_type
            },
            ExpiresIn=300
        )

        return {
            "statusCode": 200,
            "body": json.dumps({
                "fileId": file_id,
                "filename": filename,
                "objectKey": object_key,
                "uploadUrl": upload_url
            })
        }

    except Exception as e:

        print(f"Error: {str(e)}")

        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": "Unable to generate upload URL"
            })
        }