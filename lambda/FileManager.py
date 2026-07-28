import boto3
import json

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("CloudDropFiles")

s3 = boto3.client("s3")

BUCKET_NAME = "clouddrop-skand-2026"


def response(status_code, body):
    return {
        "statusCode": status_code,
        "body": json.dumps(body)
    }


def lambda_handler(event, context):

    try:
        method = event.get(
            "requestContext", {}
        ).get(
            "http", {}
        ).get("method")

        path = event.get("rawPath", "")

        # -----------------------
        # LIST FILES
        # -----------------------

        if method == "GET" and path == "/files":

            result = table.scan()

            files = result.get("Items", [])

            # DynamoDB numbers need conversion
            for file in files:
                if "size" in file:
                    file["size"] = int(file["size"])

            return response(200, files)


        # -----------------------
        # DOWNLOAD FILE
        # -----------------------

        elif method == "GET" and path.startswith("/download/"):

            file_id = path.split("/")[-1]

            result = table.get_item(
                Key={"file_id": file_id}
            )

            item = result.get("Item")

            if not item:
                return response(
                    404,
                    {"error": "File not found"}
                )

            download_url = s3.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": BUCKET_NAME,
                    "Key": item["object_key"]
                },
                ExpiresIn=300
            )

            return response(
                200,
                {"downloadUrl": download_url}
            )


        # -----------------------
        # DELETE FILE
        # -----------------------

        elif method == "DELETE" and path.startswith("/files/"):

            file_id = path.split("/")[-1]

            result = table.get_item(
                Key={"file_id": file_id}
            )

            item = result.get("Item")

            if not item:
                return response(
                    404,
                    {"error": "File not found"}
                )

            # Delete actual file
            s3.delete_object(
                Bucket=BUCKET_NAME,
                Key=item["object_key"]
            )

            # Delete metadata
            table.delete_item(
                Key={"file_id": file_id}
            )

            return response(
                200,
                {"message": "File deleted"}
            )


        return response(
            404,
            {"error": "Route not found"}
        )


    except Exception as e:

        print(str(e))

        return response(
            500,
            {"error": "Internal server error"}
        )